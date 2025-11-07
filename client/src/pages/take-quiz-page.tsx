import { useState, useEffect, useCallback, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  Clock,
  FileText,
  Code,
  Send,
  Save,
  Timer,
  CheckCircle2,
  ArrowLeft
} from "lucide-react";
import * as z from "zod";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { QuizPreview } from "@/components/ui/quiz-preview";
import { ProfessionalCppIde } from "@/components/ui/professional-cpp-ide";
import { Badge } from "@/components/ui/badge";

// Form schema for answers
const answerSchema = z.object({
  answer: z.string().min(1, "Please provide an answer"),
  codeAnswer: z.string().optional(),
});

type AnswerFormData = z.infer<typeof answerSchema>;

export default function TakeQuizPage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/quizzes/:id/take");
  const queryClient = useQueryClient();
  const quizId = match ? parseInt(params.id) : 0;
  const { toast } = useToast();

  // Quiz states
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [studentQuizId, setStudentQuizId] = useState<number | null>(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  
  // Answer states
  const [answers, setAnswers] = useState<{[key: number]: string}>({});
  const [codeAnswers, setCodeAnswers] = useState<{[key: number]: string}>({});
  const [showCodeEditor, setShowCodeEditor] = useState<{[key: number]: boolean}>({});
  
  // UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [fullscreenRequired, setFullscreenRequired] = useState(false);

  // HTTP-based webcam monitoring
  const { user } = useAuth();
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [consentRequestedBy, setConsentRequestedBy] = useState<number | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [framesSent, setFramesSent] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureIntervalRef = useRef<number | null>(null);
  const consentPollingRef = useRef<number | null>(null);
  const [consentApproved, setConsentApproved] = useState(false);

  // Form for answering questions
  const form = useForm<AnswerFormData>({
    resolver: zodResolver(answerSchema),
    defaultValues: {
      answer: "",
      codeAnswer: ""
    }
  });

  // Get quiz data (with pre-start minimal data + summary from safe endpoint)
  const { data: quizData, isLoading: isQuizLoading } = useQuery({
    queryKey: ["/api/quizzes", quizId, "take"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/quizzes/${quizId}/take`);
      return response.json();
    },
    enabled: !!quizId,
  });

  // Get quiz questions (only after quiz starts or is resumed)
  const { data: questions, isLoading: isQuestionsLoading } = useQuery({
    queryKey: ["/api/quizzes", quizId, "questions"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/quizzes/${quizId}/questions`);
      return response.json();
    },
    enabled: !!quizId && quizStarted
  });

  // Removed pre-start questions fetch: we now rely on server-provided summary to avoid leaking content

  // Get student quiz details
  const { data: studentQuizzes, isLoading: isStudentQuizLoading } = useQuery({
    queryKey: ["/api/student-quizzes"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/student-quizzes");
      return response.json();
    },
    enabled: !!quizId
  });

  // Get student answers for this quiz
  const { data: existingAnswers, refetch: refetchAnswers } = useQuery({
    queryKey: ["/api/student-quizzes", studentQuizId, "answers"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/student-quizzes/${studentQuizId}/answers`);
      return response.json();
    },
    enabled: !!studentQuizId && quizStarted
  });

  // Check if this quiz is already assigned to the student
  useEffect(() => {
    if (studentQuizzes && quizId) {
      const assignedQuiz = studentQuizzes.find(
        (sq: any) => sq.quizId === quizId
      );
      
      if (assignedQuiz) {
        setStudentQuizId(assignedQuiz.id);
        
        // If quiz is already completed, redirect
        if (assignedQuiz.status === "completed") {
          setQuizCompleted(true);
          toast({
            title: "Quiz already completed",
            description: "You have already completed this quiz.",
          });
          return;
        }
        
        // If quiz is in progress, resume
        if (assignedQuiz.status === "in_progress") {
          setQuizStarted(true);
          // Prefer server authoritative endsAt if available
          if (assignedQuiz.endsAt) {
            const remainingMs = Math.max(0, new Date(assignedQuiz.endsAt).getTime() - Date.now());
            setTimeRemaining(Math.floor(remainingMs / 1000));
          } else if (quizData) {
            const startTime = new Date(assignedQuiz.startedAt).getTime();
            const duration = quizData.duration * 60 * 1000;
            const endTime = startTime + duration;
            const remaining = Math.max(0, endTime - Date.now());
            setTimeRemaining(Math.floor(remaining / 1000));
          }
        }
      }
    }
  }, [studentQuizzes, quizId, quizData]);

  // Load existing answers
  useEffect(() => {
    if (existingAnswers) {
      const answerMap: {[key: number]: string} = {};
      const codeMap: {[key: number]: string} = {};
      const outputMap: {[key: number]: string} = {};
      const errorMap: {[key: number]: string} = {};
      
      existingAnswers.forEach((answer: any) => {
        answerMap[answer.questionId] = answer.answer || "";
        codeMap[answer.questionId] = answer.codeAnswer || "";
        outputMap[answer.questionId] = answer.codeOutput || "";
        errorMap[answer.questionId] = answer.codeError || "";
      });
      
      setAnswers(answerMap);
      setCodeAnswers(codeMap);
      setCodeOutputs(outputMap);
      setCodeErrors(errorMap);
    }
  }, [existingAnswers]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || quizCompleted) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          // Hard auto-submit without confirmation when time runs out
          try {
            stopStreaming();
            completeQuizMutation.mutate({});
          } catch {}
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, quizCompleted]);

  // Start quiz mutation
  const startQuizMutation = useMutation({
    mutationFn: async () => {
      if (!studentQuizId) throw new Error("Student quiz not found");
      return apiRequest("POST", `/api/student-quizzes/${studentQuizId}/start`);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      setQuizStarted(true);
      // Prefer server authoritative endsAt if available
      if (data?.endsAt) {
        const remainingMs = Math.max(0, new Date(data.endsAt).getTime() - Date.now());
        setTimeRemaining(Math.floor(remainingMs / 1000));
      } else if (quizData) {
        setTimeRemaining(quizData.duration * 60);
      }
      toast({
        title: "Quiz started",
        description: "Good luck! You can now answer the questions.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start quiz",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Save answer mutation (only called on submit)
  const saveAnswerMutation = useMutation({
    mutationFn: async ({ questionId, answer, codeAnswer, codeOutput, codeError }: {
      questionId: number;
      answer: string;
      codeAnswer?: string;
      codeOutput?: string;
      codeError?: string;
    }) => {
      return apiRequest("POST", `/api/student-quizzes/${studentQuizId}/answers`, {
        questionId,
        answer,
        codeAnswer,
        codeOutput,
        codeError
      });
    },
    onSuccess: () => {
      // No auto-saving UI updates needed
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save answer",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Complete quiz mutation
  const completeQuizMutation = useMutation({
    mutationFn: async () => {
      // Collect all answers to send
      const answersToSubmit = questions?.map(q => ({
        questionId: q.id,
        answer: answers[q.id] || "",
        codeAnswer: codeAnswers[q.id] || ""
      })) || [];

      return apiRequest("POST", `/api/student-quizzes/${studentQuizId}/complete`, {
        answers: answersToSubmit
      });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      setQuizCompleted(true);
      toast({
        title: "Quiz completed successfully!",
        description: "Your answers have been submitted for grading.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/student-quizzes"] });
      setTimeout(() => setLocation("/dashboard"), 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to complete quiz",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Request fullscreen and setup proctoring listeners
  // Helper to enter fullscreen
  const requestFullscreen = async () => {
    const elem: any = document.documentElement;
    if (elem.requestFullscreen) await elem.requestFullscreen();
    else if (elem.webkitRequestFullscreen) await elem.webkitRequestFullscreen();
    else if (elem.msRequestFullscreen) await elem.msRequestFullscreen();
  };

  // Strictly enforce fullscreen during the attempt
  const ensureFullscreen = async () => {
    const isFs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
    if (!isFs) {
      try {
        await requestFullscreen();
      } catch (e) {
        // If auto re-entry fails (browser blocks), we’ll show a blocking UI handled via state
        setFullscreenRequired(true);
      }
    }
  };

  const logEvent = useCallback(async (type: string, data?: any) => {
    try {
      if (!studentQuizId) return;
      await apiRequest("POST", `/api/student-quizzes/${studentQuizId}/events`, { type, data });
    } catch (e) {
      console.warn("Failed to log event", type, e);
    }
  }, [studentQuizId]);

  useEffect(() => {
    if (!quizStarted || !studentQuizId) return;

    const handleBlur = () => logEvent("tab_blur");
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") logEvent("visibility_hidden");
    };
    const handleFsChange = async () => {
      const fsActive = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      if (!fsActive) {
        // Log and immediately attempt to restore fullscreen
        logEvent("fullscreen_exit");
        await ensureFullscreen();
      } else {
        setFullscreenRequired(false);
      }
    };

    // Block copy/paste/keyboard shortcuts during quiz
    const preventCopy = (e: ClipboardEvent) => { e.preventDefault(); };
    const preventPaste = (e: ClipboardEvent) => { e.preventDefault(); };
    const preventCut = (e: ClipboardEvent) => { e.preventDefault(); };
    const preventKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["c","v","x","a","s","p"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };

    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange as any);

    document.addEventListener("copy", preventCopy);
    document.addEventListener("paste", preventPaste);
    document.addEventListener("cut", preventCut);
    document.addEventListener("keydown", preventKey);

    // On resume, re-ensure fullscreen
    ensureFullscreen();

    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange as any);

      document.removeEventListener("copy", preventCopy);
      document.removeEventListener("paste", preventPaste);
      document.removeEventListener("cut", preventCut);
      document.removeEventListener("keydown", preventKey);
    };
  }, [quizStarted, studentQuizId, logEvent]);

  const handleStartQuiz = async () => {
    setIsStarting(true);
    try {
      await requestFullscreen();
    } catch {}
    await ensureFullscreen();
    startQuizMutation.mutate();
    setIsStarting(false);
  };



  const startStreaming = async () => {
    if (streaming) return;
    try {
      // getUserMedia
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 240, frameRate: 8 }, 
        audio: false 
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // Setup canvas for snapshot encoding
      const canvas = canvasRef.current ?? document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      canvasRef.current = canvas;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Could not get canvas context');

      // Send frames via HTTP every 2 seconds (more reliable than WebSocket)
      captureIntervalRef.current = window.setInterval(async () => {
        if (!ctx || !videoRef.current || !consentApproved) return;
        
        try {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          
          // Send frame via HTTP API instead of WebSocket
          await apiRequest('POST', '/api/monitoring/frames', {
            quizId,
            studentId: user!.id,
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
  };



  const stopStreaming = useCallback(() => {
    // Clear frame interval
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current as any);
      captureIntervalRef.current = null;
    }
    // Stop all media tracks
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((t) => t.stop());
      } catch {}
      streamRef.current = null;
    }
    // Detach video element
    if (videoRef.current) {
      try { (videoRef.current as any).srcObject = null; } catch {}
    }
    setStreaming(false);
  }, []);

  // --- HTTP-based consent flow ---
  useEffect(() => {
    if (!quizStarted || !user || !studentQuizId) return;

    // Poll for consent requests every 5 seconds
    const pollForConsentRequests = async () => {
      try {
        const response = await apiRequest('GET', `/api/monitoring/consent-requests?quizId=${quizId}&studentId=${user.id}`);
        const data = await response.json();
        
        if (data.hasRequest && !consentModalOpen) {
          setConsentRequestedBy(data.teacherId);
          setConsentModalOpen(true);
        }
      } catch (error) {
        console.warn('Failed to check consent requests:', error);
      }
    };

    // Start polling
    consentPollingRef.current = window.setInterval(pollForConsentRequests, 5000);
    pollForConsentRequests(); // Initial check

    return () => {
      if (consentPollingRef.current) {
        clearInterval(consentPollingRef.current);
        consentPollingRef.current = null;
      }
    };
  }, [quizStarted, user, studentQuizId, quizId, consentModalOpen]);

  const respondConsent = async (approved: boolean) => {
    if (!user || !consentRequestedBy) return;
    
    try {
      // Send consent response via HTTP
      await apiRequest('POST', '/api/monitoring/consent', {
        quizId,
        studentId: user.id,
        teacherId: consentRequestedBy,
        approved
      });
      
      setConsentApproved(approved);
      setConsentModalOpen(false);
      setConsentRequestedBy(null);
      
      if (approved) {
        await startStreaming();
      } else {
        stopStreaming();
      }
    } catch (error) {
      console.error('Failed to send consent response:', error);
    }
  };

  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    // No auto-saving - answers will be saved only on quiz submission
  };

  const handleCodeChange = (questionId: number, code: string) => {
    setCodeAnswers(prev => ({ ...prev, [questionId]: code }));
    // No auto-saving - answers will be saved only on quiz submission
  };






  const handleCompleteQuiz = () => {
    setConfirmDialogOpen(true);
  };



  const confirmCompleteQuiz = () => {
    setIsSubmitting(true);
    // Immediately stop webcam streaming upon submit
    stopStreaming();
    completeQuizMutation.mutate({});
    setConfirmDialogOpen(false);
  };

  // Resume proctoring if returning to in-progress
  useEffect(() => {
    if (quizStarted && studentQuizId) {
      // Ensure fullscreen on resume
      const ensureFs = async () => {
        const fsActive = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
        if (!fsActive) {
          try { await requestFullscreen(); } catch {}
        }
      };
      ensureFs();
    }
  }, [quizStarted, studentQuizId]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < (questions?.length || 0)) {
      setCurrentQuestionIndex(index);
    }
  };

  // Loading states
  if (isQuizLoading || isQuestionsLoading || isStudentQuizLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading quiz...</span>
      </div>
    );
  }

  // Error states: Only treat as not found if the quiz itself is missing.
  // Questions are loaded after starting, so they may be undefined before then.
  if (!quizData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Quiz not found</h1>
        <Button onClick={() => setLocation("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // Quiz completed state
  if (quizCompleted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <CheckCircle2 className="h-16 w-16 text-green-600 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Quiz Completed!</h1>
        <p className="text-muted-foreground mb-4">Thank you for completing the quiz.</p>
        <Button onClick={() => setLocation("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // Quiz preview state (before starting)
  if (!quizStarted) {
    const now = new Date();
    const scheduledAt = quizData?.scheduledAt ? new Date(quizData.scheduledAt) : null;
    const beforeStart = scheduledAt ? scheduledAt.getTime() > now.getTime() : false;

    // Previously this view blocked starting before the scheduled time.
    // We now always show the preview with a Start button to avoid blocking students.

    return (
      <div className="container mx-auto py-6">
        <QuizPreview
          quiz={quizData}
          questions={[]}
          onStartQuiz={handleStartQuiz}
          isStarting={isStarting}
          showQuestionsList={false}
          summary={quizData?.summary}
        />
      </div>
    );
  }

  // Quiz taking interface
  // Guard against a brief render where quizStarted flips true before questions are loaded
  if (!questions || questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading questions...</span>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex] ?? questions[0];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // If fullscreen is required (lost), block UI with a dialog overlay
  if (quizStarted && fullscreenRequired) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <Card className="max-w-xl w-full">
          <CardHeader>
            <CardTitle className="text-2xl">Fullscreen Required</CardTitle>
            <CardDescription>
              You must stay in fullscreen to continue the quiz.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please re-enter fullscreen to resume your quiz. Exiting fullscreen is logged.
            </p>
            <div className="flex gap-2">
              <Button onClick={ensureFullscreen}>Re-enter Fullscreen</Button>
              <Button variant="outline" onClick={() => setLocation('/dashboard')}>Exit Quiz</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      {/* Webcam consent dialog */}
      <Dialog open={consentModalOpen} onOpenChange={setConsentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Webcam Access Requested</DialogTitle>
            <DialogDescription>
              Your instructor is requesting temporary access to your webcam for proctoring during this quiz. Do you approve?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => respondConsent(false)}>Decline</Button>
            <Button onClick={() => respondConsent(true)}>Approve</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header with timer and progress */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{quizData.title}</CardTitle>
              <CardDescription>
                Question {currentQuestionIndex + 1} of {questions.length}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              {autoSaving && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Save className="h-4 w-4 mr-1 animate-pulse" />
                  Saving...
                </div>
              )}
              {/* Streaming badge */}
              {streaming && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                  Webcam On
                  <span className="text-xs text-green-700/80">({framesSent})</span>
                </div>
              )}
              {timeRemaining !== null && (
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                  timeRemaining < 300 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  <Timer className="h-4 w-4" />
                  <span className="font-mono font-medium">
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <Progress value={progress} className="mt-4" />
        </CardHeader>
      </Card>

      {/* Question navigation */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            {questions.map((question: any, index: number) => (
              <Button
                key={index}
                variant={index === currentQuestionIndex ? "default" : "outline"}
                size="sm"
                onClick={() => goToQuestion(index)}
                className={`w-10 h-10 ${
                  answers[questions[index].id] || codeAnswers[questions[index].id] 
                    ? 'bg-green-100 border-green-300' 
                    : ''
                }`}
              >
                {index + 1}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current question */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {currentQuestion.type === "coding" ? (
                <Code className="h-5 w-5" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
              Question {currentQuestionIndex + 1}
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline">{currentQuestion.subject}</Badge>
              <Badge variant="secondary">{currentQuestion.difficulty}</Badge>
              <Badge variant={currentQuestion.type === "coding" ? "default" : "secondary"}>
                {currentQuestion.type === "coding" ? "Coding" : "Short Answer"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="prose max-w-none">
            <p className="text-base leading-relaxed whitespace-pre-wrap">
              {currentQuestion.content}
            </p>
          </div>

          {/* Universal Answer Input with Toggle for ALL Questions */}
          <div className="space-y-4">
            {/* Toggle between text and code editor for ALL question types */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                {currentQuestion.type === "coding" ? "Your Solution:" : "Your Answer:"}
              </label>
              <div className="flex gap-2">
                <Button
                  variant={!showCodeEditor[currentQuestion.id] ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowCodeEditor(prev => ({ ...prev, [currentQuestion.id]: false }))}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Text Editor
                </Button>
                <Button
                  variant={showCodeEditor[currentQuestion.id] ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowCodeEditor(prev => ({ ...prev, [currentQuestion.id]: true }))}
                >
                  <Code className="h-4 w-4 mr-2" />
                  Code Editor
                </Button>
              </div>
            </div>
            
            {/* Editor content - Available for ALL question types */}
            <div>
              {showCodeEditor[currentQuestion.id] ? (
                <div className="space-y-3">
                  <ProfessionalCppIde
                    initialCode={codeAnswers[currentQuestion.id] || (currentQuestion.type === "coding" 
                      ? "#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << \"Hello, World!\" << endl;\n    return 0;\n}"
                      : "// You can write code snippets, algorithms, or pseudocode here\n// This is helpful for technical questions\n\n")}
                    onCodeChange={(code) => handleCodeChange(currentQuestion.id, code)}
                    height="500px"
                    showTemplates={true}
                    enableFormatting={true}
                    enableAnalysis={true}
                  />
                </div>
              ) : (
                <Textarea
                  value={answers[currentQuestion.id] || ""}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  placeholder={
                    currentQuestion.type === "coding" 
                      ? "Type your answer here (algorithm explanation, pseudocode, or approach)..."
                      : "Type your answer here..."
                  }
                  className="min-h-[200px] font-mono"
                />
              )}
            </div>
            
            {/* Additional explanation field when using code editor */}
            {showCodeEditor[currentQuestion.id] && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {currentQuestion.type === "coding" ? "Explanation (optional):" : "Text Explanation:"}
                </label>
                <Textarea
                  value={answers[currentQuestion.id] || ""}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  placeholder={
                    currentQuestion.type === "coding"
                      ? "Explain your approach, algorithm, or any assumptions..."
                      : "Provide additional text explanation for your code solution..."
                  }
                  className="min-h-[100px]"
                />
              </div>
            )}
            
            {/* Help text */}
            <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                <div>
                  <strong>Text Editor:</strong> For explanations, essays, short answers, and general responses
                </div>
              </div>
              <div className="flex items-start gap-2 mt-1">
                <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                <div>
                  <strong>Code Editor:</strong> Professional IDE with C++ compilation, external compiler access, and syntax highlighting
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation and submit */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => goToQuestion(currentQuestionIndex - 1)}
          disabled={currentQuestionIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-2">
          {currentQuestionIndex === questions.length - 1 ? (
            <Button onClick={handleCompleteQuiz} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit Quiz
            </Button>
          ) : (
            <Button
              onClick={() => goToQuestion(currentQuestionIndex + 1)}
              disabled={currentQuestionIndex === questions.length - 1}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Quiz</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your quiz? This action cannot be undone.
              {timeRemaining && timeRemaining > 0 && (
                <span className="block mt-2 text-orange-600">
                  You still have {formatTime(timeRemaining)} remaining.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmCompleteQuiz} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit Quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}