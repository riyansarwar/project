import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/ui/shared/header";
import Sidebar from "@/components/ui/shared/sidebar";
import StatsCard from "@/components/dashboard/stats-card";
import UpcomingQuizzes from "@/components/dashboard/upcoming-quizzes";
import RecentActivity from "@/components/dashboard/recent-activity";
import PerformanceOverview from "@/components/dashboard/performance-overview";
import { 
  User, 
  FileText, 
  HelpCircle, 
  BarChart
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";
  
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
  
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics/performance"],
    enabled: !!user
  });

  const { data: questions, isLoading: questionsLoading } = useQuery<any[]>({
    queryKey: ["/api/questions"],
    enabled: !!user
  });

  const { data: quizzes, isLoading: quizzesLoading } = useQuery<any[]>({
    queryKey: ["/api/quizzes"],
    enabled: !!user
  });

  const { data: students, isLoading: studentsLoading } = useQuery<any[]>({
    queryKey: ["/api/students"],
    enabled: !!user
  });

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
        
        <main className="flex-1 ml-0 md:ml-64 pt-16 min-h-screen">
          <div className="p-4 md:p-6">
            <div className="mb-8 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-6 border border-cyan-200 shadow-lg">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-cyan-500 bg-clip-text text-transparent">
                {isTeacher ? "Teacher Dashboard" : "Student Dashboard"}
              </h1>
              <p className="text-cyan-700 mt-2">
                Welcome back, {user?.firstName}! Here's an overview of your {isTeacher ? "classes" : "assignments"} and recent activity.
              </p>
            </div>
            
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Display different stats based on user role */}
              {isTeacher ? (
                /* Teacher Stats */
                <>
                  {studentsLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : (
                    <StatsCard 
                      title="Total Students"
                      value={students?.length?.toString() || "0"}
                      icon={<User className="h-6 w-6" />}
                      iconBgColor="bg-primary-100"
                      iconColor="text-primary-600"
                      linkTo="/students"
                    />
                  )}
                  
                  {quizzesLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : (
                    <StatsCard 
                      title="Active Quizzes"
                      value={(quizzes?.filter(q => q.status === 'active').length ?? 0).toString()}
                      icon={<FileText className="h-6 w-6" />}
                      iconBgColor="bg-green-100"
                      iconColor="text-green-600"
                      linkTo="/quizzes"
                    />
                  )}
                  
                  {questionsLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : (
                    <StatsCard 
                      title="Questions Created"
                      value={questions?.length || "0"}
                      icon={<HelpCircle className="h-6 w-6" />}
                      iconBgColor="bg-blue-100"
                      iconColor="text-blue-600"
                      linkTo="/question-bank"
                    />
                  )}
                  
                  {analyticsLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : (
                    <StatsCard 
                      title="Avg. Score"
                      value={analyticsData?.averageScore ? `${Math.round(analyticsData.averageScore)}%` : "N/A"}
                      icon={<BarChart className="h-6 w-6" />}
                      iconBgColor="bg-yellow-100"
                      iconColor="text-yellow-600"
                      linkTo="/analytics"
                    />
                  )}
                </>
              ) : (
                /* Student Stats */
                <>
                  {quizzesLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : (
                    <StatsCard 
                      title="Assigned Quizzes"
                      value={(quizzes?.filter(quiz => ['assigned','in_progress'].includes(quiz.studentStatus)).length ?? 0).toString()}
                      icon={<FileText className="h-6 w-6" />}
                      iconBgColor="bg-green-100"
                      iconColor="text-green-600"
                      linkTo="/quizzes"
                    />
                  )}
                  
                  {quizzesLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : (
                    <StatsCard 
                      title="Completed Quizzes"
                      value={quizzes?.filter(quiz => quiz.studentStatus === 'completed').length || "0"}
                      icon={<FileText className="h-6 w-6" />}
                      iconBgColor="bg-blue-100"
                      iconColor="text-blue-600"
                      linkTo="/quizzes"
                    />
                  )}
                  
                  {analyticsLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : (
                    <StatsCard 
                      title="My Average Score"
                      value={analyticsData?.averageScore ? `${Math.round(analyticsData.averageScore)}%` : "N/A"}
                      icon={<BarChart className="h-6 w-6" />}
                      iconBgColor="bg-yellow-100"
                      iconColor="text-yellow-600"
                      linkTo="/analytics"
                    />
                  )}
                  
                  {quizzesLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : (
                    <StatsCard 
                      title="Upcoming Quizzes"
                      value={quizzes?.filter(quiz => quiz.studentStatus === 'assigned').length || "0"}
                      icon={<HelpCircle className="h-6 w-6" />}
                      iconBgColor="bg-purple-100"
                      iconColor="text-purple-600"
                      linkTo="/quizzes"
                    />
                  )}
                </>
              )}
            </div>
            
            {/* Upcoming & Recent Activities */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <UpcomingQuizzes />
              <RecentActivity />
            </div>
            
            {/* Performance Overview */}
            <div className="mb-6">
              <PerformanceOverview />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
