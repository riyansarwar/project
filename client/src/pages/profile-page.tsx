import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Edit, Key, UserPlus, Book, Mail, Phone } from "lucide-react";

// Password change schema
const passwordSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required" }),
  newPassword: z.string().min(8, { message: "Password must be at least 8 characters" }),
  confirmPassword: z.string().min(1, { message: "Please confirm your password" }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Profile details schema
const profileSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string().optional(),
});

type PasswordFormValues = z.infer<typeof passwordSchema>;
type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const { user, updateUser, refreshUser } = useAuth();
  const { toast } = useToast();

  // Password form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: "",
    },
  });

  // Fetch students for teacher
  const { data: students = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ["/api/students"],
    enabled: user?.role === "teacher",
  });

  // Fetch classes for teacher
  const { data: classes = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ["/api/classes"],
    enabled: user?.role === "teacher",
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormValues) => {
      const response = await apiRequest("POST", "/api/user/password", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Your password has been successfully updated.",
      });
      setChangePasswordOpen(false);
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const response = await apiRequest("PATCH", "/api/user/profile", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      setEditProfileOpen(false);
      // Update user data locally and refresh from server to ensure consistency
      updateUser(data);
      refreshUser();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Password form submission
  function onPasswordSubmit(values: PasswordFormValues) {
    updatePasswordMutation.mutate(values);
  }

  // Profile form submission
  function onProfileSubmit(values: ProfileFormValues) {
    updateProfileMutation.mutate(values);
  }

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
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
              <p className="text-gray-600">Manage your account information and settings</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Card */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Your personal information and preferences</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-col items-center">
                    <div className="h-24 w-24 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                      <User className="h-12 w-12 text-indigo-500" />
                    </div>
                    <h3 className="text-xl font-semibold mb-1">{user?.firstName} {user?.lastName}</h3>
                    <Badge variant="outline" className="mb-4">
                      {user?.role === "teacher" ? "Teacher" : "Student"}
                    </Badge>
                    <div className="w-full space-y-3 mt-2">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-sm">{user?.email}</span>
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-sm">@{user?.username}</span>
                      </div>
                      <Separator className="my-4" />
                      <div className="space-y-2">
                        <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="w-full">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Profile
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Profile</DialogTitle>
                              <DialogDescription>
                                Update your personal information.
                              </DialogDescription>
                            </DialogHeader>
                            <Form {...profileForm}>
                              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                                <FormField
                                  control={profileForm.control}
                                  name="firstName"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>First Name</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={profileForm.control}
                                  name="lastName"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Last Name</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={profileForm.control}
                                  name="email"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Email Address</FormLabel>
                                      <FormControl>
                                        <Input {...field} type="email" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={profileForm.control}
                                  name="phone"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Phone (Optional)</FormLabel>
                                      <FormControl>
                                        <Input {...field} type="tel" />
                                      </FormControl>
                                      <FormDescription>
                                        For contact purposes only
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <DialogFooter>
                                  <Button
                                    type="submit"
                                    disabled={updateProfileMutation.isPending}
                                  >
                                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                                  </Button>
                                </DialogFooter>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                        
                        <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="w-full">
                              <Key className="h-4 w-4 mr-2" />
                              Change Password
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Change Password</DialogTitle>
                              <DialogDescription>
                                Update your password to keep your account secure.
                              </DialogDescription>
                            </DialogHeader>
                            <Form {...passwordForm}>
                              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                                <FormField
                                  control={passwordForm.control}
                                  name="currentPassword"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Current Password</FormLabel>
                                      <FormControl>
                                        <Input {...field} type="password" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={passwordForm.control}
                                  name="newPassword"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>New Password</FormLabel>
                                      <FormControl>
                                        <Input {...field} type="password" />
                                      </FormControl>
                                      <FormDescription>
                                        At least 8 characters
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={passwordForm.control}
                                  name="confirmPassword"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Confirm New Password</FormLabel>
                                      <FormControl>
                                        <Input {...field} type="password" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <DialogFooter>
                                  <Button
                                    type="submit"
                                    disabled={updatePasswordMutation.isPending}
                                  >
                                    {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
                                  </Button>
                                </DialogFooter>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Teacher specific content */}
              {user?.role === "teacher" && (
                <div className="lg:col-span-2">
                  <Tabs defaultValue="students" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="students">Students</TabsTrigger>
                      <TabsTrigger value="classes">Classes</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="students">
                      <Card>
                        <CardHeader>
                          <CardTitle>Students</CardTitle>
                          <CardDescription>Students assigned to your classes</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {isLoadingStudents ? (
                            <div className="space-y-3">
                              {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center space-x-4">
                                  <Skeleton className="h-12 w-12 rounded-full" />
                                  <div className="space-y-2">
                                    <Skeleton className="h-4 w-[250px]" />
                                    <Skeleton className="h-4 w-[200px]" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (students && students.length > 0) ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>ID</TableHead>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Username</TableHead>
                                  <TableHead>Email</TableHead>
                                  <TableHead>Classes</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {students.map((student: any) => (
                                  <TableRow key={student.id}>
                                    <TableCell className="font-medium">{student.id}</TableCell>
                                    <TableCell>{student.firstName} {student.lastName}</TableCell>
                                    <TableCell>@{student.username}</TableCell>
                                    <TableCell>{student.email}</TableCell>
                                    <TableCell>
                                      {student.classes?.map((cls: any) => (
                                        <Badge key={cls.id} variant="outline" className="mr-1">
                                          {cls.name}
                                        </Badge>
                                      ))}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="text-center py-6">
                              <UserPlus className="mx-auto h-12 w-12 text-gray-400" />
                              <h3 className="mt-2 text-sm font-semibold text-gray-900">No students</h3>
                              <p className="mt-1 text-sm text-gray-500">
                                You don't have any students yet.
                              </p>
                              <div className="mt-6">
                                <Button className="text-sm">
                                  <UserPlus className="mr-2 h-4 w-4" />
                                  Add Students
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    <TabsContent value="classes">
                      <Card>
                        <CardHeader>
                          <CardTitle>Classes</CardTitle>
                          <CardDescription>Classes you are teaching</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {isLoadingClasses ? (
                            <div className="space-y-3">
                              {[...Array(3)].map((_, i) => (
                                <div key={i} className="space-y-2">
                                  <Skeleton className="h-5 w-[300px]" />
                                  <Skeleton className="h-4 w-[250px]" />
                                  <Skeleton className="h-4 w-full" />
                                </div>
                              ))}
                            </div>
                          ) : (classes && classes.length > 0) ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>ID</TableHead>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Subject</TableHead>
                                  <TableHead>Grade Level</TableHead>
                                  <TableHead>Students</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {classes.map((cls: any) => (
                                  <TableRow key={cls.id}>
                                    <TableCell className="font-medium">{cls.id}</TableCell>
                                    <TableCell>{cls.name}</TableCell>
                                    <TableCell>{cls.subject}</TableCell>
                                    <TableCell>{cls.gradeLevel}</TableCell>
                                    <TableCell>{cls.studentCount || 0}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="text-center py-6">
                              <Book className="mx-auto h-12 w-12 text-gray-400" />
                              <h3 className="mt-2 text-sm font-semibold text-gray-900">No classes</h3>
                              <p className="mt-1 text-sm text-gray-500">
                                You don't have any classes yet.
                              </p>
                              <div className="mt-6">
                                <Button className="text-sm">
                                  <Book className="mr-2 h-4 w-4" />
                                  Create Class
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
              
              {/* Student specific content */}
              {user?.role === "student" && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Your Classes</CardTitle>
                    <CardDescription>Classes you are enrolled in</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Student classes would go here */}
                    <div className="text-center py-6">
                      <Book className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">No classes yet</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        You are not enrolled in any classes at the moment.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}