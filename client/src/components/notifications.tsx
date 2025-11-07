import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  BellOff,
  Check,
  Loader2,
  BookOpen,
  BarChart2,
  AlertCircle,
  X,
  Users,
  CheckCircle,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function NotificationsPopover() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  // Fetch notifications
  const { 
    data: notificationsData, 
    isLoading: isLoadingNotifications,
    refetch: refetchNotifications 
  } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/notifications");
        return await res.json();
      } catch (error) {
        console.error("Error fetching notifications:", error);
        throw error;
      }
    },
    retry: 1,
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const res = await apiRequest("POST", `/api/notifications/${notificationId}/read`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to mark notification as read",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Accept class invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: async ({ classId, notificationId }: { classId: number; notificationId: number }) => {
      const res = await apiRequest("POST", "/api/classes/accept-invitation", {
        classId,
        notificationId,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation accepted",
        description: "You have successfully joined the class!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/classes/student"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to accept invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Decline class invitation mutation
  const declineInvitationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const res = await apiRequest("POST", "/api/classes/decline-invitation", {
        notificationId,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation declined",
        description: "The class invitation has been declined.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to decline invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check for unread notifications every 30 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      refetchNotifications();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [refetchNotifications]);

  // Helper to format notification date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return "Just now";
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get icon for notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "quiz_assigned":
        return <BookOpen className="h-4 w-4" />;
      case "quiz_graded":
        return <BarChart2 className="h-4 w-4" />;
      case "practice_quiz_available":
        return <BookOpen className="h-4 w-4" />;
      case "practice_quiz_completed":
        return <Check className="h-4 w-4" />;
      case "class_invitation":
        return <Users className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Count unread notifications
  const unreadCount = notificationsData?.notifications?.filter(
    (n: any) => !n.read
  ).length || 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-medium text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="outline" className="ml-auto">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {isLoadingNotifications ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notificationsData?.notifications?.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <BellOff className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notificationsData?.notifications?.map((notification: any) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-2 p-3 hover:bg-accent relative",
                    !notification.read && "bg-accent/50"
                  )}
                >
                  <div className="mt-1 bg-primary/10 rounded-full p-1.5 text-primary">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(notification.createdAt)}
                    </p>
                    {notification.type === "class_invitation" && !notification.read && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            acceptInvitationMutation.mutate({
                              classId: notification.relatedId,
                              notificationId: notification.id,
                            });
                          }}
                          disabled={acceptInvitationMutation.isPending}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => declineInvitationMutation.mutate(notification.id)}
                          disabled={declineInvitationMutation.isPending}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Decline
                        </Button>
                      </div>
                    )}
                  </div>
                  {!notification.read && notification.type !== "class_invitation" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 absolute top-2 right-2 opacity-50 hover:opacity-100"
                      onClick={() => markAsReadMutation.mutate(notification.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-3 border-t text-xs text-center text-muted-foreground">
          Notifications are updated automatically
        </div>
      </PopoverContent>
    </Popover>
  );
}