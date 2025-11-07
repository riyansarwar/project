import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import Header from "@/components/ui/shared/header";
import Sidebar from "@/components/ui/shared/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SearchIcon, Calendar as CalendarIcon, FileText, PlusIcon, ClipboardEdit, XCircle, CheckCircle, BarChart } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

// Quiz schema for the form
// Make questionIds optional so edit dialog doesn't fail validation when untouched
const quizSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  classId: z.number().min(1, "Class selection is required"),
  duration: z.number().int().positive("Duration must be a positive number"),
  scheduledAt: z.date().optional(),
  questionIds: z.array(z.number()).optional()
});

type QuizFormData = z.infer<typeof quizSchema>;

// Remove assignment functionality since quizzes are automatically assigned to all students in the selected class

export default function QuizzesPage() {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filters, setFilters] = useState({
    classId: "",
    status: "",
    dateRange: "",
    searchTerm: ""
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [isEditQuestionDialogOpen, setIsEditQuestionDialogOpen] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [questionIdsChanged, setQuestionIdsChanged] = useState<boolean>(false);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [questionFilters, setQuestionFilters] = useState({
    chapter: "", // What's stored as 'subject' in DB
    difficulty: "",
    searchTerm: ""
  });
  const itemsPerPage = 5;
  const { toast } = useToast();
  
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";

  // Stable chapter options for filters with fallback to all questions
  const { data: chapterOptions = [] } = useQuery({ queryKey: ["/api/questions/chapters"], enabled: isTeacher });
  const { data: allQuestionsForChapters = [] } = useQuery({ queryKey: ["/api/questions", "all"], enabled: isTeacher });
  const effectiveChapters: string[] = (chapterOptions && chapterOptions.length > 0)
    ? chapterOptions
    : Array.from(new Set((allQuestionsForChapters || []).flatMap((q: any) => [q?.chapter, q?.subject].filter(Boolean))))
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0)
        .sort((a: string, b: string) => a.localeCompare(b));

  // Fetch classes for the teacher
  const { data: classes = [] } = useQuery({
    queryKey: ["/api/classes/teacher"],
  });

  // Fetch quizzes
  const { data: quizzes, isLoading } = useQuery({
    queryKey: ["/api/quizzes"],
    select: (data) => {
      let filteredQuizzes = [...data];
      
      if (filters.classId && filters.classId !== "all") {
        filteredQuizzes = filteredQuizzes.filter(quiz => quiz.classId?.toString() === filters.classId);
      }
      
      if (filters.status) {
        filteredQuizzes = filteredQuizzes.filter(quiz => quiz.status === filters.status);
      }
      
      if (filters.dateRange) {
        const now = new Date();
        let startDate: Date;
        
        switch(filters.dateRange) {
          case 'thisWeek':
            startDate = new Date(now.setDate(now.getDate() - now.getDay()));
            break;
          case 'thisMonth':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'lastMonth':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            break;
          default:
            startDate = new Date(0); // All time
        }
        
        filteredQuizzes = filteredQuizzes.filter(quiz => {
          return quiz.scheduledAt && new Date(quiz.scheduledAt) >= startDate;
        });
      }
      
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        filteredQuizzes = filteredQuizzes.filter(quiz => {
          const matchesTitle = quiz.title.toLowerCase().includes(term);
          const matchesClass = classes.find((c: any) => c.id === quiz.classId)?.name.toLowerCase().includes(term) || false;
          return matchesTitle || matchesClass;
        });
      }
      
      return filteredQuizzes;
    }
  });

  // Fetch questions for creating quizzes
  const { data: questions } = useQuery({
    queryKey: ["/api/questions"],
    enabled: isTeacher
  });

  // Fetch filtered questions for quiz creation
  const { data: filteredQuestions = [] } = useQuery({
    queryKey: ["/api/questions", questionFilters],
    select: (data) => {
      if (!data) return [];
      
      let filtered = [...data];
      
      if (questionFilters.chapter && questionFilters.chapter !== "all") {
        filtered = filtered.filter(q => {
          const ch = (q.chapter || "").toLowerCase();
          const subj = (q.subject || "").toLowerCase();
          const term = questionFilters.chapter.toLowerCase();
          return ch.includes(term) || subj.includes(term);
        });
      }
      
      if (questionFilters.difficulty && questionFilters.difficulty !== "all") {
        filtered = filtered.filter(q => q.difficulty === questionFilters.difficulty);
      }
      
      if (questionFilters.searchTerm) {
        const term = questionFilters.searchTerm.toLowerCase();
        filtered = filtered.filter(q => 
          q.content.toLowerCase().includes(term) || 
          q.subject.toLowerCase().includes(term)
        );
      }
      
      return filtered;
    },
    enabled: isTeacher
  });

  // Create quiz mutation
  const createQuizMutation = useMutation({
    mutationFn: async (data: QuizFormData) => {
      return apiRequest("POST", "/api/quizzes", data);
    },
    onSuccess: () => {
      toast({
        title: "Quiz created",
        description: "Your quiz has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
      form.reset();
      setIsQuestionDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create quiz",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update quiz status mutation
  const updateQuizStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PUT", `/api/quizzes/${id}`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Quiz updated",
        description: "Quiz status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update quiz",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete quiz mutation
  const deleteQuizMutation = useMutation({
    mutationFn: async (quizId: number) => {
      return apiRequest("DELETE", `/api/quizzes/${quizId}`);
    },
    onSuccess: () => {
      toast({
        title: "Quiz deleted",
        description: "Quiz has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete quiz",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update quiz mutation
  const updateQuizMutation = useMutation({
    mutationFn: async ({ quizId, data }: { quizId: number; data: any }) => {
      return apiRequest("PUT", `/api/quizzes/${quizId}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Quiz updated",
        description: "Quiz has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
      setIsEditDialogOpen(false);
      setSelectedQuiz(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update quiz",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Start quiz mutation (for students)
  const startQuizMutation = useMutation({
    mutationFn: async (studentQuizId: number) => {
      return apiRequest("POST", `/api/student-quizzes/${studentQuizId}/start`);
    },
    onSuccess: async (response, studentQuizId) => {
      toast({
        title: "Quiz started",
        description: "Good luck with your quiz!",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
      
      // Get the quiz ID from the studentQuizId
      const student = await response.json();
      setLocation(`/quizzes/${student.quizId}/take`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start quiz",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form for creating quizzes
  const form = useForm<QuizFormData>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: "",
      classId: 0,
      duration: 30,
      questionIds: []
    }
  });

  // Form functionality for quiz management

  const onSubmit = (data: QuizFormData) => {
    createQuizMutation.mutate(data);
  };

  const handleQuestionSelect = (checked: boolean, questionId: number) => {
    if (checked) {
      setSelectedQuestions(prev => [...prev, questionId]);
      form.setValue("questionIds", [...selectedQuestions, questionId]);
    } else {
      const updated = selectedQuestions.filter(id => id !== questionId);
      setSelectedQuestions(updated);
      form.setValue("questionIds", updated);
    }
    setQuestionIdsChanged(true);
  };

  const handleFilterChange = (name: string, value: string) => {
    // For "all" values, set to empty string to clear the filter
    const filterValue = value === "all" ? "" : value;
    setFilters(prev => ({ ...prev, [name]: filterValue }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Keep mutation for direct starts if needed elsewhere, but in the list we navigate to Take page
  const startQuiz = (studentQuizId: number) => {
    startQuizMutation.mutate(studentQuizId);
  };

  const handleEditQuiz = async (quiz: any) => {
    setSelectedQuiz(quiz);
    setIsEditDialogOpen(true);
    
    // Load default values first (so form is populated immediately)
    form.reset({
      title: quiz.title,
      classId: quiz.classId || 0,
      duration: quiz.duration,
      scheduledAt: quiz.scheduledAt ? new Date(quiz.scheduledAt) : undefined,
      questionIds: []
    });
    setQuestionIdsChanged(false);
    
    // Fetch the current questions for this quiz (with auth + cookies)
    try {
      const response = await apiRequest("GET", `/api/quizzes/${quiz.id}/questions`);
      const currentQuestions = await response.json();
      const questionIds = currentQuestions.map((q: any) => q.id);
      
      setSelectedQuestions(questionIds);
      
      // Update the form with the loaded questions
      form.setValue("questionIds", questionIds);
    } catch (error) {
      // Preserve any existing selection instead of clearing on failure
      console.warn("Could not load questions, preserving current selection:", error);
      // Server-side route guards prevent accidental clearing when questionIds is omitted
    }
  };

  const handleDeleteQuiz = (quizId: number) => {
    if (confirm("Are you sure you want to delete this quiz? This action cannot be undone.")) {
      deleteQuizMutation.mutate(quizId);
    }
  };

  const handleCancelQuiz = (id: number) => {
    if (window.confirm("Are you sure you want to cancel this quiz?")) {
      updateQuizStatusMutation.mutate({ id, status: "cancelled" });
    }
  };

  const handleEndQuiz = (id: number) => {
    if (window.confirm("Are you sure you want to end this quiz now?")) {
      updateQuizStatusMutation.mutate({ id, status: "completed" });
    }
  };

  // Calculate pagination
  const totalQuizzes = quizzes?.length || 0;
  const totalPages = Math.ceil(totalQuizzes / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedQuizzes = quizzes?.slice(startIndex, endIndex) || [];

  // Helper function to get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Draft</Badge>;
      case "scheduled":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Scheduled</Badge>;
      case "active":
        return <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Completed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-100 text-red-800">Cancelled</Badge>;
      case "assigned":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Assigned</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        mobileMenuOpen={mobileMenuOpen} 
        setMobileMenuOpen={setMobileMenuOpen} 
      />
      
      <div className="flex-1 flex">
        <Sidebar 
          mobileMenuOpen={mobileMenuOpen} 
          setMobileMenuOpen={setMobileMenuOpen} 
        />
        
        <main className="flex-1 ml-0 md:ml-64 bg-gray-50 pt-16 min-h-screen">
          <div className="p-4 md:p-6">
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Quiz Management</h1>
                <p className="text-gray-600">
                  {isTeacher 
                    ? "Create, schedule and analyze quizzes for your classes" 
                    : "View and take your assigned quizzes"}
                </p>
              </div>
              
              {isTeacher && (
                <Button 
                  className="mt-4 md:mt-0"
                  onClick={() => {
                    form.reset();
                    setSelectedQuestions([]);
                    setIsQuestionDialogOpen(true);
                  }}
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Create New Quiz
                </Button>
              )}
            </div>
            
            {/* Quiz Status Cards for teachers */}
            {isTeacher && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Draft</p>
                      <h3 className="text-2xl font-bold">
                        {quizzes?.filter(q => q.status === "draft").length || 0}
                      </h3>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                      <FileText className="h-6 w-6" />
                    </div>
                  </div>
                </Card>
                
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Scheduled</p>
                      <h3 className="text-2xl font-bold">
                        {quizzes?.filter(q => q.status === "scheduled").length || 0}
                      </h3>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <CalendarIcon className="h-6 w-6" />
                    </div>
                  </div>
                </Card>
                
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Active</p>
                      <h3 className="text-2xl font-bold">
                        {quizzes?.filter(q => q.status === "active").length || 0}
                      </h3>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <CheckCircle className="h-6 w-6" />
                    </div>
                  </div>
                </Card>
                
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Completed</p>
                      <h3 className="text-2xl font-bold">
                        {quizzes?.filter(q => q.status === "completed").length || 0}
                      </h3>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                      <BarChart className="h-6 w-6" />
                    </div>
                  </div>
                </Card>
              </div>
            )}
            
            {/* Create Quiz Dialog */}
            <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
              <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                  <DialogTitle>Create New Quiz</DialogTitle>
                  <DialogDescription>
                    Fill in the details below to create a new quiz.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quiz Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter quiz title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="classId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Class</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a class" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {classes?.map((cls: any) => (
                                <SelectItem key={cls.id} value={cls.id.toString()}>
                                  {cls.name} - {cls.subject}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration (minutes)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                {...field}
                                onChange={e => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="scheduledAt"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Schedule Date & Time (Optional)</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className="pl-3 text-left font-normal"
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP p")
                                    ) : (
                                      <span>Pick date and time</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <div className="p-3 border-b">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={(date) => {
                                      if (date) {
                                        const currentTime = field.value || new Date();
                                        date.setHours(currentTime.getHours(), currentTime.getMinutes());
                                        field.onChange(date);
                                      } else {
                                        field.onChange(date);
                                      }
                                    }}
                                    disabled={(date) => date < new Date().setHours(0, 0, 0, 0)}
                                    initialFocus
                                  />
                                </div>
                                <div className="p-3 border-t">
                                  <div className="flex items-center space-x-2">
                                    <Label htmlFor="time">Time:</Label>
                                    <Input
                                      id="time"
                                      type="time"
                                      value={field.value ? format(field.value, "HH:mm") : ""}
                                      onChange={(e) => {
                                        const [hours, minutes] = e.target.value.split(':');
                                        if (field.value) {
                                          const newDate = new Date(field.value);
                                          newDate.setHours(parseInt(hours), parseInt(minutes));
                                          field.onChange(newDate);
                                        } else {
                                          const newDate = new Date();
                                          newDate.setHours(parseInt(hours), parseInt(minutes));
                                          field.onChange(newDate);
                                        }
                                      }}
                                      className="w-32"
                                    />
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                            <FormDescription>
                              If not selected, quiz will be saved as draft.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="questionIds"
                      render={() => (
                        <FormItem>
                          <FormLabel>Select Questions</FormLabel>
                          
                          {/* Question Filters */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                            <div>
                              <Label htmlFor="chapter-filter">Filter by Chapter</Label>
                              <Select 
                                value={questionFilters.chapter} 
                                onValueChange={(value) => setQuestionFilters(prev => ({ ...prev, chapter: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="All Chapters" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Chapters</SelectItem>
                                  {effectiveChapters.map((ch: string) => (
                                    <SelectItem key={ch} value={ch}>{ch}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label htmlFor="difficulty-filter">Filter by Difficulty</Label>
                              <Select 
                                value={questionFilters.difficulty} 
                                onValueChange={(value) => setQuestionFilters(prev => ({ ...prev, difficulty: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="All Difficulties" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Difficulties</SelectItem>
                                  <SelectItem value="Easy">Easy</SelectItem>
                                  <SelectItem value="Medium">Medium</SelectItem>
                                  <SelectItem value="Hard">Hard</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label htmlFor="search-filter">Search Questions</Label>
                              <div className="relative">
                                <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Search question content..."
                                  value={questionFilters.searchTerm}
                                  onChange={(e) => setQuestionFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                                  className="pl-8"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-2 border rounded-md">
                            <ScrollArea className="h-60">
                              <div className="p-4 space-y-4">
                                {filteredQuestions && filteredQuestions.length > 0 ? (
                                  filteredQuestions.map((question) => (
                                    <div key={question.id} className="flex items-start">
                                      <Checkbox
                                        id={`question-${question.id}`}
                                        checked={selectedQuestions.includes(question.id)}
                                        onCheckedChange={(checked) => 
                                          handleQuestionSelect(Boolean(checked), question.id)
                                        }
                                        className="mt-1"
                                      />
                                      <div className="ml-2">
                                        <Label 
                                          htmlFor={`question-${question.id}`}
                                          className="font-medium text-sm"
                                        >
                                          {question.content}
                                        </Label>
                                        <p className="text-xs text-gray-500">
                                          OOP C++ • {question.subject} • {question.gradeLevel} • 
                                          {question.type === "Conceptual" ? " Short Answer" : 
                                           question.type === "Code-Based" ? " Short Answer" : 
                                           " Short Answer"}
                                        </p>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <p className="py-4 text-center text-gray-500">
                                    {questions && questions.length > 0 
                                      ? "No questions match your filters. Try adjusting the search criteria."
                                      : "No questions available. Create questions first."
                                    }
                                  </p>
                                )}
                              </div>
                            </ScrollArea>
                          </div>
                          <FormDescription>
                            Select questions to include in this quiz. You can add multiple questions.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button type="submit" disabled={createQuizMutation.isPending}>
                        {createQuizMutation.isPending ? "Creating..." : "Create Quiz"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            
            {/* Edit Quiz Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                  <DialogTitle>Edit Quiz</DialogTitle>
                  <DialogDescription>
                    Update quiz details and questions.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => {
                    if (selectedQuiz) {
                      // Only include questionIds if they were changed, to avoid resetting existing ones
                      const submitData: any = { ...data };
                      if (questionIdsChanged) {
                        submitData.questionIds = selectedQuestions;
                      }
                      updateQuizMutation.mutate({ quizId: selectedQuiz.id, data: submitData });
                    }
                  })} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quiz Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter quiz title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="classId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Class</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a class" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {classes?.map((cls: any) => (
                                <SelectItem key={cls.id} value={cls.id.toString()}>
                                  {cls.name} - {cls.subject}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration (minutes)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="30"
                                {...field}
                                onChange={e => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="scheduledAt"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Schedule Date & Time (Optional)</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className="pl-3 text-left font-normal"
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP p")
                                    ) : (
                                      <span>Pick date and time</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <div className="p-3 border-b">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={(date) => {
                                      if (date) {
                                        const currentTime = field.value || new Date();
                                        date.setHours(currentTime.getHours(), currentTime.getMinutes());
                                        field.onChange(date);
                                      } else {
                                        field.onChange(date);
                                      }
                                    }}
                                    disabled={(date) => date < new Date().setHours(0, 0, 0, 0)}
                                    initialFocus
                                  />
                                </div>
                                <div className="p-3 border-t">
                                  <div className="flex items-center space-x-2">
                                    <Label htmlFor="edit-time">Time:</Label>
                                    <Input
                                      id="edit-time"
                                      type="time"
                                      value={field.value ? format(field.value, "HH:mm") : ""}
                                      onChange={(e) => {
                                        const [hours, minutes] = e.target.value.split(':');
                                        if (field.value) {
                                          const newDate = new Date(field.value);
                                          newDate.setHours(parseInt(hours), parseInt(minutes));
                                          field.onChange(newDate);
                                        } else {
                                          const newDate = new Date();
                                          newDate.setHours(parseInt(hours), parseInt(minutes));
                                          field.onChange(newDate);
                                        }
                                      }}
                                      className="w-32"
                                    />
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                            <FormDescription>
                              If not selected, quiz will remain as draft.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="questionIds"
                      render={() => (
                        <FormItem>
                          <FormLabel>Update Questions ({selectedQuestions.length} selected)</FormLabel>
                          
                          <div className="border rounded-md p-4 max-h-64 overflow-y-auto space-y-2">
                            <div className="text-sm text-gray-600 mb-2">
                              Current questions: {selectedQuestions.length}
                            </div>
                            
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setIsEditQuestionDialogOpen(true)}
                            >
                              <PlusIcon className="h-4 w-4 mr-2" />
                              Change Questions
                            </Button>
                          </div>
                          
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button type="submit" disabled={updateQuizMutation.isPending}>
                        {updateQuizMutation.isPending ? "Updating..." : "Update Quiz"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            
            {/* Edit Question Selection Dialog - Separate from create quiz */}
            <Dialog open={isEditQuestionDialogOpen} onOpenChange={setIsEditQuestionDialogOpen}>
              <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                  <DialogTitle>Select Questions for Quiz</DialogTitle>
                  <DialogDescription>
                    Choose which questions to include in your quiz.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Question Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label>Filter by Chapter</Label>
                      <Select 
                        value={questionFilters.chapter} 
                        onValueChange={(value) => setQuestionFilters(prev => ({ ...prev, chapter: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Chapters" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Chapters</SelectItem>
                          <SelectItem value="Introduction to OOP">Introduction to OOP</SelectItem>
                          <SelectItem value="C++ Basics">C++ Basics</SelectItem>
                          <SelectItem value="Classes and Objects">Classes and Objects</SelectItem>
                          <SelectItem value="Constructors and Destructors">Constructors and Destructors</SelectItem>
                          <SelectItem value="Inheritance">Inheritance</SelectItem>
                          <SelectItem value="Polymorphism">Polymorphism</SelectItem>
                          <SelectItem value="Friend Functions & Operator Overloading">Friend Functions & Operator Overloading</SelectItem>
                          <SelectItem value="Encapsulation and Abstraction">Encapsulation and Abstraction</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Filter by Difficulty</Label>
                      <Select 
                        value={questionFilters.difficulty} 
                        onValueChange={(value) => setQuestionFilters(prev => ({ ...prev, difficulty: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Difficulties" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Difficulties</SelectItem>
                          <SelectItem value="Easy">Easy</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Search Questions</Label>
                      <div className="relative">
                        <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search question content..."
                          value={questionFilters.searchTerm}
                          onChange={(e) => setQuestionFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                          className="pl-8"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="border rounded-md">
                    <ScrollArea className="h-60">
                      <div className="p-4 space-y-4">
                        {filteredQuestions && filteredQuestions.length > 0 ? (
                          filteredQuestions.map((question) => (
                            <div key={question.id} className="flex items-start space-x-3 p-3 border rounded hover:bg-gray-50">
                              <Checkbox
                                id={`edit-question-${question.id}`}
                                checked={selectedQuestions.includes(question.id)}
                                onCheckedChange={(checked) => 
                                  handleQuestionSelect(Boolean(checked), question.id)
                                }
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <Label 
                                  htmlFor={`edit-question-${question.id}`}
                                  className="font-medium text-sm cursor-pointer"
                                >
                                  {question.content}
                                </Label>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {question.subject}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {question.type || "Short Answer"}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {question.difficulty || "Medium"}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center text-gray-500 py-8">
                            No questions available. Create questions first.
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {selectedQuestions.length} question(s) selected
                    </span>
                    <div className="space-x-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setIsEditQuestionDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => {
                          setIsEditQuestionDialogOpen(false);
                        }}
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            {/* Filter and Search */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">Class</Label>
                    <Select onValueChange={(value) => handleFilterChange('classId', value)} value={filters.classId}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {classes.map((classItem: any) => (
                          <SelectItem key={classItem.id} value={classItem.id.toString()}>
                            {classItem.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">Status</Label>
                    <Select onValueChange={(value) => handleFilterChange('status', value)} value={filters.status}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        {!isTeacher && (
                          <>
                            <SelectItem value="assigned">Assigned</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">Date Range</Label>
                    <Select onValueChange={(value) => handleFilterChange('dateRange', value)} value={filters.dateRange}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="thisWeek">This Week</SelectItem>
                        <SelectItem value="thisMonth">This Month</SelectItem>
                        <SelectItem value="lastMonth">Last Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">Search</Label>
                    <div className="relative">
                      <Input
                        placeholder="Search quizzes..."
                        value={filters.searchTerm}
                        onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                        className="pl-10"
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Quiz List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div>
                        <Skeleton className="h-6 w-[250px] mb-2" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                      <div className="flex space-x-2">
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quiz Name</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedQuizzes.length > 0 ? (
                        paginatedQuizzes.map((quiz) => (
                          <TableRow key={quiz.id}>
                            <TableCell className="font-medium">{quiz.title}</TableCell>
                            <TableCell>{quiz.subject}</TableCell>
                            <TableCell>{quiz.gradeLevel}</TableCell>
                            <TableCell>{quiz.duration} mins</TableCell>
                            <TableCell>
                              {quiz.scheduledAt ? 
                                format(new Date(quiz.scheduledAt), "PPP, p") : 
                                "Not scheduled"}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(quiz.status)}
                              {!isTeacher && quiz.studentStatus && (
                                <div className="mt-1">
                                  {getStatusBadge(quiz.studentStatus)}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isTeacher ? (
                                <>
                                  {quiz.status === "draft" && (
                                    <>
                                      <Button 
                                        variant="ghost" 
                                        onClick={() => handleEditQuiz(quiz)}
                                      >
                                        <ClipboardEdit className="h-4 w-4 mr-1" />
                                        Edit
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        onClick={() => handleDeleteQuiz(quiz.id)}
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Delete
                                      </Button>
                                    </>
                                  )}
                                  
                                  {quiz.status === "scheduled" && (
                                    <>
                                      <Button 
                                        variant="ghost" 
                                        className="text-red-600"
                                        onClick={() => handleCancelQuiz(quiz.id)}
                                      >
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Cancel
                                      </Button>
                                      <Button variant="ghost" onClick={() => setLocation(`/quizzes/${quiz.id}/monitor`)}>
                                        <BarChart className="h-4 w-4 mr-1" />
                                        Monitor
                                      </Button>
                                    </>
                                  )}
                                  
                                  {quiz.status === "active" && (
                                    <>
                                      <Button 
                                        variant="ghost" 
                                        className="text-red-600"
                                        onClick={() => handleEndQuiz(quiz.id)}
                                      >
                                        End Now
                                      </Button>
                                      <Button variant="ghost" onClick={() => setLocation(`/quizzes/${quiz.id}/monitor`)}>
                                        <BarChart className="h-4 w-4 mr-1" />
                                        Monitor
                                      </Button>
                                    </>
                                  )}
                                  
                                  {quiz.status === "completed" && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        onClick={() => setLocation(`/quizzes/${quiz.id}/grade`)}
                                        className="text-blue-600 hover:text-blue-700"
                                      >
                                        <FileText className="h-4 w-4 mr-1" />
                                        Grade
                                      </Button>
                                      <Button variant="ghost" onClick={() => setLocation(`/quizzes/${quiz.id}/monitor`)}>
                                        <BarChart className="h-4 w-4 mr-1" />
                                        Monitor
                                      </Button>
                                    </>
                                  )}
                                </>
                              ) : (
                                <>
                                  {quiz.studentStatus === "assigned" && (
                                    ((quiz.status === "active") || (quiz.scheduledAt && new Date(quiz.scheduledAt) <= new Date())) ? (
                                      <Button 
                                        variant="ghost"
                                        onClick={() => setLocation(`/quizzes/${quiz.id}/take`)}
                                      >
                                        Attempt
                                      </Button>
                                    ) : (
                                      <Button variant="ghost" disabled>
                                        Starts at {quiz.scheduledAt ? format(new Date(quiz.scheduledAt), "PPP, p") : "TBD"}
                                      </Button>
                                    )
                                  )}
                                  
                                  {quiz.studentStatus === "in_progress" && (
                                    <Button 
                                      variant="ghost"
                                      onClick={() => setLocation(`/quizzes/${quiz.quizId}/take`)}
                                    >
                                      Continue
                                    </Button>
                                  )}
                                  
                                  {quiz.studentStatus === "completed" && (
                                    <Button 
                                      variant="ghost"
                                      onClick={() => setLocation(`/quizzes/${quiz.quizId}/take`)}
                                    >
                                      View Results
                                    </Button>
                                  )}
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center">
                            No quizzes found. {isTeacher ? "Create a new quiz to get started." : "You don't have any quizzes assigned."}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  
                  {totalPages > 1 && (
                    <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
                      <div className="flex-1 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
                            <span className="font-medium">{Math.min(endIndex, totalQuizzes)}</span> of{" "}
                            <span className="font-medium">{totalQuizzes}</span> quizzes
                          </p>
                        </div>
                        
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious 
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                isActive={currentPage > 1}
                              />
                            </PaginationItem>
                            
                            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                              const page = i + 1;
                              return (
                                <PaginationItem key={page}>
                                  <PaginationLink
                                    onClick={() => setCurrentPage(page)}
                                    isActive={currentPage === page}
                                  >
                                    {page}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            })}
                            
                            {totalPages > 5 && (
                              <>
                                <PaginationItem>
                                  <PaginationEllipsis />
                                </PaginationItem>
                                <PaginationItem>
                                  <PaginationLink
                                    onClick={() => setCurrentPage(totalPages)}
                                    isActive={currentPage === totalPages}
                                  >
                                    {totalPages}
                                  </PaginationLink>
                                </PaginationItem>
                              </>
                            )}
                            
                            <PaginationItem>
                              <PaginationNext 
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                isActive={currentPage < totalPages}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
