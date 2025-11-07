import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Eye, CheckCircle, AlertCircle, Code, FileText, User, ArrowLeft, Camera, CameraOff } from "lucide-react";
import { ProfessionalCppIde } from "@/components/ui/professional-cpp-ide";

interface StudentAttempt {
  id: number;
  studentId: number;
  status: string;
  score: number | null;
  startedAt: string;
  endedAt: string;
  student: {
    id: number;
    name: string;
    email: string;
  };
}

interface Answer {
  id: number;
  questionId: number;
  answer: string;
  codeAnswer: string;
  codeOutput: string;
  codeError: string;
  score: number | null;
  feedback: string | null;
  question: {
    id: number;
    content: string;
    type: string;
    answer: string;
    codeAnswer?: string;
  };
}

export default function GradingPage() {
  const { quizId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<Answer | null>(null);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [currentGrade, setCurrentGrade] = useState<string>("");
  const [currentFeedback, setCurrentFeedback] = useState<string>("");
  // Local copy of student code for testing without saving to database
  const [localCodeCopy, setLocalCodeCopy] = useState<{[key: number]: string}>({});


  // Fetch grading data
  const { data: gradingData, isLoading: gradingLoading } = useQuery({
    queryKey: ["/api/quizzes", quizId, "grading"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/quizzes/${quizId}/grading`);
      return response.json();
    },
    enabled: !!quizId
  });

  // Fetch student answers
  const { data: studentAnswers, isLoading: answersLoading, refetch: refetchAnswers } = useQuery({
    queryKey: ["/api/student-quizzes", selectedStudentId, "answers-with-questions"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/student-quizzes/${selectedStudentId}/answers-with-questions`);
      return response.json();
    },
    enabled: !!selectedStudentId
  });

  // Grade answer mutation
  const gradeMutation = useMutation({
    mutationFn: async ({ studentQuizId, questionId, score, feedback }: {
      studentQuizId: number;
      questionId: number;
      score: number;
      feedback: string;
    }) => {
      return apiRequest("POST", `/api/student-quizzes/${studentQuizId}/grade`, {
        questionId,
        score,
        feedback
      });
    },
    onSuccess: () => {
      toast({
        title: "Answer graded successfully",
        description: "The grade has been saved.",
      });
      refetchAnswers();
      setGradeDialogOpen(false);
      setCurrentGrade("");
      setCurrentFeedback("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to grade answer",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Post results mutation
  const postResultsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/quizzes/${quizId}/post-results`);
    },
    onSuccess: () => {
      toast({
        title: "Results posted successfully",
        description: "Students have been notified of their results.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
      setLocation("/quizzes");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to post results",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGradeAnswer = (answer: Answer) => {
    setSelectedAnswer(answer);
    setCurrentGrade(answer.score?.toString() || "");
    setCurrentFeedback(answer.feedback || "");
    setGradeDialogOpen(true);
  };

  // Handle code changes locally for testing purposes (don't save to database)
  const handleCodeChange = (answerId: number, newCode: string) => {
    setLocalCodeCopy(prev => ({
      ...prev,
      [answerId]: newCode
    }));
  };

  // Get the current code value (local copy if exists, otherwise original)
  const getCurrentCodeValue = (answer: Answer) => {
    return localCodeCopy[answer.id] || answer.codeAnswer || '';
  };

  const submitGrade = () => {
    if (!selectedAnswer || !selectedStudentId) return;

    const gradeValue = parseFloat(currentGrade);
    if (isNaN(gradeValue) || gradeValue < 0 || gradeValue > 100) {
      toast({
        title: "Invalid grade",
        description: "Please enter a grade between 0 and 100.",
        variant: "destructive",
      });
      return;
    }

    gradeMutation.mutate({
      studentQuizId: selectedStudentId,
      questionId: selectedAnswer.questionId,
      score: gradeValue,
      feedback: currentFeedback
    });
  };



  const getGradeLetter = (score: number | null) => {
    if (score === null) return "Not Graded";
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  };

  const getGradeColor = (score: number | null) => {
    if (score === null) return "bg-gray-100 text-gray-800";
    if (score >= 90) return "bg-green-100 text-green-800";
    if (score >= 80) return "bg-blue-100 text-blue-800";
    if (score >= 70) return "bg-yellow-100 text-yellow-800";
    if (score >= 60) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  if (gradingLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => setLocation("/quizzes")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Quizzes
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Grade Quiz Submissions</h1>
          <p className="text-muted-foreground">Review and grade student answers</p>
        </div>
      </div>

      {/* Students List */}
      <Card>
        <CardHeader>
          <CardTitle>Student Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gradingData?.map((attempt: StudentAttempt) => (
                <TableRow key={attempt.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {attempt.student.name}
                    </div>
                  </TableCell>
                  <TableCell>{attempt.student.email}</TableCell>
                  <TableCell>
                    <Badge variant={attempt.status === "completed" ? "default" : "secondary"}>
                      {attempt.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {attempt.endedAt ? new Date(attempt.endedAt).toLocaleDateString() : "N/A"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedStudentId(attempt.id)}
                      disabled={attempt.status !== "completed"}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Answers
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Student Answers */}
      {selectedStudentId && (
        <Card>
          <CardHeader>
            <CardTitle>Student Answers</CardTitle>
          </CardHeader>
          <CardContent>
            {answersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {studentAnswers?.map((answer: Answer) => (
                  <Card key={answer.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h4 className="font-medium mb-2">Question: {answer.question.content}</h4>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">
                              {answer.question.type === "coding" ? (
                                <><Code className="h-3 w-3 mr-1" /> Coding</>
                              ) : (
                                <><FileText className="h-3 w-3 mr-1" /> Text</>
                              )}
                            </Badge>
                            <Badge className={getGradeColor(answer.score)}>
                              {getGradeLetter(answer.score)}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGradeAnswer(answer)}
                        >
                          {answer.score !== null ? "Update Grade" : "Grade Answer"}
                        </Button>
                      </div>

                      {/* Text Answer */}
                      {answer.answer && (
                        <div className="mb-4">
                          <h5 className="font-medium mb-2">Text Answer:</h5>
                          <div className="bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                            {answer.answer}
                          </div>
                        </div>
                      )}

                      {/* Code Answer */}
                      {answer.codeAnswer && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-medium">Code Answer:</h5>
                            <Badge variant="outline" className="text-xs">
                              Interactive Testing Mode
                            </Badge>
                          </div>
                          <div className="space-y-3">
                            <ProfessionalCppIde
                              initialCode={getCurrentCodeValue(answer)}
                              onCodeChange={(newCode) => handleCodeChange(answer.id, newCode)}
                              readOnly={false}
                              height="400px"
                            />
                            <div className="text-xs text-muted-foreground">
                              💡 You can modify and test the student's code above. Changes are for testing only and will not be saved to the database.
                            </div>
                          </div>
                        </div>
                      )}



                      {/* Feedback */}
                      {answer.feedback && (
                        <div className="mb-4">
                          <h5 className="font-medium mb-2">Feedback:</h5>
                          <div className="bg-blue-50 p-3 rounded-lg italic">
                            {answer.feedback}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Post Results Button */}
      {gradingData && gradingData.length > 0 && (
        <div className="flex justify-center">
          <Button
            onClick={() => postResultsMutation.mutate()}
            disabled={postResultsMutation.isPending}
            size="lg"
          >
            {postResultsMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Post Results to Students
          </Button>
        </div>
      )}

      {/* Grade Dialog */}
      <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Grade Answer</DialogTitle>
            <DialogDescription>
              Assign a grade and provide feedback for this answer.
            </DialogDescription>
          </DialogHeader>

          {selectedAnswer && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Grade (0-100):</label>
                <Select value={currentGrade} onValueChange={setCurrentGrade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="95">A (90-100)</SelectItem>
                    <SelectItem value="85">B (80-89)</SelectItem>
                    <SelectItem value="75">C (70-79)</SelectItem>
                    <SelectItem value="65">D (60-69)</SelectItem>
                    <SelectItem value="55">F (0-59)</SelectItem>
                    <SelectItem value="0">F (0)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Feedback:</label>
                <Textarea
                  value={currentFeedback}
                  onChange={(e) => setCurrentFeedback(e.target.value)}
                  placeholder="Provide constructive feedback..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setGradeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={submitGrade} disabled={gradeMutation.isPending}>
                  {gradeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Submit Grade
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}