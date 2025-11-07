import { useState, useEffect, useRef, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';

export interface MonitoringSession {
  id: string;
  studentId: number;
  quizId: number;
  status: 'active' | 'inactive';
  lastFrameTime: number;
}

export interface MonitoringFrame {
  id: string;
  studentId: number;
  quizId: number;
  dataUrl: string;
  timestamp: number;
}

interface UseWebcamMonitoringOptions {
  studentId?: number;
  quizId: number;
  isTeacher?: boolean;
  enabled?: boolean;
}

export function useWebcamMonitoring({
  studentId,
  quizId,
  isTeacher = false,
  enabled = true
}: UseWebcamMonitoringOptions) {
  // Student states
  const [streaming, setStreaming] = useState(false);
  const [framesSent, setFramesSent] = useState(0);
  const [consentRequested, setConsentRequested] = useState(false);
  const [consentApproved, setConsentApproved] = useState(false);
  const [requestingTeacherId, setRequestingTeacherId] = useState<number | null>(null);

  // Teacher states  
  const [activeSessions, setActiveSessions] = useState<MonitoringSession[]>([]);
  const [latestFrames, setLatestFrames] = useState<Map<number, MonitoringFrame>>(new Map());
  const [monitoringStudentId, setMonitoringStudentId] = useState<number | null>(null);

  // Refs for cleanup
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureIntervalRef = useRef<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const sessionPollingRef = useRef<number | null>(null);

  // **STUDENT SIDE - Webcam Streaming**
  const startStreaming = useCallback(async () => {
    if (streaming || isTeacher) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 240, frameRate: 8 }, 
        audio: false 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // Setup canvas for frame capture
      const canvas = canvasRef.current ?? document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      canvasRef.current = canvas;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Could not get canvas context');

      // Start frame capture (every 2 seconds for reliability)
      captureIntervalRef.current = window.setInterval(async () => {
        if (!ctx || !videoRef.current || !consentApproved) return;
        
        try {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          
          // Send frame via HTTP instead of WebSocket
          await apiRequest('POST', '/api/monitoring/frames', {
            quizId,
            studentId,
            dataUrl,
            timestamp: Date.now()
          });
          
          setFramesSent(prev => prev + 1);
        } catch (error) {
          console.warn('Failed to send frame:', error);
        }
      }, 2000); // 2 seconds interval for reliability
      
      setStreaming(true);
    } catch (error) {
      console.error('Failed to start webcam:', error);
      setStreaming(false);
    }
  }, [streaming, isTeacher, consentApproved, quizId, studentId]);

  const stopStreaming = useCallback(() => {
    // Clear capture interval
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }

    // Stop media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStreaming(false);
    setFramesSent(0);
  }, []);

  // Handle consent response
  const respondToConsent = useCallback(async (approved: boolean) => {
    if (!requestingTeacherId) return;
    
    try {
      await apiRequest('POST', '/api/monitoring/consent', {
        quizId,
        studentId,
        teacherId: requestingTeacherId,
        approved
      });
      
      setConsentApproved(approved);
      setConsentRequested(false);
      setRequestingTeacherId(null);
      
      if (approved) {
        await startStreaming();
      } else {
        stopStreaming();
      }
    } catch (error) {
      console.error('Failed to send consent response:', error);
    }
  }, [quizId, studentId, requestingTeacherId, startStreaming, stopStreaming]);

  // **TEACHER SIDE - Monitoring**
  const requestWebcamAccess = useCallback(async (targetStudentId: number) => {
    if (!isTeacher) return;
    
    try {
      await apiRequest('POST', '/api/monitoring/request', {
        quizId,
        studentId: targetStudentId
      });
      
      setMonitoringStudentId(targetStudentId);
    } catch (error) {
      console.error('Failed to request webcam access:', error);
    }
  }, [isTeacher, quizId]);

  const stopMonitoring = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setMonitoringStudentId(null);
    setLatestFrames(new Map());
  }, []);

  // **STUDENT SIDE - Listen for consent requests**
  useEffect(() => {
    if (!enabled || isTeacher || !studentId) return;

    const pollForConsentRequests = async () => {
      try {
        const response = await apiRequest('GET', `/api/monitoring/consent-requests?quizId=${quizId}&studentId=${studentId}`);
        const data = await response.json();
        
        if (data.hasRequest && !consentRequested) {
          setConsentRequested(true);
          setRequestingTeacherId(data.teacherId);
        }
      } catch (error) {
        console.warn('Failed to check consent requests:', error);
      }
    };

    // Poll every 5 seconds for consent requests
    const pollInterval = setInterval(pollForConsentRequests, 5000);
    pollForConsentRequests(); // Initial check

    return () => {
      clearInterval(pollInterval);
    };
  }, [enabled, isTeacher, studentId, quizId, consentRequested]);

  // **TEACHER SIDE - Monitor active sessions and frames**
  useEffect(() => {
    if (!enabled || !isTeacher || !monitoringStudentId) return;

    // Server-Sent Events for real-time frame updates
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const eventSource = new EventSource(`${protocol}//${window.location.host}/api/monitoring/stream?quizId=${quizId}&studentId=${monitoringStudentId}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const frame: MonitoringFrame = JSON.parse(event.data);
        setLatestFrames(prev => {
          const newMap = new Map(prev);
          newMap.set(frame.studentId, frame);
          return newMap;
        });
      } catch (error) {
        console.warn('Failed to parse frame data:', error);
      }
    };

    eventSource.onerror = () => {
      console.warn('EventSource connection error, will retry automatically');
    };

    return () => {
      eventSource.close();
    };
  }, [enabled, isTeacher, monitoringStudentId, quizId]);

  // **TEACHER SIDE - Poll for active sessions**
  useEffect(() => {
    if (!enabled || !isTeacher) return;

    const pollSessions = async () => {
      try {
        const response = await apiRequest('GET', `/api/monitoring/sessions?quizId=${quizId}`);
        const sessions = await response.json();
        setActiveSessions(sessions);
      } catch (error) {
        console.warn('Failed to fetch monitoring sessions:', error);
      }
    };

    // Poll every 10 seconds
    sessionPollingRef.current = window.setInterval(pollSessions, 10000);
    pollSessions(); // Initial fetch

    return () => {
      if (sessionPollingRef.current) {
        clearInterval(sessionPollingRef.current);
      }
    };
  }, [enabled, isTeacher, quizId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
      stopMonitoring();
      
      if (sessionPollingRef.current) {
        clearInterval(sessionPollingRef.current);
      }
    };
  }, [stopStreaming, stopMonitoring]);

  return {
    // Student states and actions
    streaming,
    framesSent,
    consentRequested,
    consentApproved,
    requestingTeacherId,
    startStreaming,
    stopStreaming,
    respondToConsent,
    videoRef,
    canvasRef,

    // Teacher states and actions  
    activeSessions,
    latestFrames,
    monitoringStudentId,
    requestWebcamAccess,
    stopMonitoring
  };
}