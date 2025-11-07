import type { Express, Request, Response } from "express";

import { storage } from "./storage";
import { setupAuth, authenticateToken, AuthRequest } from "./auth";
import { 
  insertQuestionSchema, 
  insertQuizSchema, 
  insertStudentQuizSchema, 
  insertStudentAnswerSchema, 
  insertClassSchema
} from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { 
  gradeStudentAnswer, 
  generatePersonalizedQuestion, 
  generatePerformanceInsights
} from "./openai";
import { executeCppCodeOnline, formatCppCode, analyzeCppCode } from "./online-cpp-service";

import { NextFunction } from 'express';
import bcrypt from "bcryptjs";

// Middleware to ensure user is authenticated
function ensureAuthenticated(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

// Middleware to ensure user is a teacher
function ensureTeacher(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user && req.user.role === "teacher") {
    return next();
  }
  res.status(403).json({ message: "Forbidden - Teacher access required" });
}

// Middleware to ensure user is a student
function ensureStudent(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user && req.user.role === "student") {
    return next();
  }
  res.status(403).json({ message: "Forbidden - Student access required" });
}

export async function registerRoutes(app: Express): Promise<void> {
  // Note: index.ts creates the HTTP server and passes it into Vite setup.
  // This function does not create or manage the HTTP server directly.
  // Set up auth routes
  setupAuth(app);
  
  // Apply authentication middleware to protected routes
  app.use('/api/questions', authenticateToken);
  app.use('/api/quizzes', authenticateToken);
  app.use('/api/classes', authenticateToken);
  app.use('/api/students', authenticateToken);
  app.use('/api/notifications', authenticateToken);
  app.use('/api/practice-quiz', authenticateToken);
  app.use('/api/user', authenticateToken);
  // Missing before: protect all student-quiz routes so req.user is set
  app.use('/api/student-quizzes', authenticateToken);
  

  // User profile routes
  // Student search endpoint for class invitations
  app.get("/api/students/search", ensureTeacher, async (req, res) => {
    try {
      const { email } = req.query;
      
      if (!email) {
        return res.status(400).json({ message: "Email parameter is required" });
      }
      
      const student = await storage.getUserByEmail(email as string);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      if (student.role !== "student") {
        return res.status(400).json({ message: "User is not a student" });
      }
      
      // Return student without password
      const { password, ...studentData } = student;
      res.json(studentData);
    } catch (error) {
      console.error("Error searching for student:", error);
      res.status(500).json({ message: "Failed to search for student" });
    }
  });
  
  // Class invitation endpoint
  app.post("/api/classes/invite", ensureTeacher, async (req, res) => {
    try {
      const { classId, studentId, studentEmail } = req.body;
      const teacherId = req.user!.id;
      
      // Verify the class belongs to this teacher
      const classData = await storage.getClass(classId);
      if (!classData || classData.teacherId !== teacherId) {
        return res.status(403).json({ message: "Access denied to this class" });
      }
      
      // Create notification for the student
      await storage.createNotification({
        userId: studentId,
        title: "Class Invitation",
        message: `You have been invited to join the class "${classData.name}" (${classData.subject}). Click to accept or decline.`,
        type: "class_invitation",
        relatedId: classId
      });
      
      res.status(201).json({ message: "Invitation sent successfully" });
    } catch (error) {
      console.error("Error sending class invitation:", error);
      res.status(500).json({ message: "Failed to send invitation" });
    }
  });
  
  // Accept class invitation endpoint
  app.post("/api/classes/accept-invitation", ensureStudent, async (req, res) => {
    try {
      const { classId, notificationId } = req.body;
      const studentId = req.user!.id;
      
      // Verify the class exists
      const classData = await storage.getClass(classId);
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }
      
      // Add student to class
      const success = await storage.addStudentToClass(classId, studentId);
      
      if (success) {
        // Mark notification as read
        if (notificationId) {
          await storage.markNotificationAsRead(notificationId);
        }
        
        res.status(201).json({ message: "Successfully joined the class" });
      } else {
        res.status(400).json({ message: "Failed to join class" });
      }
    } catch (error) {
      console.error("Error accepting class invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });
  
  // Decline class invitation endpoint
  app.post("/api/classes/decline-invitation", ensureStudent, async (req, res) => {
    try {
      const { notificationId } = req.body;
      
      // Mark notification as read
      if (notificationId) {
        await storage.markNotificationAsRead(notificationId);
      }
      
      res.json({ message: "Invitation declined" });
    } catch (error) {
      console.error("Error declining class invitation:", error);
      res.status(500).json({ message: "Failed to decline invitation" });
    }
  });

  // Student management routes consolidated below

  // Profile update route
  app.patch("/api/user/profile", authenticateToken, ensureAuthenticated, async (req, res) => {
    try {
      //if (!req.user) {
      //  return res.status(401).json({ message: "User not authenticated" });
      //}

      //const userId = req.user.id;
      const { firstName, lastName, email, phone } = req.body;

      // Persist to DB and return updated user (without password)
      const updated = await storage.updateUserProfile(req.user!.id, { firstName, lastName, email });
      const { password, ...userWithoutPassword } = updated as any;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Password update route
  app.post("/api/user/password", authenticateToken, ensureAuthenticated, async (req: AuthRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password are required" });
      }

      // Verify current password
      const user = req.user!;
      const isValid = await (await import("bcryptjs")).default.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash and update new password
      const bcrypt = (await import("bcryptjs")).default;
      const hash = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(user.id, hash);

      res.json({ success: true });
    } catch (error) {
      console.error("Password update error:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  // Get classes for the current user based on role
  app.get("/api/classes/teacher", ensureTeacher, async (req, res) => {
    try {
      const teacherId = req.user!.id;
      const classes = await storage.getClassesByTeacher(teacherId);

      // For each class, get the count of students
      const classesWithStudents = await Promise.all(classes.map(async (classItem) => {
        const students = await storage.getClassStudents(classItem.id);
        return {
          ...classItem,
          studentCount: students.length,
          students // Include the actual student data
        };
      }));

      res.json(classesWithStudents);
    } catch (error) {
      console.error("Error getting teacher classes:", error);
      res.status(500).json({ message: "Error retrieving classes" });
    }
  });

  // Get classes for student
  app.get("/api/classes/student", ensureStudent, async (req, res) => {
    try {
      const studentId = req.user!.id;

      // Find all class_students entries for this student
      // and then fetch the corresponding class details
      const allClasses = await storage.getClassesByStudent(studentId);

      // If the method is not implemented yet, use a workaround
      if (!allClasses || allClasses.length === 0) {
        return res.json([]);
      }

      res.json(allClasses);
    } catch (error) {
      console.error("Error getting student classes:", error);
      res.status(500).json({ message: "Error retrieving enrolled classes" });
    }
  });

  // Legacy endpoint - redirects to appropriate role-based endpoint
  app.get("/api/classes", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;

      if (userRole === "teacher") {
        const classes = await storage.getClassesByTeacher(userId);
        const classesWithStudents = await Promise.all(classes.map(async (classItem) => {
          const students = await storage.getClassStudents(classItem.id);
          return {
            ...classItem,
            studentCount: students.length,
            students
          };
        }));
        res.json(classesWithStudents);
      } else {
        // For students, get enrolled classes
        const studentClasses = await storage.getClassesByStudent(userId);
        res.json(studentClasses);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  // Get specific class details
  app.get("/api/classes/:id", async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      if (isNaN(classId)) {
        return res.status(400).json({ message: "Invalid class ID" });
      }

      const classRecord = await storage.getClass(classId);
      if (!classRecord) {
        return res.status(404).json({ message: "Class not found" });
      }

      res.json(classRecord);
    } catch (error) {
      console.error("Error fetching class:", error);
      res.status(500).json({ message: "Failed to fetch class" });
    }
  });

  // Get students in a specific class
  app.get("/api/classes/:id/students", async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      if (isNaN(classId)) {
        return res.status(400).json({ message: "Invalid class ID" });
      }

      const students = await storage.getStudentsByClass(classId);
      res.json(students);
    } catch (error) {
      console.error("Error fetching class students:", error);
      res.status(500).json({ message: "Failed to fetch class students" });
    }
  });

  // Get quizzes for a specific class
  app.get("/api/classes/:id/quizzes", async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      if (isNaN(classId)) {
        return res.status(400).json({ message: "Invalid class ID" });
      }

      const quizzes = await storage.getQuizzesByClass(classId);
      res.json(quizzes);
    } catch (error) {
      console.error("Error fetching class quizzes:", error);
      res.status(500).json({ message: "Failed to fetch class quizzes" });
    }
  });

  // Get student performance data for a specific class (teacher only)
  app.get("/api/classes/:id/performance", ensureTeacher, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      if (isNaN(classId)) {
        return res.status(400).json({ message: "Invalid class ID" });
      }

      const performance = await storage.getStudentPerformanceByClass(classId);
      res.json(performance);
    } catch (error) {
      console.error("Error fetching class performance:", error);
      res.status(500).json({ message: "Failed to fetch class performance" });
    }
  });

  // Remove student from class (teacher only)
  app.delete("/api/classes/:id/students/:studentId", ensureTeacher, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      const studentId = parseInt(req.params.studentId);
      
      if (isNaN(classId) || isNaN(studentId)) {
        return res.status(400).json({ message: "Invalid class or student ID" });
      }

      await storage.removeStudentFromClass(classId, studentId);
      res.json({ message: "Student removed from class successfully" });
    } catch (error) {
      console.error("Error removing student from class:", error);
      res.status(500).json({ message: "Failed to remove student from class" });
    }
  });

  // Question routes - READ ONLY for teachers
  app.get("/api/questions", ensureTeacher, async (req, res) => {
    try {
      const { subject, chapter, gradeLevel, type, difficulty, searchTerm } = req.query;

      const questions = await storage.searchQuestions({
        subject: subject as string,
        chapter: chapter as string,
        gradeLevel: gradeLevel as string,
        type: type as string,
        difficulty: difficulty as string,
        searchTerm: searchTerm as string
      });

      res.json(questions);
    } catch (error) {
      console.error("Error getting questions:", error);
      res.status(500).json({ message: "Error retrieving questions" });
    }
  });

  // Distinct chapter options for filters
  app.get("/api/questions/chapters", ensureTeacher, async (_req, res) => {
    try {
      const chapters = await storage.getChapterOptions();
      res.json(chapters);
    } catch (error) {
      console.error("Error getting chapter options:", error);
      res.status(500).json({ message: "Error retrieving chapters" });
    }
  });

  // These endpoints are disabled - questions are read-only
  app.post("/api/questions", ensureTeacher, async (req, res) => {
    res.status(403).json({ message: "Question creation is disabled. Question bank is read-only." });
  });

  app.put("/api/questions/:id", ensureTeacher, async (req, res) => {
    res.status(403).json({ message: "Question editing is disabled. Question bank is read-only." });
  });

  app.delete("/api/questions/:id", ensureTeacher, async (req, res) => {
    res.status(403).json({ message: "Question deletion is disabled. Question bank is read-only." });
  });

  // AI endpoints are disabled - questions are read-only
  app.post("/api/ai/generate-candidates", ensureTeacher, async (req, res) => {
    res.status(403).json({ message: "AI question generation is disabled. Question bank is read-only." });
  });

  app.post("/api/ai/save-selected", ensureTeacher, async (req, res) => {
    res.status(403).json({ message: "AI question saving is disabled. Question bank is read-only." });
  });

  app.post("/api/questions/generate", ensureTeacher, async (req, res) => {
    res.status(403).json({ message: "AI question generation is disabled. Question bank is read-only." });
  });

  // Helper functions for similarity detection - moved outside block scope
const similarityThreshold = 0.80; // 80% similarity is considered a duplicate
function normalizeText(text: string): string {
  return text.trim().toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ');   // Normalize whitespace
}

function computeSimpleWordOverlap(text1: string, text2: string): number {
  const words1 = new Set(normalizeText(text1).split(' '));
  const words2 = new Set(normalizeText(text2).split(' '));

  if (words1.size === 0 || words2.size === 0) return 0;

  // Count common words
  let commonCount = 0;
  // Use array from Set for iteration to avoid downlevelIteration issue
  Array.from(words1).forEach(word => {
    if (words2.has(word)) commonCount++;
  });

  // Jaccard similarity: intersection / union
  return commonCount / (words1.size + words2.size - commonCount);
}

function detectKeyPhrases(text: string): string[] {
  const normalized = normalizeText(text);
  // Extract common OOP phrases that would indicate a question's topic
  const phrases = [
    'class', 'object', 'inheritance', 'polymorphism', 
    'encapsulation', 'abstraction', 'constructor', 'destructor', 
    'virtual', 'override', 'template', 'exception', 'operator overload',
    'overriding', 'overloading', 'interface', 'multiple inheritance',
    'abstract class', 'friend function', 'static member', 'dynamic binding'
  ];

  return phrases.filter(phrase => normalized.includes(phrase));
}

function hasSimilarContent(existingQuestion: any, newQuestion: any): boolean {
  const existingContent = existingQuestion.content;
  const newContent = newQuestion.question;

  // Check for exact duplication (case-insensitive)
  const exactMatch = normalizeText(existingContent) === normalizeText(newContent);
  if (exactMatch) return true;

  // Check for high word overlap
  const overlapScore = computeSimpleWordOverlap(existingContent, newContent);
  if (overlapScore > similarityThreshold) return true;

  // Check for shared key OOP phrases/concepts (duplicate topic)
  const existingPhrases = detectKeyPhrases(existingContent);
  const newPhrases = detectKeyPhrases(newContent);

  // If both questions have the same key phrases and same question type, they're likely duplicates
  if (existingPhrases.length > 0 && 
      newPhrases.length > 0 && 
      existingPhrases.every(p => newPhrases.includes(p)) &&
      existingQuestion.type === newQuestion.type) {
    return true;
  }

  return false;
}

// Save selected questions to the database with enhanced duplicate checking
app.post("/api/ai/save-questions", ensureTeacher, async (req, res) => {
  try {
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "No questions provided" });
    }

    // Get all existing questions for the teacher for duplicate checking
    const existingQuestions = await storage.getQuestionsByTeacher(1);

    const savedQuestions = [];
    const duplicates = [];

      // Check for duplicates among selected questions themselves first
      const uniqueSelectedQuestions = [];
      const internalDuplicates = new Set();

      for (let i = 0; i < questions.length; i++) {
        let isDuplicateWithinSelection = false;

        for (let j = 0; j < uniqueSelectedQuestions.length; j++) {
          if (hasSimilarContent({ content: uniqueSelectedQuestions[j].question, type: uniqueSelectedQuestions[j].type }, 
                               { question: questions[i].question, type: questions[i].type })) {
            isDuplicateWithinSelection = true;
            break;
          }
        }

        if (!isDuplicateWithinSelection) {
          uniqueSelectedQuestions.push(questions[i]);
        } else {
          internalDuplicates.add(i);
          duplicates.push(questions[i].question);
        }
      }

      // Then check for duplicates against existing database questions
      for (const questionData of uniqueSelectedQuestions) {
        try {
          // Check for similarity with existing questions
          const isDuplicate = existingQuestions.some(q => 
            hasSimilarContent(q, questionData)
          );

          if (isDuplicate) {
            duplicates.push(questionData.question);
            continue;
          }

          const question = await storage.createQuestion({
            subject: questionData.subject,
            gradeLevel: questionData.gradeLevel,
            type: questionData.type,
            difficulty: questionData.difficulty,
            content: questionData.question,
            answer: questionData.correctAnswer,
            teacherId: 1
          });

          savedQuestions.push(question);
        } catch (err) {
          console.error("Error saving generated question:", err);
        }
      }

      // Response message varies based on whether there were duplicates
      let message = `${savedQuestions.length} questions have been saved to your question bank.`;
      if (duplicates.length > 0) {
        message += ` ${duplicates.length} duplicate question(s) were skipped.`;
      }

      res.json({
        questions: savedQuestions,
        duplicates: duplicates.length,
        message
      });
    } catch (error: any) {
      console.error("Error saving selected questions:", error);
      res.status(500).json({ 
        message: error.message || "Error saving selected questions" 
      });
    }
  });

  // Quiz routes
  app.get("/api/quizzes", ensureAuthenticated, async (req, res) => {
    try {
      const now = new Date();
      let list: any[] = [];

      if (req.user!.role === "teacher") {
        // Quizzes owned by the teacher
        const quizzes = await storage.getQuizzesByTeacher(req.user!.id);
        list = quizzes.map((q: any) => {
          // Derive status based on scheduled window [scheduledAt, scheduledAt + duration)
          if (q.scheduledAt && !["completed", "cancelled"].includes(q.status)) {
            const startMs = new Date(q.scheduledAt).getTime();
            const endMs = startMs + (q.duration ?? 0) * 60_000; // duration in minutes
            const nowMs = now.getTime();
            if (!isNaN(startMs) && !isNaN(endMs)) {
              if (nowMs >= endMs) {
                return { ...q, status: "completed" };
              }
              if (nowMs >= startMs && nowMs < endMs) {
                return { ...q, status: "active" };
              }
            }
          }
          return q;
        });
      } else {
        // Student: return assigned quizzes with their attempt status
        const sQuizzes = await storage.getStudentQuizzesByStudent(req.user!.id);
        const quizzes = await Promise.all(sQuizzes.map((sq: any) => storage.getQuiz(sq.quizId)));
        list = quizzes.map((q: any, i: number) => {
          const sq = sQuizzes[i];
          // Safety: skip missing quiz records
          if (!q) return null;
          // Derive status based on scheduled window [scheduledAt, scheduledAt + duration)
          let status = q.status;
          if (q.scheduledAt && !["completed", "cancelled"].includes(q.status)) {
            const startMs = new Date(q.scheduledAt).getTime();
            const endMs = startMs + (q.duration ?? 0) * 60_000; // duration in minutes
            const nowMs = now.getTime();
            if (!isNaN(startMs) && !isNaN(endMs)) {
              if (nowMs >= endMs) status = "completed";
              else if (nowMs >= startMs && nowMs < endMs) status = "active";
            }
          }
          return {
            ...q,
            status,
            studentStatus: sq.status,
            studentQuizId: sq.id,
            quizId: q.id,
          };
        }).filter(Boolean) as any[];
      }

      res.json(list);
    } catch (error) {
      console.error("Error getting quizzes:", error);
      res.status(500).json({ message: "Error retrieving quizzes" });
    }
  });

  app.post("/api/quizzes", ensureTeacher, async (req, res) => {
    try {
      //if (!req.user) {
      //  return res.status(401).json({ message: "Unauthorized" });
      //}

      // Get class details to populate subject and gradeLevel
      const selectedClass = await storage.getClass(req.body.classId);
      if (!selectedClass) {
        return res.status(400).json({ message: "Selected class not found" });
      }

      const quizData = insertQuizSchema.parse({
        title: req.body.title,
        classId: req.body.classId,
        subject: selectedClass.subject,
        gradeLevel: "University", // BSCS is university level
        duration: req.body.duration,
        scheduledAt: req.body.scheduledAt,
        teacherId: req.user!.id,
        status: req.body.scheduledAt ? (new Date(req.body.scheduledAt) <= new Date() ? "active" : "scheduled") : "draft"
      });

      const quiz = await storage.createQuiz(quizData);

      // Add questions to quiz if provided
      if (req.body.questionIds && Array.isArray(req.body.questionIds)) {
        await Promise.all(req.body.questionIds.map(async (questionId: number, index: number) => {
          await storage.addQuestionToQuiz(quiz.id, questionId, index + 1);
        }));
      }

      // Automatically assign quiz to all students in the selected class
      if (req.body.classId) {
        const studentsInClass = await storage.getClassStudents(req.body.classId);
        await Promise.all(studentsInClass.map(async (student: any) => {
          await storage.assignQuizToStudent(quiz.id, student.id);
        }));
      }

      res.status(201).json(quiz);
    } catch (error: any) {
      if (error.name === "ZodError") {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error creating quiz:", error);
      res.status(500).json({ message: "Error creating quiz" });
    }
  });

  app.get("/api/quizzes/:id", ensureAuthenticated, async (req, res) => {
    try {
      //if (!req.user) {
      //  return res.status(401).json({ message: "Unauthorized" });
      //}

      const quizId = parseInt(req.params.id);
      const quiz = await storage.getQuiz(quizId);

      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }

      // Get questions for this quiz
      const questions = await storage.getQuizQuestions(quizId);

      // If user is a student, check if they are assigned to this quiz
      //if (req.user.role === "student") {
      //  const studentQuizzes = await storage.getStudentQuizzesByStudent(req.user.id);
      //  const studentQuiz = studentQuizzes.find(sq => sq.quizId === quizId);

      //  if (!studentQuiz) {
      //    return res.status(403).json({ message: "You don't have access to this quiz" });
      //  }

      //  res.json({
      //    quiz,
      //    questions,
      //    studentQuiz
      //  });
      //} else {
        res.json({
          quiz,
          questions
        });
      //}
    } catch (error) {
      console.error("Error getting quiz:", error);
      res.status(500).json({ message: "Error retrieving quiz" });
    }
  });

  app.get("/api/quizzes/:id/questions", async (req, res) => {
    try {
      const quizId = parseInt(req.params.id);
      console.log("Fetching questions for quiz ID:", quizId);
      
      const questions = await storage.getQuizQuestions(quizId);
      console.log("Found questions:", questions.length);
      
      res.json(questions);
    } catch (error: any) {
      console.error("Error getting quiz questions:", error);
      res.status(500).json({ message: "Error retrieving quiz questions" });
    }
  });

  app.put("/api/quizzes/:id", ensureTeacher, async (req, res) => {
    try {
      const quizId = parseInt(req.params.id);
      const quiz = await storage.getQuiz(quizId);
      if (!quiz) return res.status(404).json({ message: "Quiz not found" });

      const updateData = { ...req.body };
      if (updateData.scheduledAt && typeof updateData.scheduledAt === 'string') {
        updateData.scheduledAt = new Date(updateData.scheduledAt);
      }

      // If teacher ends the quiz now → mark quiz completed and auto-complete all student attempts
      if (updateData.status === "completed" && quiz.status !== "completed") {
        // Update quiz status first
        const updatedQuiz = await storage.updateQuiz(quizId, { status: "completed" });

        // Auto-complete all attempts for this quiz
        const sQuizzes = await storage.getStudentQuizzesByQuiz(quizId);
        for (const sq of sQuizzes) {
          if (sq.status !== "completed") {
            try {
              const answers = await storage.getStudentAnswersByQuiz(sq.id);
              const totalScore = answers.reduce((sum, a) => sum + (a.score || 0), 0);
              const avg = answers.length > 0 ? Math.round(totalScore / answers.length) : 0;
              await storage.updateStudentQuizStatus(sq.id, "completed", avg);
              await storage.logAttemptEvent(sq.id, "manual_submit", { reason: "quiz_ended_by_teacher" });
            } catch (e) {
              console.warn("Failed to complete attempt", sq.id, e);
            }
          }
        }

        return res.json(updatedQuiz);
      }

      // Otherwise, proceed with normal updates
      if (updateData.scheduledAt instanceof Date) {
        const now = new Date();
        if (updateData.scheduledAt > now) updateData.status = "scheduled";
      } else if (updateData.scheduledAt === null || updateData.scheduledAt === undefined) {
        updateData.status = "draft";
      }

      const updatedQuiz = await storage.updateQuiz(quizId, updateData);

      // Only update questions when the client explicitly sends a non-empty list
      if (Array.isArray(req.body.questionIds) && req.body.questionIds.length > 0) {
        await storage.updateQuizQuestions(quizId, req.body.questionIds);
      }
      // If questionIds is omitted or empty, keep existing questions as-is

      res.json(updatedQuiz);
    } catch (error) {
      console.error("Error updating quiz:", error);
      res.status(500).json({ message: "Error updating quiz" });
    }
  });

  app.delete("/api/quizzes/:id", ensureTeacher, async (req, res) => {
    try {
      const quizId = parseInt(req.params.id);
      const quiz = await storage.getQuiz(quizId);

      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }

      await storage.deleteQuiz(quizId);
      res.json({ message: "Quiz deleted successfully" });
    } catch (error) {
      console.error("Error deleting quiz:", error);
      res.status(500).json({ message: "Error deleting quiz" });
    }
  });

  // Safe endpoint for students to check access and get minimal info before starting
  app.get("/api/quizzes/:id/take", ensureAuthenticated, async (req, res) => {
    try {
      const quizId = parseInt(req.params.id);
      const quiz = await storage.getQuiz(quizId);
      if (!quiz) return res.status(404).json({ message: "Quiz not found" });

      // If user is a student, ensure they are assigned to this quiz
      if (req.user!.role === "student") {
        const studentQuizzes = await storage.getStudentQuizzesByStudent(req.user!.id);
        const studentQuiz = studentQuizzes.find((sq: any) => sq.quizId === quizId);
        if (!studentQuiz) {
          return res.status(403).json({ message: "You don't have access to this quiz" });
        }
      }

      // Compute a non-sensitive summary (counts only) without returning question content
      const quizQuestions = await storage.getQuizQuestions(quizId);
      const types: Record<string, number> = {};
      for (const q of quizQuestions) {
        types[(q as any).type] = (types[(q as any).type] || 0) + 1;
      }
      const summary = { totalQuestions: quizQuestions.length, types };

      // Return minimal data and summary to allow client to render the pre-start screen
      res.json({ 
        id: quiz.id, 
        title: quiz.title, 
        scheduledAt: quiz.scheduledAt, 
        status: quiz.status, 
        duration: quiz.duration,
        summary
      });
    } catch (error) {
      console.error("Error preparing quiz take page:", error);
      res.status(500).json({ message: "Error preparing quiz" });
    }
  });

  // Student quiz assignment
  app.post("/api/quizzes/:id/assign", ensureTeacher, async (req, res) => {
    try {
      const quizId = parseInt(req.params.id);
      const studentIds = req.body.studentIds;

      if (!Array.isArray(studentIds)) {
        return res.status(400).json({ message: "studentIds must be an array" });
      }

      const quiz = await storage.getQuiz(quizId);

      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }

      //if (quiz.teacherId !== req.user.id) {
      //  return res.status(403).json({ message: "You can only assign your own quizzes" });
      //}

      const assignments = await Promise.all(studentIds.map(async (studentId) => {
        const assignmentData = insertStudentQuizSchema.parse({
          studentId,
          quizId,
          status: "assigned"
        });

        return storage.assignQuizToStudent(assignmentData);
      }));

      res.status(201).json(assignments);
    } catch (error: any) {
      if (error.name === "ZodError") {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error assigning quiz:", error);
      res.status(500).json({ message: "Error assigning quiz" });
    }
  });

  // Student quiz start: randomize order and set endsAt
  app.post("/api/student-quizzes/:id/start", ensureStudent, async (req: AuthRequest, res) => {
    try {
      const studentQuizId = parseInt(req.params.id);
      const studentQuiz = await storage.getStudentQuiz(studentQuizId);

      if (!studentQuiz) {
        return res.status(404).json({ message: "Quiz assignment not found" });
      }

      // Authorization: must be the assigned student
      if (studentQuiz.studentId !== req.user!.id) {
        return res.status(403).json({ message: "You can only access your own quizzes" });
      }

      if (studentQuiz.status !== "assigned") {
        return res.status(400).json({ message: `Quiz is already ${studentQuiz.status}` });
      }

      // Build randomized question order for this attempt
      const quizQuestions = await storage.getQuizQuestions(studentQuiz.quizId);
      const order = quizQuestions.map(q => q.id).sort(() => Math.random() - 0.5);

      // Compute endsAt from quiz.duration (minutes)
      const quiz = await storage.getQuiz(studentQuiz.quizId);
      if (quiz?.scheduledAt && new Date(quiz.scheduledAt).getTime() > Date.now()) {
        return res.status(400).json({ message: "Quiz has not started yet" });
      }
      const durationMinutes = quiz?.duration ?? 0;
      const endsAt = new Date(Date.now() + durationMinutes * 60_000);

      // Save plan on student_quizzes and mark in_progress
      await storage.setAttemptPlan(studentQuizId, order, endsAt, true);
      const updatedStudentQuiz = await storage.updateStudentQuizStatus(studentQuizId, "in_progress");

      // Log attempt start
      await storage.logAttemptEvent(studentQuizId, "attempt_start", { endsAt, questionCount: order.length });

      res.json({ ...updatedStudentQuiz, questionOrder: order, endsAt });
    } catch (error) {
      console.error("Error starting quiz:", error);
      res.status(500).json({ message: "Error starting quiz" });
    }
  });

  // Enhanced answer submission route to support code answers
  app.post("/api/student-quizzes/:id/answers", ensureStudent, async (req: AuthRequest, res) => {
    try {
      const studentQuizId = parseInt(req.params.id);
      const { questionId, answer, codeAnswer, codeOutput, codeError } = req.body;

      if (!questionId || typeof answer !== 'string') {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const studentQuiz = await storage.getStudentQuiz(studentQuizId);
      if (!studentQuiz) return res.status(404).json({ message: "Quiz assignment not found" });

      // Authorization: must be the assigned student
      if (studentQuiz.studentId !== req.user!.id) {
        return res.status(403).json({ message: "You can only submit answers for your own quiz" });
      }

      if (studentQuiz.status !== "in_progress") return res.status(400).json({ message: "Quiz is not in progress" });

      // Reject answers after endsAt
      if (studentQuiz.endsAt && new Date(studentQuiz.endsAt).getTime() < Date.now()) {
        await storage.updateStudentQuizStatus(studentQuizId, "completed");
        return res.status(400).json({ message: "Attempt has ended" });
      }

      const studentAnswer = await storage.submitStudentAnswer({
        studentQuizId,
        questionId,
        answer,
        codeAnswer,
        codeOutput,
        codeError
      });

      // Log answer submission event
      await storage.logAttemptEvent(studentQuizId, "answer_submit", { questionId });

      res.status(201).json(studentAnswer);
    } catch (error: any) {
      console.error("Error submitting answer:", error);
      res.status(500).json({ message: "Error submitting answer" });
    }
  });

  // Proctoring events: log and retrieve, plus single attempt fetch
  const VIOLATION_TYPES = ["tab_blur", "visibility_hidden", "fullscreen_exit", "suspicious_face"]; // used for auto-complete on excessive violations
  const VIOLATION_THRESHOLD = 3;
  const VIOLATION_WINDOW_MS = 2 * 60_000; // last 2 minutes

  async function completeAttemptAndScore(studentQuizId: number) {
    const answers = await storage.getStudentAnswersByQuiz(studentQuizId);
    const totalScore = answers.reduce((sum, a) => sum + (a.score || 0), 0);
    const averageScore = answers.length > 0 ? Math.round(totalScore / answers.length) : 0;
    return storage.updateStudentQuizStatus(studentQuizId, "completed", averageScore);
  }

  // Log a proctoring event (student)
  app.post("/api/student-quizzes/:id/events", ensureStudent, async (req: AuthRequest, res) => {
    try {
      const studentQuizId = parseInt(req.params.id);
      const { type, details } = req.body || {};

      if (!type || typeof type !== "string") {
        return res.status(400).json({ message: "Event 'type' is required" });
      }

      const studentQuiz = await storage.getStudentQuiz(studentQuizId);
      if (!studentQuiz) return res.status(404).json({ message: "Quiz assignment not found" });
      if (studentQuiz.studentId !== req.user!.id) {
        return res.status(403).json({ message: "You can only log events for your own quiz" });
      }

      if (studentQuiz.status !== "in_progress") {
        return res.status(400).json({ message: "Attempt is not in progress" });
      }

      // If time expired, auto-complete first
      if (studentQuiz.endsAt && new Date(studentQuiz.endsAt).getTime() <= Date.now()) {
        const updated = await completeAttemptAndScore(studentQuizId);
        await storage.logAttemptEvent(studentQuizId, "timeout_submit", { reason: "ends_at_passed" });
        return res.json({ completed: true, studentQuiz: updated });
      }

      const event = await storage.logAttemptEvent(studentQuizId, type, details);

      // Evaluate violations and auto-complete if threshold exceeded
      if (VIOLATION_TYPES.includes(type)) {
        const recentCount = await storage.countRecentViolationEvents(studentQuizId, VIOLATION_TYPES, VIOLATION_WINDOW_MS);
        if (recentCount >= VIOLATION_THRESHOLD) {
          const updated = await completeAttemptAndScore(studentQuizId);
          await storage.logAttemptEvent(studentQuizId, "violation_threshold", { threshold: VIOLATION_THRESHOLD, windowMs: VIOLATION_WINDOW_MS });
          return res.json({ logged: event, completed: true, studentQuiz: updated });
        }
      }

      res.status(201).json({ logged: event });
    } catch (error) {
      console.error("Error logging attempt event:", error);
      res.status(500).json({ message: "Error logging attempt event" });
    }
  });

  // Get proctoring events (student owner or teacher of the quiz)
  app.get("/api/student-quizzes/:id/events", ensureAuthenticated, async (req: AuthRequest, res) => {
    try {
      const studentQuizId = parseInt(req.params.id);
      const studentQuiz = await storage.getStudentQuiz(studentQuizId);
      if (!studentQuiz) return res.status(404).json({ message: "Quiz assignment not found" });

      const user = req.user!;
      if (user.role === "student" && studentQuiz.studentId !== user.id) {
        return res.status(403).json({ message: "You can only view your own quiz events" });
      }
      if (user.role === "teacher") {
        const quiz = await storage.getQuiz(studentQuiz.quizId);
        if (!quiz || quiz.teacherId !== user.id) {
          return res.status(403).json({ message: "You can only view events for your own quizzes" });
        }
      }

      const events = await storage.getAttemptEvents(studentQuizId, 500);
      res.json(events);
    } catch (error) {
      console.error("Error retrieving attempt events:", error);
      res.status(500).json({ message: "Error retrieving attempt events" });
    }
  });

  // Get a single student quiz with quiz info (authorization: student owner or teacher)
  app.get("/api/student-quizzes/:id", ensureAuthenticated, async (req: AuthRequest, res) => {
    try {
      const studentQuizId = parseInt(req.params.id);
      const studentQuiz = await storage.getStudentQuiz(studentQuizId);
      if (!studentQuiz) return res.status(404).json({ message: "Quiz assignment not found" });

      const user = req.user!;
      if (user.role === "student" && studentQuiz.studentId !== user.id) {
        return res.status(403).json({ message: "You can only view your own quiz" });
      }
      if (user.role === "teacher") {
        const quiz = await storage.getQuiz(studentQuiz.quizId);
        if (!quiz || quiz.teacherId !== user.id) {
          return res.status(403).json({ message: "You can only view attempts for your own quizzes" });
        }
      }

      const quiz = await storage.getQuiz(studentQuiz.quizId);
      res.json({ ...studentQuiz, quiz });
    } catch (error) {
      console.error("Error retrieving student quiz:", error);
      res.status(500).json({ message: "Error retrieving student quiz" });
    }
  });

  // Get all student quizzes for the current student (includes attempt meta)
  app.get("/api/student-quizzes", ensureStudent, async (req: AuthRequest, res) => {
    try {
      const studentId = req.user!.id;
      const sQuizzes = await storage.getStudentQuizzesByStudent(studentId);
      const now = new Date();

      const enriched = await Promise.all(
        sQuizzes.map(async (sq) => {
          const quiz = await storage.getQuiz(sq.quizId);
          if (!quiz) return null;
          let status = quiz.status;
          if (quiz.scheduledAt && new Date(quiz.scheduledAt) <= now && !["completed", "cancelled"].includes(quiz.status)) {
            status = "active";
          }
          return { ...sq, quiz: { ...quiz, status } };
        })
      );

      res.json(enriched.filter(Boolean));
    } catch (error) {
      console.error("Error getting student quizzes:", error);
      res.status(500).json({ message: "Error retrieving student quizzes" });
    }
  });

  // Get student answers for a quiz
  app.get("/api/student-quizzes/:id/answers", ensureAuthenticated, async (req: AuthRequest, res) => {
    try {
      const studentQuizId = parseInt(req.params.id);
      const studentQuiz = await storage.getStudentQuiz(studentQuizId);

      if (!studentQuiz) {
        return res.status(404).json({ message: "Quiz assignment not found" });
      }

      // Authorization: student owner or quiz teacher can view
      const user = req.user!;
      if (user.role === "student" && studentQuiz.studentId !== user.id) {
        return res.status(403).json({ message: "You can only view your own answers" });
      }
      if (user.role === "teacher") {
        const quiz = await storage.getQuiz(studentQuiz.quizId);
        if (!quiz || quiz.teacherId !== user.id) {
          return res.status(403).json({ message: "You can only view answers for your own quizzes" });
        }
      }

      const answers = await storage.getStudentAnswersByQuiz(studentQuizId);
      // Optionally redact or transform answer fields if needed
      res.json(answers);
    } catch (error) {
      console.error("Error getting student answers:", error);
      res.status(500).json({ message: "Error retrieving student answers" });
    }
  });

  app.post("/api/student-quizzes/:id/complete", ensureStudent, async (req: AuthRequest, res) => {
    try {
      const studentQuizId = parseInt(req.params.id);
      const studentQuiz = await storage.getStudentQuiz(studentQuizId);

      if (!studentQuiz) return res.status(404).json({ message: "Quiz assignment not found" });

      // Authorization: must be the assigned student
      if (studentQuiz.studentId !== req.user!.id) {
        return res.status(403).json({ message: "You can only complete your own quiz" });
      }

      if (studentQuiz.status !== "in_progress") return res.status(400).json({ message: "Quiz is not in progress" });

      // Save all answers before completing
      const { answers } = req.body;
      if (answers && Array.isArray(answers)) {
        for (const answer of answers) {
          if (answer.questionId && typeof answer.answer === 'string') {
            await storage.submitStudentAnswer({
              studentQuizId,
              questionId: answer.questionId,
              answer: answer.answer,
              codeAnswer: answer.codeAnswer,
              codeOutput: answer.codeOutput,
              codeError: answer.codeError
            });
          }
        }
      }

      // Mark quiz as completed without calculating scores (will be done by teacher grading)
      const updatedStudentQuiz = await storage.updateStudentQuizStatus(studentQuizId, "completed");

      // Log completion event
      await storage.logAttemptEvent(studentQuizId, "manual_submit");

      res.json(updatedStudentQuiz);
    } catch (error) {
      console.error("Error completing quiz:", error);
      res.status(500).json({ message: "Error completing quiz" });
    }
  });

  // Teacher grading endpoints
  app.get("/api/quizzes/:quizId/grading", ensureTeacher, async (req: AuthRequest, res) => {
    try {
      const quizId = parseInt(req.params.quizId);

      // Verify teacher owns this quiz
      const quiz = await storage.getQuiz(quizId);
      if (!quiz || quiz.teacherId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get all student attempts for this quiz
      const attempts = await storage.getAttemptsWithUsersByQuiz(quizId);

      // Filter to only completed attempts
      const completedAttempts = attempts.filter(a => a.status === "completed");

      res.json(completedAttempts);
    } catch (error) {
      console.error("Error getting grading data:", error);
      res.status(500).json({ message: "Error retrieving grading data" });
    }
  });

  app.get("/api/student-quizzes/:studentQuizId/answers-with-questions", ensureTeacher, async (req: AuthRequest, res) => {
    try {
      const studentQuizId = parseInt(req.params.studentQuizId);
      const studentQuiz = await storage.getStudentQuiz(studentQuizId);

      if (!studentQuiz) return res.status(404).json({ message: "Student quiz not found" });

      // Verify teacher owns the quiz
      const quiz = await storage.getQuiz(studentQuiz.quizId);
      if (!quiz || quiz.teacherId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const answers = await storage.getStudentAnswersByQuiz(studentQuizId);
      const questions = await storage.getQuizQuestions(studentQuiz.quizId);

      // Combine answers with question details
      const answersWithQuestions = answers.map(answer => {
        const question = questions.find(q => q.id === answer.questionId);
        return {
          ...answer,
          question: question ? {
            id: question.id,
            content: question.content,
            type: question.type,
            answer: question.answer // Include correct answer for grading
          } : null
        };
      });

      res.json(answersWithQuestions);
    } catch (error) {
      console.error("Error getting student answers:", error);
      res.status(500).json({ message: "Error retrieving student answers" });
    }
  });

  app.post("/api/student-quizzes/:studentQuizId/grade", ensureTeacher, async (req: AuthRequest, res) => {
    try {
      const studentQuizId = parseInt(req.params.studentQuizId);
      const { questionId, score, feedback } = req.body;

      const studentQuiz = await storage.getStudentQuiz(studentQuizId);
      if (!studentQuiz) return res.status(404).json({ message: "Student quiz not found" });

      // Verify teacher owns the quiz
      const quiz = await storage.getQuiz(studentQuiz.quizId);
      if (!quiz || quiz.teacherId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedAnswer = await storage.updateStudentAnswerScore(studentQuizId, questionId, score, feedback);
      res.json(updatedAnswer);
    } catch (error) {
      console.error("Error grading answer:", error);
      res.status(500).json({ message: "Error grading answer" });
    }
  });

  app.post("/api/quizzes/:quizId/post-results", ensureTeacher, async (req: AuthRequest, res) => {
    try {
      const quizId = parseInt(req.params.quizId);

      // Verify teacher owns this quiz
      const quiz = await storage.getQuiz(quizId);
      if (!quiz || quiz.teacherId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get all completed attempts
      const attempts = await storage.getStudentQuizzesByQuiz(quizId);
      const completedAttempts = attempts.filter(a => a.status === "completed");

      // Calculate and update final scores
      for (const attempt of completedAttempts) {
        const answers = await storage.getStudentAnswersByQuiz(attempt.id);
        const totalScore = answers.reduce((sum, answer) => sum + (answer.score || 0), 0);
        const averageScore = answers.length > 0 ? Math.round(totalScore / answers.length) : 0;

        await storage.updateStudentQuizStatus(attempt.id, "completed", averageScore);

        // Create notification for student
        await storage.createNotification({
          userId: attempt.studentId,
          title: "Quiz Results Available",
          message: `Your results for "${quiz.title}" are now available. Your score: ${averageScore}%`,
          type: "quiz_result",
          relatedId: quizId
        });
      }

      res.json({ message: "Results posted successfully", updatedAttempts: completedAttempts.length });
    } catch (error) {
      console.error("Error posting results:", error);
      res.status(500).json({ message: "Error posting results" });
    }
  });

  // Student management
  app.get("/api/students", ensureTeacher, async (req, res) => {
    try {
      // Get authenticated teacher's ID with demo fallback
      const teacherId = req.user?.id || 5;
        const classes = await storage.getClassesByTeacher(teacherId);

        if (classes.length === 0) {
          // If teacher has no classes, return all students
          const allStudents = await storage.getUsersByRole("student");
          const sanitizedStudents = allStudents.map(student => {
            const { password, ...rest } = student;
            return rest;
          });
          return res.json(sanitizedStudents);
        }

        let allStudents: any[] = [];
        for (const cls of classes) {
          const students = await storage.getClassStudents(cls.id);
          // Add class info to each student
          const studentsWithClass = students.map(student => ({
            ...student,
            classes: [{ id: cls.id, name: cls.name }]
          }));

          // Merge with existing students or add new ones
          studentsWithClass.forEach(newStudent => {
            const existingIndex = allStudents.findIndex(s => s.id === newStudent.id);
            if (existingIndex >= 0) {
              // Add class to existing student
              allStudents[existingIndex].classes.push(...newStudent.classes);
            } else {
              // Add new student
              allStudents.push(newStudent);
            }
          });
        }

        return res.json(allStudents);
    } catch (error) {
      console.error("Error getting students:", error);
      res.status(500).json({ message: "Error retrieving students" });
    }
  });

  // Use the new role-specific endpoints instead of this one
  // This route is deprecated but kept for backward compatibility

  app.post("/api/classes", ensureTeacher, async (req, res) => {
    try {
      // Get the authenticated teacher's ID
      const teacherId = req.user?.id;
      if (!teacherId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check for duplicate class name for this teacher
      const existingClass = await storage.getClassByNameAndTeacher(req.body.name, teacherId);
      if (existingClass) {
        return res.status(409).json({ 
          message: "You already have a class with this name. Please choose a different name." 
        });
      }

      const classData = insertClassSchema.parse({
        ...req.body,
        teacherId: teacherId
      });

      const newClass = await storage.createClass(classData);
      res.status(201).json(newClass);
    } catch (error: any) {
      if (error.name === "ZodError") {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error creating class:", error);
      res.status(500).json({ message: "Error creating class" });
    }
  });

  // Edit class
  app.put("/api/classes/:id", ensureTeacher, async (req, res) => {
    try {
      const classId = parseInt(req.params.id);
      const teacherId = req.user?.id;
      
      if (!teacherId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const existingClass = await storage.getClass(classId);
      if (!existingClass) {
        return res.status(404).json({ message: "Class not found" });
      }

      if (existingClass.teacherId !== teacherId) {
        return res.status(403).json({ message: "You can only edit your own classes" });
      }

      // Check for duplicate name if name is being changed
      if (req.body.name && req.body.name !== existingClass.name) {
        const duplicateClass = await storage.getClassByNameAndTeacher(req.body.name, teacherId);
        if (duplicateClass) {
          return res.status(409).json({ 
            message: "You already have a class with this name. Please choose a different name." 
          });
        }
      }

      const classData = insertClassSchema.parse({
        ...req.body,
        teacherId: teacherId
      });

      const updatedClass = await storage.updateClass(classId, classData);
      res.json(updatedClass);
    } catch (error: any) {
      if (error.name === "ZodError") {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error updating class:", error);
      res.status(500).json({ message: "Error updating class" });
    }
  });

  // Delete class
  app.delete("/api/classes/:id", ensureTeacher, async (req, res) => {
    try {
      const classId = parseInt(req.params.id);
      const teacherId = req.user?.id;
      
      if (!teacherId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const existingClass = await storage.getClass(classId);
      if (!existingClass) {
        return res.status(404).json({ message: "Class not found" });
      }

      if (existingClass.teacherId !== teacherId) {
        return res.status(403).json({ message: "You can only delete your own classes" });
      }

      await storage.deleteClass(classId);
      res.json({ message: "Class deleted successfully" });
    } catch (error) {
      console.error("Error deleting class:", error);
      res.status(500).json({ message: "Error deleting class" });
    }
  });

  app.post("/api/classes/:id/students", ensureTeacher, async (req, res) => {
    try {
      const classId = parseInt(req.params.id);
      const { studentIds } = req.body;

      if (!Array.isArray(studentIds)) {
        return res.status(400).json({ message: "studentIds must be an array" });
      }

      const classData = await storage.getClass(classId);

      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }

      //if (classData.teacherId !== req.user.id) {
      //  return res.status(403).json({ message: "You can only manage your own classes" });
      //}

      const results = await Promise.all(studentIds.map(async (studentId) => {
        return storage.addStudentToClass(classId, studentId);
      }));

      res.status(201).json(results);
    } catch (error) {
      console.error("Error adding students to class:", error);
      res.status(500).json({ message: "Error adding students to class" });
    }
  });

  app.get("/api/classes/:id/students", ensureTeacher, async (req, res) => {
    try {
      const classId = parseInt(req.params.id);
      const classData = await storage.getClass(classId);

      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }

      //if (classData.teacherId !== req.user.id) {
      //  return res.status(403).json({ message: "You can only view your own classes" });
      //}

      const students = await storage.getClassStudents(classId);
      // Remove sensitive information
      const sanitizedStudents = students.map(student => {
        const { password, ...rest } = student;
        return rest;
      });

      res.json(sanitizedStudents);
    } catch (error) {
      console.error("Error getting class students:", error);
      res.status(500).json({ message: "Error retrieving class students" });
    }
  });

  // Practice Quiz feature for students
  app.post("/api/practice-quiz/generate", ensureStudent, async (req, res) => {
    try {
      // For demo purposes, use mock student ID 4 (the current logged-in student)
      const user = {id: 4};

      const { subject, chapter, questionCount = 5 } = req.body;

      if (!subject) {
        return res.status(400).json({ message: "Subject is required" });
      }

      // Get all questions for the selected subject and chapter (if specified)
      const searchFilters: any = { subject };
      if (chapter) {
        searchFilters.chapter = chapter;
      }
      
      const allQuestions = await storage.searchQuestions(searchFilters);

      if (allQuestions.length === 0) {
        return res.status(404).json({ 
          message: `No questions found for subject: ${subject}. Please try another subject.` 
        });
      }

      // Randomly select the requested number of questions or all available if less
      const selectedCount = Math.min(parseInt(questionCount.toString()), allQuestions.length);

      // Shuffle the questions array
      const shuffledQuestions = [...allQuestions].sort(() => Math.random() - 0.5);

      // Take only the requested number of questions
      const practiceQuestions = shuffledQuestions.slice(0, selectedCount);

      // Create a practice quiz in the database
      const practiceQuiz = await storage.createPracticeQuiz({
        studentId: user.id,
        subject,
        chapter,
        questionCount: selectedCount,
        status: 'in_progress'
      });

      // Add each question to the practice quiz
      for (const question of practiceQuestions) {
        await storage.addQuestionToPracticeQuiz(practiceQuiz.id, question.id);
      }

      // Notify students in the same classes about new practice quiz (optional)
      const userClasses = await storage.getClassesByStudent(user.id);

      if (userClasses.length > 0) {
        // For each class, get the students and send notifications to them
        const processedStudentIds = new Set<number>();
        processedStudentIds.add(user.id); // Don't notify the creator

        for (const classItem of userClasses) {
          const classStudents = await storage.getClassStudents(classItem.id);

          for (const student of classStudents) {
            if (!processedStudentIds.has(student.id)) {
              processedStudentIds.add(student.id);

              // Create notification for the student
              await storage.createNotification({
                userId: student.id,
                title: "New Practice Quiz Available",
                message: `A new practice quiz on ${subject} is available for practice.`,
                type: "practice_quiz_available",
                relatedId: practiceQuiz.id
              });
            }
          }
        }
      }

      // Get practice quiz questions with full details
      const questionsWithDetails = await storage.getPracticeQuizQuestions(practiceQuiz.id);

      // Return the practice quiz data
      res.json({
        practiceQuiz: {
          ...practiceQuiz,
          questions: questionsWithDetails
        },
        message: `Generated practice quiz with ${practiceQuestions.length} questions on ${subject}`
      });
    } catch (error) {
      console.error("Error generating practice quiz:", error);
      res.status(500).json({ message: "Error generating practice quiz" });
    }
  });

  // Submit and grade practice quiz answers
  app.post("/api/practice-quiz/submit", ensureStudent, async (req, res) => {
    try {
      // For demo purposes, use mock student ID 4 (the current logged-in student)  
      const user = {id: 4};

      const { answers, practiceQuizId } = req.body;

      if (!answers || !Array.isArray(answers) || !practiceQuizId) {
        return res.status(400).json({ message: "Invalid submission data" });
      }

      // Verify the practice quiz exists and belongs to this student
      const practiceQuiz = await storage.getPracticeQuiz(practiceQuizId);

      if (!practiceQuiz) {
        return res.status(404).json({ message: "Practice quiz not found" });
      }

      if (practiceQuiz.studentId !== user.id) {
        return res.status(403).json({ message: "You don't have permission to submit this quiz" });
      }

      // Process and grade each answer
      const gradingResults = await Promise.all(
        answers.map(async (answerItem: { questionId: number; answer: string }) => {
          const { questionId, answer } = answerItem;

          // Get the original question
          const question = await storage.getQuestion(questionId);

          if (!question) {
            return {
              questionId,
              score: 0,
              feedback: "Question not found",
              success: false
            };
          }

          // Grade the answer using AI
          try {
            const gradingResult = await gradeStudentAnswer(
              question.content,
              question.answer,
              answer,
              question.subject
            );

            // Store the graded answer in the database
            const practiceQuizAnswer = await storage.submitPracticeQuizAnswer(
              practiceQuizId,
              questionId,
              answer,
              gradingResult.score,
              gradingResult.feedback,
              gradingResult.analysis
            );

            return {
              questionId,
              question: question.content,
              correctAnswer: question.answer,
              studentAnswer: answer,
              score: gradingResult.score,
              feedback: gradingResult.feedback,
              analysis: gradingResult.analysis,
              success: true
            };
          } catch (error: any) {
            console.error("Error grading practice answer:", error);
            return {
              questionId,
              question: question.content,
              correctAnswer: question.answer,
              studentAnswer: answer,
              score: 0,
              feedback: "Error grading answer",
              success: false
            };
          }
        })
      );

      // Calculate overall performance
      const validScores = gradingResults.filter(r => r.success).map(r => r.score);
      const averageScore = validScores.length > 0 
        ? Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length) 
        : 0;

      // Update the practice quiz status to completed with the average score
      await storage.updatePracticeQuizStatus(practiceQuizId, 'completed', averageScore);

      // Create a notification for the student about their result
      await storage.createNotification({
        userId: user.id,
        title: "Practice Quiz Results",
        message: `You completed a practice quiz in ${practiceQuiz.subject} with a score of ${averageScore}%.`,
        type: "practice_quiz_completed",
        relatedId: practiceQuizId
      });

      // Return the graded results
      res.json({
        practiceQuizId,
        results: gradingResults,
        averageScore,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error submitting practice quiz:", error);
      res.status(500).json({ message: "Error submitting practice quiz" });
    }
  });

  // Get available subjects for practice quizzes
  app.get("/api/practice-quiz/subjects", ensureStudent, async (req, res) => {
    try {
      // ensureStudent middleware already guarantees req.user exists
      //const user = req.user!;
      const user = {id: 1};

      // Define the 5 main CS subjects - OOP must be one of them
      const mainSubjects = [
        "Object-Oriented Programming",
        "Data Structures", 
        "Algorithms",
        "Databases",
        "Operating Systems"
      ];

      // Get all questions to count how many exist for each subject
      const allQuestions = await storage.searchQuestions({});
      
      // Calculate question counts for each main subject
      const questionCounts = mainSubjects.map(subject => ({
        subject,
        count: allQuestions.filter(q => q.subject === subject).length
      }));

      res.json({
        subjects: mainSubjects,
        questionCounts
      });
    } catch (error) {
      console.error("Error getting practice quiz subjects:", error);
      res.status(500).json({ message: "Error retrieving practice quiz subjects" });
    }
  });

  // Get available chapters for a specific subject
  app.get("/api/practice-quiz/chapters", ensureStudent, async (req, res) => {
    try {
      const { subject } = req.query;
      
      if (!subject || typeof subject !== 'string') {
        return res.status(400).json({ message: "Subject parameter is required" });
      }

      // Get all questions for the specified subject and extract unique chapters
      const subjectQuestions = await storage.searchQuestions({ subject });
      
      // Create a map of chapters with their minimum ID (for ordering) and count
      const chapterMap = new Map();
      
      subjectQuestions.forEach(q => {
        if (q.chapter && q.chapter.trim() !== '') {
          if (!chapterMap.has(q.chapter)) {
            chapterMap.set(q.chapter, {
              chapter: q.chapter,
              minId: q.id,
              count: 1
            });
          } else {
            const existing = chapterMap.get(q.chapter);
            existing.count++;
            if (q.id < existing.minId) {
              existing.minId = q.id;
            }
          }
        }
      });
      
      // Convert to array and sort by minimum ID (database order)
      const chaptersWithOrder = Array.from(chapterMap.values())
        .sort((a, b) => a.minId - b.minId);
      
      const chapters = chaptersWithOrder.map(c => c.chapter);
      const chapterCounts = chaptersWithOrder.map(c => ({
        chapter: c.chapter,
        count: c.count
      }));

      res.json({
        subject,
        chapters,
        chapterCounts
      });
    } catch (error) {
      console.error("Error getting practice quiz chapters:", error);
      res.status(500).json({ message: "Error retrieving practice quiz chapters" });
    }
  });

  // Get student's practice quiz history
  app.get("/api/practice-quiz/history", ensureStudent, async (req, res) => {
    try {
      // ensureStudent middleware already guarantees req.user exists
      //const user = req.user!;
      const user = {id: 1};

      // Get all practice quizzes for this student
      const practiceQuizzes = await storage.getPracticeQuizzesByStudent(user.id);

      res.json({
        practiceQuizzes
      });
    } catch (error) {
      console.error("Error getting practice quiz history:", error);
      res.status(500).json({ message: "Error retrieving practice quiz history" });
    }
  });

  // Get practice quiz details including questions and answers
  app.get("/api/practice-quiz/:id", ensureStudent, async (req, res) => {
    try {
      // ensureStudent middleware already guarantees req.user exists
      //const user = req.user!;
      const user = {id: 1};

      const practiceQuizId = parseInt(req.params.id);

      if (isNaN(practiceQuizId)) {
        return res.status(400).json({ message: "Invalid practice quiz ID" });
      }

      // Get the practice quiz
      const practiceQuiz = await storage.getPracticeQuiz(practiceQuizId);

      if (!practiceQuiz) {
        return res.status(404).json({ message: "Practice quiz not found" });
      }

      if (practiceQuiz.studentId !== user.id) {
        return res.status(403).json({ message: "You don't have permission to view this quiz" });
      }

      // Get the questions for this practice quiz
      const questions = await storage.getPracticeQuizQuestions(practiceQuizId);

      // Get the answers for this practice quiz
      const answers = await storage.getPracticeQuizAnswers(practiceQuizId);

      res.json({
        practiceQuiz,
        questions,
        answers
      });
    } catch (error) {
      console.error("Error getting practice quiz details:", error);
      res.status(500).json({ message: "Error retrieving practice quiz details" });
    }
  });

  // Get user notifications
  app.get("/api/notifications", authenticateToken, async (req, res) => {
    try {
      // Get notifications for the authenticated user
      const userId = req.user!.id;
      const notifications = await storage.getNotificationsByUser(userId);

      res.json({
        notifications
      });
    } catch (error) {
      console.error("Error getting notifications:", error);
      res.status(500).json({ message: "Error retrieving notifications" });
    }
  });

  // Mark notification as read
  app.post("/api/notifications/:id/read", authenticateToken, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);

      if (isNaN(notificationId)) {
        return res.status(400).json({ message: "Invalid notification ID" });
      }

      // Update the notification
      const updatedNotification = await storage.markNotificationAsRead(notificationId);

      if (!updatedNotification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      res.json({
        notification: updatedNotification
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Error updating notification" });
    }
  });

  // Analytics
  app.get("/api/analytics/performance", ensureTeacher, async (req, res) => {
    try {
      // Get authenticated teacher's ID with demo fallback
      const teacherId = req.user?.id || 5;

      // Get all classes for the teacher
      const classes = await storage.getClassesByTeacher(teacherId);

      // Get all students in those classes
      const classStudents: Array<{
        class: any;
        students: Array<Omit<any, "password">>;
      }> = [];

      for (const classItem of classes) {
        const students = await storage.getClassStudents(classItem.id);
        classStudents.push({
          class: classItem,
          students: students.map(s => {
            const { password, ...rest } = s;
            return rest;
          })
        });
      }

      // Get all quizzes by teacher
      const quizzes = await storage.getQuizzesByTeacher(teacherId);

      // Get student quiz assignments and performances
      const quizPerformance: Array<{
        quiz: any;
        studentPerformance: any[];
      }> = [];

      for (const quiz of quizzes) {
        const studentQuizzes = await storage.getStudentQuizzesByQuiz(quiz.id);
        quizPerformance.push({
          quiz,
          studentPerformance: studentQuizzes
        });
      }

      // Return summary data
      res.json({
        teacherId,
        classCount: classes.length,
        studentCount: classStudents.reduce((sum, cs) => sum + cs.students.length, 0),
        quizCount: quizzes.length,
        classStudents,
        quizPerformance
      });
    } catch (error) {
      console.error("Error getting performance analytics:", error);
      res.status(500).json({ message: "Error retrieving performance analytics" });
    }
  });

  app.post("/api/analytics/insights", ensureTeacher, async (req, res) => {
    try {
      // ensureTeacher middleware already guarantees req.user exists
      //const user = req.user!;

      const { studentData, subject } = req.body;

      if (!studentData || !subject) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const insights = await generatePerformanceInsights(studentData, subject);
      res.json(insights);
    } catch (error) {
      console.error("Error generating performance insights:", error);
      res.status(500).json({ message: "Error generating performance insights" });
    }
  });

  // Professional C++ IDE API endpoints
  app.post("/api/execute-cpp", async (req, res) => {
    try {
      const { code, input } = req.body;
      const result = await executeCppCodeOnline(code, input);
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: error.message,
        output: `Server Error: ${error.message}`
      });
    }
  });

  app.post("/api/format-cpp", async (req, res) => {
    try {
      const { code } = req.body;
      const result = await formatCppCode(code);
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: error.message
      });
    }
  });

  app.post("/api/analyze-cpp", async (req, res) => {
    try {
      const { code } = req.body;
      const result = await analyzeCppCode(code);
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: error.message
      });
    }
  });



  // Teacher: monitor active quiz attempts (with student info)
  app.get("/api/quizzes/:quizId/attempts", ensureTeacher, async (req: AuthRequest, res) => {
    try {
      const quizId = parseInt(req.params.quizId);
      const quiz = await storage.getQuiz(quizId);
      if (!quiz || quiz.teacherId !== req.user!.id) {
        return res.status(403).json({ message: "You can only view attempts for your own quizzes" });
      }
      const attempts = await storage.getAttemptsWithUsersByQuiz(quizId);
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching attempts:", error);
      res.status(500).json({ message: "Error fetching attempts" });
    }
  });

  // **MONITORING API ENDPOINTS - HTTP-based webcam monitoring**
  
  // In-memory storage for monitoring data (consider moving to database for production)
  const monitoringSessions = new Map<string, { studentId: number; quizId: number; status: string; lastFrame: number; teacherId?: number }>();
  const monitoringFrames = new Map<string, { studentId: number; quizId: number; dataUrl: string; timestamp: number }>();
  const consentRequests = new Map<string, { teacherId: number; timestamp: number }>();
  const activeConsents = new Map<string, { teacherId: number; approved: boolean; timestamp: number }>();

  // Server-Sent Events clients for real-time frame streaming
  const sseClients = new Map<string, Response>();

  // Submit webcam frame (Student)
  app.post("/api/monitoring/frames", ensureStudent, async (req: AuthRequest, res) => {
    try {
      const { quizId, studentId, dataUrl, timestamp } = req.body;
      
      if (!quizId || !dataUrl || studentId !== req.user!.id) {
        return res.status(400).json({ message: "Invalid frame data" });
      }

      // Check if student has active consent
      const consentKey = `${quizId}:${studentId}`;
      const consent = activeConsents.get(consentKey);
      if (!consent?.approved) {
        return res.status(403).json({ message: "No monitoring consent" });
      }

      // Store the frame
      const frameKey = `${quizId}:${studentId}:${Date.now()}`;
      const frame = { studentId, quizId, dataUrl, timestamp: timestamp || Date.now() };
      monitoringFrames.set(frameKey, frame);

      // Update session status
      const sessionKey = `${quizId}:${studentId}`;
      monitoringSessions.set(sessionKey, {
        studentId,
        quizId,
        status: 'active',
        lastFrame: Date.now(),
        teacherId: consent.teacherId
      });

      // Send to monitoring teacher via SSE if connected
      const sseKey = `${quizId}:${consent.teacherId}:${studentId}`;
      const sseRes = sseClients.get(sseKey);
      if (sseRes) {
        try {
          sseRes.write(`data: ${JSON.stringify({
            id: frameKey,
            studentId,
            quizId,
            dataUrl,
            timestamp: frame.timestamp
          })}\n\n`);
        } catch (error) {
          console.warn('Failed to send SSE frame:', error);
          sseClients.delete(sseKey);
        }
      }

      // Clean up old frames (keep only last 10 per student)
      const studentFrameKeys = Array.from(monitoringFrames.keys())
        .filter(key => key.startsWith(`${quizId}:${studentId}:`))
        .sort((a, b) => {
          const timestampA = parseInt(a.split(':')[2]);
          const timestampB = parseInt(b.split(':')[2]);
          return timestampB - timestampA;
        });

      studentFrameKeys.slice(10).forEach(key => monitoringFrames.delete(key));

      res.json({ success: true, frameId: frameKey });
    } catch (error) {
      console.error("Error storing frame:", error);
      res.status(500).json({ message: "Error storing frame" });
    }
  });

  // Request webcam access (Teacher)
  app.post("/api/monitoring/request", ensureTeacher, async (req: AuthRequest, res) => {
    try {
      const { quizId, studentId } = req.body;
      const teacherId = req.user!.id;

      if (!quizId || !studentId) {
        return res.status(400).json({ message: "Missing quizId or studentId" });
      }

      // Verify teacher owns the quiz
      const quiz = await storage.getQuiz(quizId);
      if (!quiz || quiz.teacherId !== teacherId) {
        return res.status(403).json({ message: "You can only monitor your own quizzes" });
      }

      // Store consent request
      const consentKey = `${quizId}:${studentId}`;
      consentRequests.set(consentKey, {
        teacherId,
        timestamp: Date.now()
      });

      res.json({ success: true, message: "Monitoring request sent to student" });
    } catch (error) {
      console.error("Error requesting monitoring:", error);
      res.status(500).json({ message: "Error requesting monitoring" });
    }
  });

  // Handle consent response (Student)
  app.post("/api/monitoring/consent", ensureStudent, async (req: AuthRequest, res) => {
    try {
      const { quizId, studentId, teacherId, approved } = req.body;

      if (studentId !== req.user!.id) {
        return res.status(403).json({ message: "You can only respond to your own consent requests" });
      }

      const consentKey = `${quizId}:${studentId}`;
      
      if (approved) {
        activeConsents.set(consentKey, {
          teacherId,
          approved: true,
          timestamp: Date.now()
        });
      } else {
        activeConsents.delete(consentKey);
      }

      // Clean up the request
      consentRequests.delete(consentKey);

      res.json({ success: true, approved });
    } catch (error) {
      console.error("Error handling consent:", error);
      res.status(500).json({ message: "Error handling consent" });
    }
  });

  // Check for pending consent requests (Student)
  app.get("/api/monitoring/consent-requests", ensureStudent, async (req: AuthRequest, res) => {
    try {
      const { quizId, studentId } = req.query;
      const userId = req.user!.id;

      if (parseInt(studentId as string) !== userId) {
        return res.status(403).json({ message: "You can only check your own consent requests" });
      }

      const consentKey = `${quizId}:${studentId}`;
      const request = consentRequests.get(consentKey);

      if (request && Date.now() - request.timestamp < 300000) { // 5 minute timeout
        res.json({
          hasRequest: true,
          teacherId: request.teacherId,
          timestamp: request.timestamp
        });
      } else {
        // Clean up expired requests
        if (request) consentRequests.delete(consentKey);
        res.json({ hasRequest: false });
      }
    } catch (error) {
      console.error("Error checking consent requests:", error);
      res.status(500).json({ message: "Error checking consent requests" });
    }
  });

  // Get monitoring sessions (Teacher)
  app.get("/api/monitoring/sessions", ensureTeacher, async (req: AuthRequest, res) => {
    try {
      const { quizId } = req.query;
      const teacherId = req.user!.id;

      if (!quizId) {
        return res.status(400).json({ message: "Missing quizId" });
      }

      // Verify teacher owns the quiz
      const quiz = await storage.getQuiz(parseInt(quizId as string));
      if (!quiz || quiz.teacherId !== teacherId) {
        return res.status(403).json({ message: "You can only view sessions for your own quizzes" });
      }

      // Get active sessions for this quiz
      const sessions = Array.from(monitoringSessions.entries())
        .filter(([key, session]) => {
          return key.startsWith(`${quizId}:`) && session.teacherId === teacherId;
        })
        .map(([key, session]) => ({
          id: key,
          studentId: session.studentId,
          quizId: session.quizId,
          status: Date.now() - session.lastFrame > 30000 ? 'inactive' : session.status,
          lastFrameTime: session.lastFrame
        }));

      res.json(sessions);
    } catch (error) {
      console.error("Error getting monitoring sessions:", error);
      res.status(500).json({ message: "Error getting monitoring sessions" });
    }
  });

  // Server-Sent Events stream for real-time frames (Teacher)
  app.get("/api/monitoring/stream", ensureTeacher, (req: AuthRequest, res) => {
    try {
      const { quizId, studentId } = req.query;
      const teacherId = req.user!.id;

      if (!quizId || !studentId) {
        return res.status(400).json({ message: "Missing quizId or studentId" });
      }

      // Set up SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      const sseKey = `${quizId}:${teacherId}:${studentId}`;
      sseClients.set(sseKey, res);

      // Send initial connection event
      res.write('data: {"type":"connected"}\n\n');

      // Send heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        try {
          res.write('data: {"type":"heartbeat","timestamp":' + Date.now() + '}\n\n');
        } catch (error) {
          clearInterval(heartbeat);
          sseClients.delete(sseKey);
        }
      }, 30000);

      req.on('close', () => {
        clearInterval(heartbeat);
        sseClients.delete(sseKey);
      });

    } catch (error) {
      console.error("Error setting up SSE stream:", error);
      res.status(500).json({ message: "Error setting up monitoring stream" });
    }
  });

}