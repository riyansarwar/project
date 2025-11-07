import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Clock, BookOpen, FileText, Code, Play } from "lucide-react";
import { Quiz, Question } from "@shared/schema";
import { format } from "date-fns";

interface QuizPreviewProps {
  quiz: Quiz;
  questions: Question[];
  onStartQuiz: () => void;
  isStarting?: boolean;
  showQuestionsList?: boolean;
  summary?: { totalQuestions: number; types: Record<string, number> };
}

export function QuizPreview({ quiz, questions, onStartQuiz, isStarting = false, showQuestionsList = true, summary }: QuizPreviewProps) {
  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case "coding":
        return <Code className="h-4 w-4" />;
      case "short_answer":
        return <FileText className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getQuestionTypeBadge = (type: string) => {
    const badges = {
      coding: { label: "Coding", variant: "default" as const },
      short_answer: { label: "Short Answer", variant: "secondary" as const },
      essay: { label: "Essay", variant: "outline" as const },
      multiple_choice: { label: "Multiple Choice", variant: "secondary" as const }
    };
    
    return badges[type as keyof typeof badges] || { label: type, variant: "outline" as const };
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "text-green-600";
      case "medium":
        return "text-yellow-600";
      case "hard":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const totalQuestions = summary?.totalQuestions ?? questions.length;
  const typeCounts: Record<string, number> = summary?.types ?? questions.reduce((acc: Record<string, number>, q) => {
    acc[q.type] = (acc[q.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Quiz Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{quiz.title}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {quiz.subject}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {quiz.duration} minutes
                </div>
                <Badge variant="outline">{quiz.gradeLevel}</Badge>
              </div>
              {quiz.scheduledAt && (
                <p className="text-sm text-muted-foreground">
                  Scheduled: {format(new Date(quiz.scheduledAt), "PPP 'at' p")}
                </p>
              )}
            </div>
            <Button 
              onClick={onStartQuiz}
              disabled={isStarting}
              size="lg"
              className="min-w-[120px]"
            >
              {isStarting ? (
                <>
                  <Play className="h-4 w-4 mr-2 animate-pulse" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Quiz
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Quiz Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Quiz Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{totalQuestions}</div>
              <div className="text-sm text-muted-foreground">Total Questions</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{quiz.duration}</div>
              <div className="text-sm text-muted-foreground">Minutes</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {totalQuestions > 0 ? Math.round(quiz.duration / totalQuestions) : 0}
              </div>
              <div className="text-sm text-muted-foreground">Min per Question</div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Question Types:</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(typeCounts).map(([type, count]) => {
                const badge = getQuestionTypeBadge(type);
                return (
                  <Badge key={type} variant={badge.variant}>
                    {getQuestionTypeIcon(type)}
                    <span className="ml-1">{badge.label} ({count})</span>
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Difficulty distribution (derived from provided questions only) */}
          {questions.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="font-medium">Difficulty Distribution:</h4>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(questions.map(q => q.difficulty))).map(difficulty => {
                  const count = questions.filter(q => q.difficulty === difficulty).length;
                  return (
                    <Badge key={difficulty} variant="outline">
                      <span className={getDifficultyColor(difficulty)}>
                        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} ({count})
                      </span>
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions Preview */}
      {showQuestionsList && questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Questions Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div key={question.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Question {index + 1}
                      </span>
                      {getQuestionTypeIcon(question.type)}
                      <Badge variant={getQuestionTypeBadge(question.type).variant} className="text-xs">
                        {getQuestionTypeBadge(question.type).label}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <span className={getDifficultyColor(question.difficulty)}>
                        {question.difficulty}
                      </span>
                    </Badge>
                  </div>
                  
                  <div className="text-sm leading-relaxed">
                    {question.content.length > 200 
                      ? `${question.content.substring(0, 200)}...`
                      : question.content
                    }
                  </div>
                  
                  {question.type === "coding" && (
                    <div className="mt-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      💡 This question requires writing C++ code with the integrated code editor
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <span className="font-medium text-primary">1.</span>
            <span>You have <strong>{quiz.duration} minutes</strong> to complete all {totalQuestions} questions.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium text-primary">2.</span>
            <span>Navigate between questions using the Previous/Next buttons.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium text-primary">3.</span>
            <span>For coding questions, use the integrated C++ code editor to write and test your solutions.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium text-primary">4.</span>
            <span>Your answers are saved automatically as you type.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium text-primary">5.</span>
            <span>Review all your answers before final submission.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium text-primary">6.</span>
            <span>Once submitted, you cannot change your answers.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}