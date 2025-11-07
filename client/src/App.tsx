import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import DashboardPage from "@/pages/dashboard-page";
import QuestionBankPage from "@/pages/question-bank-page";
import QuizzesPage from "@/pages/quizzes-page";
import TakeQuizPage from "@/pages/take-quiz-page";
import PracticeQuizPage from "@/pages/practice-quiz-page";
import StudentsPage from "@/pages/students-page";
import AnalyticsPage from "@/pages/analytics-page";
import ProfilePage from "@/pages/profile-page";
import ClassesPage from "@/pages/classes-page";
import ClassDetailsPage from "@/pages/class-details-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "@/hooks/use-auth";
import QuizMonitorPage from "@/pages/quiz-monitor-page";
import GradingPage from "@/pages/grading-page";
import { ErrorBoundary } from "@/components/error-boundary";
import { ProfessionalCppIde } from "@/components/ui/professional-cpp-ide";

// Simple IDE Page Component
function IdePage() {
  return (
    <div className="min-h-screen bg-background p-4">
      <ProfessionalCppIde height="calc(100vh - 2rem)" />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/ide" component={IdePage} exact />
      {/* Put more specific routes before generic ones and use exact where appropriate */}
      <ProtectedRoute path="/quizzes/:quizId/grade" component={GradingPage} exact />
      <ProtectedRoute path="/quizzes/:id/take" component={TakeQuizPage} exact />
      <ProtectedRoute path="/quizzes/:id/monitor" component={QuizMonitorPage} exact />
      <ProtectedRoute path="/quizzes" component={QuizzesPage} exact />
      <ProtectedRoute path="/dashboard" component={DashboardPage} exact />
      <ProtectedRoute path="/question-bank" component={QuestionBankPage} exact />
      <ProtectedRoute path="/practice-quiz" component={PracticeQuizPage} exact />
      <ProtectedRoute path="/students" component={StudentsPage} exact />
      <ProtectedRoute path="/analytics" component={AnalyticsPage} exact />
      <ProtectedRoute path="/profile" component={ProfilePage} exact />
      <ProtectedRoute path="/classes/:id" component={ClassDetailsPage} exact />
      <ProtectedRoute path="/classes" component={ClassesPage} exact />
      <ProtectedRoute path="/" component={HomePage} exact />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ErrorBoundary>
          <Router />
        </ErrorBoundary>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;