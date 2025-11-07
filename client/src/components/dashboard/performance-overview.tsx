import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface ClassPerformance {
  name: string;
  score: number;
  color: string;
}

export default function PerformanceOverview() {
  const [, setLocation] = useLocation();
  
  interface AnalyticsData {
    teacherId: number;
    classCount: number;
    studentCount: number;
    questionCount: number;
    quizCount: number;
    averageScore: number;
    subjectPerformance?: Array<{
      subject: string;
      score: number;
    }>;
  }
  
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics/performance"],
  });
  
  // Generate performance data based on API results
  let classPerformances: ClassPerformance[] = [];

  return (
    <Card>
      <CardHeader className="px-5 py-4 border-b border-gray-200">
        <CardTitle className="font-semibold text-lg">Class Performance Overview</CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div 
          className="h-80 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300 mb-4 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => setLocation("/analytics")}
        >
          <div className="text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto h-12 w-12 text-gray-400 mb-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="20" x2="12" y2="10" />
              <line x1="18" y1="20" x2="18" y2="4" />
              <line x1="6" y1="20" x2="6" y2="16" />
            </svg>
            <p className="text-gray-500">Click to view detailed analytics</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {isLoading ? (
            <>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </>
          ) : analytics?.subjectPerformance && analytics.subjectPerformance.length > 0 ? (
            analytics.subjectPerformance.slice(0, 3).map((subject: {subject: string; score: number}, index: number) => {
              // Determine color based on score
              let color = "bg-red-500";
              if (subject.score >= 80) {
                color = "bg-green-500";
              } else if (subject.score >= 60) {
                color = "bg-blue-500";
              } else if (subject.score >= 40) {
                color = "bg-yellow-500";
              }
              
              return (
                <div 
                  key={index} 
                  className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow duration-300"
                  onClick={() => setLocation("/analytics")}
                >
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    {index === 0 ? "Highest Performing Subject" : 
                     index === 1 ? "Average Performing Subject" : 
                     "Needs Improvement"}
                  </h4>
                  <p className="font-bold text-lg">{subject.subject}</p>
                  <div className="mt-2 flex items-center">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                      <div 
                        className={`${color} h-2.5 rounded-full`} 
                        style={{ width: `${subject.score}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{subject.score}%</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-3 text-center py-6">
              <p className="text-gray-500 mb-4">No performance data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
