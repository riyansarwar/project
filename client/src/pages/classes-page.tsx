import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { School, GraduationCap, Users, Plus, Edit, Trash, FileText, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ClassInviteDialog } from "@/components/class-invite-dialog";
import { useLocation } from "wouter";

import Header from "@/components/ui/shared/header";
import Sidebar from "@/components/ui/shared/sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { apiRequest } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

// Schema for creating or updating a class
const classSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  subject: z.string().min(1, "Subject is required"),
  gradeLevel: z.string().min(1, "Grade level is required"),
});

type ClassFormData = z.infer<typeof classSchema>;

// State for invite dialog
interface InviteDialogState {
  open: boolean;
  classId: number | null;
  className: string;
}

// State for editing
interface EditingState {
  isOpen: boolean;
  classId: number | null;
  initialData: ClassFormData | null;
}

export default function ClassesPage() {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EditingState>({
    isOpen: false,
    classId: null,
    initialData: null
  });
  const [inviteDialog, setInviteDialog] = useState<InviteDialogState>({
    open: false,
    classId: null,
    className: ""
  });
  const { user } = useAuth();
  const { toast } = useToast();

  const isTeacher = user?.role === "teacher";

  // Query for fetching classes
  const { data: classes, isLoading } = useQuery({
    queryKey: [isTeacher ? "/api/classes/teacher" : "/api/classes/student"],
  });

  // Form for creating/editing classes
  const form = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: "",
      subject: "",
      gradeLevel: "",
    },
  });

  // Mutation for creating a class
  const createClassMutation = useMutation({
    mutationFn: async (data: ClassFormData) => {
      const response = await apiRequest("POST", "/api/classes", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Class created",
        description: "The class has been created successfully.",
      });
      setIsCreateDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/classes/teacher"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create class",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for updating a class
  const updateClassMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ClassFormData }) => {
      const response = await apiRequest("PUT", `/api/classes/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Class updated",
        description: "The class has been updated successfully.",
      });
      setEditing({ isOpen: false, classId: null, initialData: null });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/classes/teacher"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update class",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting a class
  const deleteClassMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/classes/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Class deleted",
        description: "The class has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/classes/teacher"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete class",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ClassFormData) => {
    if (editing.classId) {
      updateClassMutation.mutate({ id: editing.classId, data });
    } else {
      createClassMutation.mutate(data);
    }
  };

  const handleEdit = (classItem: any) => {
    const initialData = {
      name: classItem.name,
      subject: classItem.subject,
      gradeLevel: classItem.gradeLevel
    };
    setEditing({
      isOpen: true,
      classId: classItem.id,
      initialData
    });
    form.reset(initialData);
  };

  const handleDelete = (classId: number, className: string) => {
    if (window.confirm(`Are you sure you want to delete the class "${className}"? This action cannot be undone.`)) {
      deleteClassMutation.mutate(classId);
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
                <h1 className="text-2xl font-bold text-gray-900">
                  {isTeacher ? "My Classes" : "Enrolled Classes"}
                </h1>
                <p className="text-gray-600">
                  {isTeacher 
                    ? "Manage your classes and student assignments" 
                    : "View your enrolled classes and assignments"}
                </p>
              </div>
              
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                    <CardFooter>
                      <Skeleton className="h-9 w-full" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : classes && classes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((classItem: any) => (
                  <Card key={classItem.id} className="overflow-hidden">
                    <CardHeader className="bg-primary/10 pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-xl">{classItem.name}</CardTitle>
                        {isTeacher && (
                          <div className="flex space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => handleEdit(classItem)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-red-500"
                              onClick={() => handleDelete(classItem.id, classItem.name)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <CardDescription>{classItem.subject} - {classItem.gradeLevel}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="flex items-center mb-2">
                        <Users className="h-4 w-4 mr-2 text-gray-500" />
                        <span>
                          {classItem.studentCount || classItem.students?.length || 0} Students
                        </span>
                      </div>
                      <div className="flex items-center">
                        {isTeacher ? (
                          <School className="h-4 w-4 mr-2 text-gray-500" />
                        ) : (
                          <GraduationCap className="h-4 w-4 mr-2 text-gray-500" />
                        )}
                        <span>
                          {isTeacher ? "Teacher" : "Enrolled"}
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t pt-4 bg-gray-50">
                      <Button 
                        className="w-full"
                        onClick={() => setLocation(`/classes/${classItem.id}`)}
                      >
                        <ArrowRight className="mr-2 h-4 w-4" />
                        ENTER CLASS
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-md p-6 text-center">
                <div className="mx-auto mb-4 bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center">
                  {isTeacher ? (
                    <School className="h-8 w-8 text-gray-500" />
                  ) : (
                    <GraduationCap className="h-8 w-8 text-gray-500" />
                  )}
                </div>
                <h3 className="text-lg font-medium mb-2">No Classes Found</h3>
                <p className="text-gray-500 mb-4">
                  {isTeacher 
                    ? "You haven't created any classes yet" 
                    : "You're not enrolled in any classes"}
                </p>
                {isTeacher && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Class
                  </Button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Dialog for creating/editing a class */}
      <Dialog open={isCreateDialogOpen || editing.isOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setEditing({ isOpen: false, classId: null, initialData: null });
          form.reset();
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editing.isOpen ? "Edit Class" : "Create New Class"}</DialogTitle>
            <DialogDescription>
              {editing.isOpen 
                ? "Update the class details below." 
                : "Fill in the details below to create a new class."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter class name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Object-Oriented Programming">Object-Oriented Programming</SelectItem>
                        <SelectItem value="Data Structures & Algorithms">Data Structures & Algorithms</SelectItem>
                        <SelectItem value="Computer Networks">Computer Networks</SelectItem>
                        <SelectItem value="Database Systems">Database Systems</SelectItem>
                        <SelectItem value="Software Engineering">Software Engineering</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="gradeLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="University">University</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={createClassMutation.isPending || updateClassMutation.isPending}>
                  {editing.isOpen 
                    ? (updateClassMutation.isPending ? "Updating..." : "Update Class")
                    : (createClassMutation.isPending ? "Creating..." : "Create Class")
                  }
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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