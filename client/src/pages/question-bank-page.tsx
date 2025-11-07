import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { Question } from "../../../shared/schema";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/ui/shared/header";
import Sidebar from "@/components/ui/shared/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { 
  SearchIcon, 
  Filter,
  BookOpen,
  GraduationCap,
  FileText,
  BarChart3
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function QuestionBankPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filters, setFilters] = useState({
    chapter: "", // What's currently stored as 'subject' in DB
    type: "",
    difficulty: "",
    searchTerm: ""
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const { user } = useAuth();

  // Stable chapter options
  const { data: chapterOptions = [] } = useQuery({ queryKey: ["/api/questions/chapters"] });
  // Fallback: load all questions once (unfiltered) to build chapter list if needed
  const { data: allQuestions = [] } = useQuery({ queryKey: ["/api/questions", "all"] });
  const effectiveChapters: string[] = (chapterOptions && chapterOptions.length > 0)
    ? chapterOptions
    : Array.from(new Set((allQuestions || []).flatMap((q: any) => [q?.chapter, q?.subject].filter(Boolean))))
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0)
        .sort((a: string, b: string) => a.localeCompare(b));

  // Fetch questions (read-only)
  const { data: questions, isLoading } = useQuery({
    queryKey: ["/api/questions", filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      // Map frontend filter names to backend field names
      if (filters.chapter) queryParams.append("chapter", filters.chapter);
      if (filters.type) queryParams.append("type", filters.type);
      if (filters.difficulty) queryParams.append("difficulty", filters.difficulty);
      if (filters.searchTerm) queryParams.append("searchTerm", filters.searchTerm);
      
      const url = `/api/questions?${queryParams.toString()}`;
      
      // Use proper authentication headers (support both persistent and session storage)
      const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error("Failed to fetch questions");
      }
      
      return response.json();
    },
  });

  // Handle filter changes
  const handleFilterChange = (name: string, value: string) => {
    // Convert "all" back to empty string for API calls
    const filterValue = value === "all" ? "" : value;
    setFilters(prev => ({ ...prev, [name]: filterValue }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Calculate pagination
  const totalQuestions = questions?.length || 0;
  const totalPages = Math.ceil(totalQuestions / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedQuestions = questions?.slice(startIndex, endIndex) || [];

  // Get difficulty badge color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'multiple_choice': return <FileText className="h-4 w-4" />;
      case 'short_answer': return <BookOpen className="h-4 w-4" />;
      case 'essay': return <GraduationCap className="h-4 w-4" />;
      case 'true_false': return <BarChart3 className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

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
              <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
              <p className="text-gray-600">Browse the shared question bank (read-only)</p>
            </div>
            
            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="search">Search Questions</Label>
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="search"
                        placeholder="Search by content..."
                        value={filters.searchTerm}
                        onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="chapter">Chapter</Label>
                    <Select 
                      value={filters.chapter} 
                      onValueChange={(value) => handleFilterChange("chapter", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All chapters" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All chapters</SelectItem>
                        {effectiveChapters.map((ch: string) => (
                          <SelectItem key={ch} value={ch}>{ch}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="type">Question Type</Label>
                    <Select 
                      value={filters.type} 
                      onValueChange={(value) => handleFilterChange("type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="Conceptual">Conceptual</SelectItem>
                        <SelectItem value="Code-Based">Code-Based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select 
                      value={filters.difficulty} 
                      onValueChange={(value) => handleFilterChange("difficulty", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All levels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All levels</SelectItem>
                        <SelectItem value="Easy">Easy</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Questions Table */}
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-4 space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[100px]" />
                        <Skeleton className="h-4 w-[100px]" />
                        <Skeleton className="h-4 w-[80px]" />
                      </div>
                    ))}
                  </div>
                ) : paginatedQuestions.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="text-gray-500 mb-2">
                      <Filter className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No questions found</h3>
                    <p className="text-gray-500">
                      {Object.values(filters).some(f => f !== "") 
                        ? "Try adjusting your filters to see more questions."
                        : "No questions are currently available in the question bank."
                      }
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Content</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Chapter</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Difficulty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedQuestions.map((question: Question) => (
                        <TableRow key={question.id}>
                          <TableCell className="max-w-md">
                            <div className="truncate" title={question.content}>
                              {question.content}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">OOP C++</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{question.subject}</div>
                              <div className="text-gray-500">{question.gradeLevel}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                question.type === "Code-Based" ? "default" : "secondary"
                              }
                            >
                              {question.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                question.difficulty === "Easy" ? "secondary" : 
                                question.difficulty === "Medium" ? "default" : "destructive"
                              }
                            >
                              {question.difficulty}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber;
                      if (totalPages <= 5) {
                        pageNumber = i + 1;
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i;
                      } else {
                        pageNumber = currentPage - 2 + i;
                      }
                      
                      return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            onClick={() => setCurrentPage(pageNumber)}
                            isActive={currentPage === pageNumber}
                            className="cursor-pointer"
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}

            {/* Summary */}
            {questions && questions.length > 0 && (
              <div className="mt-4 text-sm text-gray-600 text-center">
                Showing {startIndex + 1} to {Math.min(endIndex, totalQuestions)} of {totalQuestions} questions
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}