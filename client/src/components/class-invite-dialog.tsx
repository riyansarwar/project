import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Search, Send } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const inviteSchema = z.object({
  studentEmail: z.string().email("Please enter a valid email address"),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface ClassInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: number;
  className: string;
}

export function ClassInviteDialog({ 
  open, 
  onOpenChange, 
  classId, 
  className 
}: ClassInviteDialogProps) {
  const { toast } = useToast();
  const [searchedStudent, setSearchedStudent] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      studentEmail: "",
    },
  });

  const searchStudent = async (email: string) => {
    setIsSearching(true);
    try {
      const response = await apiRequest("GET", `/api/students/search?email=${encodeURIComponent(email)}`);
      const student = await response.json();
      setSearchedStudent(student);
    } catch (error: any) {
      setSearchedStudent(null);
      if (error.message.includes("404")) {
        toast({
          title: "Student not found",
          description: "No student found with this email address",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Search failed",
          description: "Failed to search for student",
          variant: "destructive",
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!searchedStudent) throw new Error("No student selected");
      
      return apiRequest("POST", "/api/classes/invite", {
        classId,
        studentId: searchedStudent.id,
        studentEmail: searchedStudent.email,
      });
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: `Class invitation sent to ${searchedStudent.email}`,
      });
      
      // Reset form and close dialog
      form.reset();
      setSearchedStudent(null);
      onOpenChange(false);
      
      // Refresh classes data
      queryClient.invalidateQueries({ queryKey: ["/api/classes/teacher"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    const email = form.getValues("studentEmail");
    if (email) {
      searchStudent(email);
    }
  };

  const handleInvite = () => {
    inviteMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Student to Class</DialogTitle>
          <DialogDescription>
            Search for a student by email and send them an invitation to join "{className}"
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="studentEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student Email</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder="student@email.com"
                        {...field}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSearch();
                          }
                        }}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSearch}
                      disabled={isSearching || !field.value}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {searchedStudent && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {searchedStudent.firstName} {searchedStudent.lastName}
                      </p>
                      <p className="text-sm text-gray-600">{searchedStudent.email}</p>
                      <Badge variant="outline" className="mt-1">
                        {searchedStudent.role}
                      </Badge>
                    </div>
                    <Button
                      onClick={handleInvite}
                      disabled={inviteMutation.isPending}
                      size="sm"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {inviteMutation.isPending ? "Sending..." : "Send Invite"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </Form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}