import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckCircle,
  PlusCircle,
  UserPlus,
  Edit2
} from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

// Define activity types
type ActivityType = "graded" | "created" | "added" | "updated";

interface Activity {
  id: number;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
}

// Function to render the appropriate icon based on activity type
function getActivityIcon(type: ActivityType) {
  switch (type) {
    case "graded":
      return <CheckCircle className="text-primary-600" />;
    case "created":
      return <PlusCircle className="text-blue-600" />;
    case "added":
      return <UserPlus className="text-green-600" />;
    case "updated":
      return <Edit2 className="text-yellow-600" />;
    default:
      return <CheckCircle />;
  }
}

// Function to format the timestamp (e.g., "Today, 2:34 PM" or "Yesterday, 11:20 AM")
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  const timeString = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  
  if (isToday) {
    return `Today, ${timeString}`;
  } else if (isYesterday) {
    return `Yesterday, ${timeString}`;
  } else {
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeString}`;
  }
}

// Function to get background and text color based on activity type
function getActivityColors(type: ActivityType): { bg: string; text: string } {
  switch (type) {
    case "graded":
      return { bg: "bg-primary-100", text: "text-primary-600" };
    case "created":
      return { bg: "bg-blue-100", text: "text-blue-600" };
    case "added":
      return { bg: "bg-green-100", text: "text-green-600" };
    case "updated":
      return { bg: "bg-yellow-100", text: "text-yellow-600" };
    default:
      return { bg: "bg-gray-100", text: "text-gray-600" };
  }
}

export default function RecentActivity() {
  const [, setLocation] = useLocation();
  
  // Since we don't have an actual API for activities yet, we'll use empty array
  const activities: Activity[] = [];
  const isLoading = false;

  return (
    <Card>
      <CardHeader className="px-5 py-4 border-b border-gray-200">
        <CardTitle className="font-semibold text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start">
                <Skeleton className="h-6 w-6 rounded-full mr-3" />
                <div className="w-full">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-5/6 mb-2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : activities && activities.length > 0 ? (
          <div className="relative">
            <div className="border-l-2 border-gray-200 ml-3 pb-1">
              {activities.map((activity, index) => {
                const { bg, text } = getActivityColors(activity.type);
                return (
                  <div 
                    key={activity.id} 
                    className="flex mb-4 items-start relative cursor-pointer"
                    onClick={() => {
                      // Navigate based on activity type
                      switch (activity.type) {
                        case "graded":
                          setLocation("/analytics");
                          break;
                        case "created":
                          setLocation("/quizzes");
                          break;
                        case "added":
                          setLocation("/students");
                          break;
                        case "updated":
                          setLocation("/question-bank");
                          break;
                      }
                    }}
                  >
                    <div className={`absolute -left-3.5 mt-1 w-6 h-6 rounded-full ${bg} flex items-center justify-center`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="ml-6 hover:bg-gray-50 px-3 py-2 rounded-md transition-colors w-full">
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-sm text-gray-500">{activity.description}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatTimestamp(activity.timestamp)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-500">No recent activity found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
