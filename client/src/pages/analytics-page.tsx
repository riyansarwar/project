import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Header from "@/components/ui/shared/header";
import Sidebar from "@/components/ui/shared/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getPerformanceInsights } from "@/lib/openai";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from "recharts";
import {
  FileText,
  BarChart as BarChartIcon,
  LineChart as LineChartIcon,
  FileSpreadsheet,
  Printer,
  BrainCircuit,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  ChevronRight
} from "lucide-react";

export default function AnalyticsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("All Subjects");
  const [selectedPeriod, setSelectedPeriod] = useState("Last 30 Days");
  const [activeInsight, setActiveInsight] = useState<string | null>(null);
  const { toast } = useToast();
  
  const { user } = useAuth();

  // Fetch analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ["/api/analytics/performance"],
  });

  // Request AI insights
  const generateInsightsMutation = useMutation({
    mutationFn: async (data: any) => {
      return getPerformanceInsights(data, selectedSubject !== "All Subjects" ? selectedSubject : "General");
    },
    onSuccess: (data) => {
      toast({
        title: "Insights generated",
        description: "AI has analyzed the performance data successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate insights",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate insights when subject changes
  const handleGenerateInsights = () => {
    if (analyticsData) {
      generateInsightsMutation.mutate(analyticsData);
    }
  };

  // Mock performance by subject data (in a real app, this would come from the API)
  const subjectPerformanceData = [
    { subject: "Mathematics", score: 75 },
    { subject: "Physics", score: 88 },
    { subject: "Biology", score: 62 },
    { subject: "Chemistry", score: 79 },
    { subject: "History", score: 81 }
  ];

  // Mock performance trend data
  const performanceTrendData = [
    { month: 'Jan', average: 72 },
    { month: 'Feb', average: 68 },
    { month: 'Mar', average: 70 },
    { month: 'Apr', average: 75 },
    { month: 'May', average: 79 },
    { month: 'Jun', average: 82 }
  ];

  // Mock question type performance data
  const questionTypeData = [
    { name: 'Multiple Choice', value: 82 },
    { name: 'Short Answer', value: 68 },
    { name: 'Essay', value: 55 },
    { name: 'True/False', value: 90 }
  ];

  // Mock difficulty performance data
  const difficultyData = [
    { name: 'Easy', score: 88 },
    { name: 'Medium', score: 72 },
    { name: 'Hard', score: 58 }
  ];

  // Mock AI insights for demo (in real app, these would come from OpenAI API)
  const aiInsights = generateInsightsMutation.data || {
    learningGaps: [
      "Grade 9 Biology students are struggling with concepts related to cellular respiration",
      "Grade 11 Physics students show inconsistent understanding of vector resolution"
    ],
    strengths: [
      "Strong performance in algebraic equations across all grades",
      "Grade 12 Chemistry students excel in understanding periodic table concepts"
    ],
    recommendedFocus: [
      "Additional practice problems for vector resolution in Physics",
      "More visual aids for cellular biology concepts",
      "Group work for history analysis activities"
    ],
    teachingStrategies: [
      "Interactive simulations would benefit Physics students who struggle with conceptual understanding",
      "Group discussions may help History students who perform better on collaborative assignments",
      "Visual learning tools could improve understanding of cellular biology concepts"
    ]
  };

  // Helper function for getting appropriate color for performance bars
  const getScoreColor = (score: number) => {
    if (score >= 85) return "bg-green-500";
    if (score >= 75) return "bg-blue-500";
    if (score >= 65) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Colors for pie chart
  const COLORS = ['#4f46e5', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];

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
              <h1 className="text-2xl font-bold text-gray-900">Performance Analytics</h1>
              <p className="text-gray-600">Comprehensive insights into student and class performance</p>
            </div>
            
            {/* Filters */}
            <div className="mb-6 bg-white rounded-lg shadow p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                <div className="w-full md:w-64">
                  <Label className="mb-1 block">Subject</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All Subjects">All Subjects</SelectItem>
                      <SelectItem value="Mathematics">Mathematics</SelectItem>
                      <SelectItem value="Physics">Physics</SelectItem>
                      <SelectItem value="Chemistry">Chemistry</SelectItem>
                      <SelectItem value="Biology">Biology</SelectItem>
                      <SelectItem value="History">History</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-full md:w-64">
                  <Label className="mb-1 block">Time Period</Label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Last 7 Days">Last 7 Days</SelectItem>
                      <SelectItem value="Last 30 Days">Last 30 Days</SelectItem>
                      <SelectItem value="Last 90 Days">Last 90 Days</SelectItem>
                      <SelectItem value="This Semester">This Semester</SelectItem>
                      <SelectItem value="This Year">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button onClick={handleGenerateInsights} disabled={generateInsightsMutation.isPending}>
                <BrainCircuit className="mr-2 h-4 w-4" />
                {generateInsightsMutation.isPending ? "Generating Insights..." : "Generate AI Insights"}
              </Button>
            </div>
            
            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Average Performance by Subject */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Average Performance by Subject</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-8" />
                          </div>
                          <Skeleton className="h-2.5 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {subjectPerformanceData.map((item, index) => (
                        <div key={index}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{item.subject}</span>
                            <span>{item.score}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className={`${getScoreColor(item.score)} h-2.5 rounded-full`} 
                              style={{ width: `${item.score}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Performance Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Performance Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-60 w-full bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                      <LineChartIcon className="h-8 w-8 text-gray-300" />
                    </div>
                  ) : (
                    <>
                      <div className="h-60">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={performanceTrendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Line type="monotone" dataKey="average" stroke="#4F46E5" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="bg-green-50 p-3 rounded-lg">
                          <p className="text-sm text-gray-600">Most Improved</p>
                          <p className="font-semibold">Grade 9 Biology</p>
                          <p className="text-xs text-green-600">+12% in 30 days</p>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg">
                          <p className="text-sm text-gray-600">Needs Attention</p>
                          <p className="font-semibold">Grade 10 Chemistry</p>
                          <p className="text-xs text-red-600">-5% in 30 days</p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
              
              {/* Question Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Question Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <p className="font-medium text-sm">Most Challenging Questions</p>
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">32% Avg. Score</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">Newton's Third Law of Motion</p>
                        <div className="flex text-xs text-gray-500">
                          <span className="mr-3">Physics • Grade 11</span>
                          <span>68% incorrect answers</span>
                        </div>
                      </div>
                      
                      <div className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <p className="font-medium text-sm">Easiest Questions</p>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">95% Avg. Score</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">Basic Algebra Equations</p>
                        <div className="flex text-xs text-gray-500">
                          <span className="mr-3">Mathematics • Grade 10</span>
                          <span>5% incorrect answers</span>
                        </div>
                      </div>
                      
                      <div className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <p className="font-medium text-sm">Answer Time Analysis</p>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">Average time per question</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Multiple Choice:</span>
                            <span className="font-medium"> 45 sec</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Short Answer:</span>
                            <span className="font-medium"> 2 min 12 sec</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Essay:</span>
                            <span className="font-medium"> 8 min 35 sec</span>
                          </div>
                          <div>
                            <span className="text-gray-500">True/False:</span>
                            <span className="font-medium"> 20 sec</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Detailed Analytics */}
            <Tabs defaultValue="performance" className="mb-6">
              <TabsList className="mb-4">
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="questions">Question Analysis</TabsTrigger>
                <TabsTrigger value="students">Student Analysis</TabsTrigger>
              </TabsList>
              
              <TabsContent value="performance" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Performance by Class</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { class: 'Grade 9 Biology', score: 62 },
                            { class: 'Grade 10 Algebra', score: 74 },
                            { class: 'Grade 10 Chemistry', score: 68 },
                            { class: 'Grade 11 Physics', score: 88 },
                            { class: 'Grade 12 History', score: 81 }
                          ]}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="class" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="score" fill="#4F46E5" name="Average Score (%)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Question Type Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-60">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={questionTypeData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {questionTypeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value}%`, "Score"]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Difficulty Level Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-60">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={difficultyData}
                            layout="vertical"
                            margin={{ top: 20, right: 30, left: 50, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" domain={[0, 100]} />
                            <YAxis dataKey="name" type="category" />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="score" fill="#10B981" name="Average Score (%)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="questions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Top 5 Most Challenging Questions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { question: "Explain the difference between mitosis and meiosis in detail.", subject: "Biology", correct: 32, gradeLevel: "Grade 9" },
                        { question: "Solve the following differential equation: dy/dx + 2y = x^2 - x + 1", subject: "Mathematics", correct: 35, gradeLevel: "Grade 12" },
                        { question: "Describe Newton's Third Law and give three examples from everyday life.", subject: "Physics", correct: 42, gradeLevel: "Grade 11" },
                        { question: "Explain the process of cellular respiration and its importance.", subject: "Biology", correct: 45, gradeLevel: "Grade 10" },
                        { question: "Analyze the causes and effects of World War I on global politics.", subject: "History", correct: 48, gradeLevel: "Grade 11" }
                      ].map((item, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-sm">{item.question}</h4>
                              <p className="text-xs text-gray-500 mt-1">{item.subject} • {item.gradeLevel}</p>
                            </div>
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full whitespace-nowrap">
                              {item.correct}% Correct
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Question Response Time Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { subject: 'Mathematics', time: 1.5 },
                            { subject: 'Physics', time: 2.3 },
                            { subject: 'Chemistry', time: 1.8 },
                            { subject: 'Biology', time: 2.5 },
                            { subject: 'History', time: 3.2 }
                          ]}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="subject" />
                          <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                          <Tooltip formatter={(value) => [`${value} min`, "Avg. Response Time"]} />
                          <Legend />
                          <Bar dataKey="time" fill="#F59E0B" name="Average Response Time (minutes)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="students" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Top Performing Students</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { name: "Emma Smith", class: "Grade 11 Physics", score: 95 },
                        { name: "Liam Brown", class: "Grade 11 Physics", score: 91 },
                        { name: "Noah Williams", class: "Grade 12 History", score: 89 },
                        { name: "Olivia Johnson", class: "Grade 12 Chemistry", score: 88 },
                        { name: "James Wilson", class: "Grade 10 Algebra", score: 87 }
                      ].map((student, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border-b last:border-0">
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-gray-500">{student.class}</p>
                          </div>
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-2">
                              <div 
                                className={`${getScoreColor(student.score)} h-2.5 rounded-full`} 
                                style={{ width: `${student.score}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{student.score}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Students Needing Additional Support</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { name: "Sophia Williams", class: "Grade 9 Biology", score: 62, area: "Cellular functions" },
                        { name: "Ethan Davis", class: "Grade 10 Chemistry", score: 65, area: "Chemical equations" },
                        { name: "Ava Miller", class: "Grade 9 Biology", score: 66, area: "Genetic concepts" },
                        { name: "Benjamin Moore", class: "Grade 11 Physics", score: 68, area: "Vector calculations" },
                        { name: "Isabella Taylor", class: "Grade 10 Algebra", score: 69, area: "Quadratic equations" }
                      ].map((student, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex justify-between items-center mb-1">
                            <p className="font-medium">{student.name}</p>
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">{student.score}%</span>
                          </div>
                          <p className="text-sm text-gray-600">{student.class}</p>
                          <div className="mt-2 text-xs">
                            <span className="text-red-600 font-medium">Focus area: </span>
                            <span>{student.area}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            {/* AI Insights */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">AI-Generated Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4 shrink-0">
                        <BrainCircuit className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Learning Gap Identification</h4>
                        <p className="text-sm text-gray-600 mb-3">Our AI has identified potential learning gaps in specific areas of the curriculum:</p>
                        <div className="space-y-2 text-sm text-gray-600 mb-3">
                          {generateInsightsMutation.isPending ? (
                            <div className="space-y-3">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-full" />
                            </div>
                          ) : (
                            aiInsights.learningGaps.map((gap, index) => (
                              <div key={index} className="flex items-start">
                                <AlertTriangle className="text-yellow-500 mr-2 h-4 w-4 mt-0.5 shrink-0" />
                                <span>{gap}</span>
                              </div>
                            ))
                          )}
                        </div>
                        <button 
                          className={`text-blue-600 text-sm font-medium flex items-center ${activeInsight === 'gaps' ? 'mb-2' : ''}`}
                          onClick={() => setActiveInsight(activeInsight === 'gaps' ? null : 'gaps')}
                        >
                          {activeInsight === 'gaps' ? 'Hide Details' : 'View Detailed Analysis'}
                          <ChevronDown className={`ml-1 h-4 w-4 ${activeInsight === 'gaps' ? 'transform rotate-180' : ''}`} />
                        </button>
                        
                        {activeInsight === 'gaps' && (
                          <div className="mt-2 pt-2 border-t border-blue-200">
                            <p className="text-sm text-gray-600 mb-2">AI suggests the following interventions:</p>
                            <ul className="text-sm space-y-1">
                              <li className="flex items-center">
                                <ChevronRight className="h-3 w-3 text-blue-500 mr-1" />
                                <span>Provide supplementary materials focusing on cellular respiration processes</span>
                              </li>
                              <li className="flex items-center">
                                <ChevronRight className="h-3 w-3 text-blue-500 mr-1" />
                                <span>Create targeted practice sessions for vector resolution problems</span>
                              </li>
                              <li className="flex items-center">
                                <ChevronRight className="h-3 w-3 text-blue-500 mr-1" />
                                <span>Implement peer teaching where high-performing students can assist peers</span>
                              </li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-4 shrink-0">
                        <BrainCircuit className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Teaching Strategy Recommendations</h4>
                        <p className="text-sm text-gray-600 mb-3">Based on student performance patterns, our AI recommends these teaching strategies:</p>
                        <div className="space-y-2 text-sm text-gray-600 mb-3">
                          {generateInsightsMutation.isPending ? (
                            <div className="space-y-3">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-full" />
                            </div>
                          ) : (
                            aiInsights.teachingStrategies.map((strategy, index) => (
                              <div key={index} className="flex items-start">
                                <CheckCircle className="text-green-500 mr-2 h-4 w-4 mt-0.5 shrink-0" />
                                <span>{strategy}</span>
                              </div>
                            ))
                          )}
                        </div>
                        <button 
                          className={`text-green-600 text-sm font-medium flex items-center ${activeInsight === 'strategies' ? 'mb-2' : ''}`}
                          onClick={() => setActiveInsight(activeInsight === 'strategies' ? null : 'strategies')}
                        >
                          {activeInsight === 'strategies' ? 'Hide Details' : 'View All Recommendations'}
                          <ChevronDown className={`ml-1 h-4 w-4 ${activeInsight === 'strategies' ? 'transform rotate-180' : ''}`} />
                        </button>
                        
                        {activeInsight === 'strategies' && (
                          <div className="mt-2 pt-2 border-t border-green-200">
                            <p className="text-sm text-gray-600 mb-2">Additional recommendations:</p>
                            <ul className="text-sm space-y-1">
                              <li className="flex items-center">
                                <ChevronRight className="h-3 w-3 text-green-500 mr-1" />
                                <span>Incorporate problem-based learning techniques</span>
                              </li>
                              <li className="flex items-center">
                                <ChevronRight className="h-3 w-3 text-green-500 mr-1" />
                                <span>Use formative assessments more frequently</span>
                              </li>
                              <li className="flex items-center">
                                <ChevronRight className="h-3 w-3 text-green-500 mr-1" />
                                <span>Create differentiated learning paths based on student performance</span>
                              </li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mr-4 shrink-0">
                        <BrainCircuit className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Personalized Learning Paths</h4>
                        <p className="text-sm text-gray-600 mb-3">AI-generated personalized learning paths are available for 5 students who would benefit from tailored curriculum:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <div className="bg-white p-3 rounded-md border border-gray-200">
                            <p className="font-medium text-sm">Emma Smith</p>
                            <p className="text-xs text-gray-600">Shows advanced aptitude in Physics - recommended for enrichment activities</p>
                          </div>
                          <div className="bg-white p-3 rounded-md border border-gray-200">
                            <p className="font-medium text-sm">James Johnson</p>
                            <p className="text-xs text-gray-600">Requires additional support in Algebra - recommended for remedial sessions</p>
                          </div>
                        </div>
                        <button className="text-purple-600 text-sm font-medium">Generate All Learning Paths</button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Export Options */}
            <div className="flex justify-end space-x-3 mb-6">
              <Button variant="outline" className="flex items-center">
                <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" /> Export to Excel
              </Button>
              <Button variant="outline" className="flex items-center">
                <FileText className="mr-2 h-4 w-4 text-red-600" /> Export to PDF
              </Button>
              <Button variant="outline" className="flex items-center">
                <Printer className="mr-2 h-4 w-4 text-blue-600" /> Print Report
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
