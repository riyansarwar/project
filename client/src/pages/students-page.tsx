import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
  SearchIcon, 
  UserPlus, 
  User, 
  Mail,
  Eye,
  UserCog
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

// New class schema
const classSchema = z.object({
  name: z.string().min(3, "Class name must be at least 3 characters"),
  subject: z.string().min(1, "Subject is required"),
  gradeLevel: z.string().min(1, "Grade level is required")
});

type ClassFormData = z.infer<typeof classSchema>;

// Add students to class schema
const addStudentsSchema = z.object({
  studentIds: z.array(z.number()).min(1, "Select at least one student")
});

type AddStudentsFormData = z.infer<typeof addStudentsSchema>;

export default function StudentsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filters, setFilters] = useState({
    class: "",
    performance: "",
    status: "",
    searchTerm: ""
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [isAddStudentsOpen, setIsAddStudentsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("students");
  const itemsPerPage = 5;
  const { toast } = useToast();
  
  const { user } = useAuth();

  // Fetch students
  const { data: students, isLoading } = useQuery({
    queryKey: ["/api/students"],
    select: (data: any[]) => {
      // Handle empty data or non-array data
      if (!data || !Array.isArray(data)) {
        return [];
      }
      
      let filteredStudents = [...data];
      
      if (filters.class) {
        // Filter by class (would need classIds for each student in a real implementation)
        // filteredStudents = filteredStudents.filter(student => student.classIds.includes(parseInt(filters.class)));
      }
      
      if (filters.performance) {
        // Filter by performance level
        switch(filters.performance) {
          case 'excellent':
            filteredStudents = filteredStudents.filter(student => (student.averageScore || 0) >= 90);
            break;
          case 'good':
            filteredStudents = filteredStudents.filter(student => 
              (student.averageScore || 0) >= 80 && (student.averageScore || 0) < 90
            );
            break;
          case 'average':
            filteredStudents = filteredStudents.filter(student => 
              (student.averageScore || 0) >= 70 && (student.averageScore || 0) < 80
            );
            break;
          case 'needsImprovement':
            filteredStudents = filteredStudents.filter(student => (student.averageScore || 0) < 70);
            break;
        }
      }
      
      if (filters.status) {
        // Filter by status
        filteredStudents = filteredStudents.filter(student => student.status === filters.status);
      }
      
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        filteredStudents = filteredStudents.filter(student => 
          student.firstName.toLowerCase().includes(term) || 
          student.lastName.toLowerCase().includes(term) ||
          student.email.toLowerCase().includes(term)
        );
      }
      
      // Add random performance data for demo (in real app, this would come from the API)
      return filteredStudents.map(student => ({
        ...student,
        averageScore: student.averageScore || Math.floor(Math.random() * 30) + 65, // Random score between 65-95
        quizzesTaken: student.quizzesTaken || Math.floor(Math.random() * 5) + 7, // Random between 7-12
        totalQuizzes: student.totalQuizzes || 12,
        status: student.status || (Math.random() > 0.2 ? 'active' : 'inactive')
      }));
    }
  });

  // Fetch classes
  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ["/api/classes"],
    select: (data) => {
      // Handle empty data or non-array data
      if (!data || !Array.isArray(data)) {
        return [];
      }
      return data;
    }
  });

  // Create class mutation
  const createClassMutation = useMutation({
    mutationFn: async (data: ClassFormData) => {
      return apiRequest("POST", "/api/classes", data);
    },
    onSuccess: () => {
      toast({
        title: "Class created",
        description: "New class has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create class",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add students to class mutation
  const addStudentsToClassMutation = useMutation({
    mutationFn: async ({ classId, data }: { classId: number; data: AddStudentsFormData }) => {
      return apiRequest("POST", `/api/classes/${classId}/students`, data);
    },
    onSuccess: () => {
      toast({
        title: "Students added",
        description: "Students have been added to the class successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      setIsAddStudentsOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add students",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form for creating a new class
  const form = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: "",
      subject: "",
      gradeLevel: ""
    }
  });

  // Form for adding students to a class
  const addStudentsForm = useForm<AddStudentsFormData>({
    resolver: zodResolver(addStudentsSchema),
    defaultValues: {
      studentIds: []
    }
  });

  const onSubmit = (data: ClassFormData) => {
    createClassMutation.mutate(data);
  };

  const onAddStudents = (data: AddStudentsFormData) => {
    if (selectedClass) {
      addStudentsToClassMutation.mutate({ classId: selectedClass.id, data });
    }
  };

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleAddStudentsToClass = (classItem: any) => {
    setSelectedClass(classItem);
    setIsAddStudentsOpen(true);
    addStudentsForm.reset();
  };

  // Calculate pagination
  const totalStudents = students?.length || 0;
  const totalPages = Math.ceil(totalStudents / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStudents = students?.slice(startIndex, endIndex) || [];

  // Helper function to get initials for avatar
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  // Helper function to get color based on performance
  const getPerformanceColor = (score: number) => {
    if (score >= 90) return "bg-green-500";
    if (score >= 80) return "bg-blue-500";
    if (score >= 70) return "bg-yellow-500";
    return "bg-red-500";
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
                <h1 className="text-2xl font-bold text-gray-900">Students Management</h1>
                <p className="text-gray-600">View and manage your students and their performance</p>
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="students">Students</TabsTrigger>
                <TabsTrigger value="classes">Classes</TabsTrigger>
              </TabsList>
              
              <TabsContent value="students" className="space-y-4">
                {/* Filter and Search */}
                <Card>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-1">Class</Label>
                        <Select onValueChange={(value) => handleFilterChange('class', value)} value={filters.class}>
                          <SelectTrigger>
                            <SelectValue placeholder="All Classes" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Classes</SelectItem>
                            {classes && classes.map((classItem: any) => (
                              <SelectItem key={classItem.id} value={classItem.id.toString()}>
                                {classItem.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-1">Performance</Label>
                        <Select onValueChange={(value) => handleFilterChange('performance', value)} value={filters.performance}>
                          <SelectTrigger>
                            <SelectValue placeholder="All Performance" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Performance</SelectItem>
                            <SelectItem value="excellent">Excellent (90%+)</SelectItem>
                            <SelectItem value="good">Good (80-89%)</SelectItem>
                            <SelectItem value="average">Average (70-79%)</SelectItem>
                            <SelectItem value="needsImprovement">Needs Improvement (less than 70%)</SelectItem>
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
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-1">Search</Label>
                        <div className="relative">
                          <Input
                            placeholder="Search students..."
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
                
                {/* Students List */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  {isLoading ? (
                    <div className="p-6 space-y-6">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="ml-4 space-y-2">
                            <Skeleton className="h-4 w-[250px]" />
                            <Skeleton className="h-4 w-[200px]" />
                          </div>
                          <div className="ml-auto">
                            <Skeleton className="h-8 w-24" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>ID</TableHead>
                            <TableHead>Class</TableHead>
                            <TableHead>Performance</TableHead>
                            <TableHead>Quizzes Taken</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedStudents.length > 0 ? (
                            paginatedStudents.map((student) => (
                              <TableRow key={student.id}>
                                <TableCell>
                                  <div className="flex items-center">
                                    <Avatar className="h-10 w-10">
                                      <AvatarFallback className="bg-gray-200 text-gray-700">
                                        {getInitials(student.firstName, student.lastName)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="ml-4">
                                      <div className="font-medium">
                                        {student.firstName} {student.lastName}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {student.email}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>ST-{student.id.toString().padStart(3, '0')}</TableCell>
                                <TableCell>
                                  {classes && classes.find((c: any) => c.id === student.classId)?.name || "Unassigned"}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <Progress 
                                      value={student.averageScore} 
                                      className={`w-16 mr-2 h-2.5 ${getPerformanceColor(student.averageScore)}`}
                                    />
                                    <span className="text-sm font-medium">{student.averageScore}%</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {student.quizzesTaken}/{student.totalQuizzes}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={student.status === "active" 
                                      ? "bg-green-100 text-green-800" 
                                      : "bg-yellow-100 text-yellow-800"}
                                  >
                                    {student.status === "active" ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost">
                                    <Eye className="h-4 w-4 mr-1" />
                                    View Details
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} className="h-24 text-center">
                                No students found. Try adjusting your filters or add new students.
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
                                <span className="font-medium">{Math.min(endIndex, totalStudents)}</span> of{" "}
                                <span className="font-medium">{totalStudents}</span> students
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
              </TabsContent>
              
              <TabsContent value="classes" className="space-y-4">
                {/* Classes List */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Class Name</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Grade Level</TableHead>
                        <TableHead>Students</TableHead>
                        <TableHead>Avg. Performance</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classes && classes.length > 0 ? (
                        classes.map((classItem: any) => {
                          // Get students for this class (in a real implementation)
                          const classStudents = [];
                          const avgPerformance = Math.floor(Math.random() * 20) + 70; // Random for demo
                          
                          return (
                            <TableRow key={classItem.id}>
                              <TableCell className="font-medium">{classItem.name}</TableCell>
                              <TableCell>{classItem.subject}</TableCell>
                              <TableCell>{classItem.gradeLevel}</TableCell>
                              <TableCell>{classStudents.length || "0"}</TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <Progress 
                                    value={avgPerformance} 
                                    className={`w-16 mr-2 h-2.5 ${getPerformanceColor(avgPerformance)}`}
                                  />
                                  <span className="text-sm font-medium">{avgPerformance}%</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="ghost"
                                  onClick={() => handleAddStudentsToClass(classItem)}
                                >
                                  <UserPlus className="h-4 w-4 mr-1" />
                                  Add Students
                                </Button>
                                <Button variant="ghost">
                                  <UserCog className="h-4 w-4 mr-1" />
                                  Manage
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            No classes found. Create a new class to get started.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
            
            {/* Add Students to Class Dialog */}
            <Dialog open={isAddStudentsOpen} onOpenChange={setIsAddStudentsOpen}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add Students to Class</DialogTitle>
                  <DialogDescription>
                    {selectedClass && (
                      <span>Select students to add to {selectedClass.name} class.</span>
                    )}
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...addStudentsForm}>
                  <form onSubmit={addStudentsForm.handleSubmit(onAddStudents)} className="space-y-4">
                    <FormField
                      control={addStudentsForm.control}
                      name="studentIds"
                      render={() => (
                        <FormItem>
                          <div className="border rounded-md">
                            <ScrollArea className="h-60">
                              <div className="p-4 space-y-4">
                                {students && students.length > 0 ? (
                                  students.map((student) => (
                                    <div key={student.id} className="flex items-center">
                                      <Checkbox
                                        id={`student-${student.id}`}
                                        onCheckedChange={(checked) => {
                                          const currentIds = addStudentsForm.getValues("studentIds");
                                          if (checked) {
                                            addStudentsForm.setValue("studentIds", [...currentIds, student.id]);
                                          } else {
                                            addStudentsForm.setValue(
                                              "studentIds",
                                              currentIds.filter(id => id !== student.id)
                                            );
                                          }
                                        }}
                                      />
                                      <div className="ml-2 flex items-center">
                                        <Avatar className="h-8 w-8 mr-2">
                                          <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                                            {getInitials(student.firstName, student.lastName)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <Label htmlFor={`student-${student.id}`}>
                                          {student.firstName} {student.lastName}
                                        </Label>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <p className="py-4 text-center text-gray-500">
                                    No students available.
                                  </p>
                                )}
                              </div>
                            </ScrollArea>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button type="submit" disabled={addStudentsToClassMutation.isPending}>
                        {addStudentsToClassMutation.isPending ? "Adding..." : "Add Students"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}
