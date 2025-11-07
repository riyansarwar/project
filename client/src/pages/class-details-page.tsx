import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Users, BookOpen, TrendingUp, TrendingDown, Calendar, Award, UserCheck, UserX, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ClassInviteDialog } from "@/components/class-invite-dialog";

import Header from "@/components/ui/shared/header";
import Sidebar from "@/components/ui/shared/sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ClassDetailsPageProps {
  params: { id: string };
}

export default function ClassDetailsPage({ params }: ClassDetailsPageProps) {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inviteDialog, setInviteDialog] = useState({
    open: false,
    classId: null as number | null,
    className: ""
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const classId = parseInt(params.id);

  // Fetch class details
  const { data: classDetails, isLoading: isClassLoading } = useQuery({
    queryKey: [`/api/classes/${classId}`],
  });

  // Fetch students in this class
  const { data: students = [], isLoading: isStudentsLoading } = useQuery({
    queryKey: [`/api/classes/${classId}/students`],
  });

  // Fetch quizzes for this class
  const { data: quizzes = [], isLoading: isQuizzesLoading } = useQuery({
    queryKey: [`/api/classes/${classId}/quizzes`],
  });

  // Fetch student performance data
  const { data: performance = [], isLoading: isPerformanceLoading } = useQuery({
    queryKey: [`/api/classes/${classId}/performance`],
    enabled: isTeacher,
  });

  // Remove student from class mutation
  const removeStudentMutation = useMutation({
    mutationFn: async (studentId: number) => {
      return apiRequest("DELETE", `/api/classes/${classId}/students/${studentId}`);
    },
    onSuccess: () => {
      toast({
        title: "Student removed",
        description: "Student has been removed from the class.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/classes/${classId}/students`] });
      queryClient.invalidateQueries({ queryKey: [`/api/classes/${classId}/performance`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove student",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRemoveStudent = (studentId: number, studentName: string) => {
    if (confirm(`Are you sure you want to remove ${studentName} from this class?`)) {
      removeStudentMutation.mutate(studentId);
    }
  };

  // Get top and low performers
  const sortedPerformance = [...performance].sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));
  const topPerformers = sortedPerformance.slice(0, 3);
  const lowPerformers = sortedPerformance.slice(-3).reverse();

  if (isClassLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar 
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />
        <div className="flex-1 flex flex-col">
          <Header 
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
          />
          <main className="flex-1 p-6">
            <div className="space-y-6">
              <Skeleton className="h-8 w-64" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar 
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />
      
      <div className="flex-1 flex flex-col">
        <Header 
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />
        
        <main className="flex-1 p-6 ml-0 lg:ml-64">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Back Button and Class Header */}
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => setLocation("/classes")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Classes</span>
              </Button>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold">{classDetails?.name}</h1>
              <p className="text-gray-600">{classDetails?.subject} - {classDetails?.gradeLevel}</p>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{students.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{quizzes.length}</div>
                </CardContent>
              </Card>

              {isTeacher && (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {performance.length > 0 
                          ? `${Math.round(performance.reduce((acc, curr) => acc + (curr.averageScore || 0), 0) / performance.length)}%`
                          : "N/A"
                        }
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Completed Quizzes</CardTitle>
                      <Award className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {quizzes.filter(quiz => quiz.status === "completed").length}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Students Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Students ({students.length})</CardTitle>
                  {isTeacher && (
                    <Button 
                      onClick={() => setInviteDialog({
                        open: true,
                        classId: classId,
                        className: classDetails?.name || "Class"
                      })}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Invite Students
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isStudentsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[200px]" />
                          <Skeleton className="h-3 w-[150px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : students.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Student ID</TableHead>
                        {isTeacher && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student: any) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">
                            {student.firstName} {student.lastName}
                          </TableCell>
                          <TableCell>{student.email}</TableCell>
                          <TableCell>{student.id}</TableCell>
                          {isTeacher && (
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveStudent(student.id, `${student.firstName} ${student.lastName}`)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <UserX className="h-4 w-4 mr-1" />
                                Remove
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-8 text-gray-500">No students in this class yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Quizzes Section */}
            <Card>
              <CardHeader>
                <CardTitle>Quizzes ({quizzes.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {isQuizzesLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : quizzes.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quiz Title</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Scheduled Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quizzes.map((quiz: any) => (
                        <TableRow key={quiz.id}>
                          <TableCell className="font-medium">{quiz.title}</TableCell>
                          <TableCell>{quiz.duration} minutes</TableCell>
                          <TableCell>
                            <Badge variant={
                              quiz.status === "completed" ? "default" :
                              quiz.status === "active" ? "destructive" :
                              quiz.status === "scheduled" ? "secondary" : "outline"
                            }>
                              {quiz.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {quiz.scheduledAt ? new Date(quiz.scheduledAt).toLocaleDateString() : "Not scheduled"}
                          </TableCell>
                          <TableCell>
                            {quiz.status === "completed" && (
                              <Button variant="outline" size="sm" onClick={() => setLocation(`/quizzes/${quiz.id}/grade`)}>
                                Grade
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-8 text-gray-500">No quizzes for this class yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Performance Section - Only for Teachers */}
            {isTeacher && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Performers */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span>Top Performers</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isPerformanceLoading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : topPerformers.length > 0 ? (
                      <div className="space-y-3">
                        {topPerformers.map((performer: any, index: number) => (
                          <div key={performer.studentId} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full text-green-800 font-semibold text-sm">
                                #{index + 1}
                              </div>
                              <div>
                                <p className="font-medium">{performer.studentName}</p>
                                <p className="text-sm text-gray-600">{performer.quizzesCompleted} quizzes completed</p>
                              </div>
                            </div>
                            <Badge className="bg-green-100 text-green-800">
                              {Math.round(performer.averageScore || 0)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-8 text-gray-500">No performance data available yet.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Low Performers */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                      <span>Needs Improvement</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isPerformanceLoading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : lowPerformers.length > 0 ? (
                      <div className="space-y-3">
                        {lowPerformers.map((performer: any) => (
                          <div key={performer.studentId} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-full text-red-800 font-semibold text-sm">
                                !
                              </div>
                              <div>
                                <p className="font-medium">{performer.studentName}</p>
                                <p className="text-sm text-gray-600">{performer.quizzesCompleted} quizzes completed</p>
                              </div>
                            </div>
                            <Badge className="bg-red-100 text-red-800">
                              {Math.round(performer.averageScore || 0)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-8 text-gray-500">No performance data available yet.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Class invitation dialog */}
      <ClassInviteDialog 
        open={inviteDialog.open}
        onOpenChange={(open) => setInviteDialog(prev => ({ ...prev, open }))}
        classId={inviteDialog.classId!}
        className={inviteDialog.className}
      />
    </div>
  );
}