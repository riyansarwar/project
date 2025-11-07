import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useWebcamMonitoring } from "@/hooks/use-webcam-monitoring";

export default function QuizMonitorPage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/quizzes/:id/monitor");
  const quizId = match ? parseInt(params.id) : 0;
  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerStudentId, setViewerStudentId] = useState<number | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: quiz, isLoading: loadingQuiz } = useQuery({
    queryKey: ["/api/quizzes", quizId],
    queryFn: async () => (await apiRequest("GET", `/api/quizzes/${quizId}`)).json(),
    enabled: !!quizId,
  });

  const { data: attempts = [], isLoading: loadingAttempts, refetch } = useQuery({
    queryKey: ["/api/quizzes", quizId, "attempts"],
    queryFn: async () => (await apiRequest("GET", `/api/quizzes/${quizId}/attempts`)).json(),
    enabled: !!quizId,
    refetchInterval: 5000,
  });

  // Use the new HTTP-based webcam monitoring system
  const {
    requestAccess,
    frames,
    frameCount,
    isConnected,
    consents,
    isLoading: monitoringLoading,
    error: monitoringError
  } = useWebcamMonitoring({
    quizId,
    role: 'teacher'
  });

  const handleRequestWebcam = async (studentId: number) => {
    try {
      await requestAccess(studentId);
      toast({
        title: "Webcam Request Sent",
        description: `Request sent to student #${studentId}`,
      });
    } catch (error) {
      toast({
        title: "Request Failed",
        description: "Failed to send webcam request",
        variant: "destructive",
      });
    }
  };

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["/api/student-quizzes", selectedAttempt?.id, "events"],
    queryFn: async () => (await apiRequest("GET", `/api/student-quizzes/${selectedAttempt?.id}/events`)).json(),
    enabled: !!selectedAttempt && eventsOpen,
    refetchInterval: eventsOpen ? 4000 : false,
  });

  useEffect(() => {
    if (!match) setLocation("/quizzes");
  }, [match, setLocation]);

  const statusBadge = (status?: string) => {
    const variant = status === "in_progress" ? "default" : status === "completed" ? "secondary" : "outline";
    return <Badge variant={variant}>{status || "unknown"}</Badge>;
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Monitor Quiz</h1>
          <p className="text-muted-foreground">Real-time overview of student attempts</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button variant="outline" onClick={() => setLocation("/quizzes")}>Back to Quizzes</Button>
          <div className="text-xs text-muted-foreground">
            <span className="mr-2">Monitoring:</span>
            <Badge variant={isConnected ? "default" : "destructive"}>{isConnected ? "Connected" : "Disconnected"}</Badge>
          </div>
          {monitoringError && (
            <div className="text-xs text-destructive">
              Error: {monitoringError}
            </div>
          )}
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{quiz?.title || "Loading..."}</CardTitle>
          <CardDescription>
            {quiz?.scheduledAt ? `Scheduled: ${format(new Date(quiz.scheduledAt), "PPP, p")}` : "Not scheduled"}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attempts</CardTitle>
          <CardDescription>Auto-refreshing every 5 seconds</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Ends At</TableHead>
                <TableHead>Webcam</TableHead>
                <TableHead className="text-right">Frames</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(attempts || []).map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{a.user?.name || a.studentName || `Student #${a.userId || a.studentId}`}</span>
                      <span className="text-xs text-muted-foreground">{a.user?.email || a.studentEmail || ""}</span>
                    </div>
                  </TableCell>
                  <TableCell>{statusBadge(a.status)}</TableCell>
                  <TableCell>{a.startedAt ? format(new Date(a.startedAt), "PPP p") : "—"}</TableCell>
                  <TableCell>{a.endsAt ? format(new Date(a.endsAt), "PPP p") : "—"}</TableCell>
                  <TableCell>
                    {frames[a.studentId || a.userId] ? (
                      <button onClick={() => { setViewerStudentId(a.studentId || a.userId); setViewerOpen(true); }}>
                        <img src={frames[a.studentId || a.userId]} alt="Webcam" className="w-24 h-16 object-cover rounded border hover:ring-2 hover:ring-primary transition" />
                      </button>
                    ) : consents[a.studentId || a.userId] ? (
                      <span className="text-xs text-muted-foreground">Waiting for frames…</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-xs text-muted-foreground">{frameCount[a.studentId || a.userId] || 0}</span>
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => { setSelectedAttempt(a); setEventsOpen(true); }}>View Events</Button>
                    {a.status === 'in_progress' && (
                      <Button
                        size="sm"
                        onClick={() => handleRequestWebcam((a.student?.id ?? a.studentId ?? a.userId) as number)}
                        disabled={monitoringLoading || !isConnected}
                        title={!isConnected ? 'Monitoring not connected' : ''}
                      >
                        Request Webcam
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={eventsOpen} onOpenChange={setEventsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Attempt Events - {selectedAttempt?.user?.name || selectedAttempt?.studentName || selectedAttempt?.id}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(events || []).map((ev: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell>{ev.createdAt ? format(new Date(ev.createdAt), "PPP p") : "—"}</TableCell>
                    <TableCell><Badge variant={ev.type?.includes("suspicious") ? "destructive" : "secondary"}>{ev.type}</Badge></TableCell>
                    <TableCell>
                      <pre className="text-xs whitespace-pre-wrap">{typeof ev.data === "string" ? ev.data : JSON.stringify(ev.data || {}, null, 2)}</pre>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Live viewer dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Live Webcam</DialogTitle>
          </DialogHeader>
          {viewerStudentId && frames[viewerStudentId] ? (
            <img src={frames[viewerStudentId]} alt="Live Webcam" className="w-full h-auto rounded border" />
          ) : (
            <div className="text-sm text-muted-foreground">No live frame available.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}