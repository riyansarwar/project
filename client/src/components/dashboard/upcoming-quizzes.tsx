import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

interface UpcomingQuiz {
  id: number;
  title: string;
  subject: string;
  gradeLevel: string;
  duration: number;
  scheduledAt: string;
  status: string;
}

export default function UpcomingQuizzes() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const [, setLocation] = useLocation();

  const { data: quizzes, isLoading } = useQuery<UpcomingQuiz[]>({
    queryKey: ["/api/quizzes"],
    select: (data) => {
      // Select only scheduled quizzes and sort by scheduledAt
      return data
        .filter((quiz) => quiz.status === "scheduled")
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
        .slice(0, 3); // Take only 3 upcoming quizzes
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="px-5 py-4 border-b border-gray-200">
          <CardTitle className="text-lg font-semibold">Upcoming Quizzes</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex items-center">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="ml-3">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="text-right">
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="h-9 w-full mt-3" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
        <CardTitle className="text-lg font-semibold">Upcoming Quizzes</CardTitle>
        <Button 
          variant="link" 
          size="sm" 
          className="text-primary-600"
          onClick={() => setLocation("/quizzes")}
        >
          View All
        </Button>
      </CardHeader>
      <CardContent className="p-5">
        {quizzes && quizzes.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {quizzes.map((quiz) => {
              const quizDate = new Date(quiz.scheduledAt);
              const isToday = new Date().toDateString() === quizDate.toDateString();
              const isTomorrow = new Date(Date.now() + 86400000).toDateString() === quizDate.toDateString();
              
              let dateText = quizDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              if (isToday) dateText = 'Today';
              if (isTomorrow) dateText = 'Tomorrow';
              
              const timeText = quizDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
              
              // Determine background color based on subject
              let bgColor = "bg-purple-100";
              let textColor = "text-purple-600";
              
              if (quiz.subject.toLowerCase().includes("math") || quiz.subject.toLowerCase().includes("algebra")) {
                bgColor = "bg-blue-100";
                textColor = "text-blue-600";
              } else if (quiz.subject.toLowerCase().includes("physics")) {
                bgColor = "bg-blue-100";
                textColor = "text-blue-600";
              } else if (quiz.subject.toLowerCase().includes("biology")) {
                bgColor = "bg-green-100";
                textColor = "text-green-600";
              }
              
              return (
                <li 
                  key={quiz.id} 
                  className="py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 rounded-md px-2 transition-colors"
                  onClick={() => setLocation(`/quizzes/${quiz.id}`)}
                >
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center ${textColor}`}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">{quiz.title}</p>
                      <p className="text-sm text-gray-500">{quiz.gradeLevel} • {quiz.duration} mins</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{dateText}</p>
                    <p className="text-xs text-gray-500">{timeText}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-500 mb-4">No upcoming quizzes found</p>
          </div>
        )}
        {isTeacher && (
          <Button 
            variant="outline" 
            className="mt-3 w-full"
            onClick={() => setLocation("/quizzes?action=new")}
          >
            Schedule New Quiz
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
