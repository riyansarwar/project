import { db } from "./db";
import { 
  users, 
  questions, 
  quizzes, 
  classes, 
  classStudents,
  practiceQuizzes,
  practiceQuizQuestions,
  notifications,
  type User,
  type Question,
  type Quiz,
  type Class,
  type PracticeQuiz, 
  type PracticeQuizQuestion,
  type InsertUser,
  type InsertQuestion,
  type InsertQuiz,
  type InsertClass,
  type InsertPracticeQuiz,
  type InsertPracticeQuizQuestion
} from "./db";

import { 
  quizQuestions,
  studentQuizzes,
  studentAnswers,
  attemptEvents
} from "@shared/schema";
import { eq, desc, and, like, ilike, or, sql } from "drizzle-orm";

export class Storage {
  // User operations with database
  async createUser(userData: InsertUser): Promise<User> {
    try {
      const [user] = await db.insert(users).values(userData).returning();
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }



  async getUserById(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      return undefined;
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.getUserById(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error("Error getting user by username:", error);
      return undefined;
    }
  }

  async getUsersByRole(role: string): Promise<User[]> {
    try {
      return await db.select().from(users).where(eq(users.role, role));
    } catch (error) {
      console.error("Error getting users by role:", error);
      return [];
    }
  }

  // Update basic profile fields (firstName, lastName)
  async updateUserProfile(id: number, updates: { firstName?: string; lastName?: string; }): Promise<User> {
    const updateData: Partial<User> = {};
    if (typeof updates.firstName === 'string') updateData.firstName = updates.firstName;
    if (typeof updates.lastName === 'string') updateData.lastName = updates.lastName;

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    return updated;
  }

  // Update password hash
  async updateUserPassword(id: number, passwordHash: string): Promise<void> {
    await db
      .update(users)
      .set({ password: passwordHash })
      .where(eq(users.id, id));
  }

  // Questions
  async createQuestion(questionData: InsertQuestion): Promise<Question> {
    const [question] = await db
      .insert(questions)
      .values(questionData)
      .returning();
    return question;
  }

  async getQuestions(): Promise<Question[]> {
    return await db.select().from(questions).orderBy(desc(questions.createdAt));
  }

  async getQuestion(id: number): Promise<Question | undefined> {
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question;
  }

  async getQuestionsBySubject(subject: string): Promise<Question[]> {
    return await db.select().from(questions).where(eq(questions.subject, subject));
  }

  async searchQuestions(filters: {
    subject?: string;
    chapter?: string;
    gradeLevel?: string;
    type?: string;
    difficulty?: string;
    searchTerm?: string;
  }): Promise<Question[]> {
    try {
      let query = db.select().from(questions);
      const conditions = [];
      if (filters.subject) {
        conditions.push(eq(questions.subject, filters.subject));
      }
      if (filters.chapter) {
        // Case-insensitive partial match on chapter, with subject fallback for legacy rows
        conditions.push(
          or(
            ilike(questions.chapter, `%${filters.chapter}%`),
            ilike(questions.subject, `%${filters.chapter}%`)
          )
        );
      }
      if (filters.gradeLevel) {
        conditions.push(eq(questions.gradeLevel, filters.gradeLevel));
      }
      if (filters.type) {
        conditions.push(eq(questions.type, filters.type));
      }
      if (filters.difficulty) {
        conditions.push(eq(questions.difficulty, filters.difficulty));
      }
      if (filters.searchTerm) {
        // Search in question content, subject, answer, and chapter
        conditions.push(
          or(
            ilike(questions.content, `%${filters.searchTerm}%`),
            ilike(questions.subject, `%${filters.searchTerm}%`),
            ilike(questions.answer, `%${filters.searchTerm}%`),
            ilike(questions.chapter, `%${filters.searchTerm}%`)
          )
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const result = await query.orderBy(desc(questions.createdAt));
      return result;
    } catch (error) {
      console.error("Error searching questions:", error);
      return [];
    }
  }

  async updateQuestion(id: number, questionData: Partial<InsertQuestion>): Promise<Question> {
    const [updatedQuestion] = await db
      .update(questions)
      .set(questionData)
      .where(eq(questions.id, id))
      .returning();
    return updatedQuestion;
  }

  async deleteQuestion(id: number): Promise<void> {
    await db.delete(questions).where(eq(questions.id, id));
  }

  // Quizzes
  async createQuiz(quizData: InsertQuiz): Promise<Quiz> {
    const [quiz] = await db
      .insert(quizzes)
      .values(quizData)
      .returning();
    return quiz;
  }

  async getQuizzes(): Promise<Quiz[]> {
    return await db.select().from(quizzes).orderBy(desc(quizzes.createdAt));
  }

  async getQuiz(id: number): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    return quiz;
  }

  async updateQuiz(id: number, quizData: Partial<Quiz>): Promise<Quiz> {
    const [updatedQuiz] = await db
      .update(quizzes)
      .set(quizData)
      .where(eq(quizzes.id, id))
      .returning();
    return updatedQuiz;
  }

  async deleteQuiz(id: number): Promise<void> {
    // First delete related quiz questions
    await db.delete(quizQuestions).where(eq(quizQuestions.quizId, id));
    // Delete student quiz assignments
    await db.delete(studentQuizzes).where(eq(studentQuizzes.quizId, id));
    // Then delete the quiz itself
    await db.delete(quizzes).where(eq(quizzes.id, id));
  }

  async getQuizzesByTeacher(teacherId: number): Promise<Quiz[]> {
    return await db.select().from(quizzes).where(eq(quizzes.teacherId, teacherId)).orderBy(desc(quizzes.createdAt));
  }

  // Classes
  async createClass(classData: InsertClass): Promise<Class> {
    const [newClass] = await db
      .insert(classes)
      .values(classData)
      .returning();
    return newClass;
  }

  async getClassByNameAndTeacher(name: string, teacherId: number): Promise<Class | undefined> {
    const [existingClass] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.name, name), eq(classes.teacherId, teacherId)));
    return existingClass;
  }

  // Student-teacher relationships
  async getClassesByStudent(studentId: number): Promise<Class[]> {
    const result = await db
      .select({
        class: classes
      })
      .from(classStudents)
      .innerJoin(classes, eq(classStudents.classId, classes.id))
      .where(eq(classStudents.studentId, studentId));
    
    return result.map(r => r.class);
  }

  async getClass(id: number): Promise<Class | undefined> {
    const [classRecord] = await db.select().from(classes).where(eq(classes.id, id));
    return classRecord;
  }

  async getStudentsByClass(classId: number): Promise<User[]> {
    const result = await db
      .select({
        student: users
      })
      .from(classStudents)
      .innerJoin(users, eq(classStudents.studentId, users.id))
      .where(eq(classStudents.classId, classId));
    
    return result.map(r => r.student);
  }

  async getQuizzesByClass(classId: number): Promise<Quiz[]> {
    return await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.classId, classId))
      .orderBy(desc(quizzes.createdAt));
  }

  async getStudentPerformanceByClass(classId: number): Promise<any[]> {
    // Get all students in the class with their quiz performance
    const result = await db
      .select({
        studentId: users.id,
        studentName: users.firstName,
        studentLastName: users.lastName,
        quizId: quizzes.id,
        quizTitle: quizzes.title,
        score: studentQuizzes.score,
        completedAt: studentQuizzes.completedAt
      })
      .from(users)
      .innerJoin(classStudents, eq(users.id, classStudents.studentId))
      .leftJoin(studentQuizzes, eq(users.id, studentQuizzes.studentId))
      .leftJoin(quizzes, and(
        eq(studentQuizzes.quizId, quizzes.id),
        eq(quizzes.classId, classId)
      ))
      .where(eq(classStudents.classId, classId));

    // Group by student and calculate performance metrics
    const performanceMap = new Map();
    
    result.forEach((row: any) => {
      const key = row.studentId;
      if (!performanceMap.has(key)) {
        performanceMap.set(key, {
          studentId: row.studentId,
          studentName: `${row.studentName} ${row.studentLastName}`,
          scores: [],
          quizzesCompleted: 0
        });
      }
      
      if (row.score !== null) {
        const student = performanceMap.get(key);
        student.scores.push(row.score);
        student.quizzesCompleted++;
      }
    });

    // Calculate averages and return
    return Array.from(performanceMap.values()).map((student: any) => ({
      ...student,
      averageScore: student.scores.length > 0 
        ? student.scores.reduce((a: number, b: number) => a + b, 0) / student.scores.length 
        : null
    }));
  }

  async removeStudentFromClass(classId: number, studentId: number): Promise<void> {
    await db
      .delete(classStudents)
      .where(and(
        eq(classStudents.classId, classId),
        eq(classStudents.studentId, studentId)
      ));
  }

  async addQuestionToQuiz(quizId: number, questionId: number, order: number): Promise<void> {
    await db
      .insert(quizQuestions)
      .values({ 
        quizId, 
        questionId, 
        order 
      });
  }

  async getClassStudents(classId: number): Promise<User[]> {
    const result = await db
      .select({
        student: users
      })
      .from(classStudents)
      .innerJoin(users, eq(classStudents.studentId, users.id))
      .where(eq(classStudents.classId, classId));
    
    return result.map(r => r.student);
  }

  async assignQuizToStudent(quizId: number, studentId: number): Promise<void> {
    await db
      .insert(studentQuizzes)
      .values({
        quizId,
        studentId,
        status: "assigned"
      });
  }

  // ----- Student quizzes and answers (needed by routes) -----
  async getStudentQuiz(id: number) {
    const [row] = await db.select().from(studentQuizzes).where(eq(studentQuizzes.id, id));
    return row;
  }

  async getStudentQuizzesByStudent(studentId: number) {
    return await db.select().from(studentQuizzes).where(eq(studentQuizzes.studentId, studentId));
  }

  async getStudentQuizzesByQuiz(quizId: number) {
    return await db.select().from(studentQuizzes).where(eq(studentQuizzes.quizId, quizId));
  }

  async getAttemptsWithUsersByQuiz(quizId: number) {
    const result = await db
      .select({
        attempt: studentQuizzes,
        student: users,
      })
      .from(studentQuizzes)
      .innerJoin(users, eq(studentQuizzes.studentId, users.id))
      .where(eq(studentQuizzes.quizId, quizId));
    return result.map(r => ({ ...r.attempt, student: {
      id: r.student.id,
      firstName: r.student.firstName,
      lastName: r.student.lastName,
    }}));
  }

  async submitStudentAnswer(data: { studentQuizId: number; questionId: number; answer: string; codeAnswer?: string; codeOutput?: string; codeError?: string; }) {
    const [row] = await db
      .insert(studentAnswers)
      .values({
        studentQuizId: data.studentQuizId,
        questionId: data.questionId,
        answer: data.answer,
        codeAnswer: data.codeAnswer,
        codeOutput: data.codeOutput,
        codeError: data.codeError,
      })
      .returning();
    return row;
  }

  async getStudentAnswersByQuiz(studentQuizId: number) {
    return await db.select().from(studentAnswers).where(eq(studentAnswers.studentQuizId, studentQuizId));
  }

  async updateStudentQuizStatus(id: number, status: "assigned" | "in_progress" | "completed", score?: number) {
    const [row] = await db
      .update(studentQuizzes)
      .set({ status, startedAt: status === "in_progress" ? new Date() : undefined, completedAt: status === "completed" ? new Date() : undefined, score })
      .where(eq(studentQuizzes.id, id))
      .returning();
    return row;
  }

  // Grading functions
  async updateStudentAnswerScore(studentQuizId: number, questionId: number, score: number, feedback?: string) {
    const [row] = await db
      .update(studentAnswers)
      .set({ score, feedback })
      .where(and(
        eq(studentAnswers.studentQuizId, studentQuizId),
        eq(studentAnswers.questionId, questionId)
      ))
      .returning();
    return row;
  }

  async getStudentAnswer(studentQuizId: number, questionId: number) {
    const [row] = await db
      .select()
      .from(studentAnswers)
      .where(and(
        eq(studentAnswers.studentQuizId, studentQuizId),
        eq(studentAnswers.questionId, questionId)
      ));
    return row;
  }

  // ----- Proctoring helpers -----
  async setAttemptPlan(id: number, questionOrder: number[], endsAt: Date, enforceFullscreen = true) {
    const [row] = await db
      .update(studentQuizzes)
      .set({ questionOrder: questionOrder as any, endsAt, enforceFullscreen })
      .where(eq(studentQuizzes.id, id))
      .returning();
    return row;
  }

  async logAttemptEvent(studentQuizId: number, type: string, details?: any) {
    const [row] = await db
      .insert(attemptEvents)
      .values({ studentQuizId, type, details })
      .returning();
    return row;
  }

  async getAttemptEvents(studentQuizId: number, limit = 200) {
    return await db
      .select()
      .from(attemptEvents)
      .where(eq(attemptEvents.studentQuizId, studentQuizId))
      .orderBy(desc(attemptEvents.createdAt))
      .limit(limit);
  }

  async countRecentViolationEvents(studentQuizId: number, types: string[], sinceMs: number) {
    const since = new Date(Date.now() - sinceMs);
    const rows = await db
      .select()
      .from(attemptEvents)
      .where(and(
        eq(attemptEvents.studentQuizId, studentQuizId),
        sql`${attemptEvents.createdAt} >= ${since}`
      ));
    const set = new Set(types);
    return rows.filter(r => set.has((r as any).type)).length;
  }

  async getQuizQuestions(quizId: number): Promise<Question[]> {
    const result = await db
      .select({
        question: questions
      })
      .from(quizQuestions)
      .innerJoin(questions, eq(quizQuestions.questionId, questions.id))
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(quizQuestions.order);

    return result.map(r => r.question);
  }

  async updateQuizQuestions(quizId: number, questionIds: number[]): Promise<void> {
    // First delete existing questions for this quiz
    await db.delete(quizQuestions).where(eq(quizQuestions.quizId, quizId));
    
    // Then add the new questions with proper ordering
    if (questionIds.length > 0) {
      await Promise.all(questionIds.map(async (questionId, index) => {
        await this.addQuestionToQuiz(quizId, questionId, index + 1);
      }));
    }
  }

  // Notification methods  
  async createNotification(notification: {
    userId: number;
    title: string;
    message: string;
    type: string;
    relatedId?: number;
  }): Promise<any> {
    const [newNotification] = await db
      .insert(notifications)
      .values({
        userId: notification.userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        relatedId: notification.relatedId,
        read: false,
        createdAt: new Date()
      })
      .returning();
    return newNotification;
  }

  async markNotificationAsRead(notificationId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notificationId));
  }

  // Quiz-related methods
  async getQuizzesByTeacher(teacherId: number): Promise<Quiz[]> {
    return await db.select().from(quizzes).where(eq(quizzes.teacherId, teacherId)).orderBy(desc(quizzes.createdAt));
  }

  async updateClass(id: number, classData: Partial<InsertClass>): Promise<Class> {
    const [updatedClass] = await db
      .update(classes)
      .set(classData)
      .where(eq(classes.id, id))
      .returning();
    return updatedClass;
  }

  async deleteClass(id: number): Promise<void> {
    // First delete class-student relationships
    await db.delete(classStudents).where(eq(classStudents.classId, id));
    // Then delete the class itself
    await db.delete(classes).where(eq(classes.id, id));
  }

  async getClasses(): Promise<Class[]> {
    return await db.select().from(classes);
  }

  async getClass(id: number): Promise<Class | undefined> {
    const [classItem] = await db.select().from(classes).where(eq(classes.id, id));
    return classItem;
  }

  async getClassesByTeacher(teacherId: number): Promise<Class[]> {
    return await db.select().from(classes).where(eq(classes.teacherId, teacherId));
  }

  async addStudentToClass(classId: number, studentId: number): Promise<boolean> {
    try {
      console.log("DEBUG: addStudentToClass called with:", { classId, studentId });
      
      if (classId === undefined || studentId === undefined) {
        console.error("UNDEFINED VALUES:", { classId, studentId });
        return false;
      }
      
      await db
        .insert(classStudents)
        .values({ classId, studentId });
      return true;
    } catch (error) {
      console.error("Error adding student to class:", error);
      return false;
    }
  }

  async getClassStudents(classId: number): Promise<User[]> {
    const result = await db
      .select({
        user: users
      })
      .from(classStudents)
      .innerJoin(users, eq(classStudents.studentId, users.id))
      .where(eq(classStudents.classId, classId));

    return result.map(r => r.user);
  }

  // Quiz assignments
  async assignQuizToStudent(quizId: number, studentId: number): Promise<boolean> {
    try {
      await db
        .insert(studentQuizzes)
        .values({ 
          quizId, 
          studentId,
          status: "assigned"
        });
      return true;
    } catch (error) {
      console.error("Error assigning quiz to student:", error);
      return false;
    }
  }

  // Practice Quizzes
  async createPracticeQuiz(practiceQuizData: InsertPracticeQuiz): Promise<PracticeQuiz> {
    const [practiceQuiz] = await db
      .insert(practiceQuizzes)
      .values(practiceQuizData)
      .returning();
    return practiceQuiz;
  }

    async getPracticeQuiz(id: number): Promise<PracticeQuiz | undefined> {
    const [practiceQuiz] = await db.select().from(practiceQuizzes).where(eq(practiceQuizzes.id, id));
    return practiceQuiz;
  }

    async getPracticeQuizzesByStudent(studentId: number): Promise<PracticeQuiz[]> {
    return await db.select().from(practiceQuizzes).where(eq(practiceQuizzes.studentId, studentId)).orderBy(desc(practiceQuizzes.createdAt));
  }

  async addQuestionToPracticeQuiz(practiceQuizId: number, questionId: number): Promise<PracticeQuizQuestion> {
    const [practiceQuizQuestion] = await db
      .insert(practiceQuizQuestions)
      .values({ practiceQuizId, questionId })
      .returning();
    return practiceQuizQuestion;
  }

  async getPracticeQuizQuestions(practiceQuizId: number): Promise<Question[]> {
    const result = await db
      .select({
        question: questions
      })
      .from(practiceQuizQuestions)
      .innerJoin(questions, eq(practiceQuizQuestions.questionId, questions.id))
      .where(eq(practiceQuizQuestions.practiceQuizId, practiceQuizId));

    return result.map(r => r.question);
  }

  async submitPracticeQuizAnswer(
    practiceQuizId: number,
    questionId: number,
    answer: string,
    score: number,
    feedback: string,
    analysis: any
  ): Promise<PracticeQuizQuestion> {
    // Update or insert the answer for a practice quiz question
    const existingAnswer = await db
      .select()
      .from(practiceQuizQuestions)
      .where(
        and(
          eq(practiceQuizQuestions.practiceQuizId, practiceQuizId),
          eq(practiceQuizQuestions.questionId, questionId)
        )
      );

    if (existingAnswer.length > 0) {
      // Update existing answer
      const [updated] = await db
        .update(practiceQuizQuestions)
        .set({
          answer,
          score,
          feedback,
          aiAnalysis: analysis
        })
        .where(
          and(
            eq(practiceQuizQuestions.practiceQuizId, practiceQuizId),
            eq(practiceQuizQuestions.questionId, questionId)
          )
        )
        .returning();
      return updated;
    } else {
      // This shouldn't happen normally as questions are added when quiz is created
      const [inserted] = await db
        .insert(practiceQuizQuestions)
        .values({
          practiceQuizId,
          questionId,
          answer,
          score,
          feedback,
          aiAnalysis: analysis
        })
        .returning();
      return inserted;
    }
  }

  async updatePracticeQuizStatus(
    practiceQuizId: number, 
    status: string,
    score?: number
  ): Promise<PracticeQuiz> {
    const updateData: any = { status };
    
    if (score !== undefined) {
      updateData.score = score;
    }
    
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    const [updated] = await db
      .update(practiceQuizzes)
      .set(updateData)
      .where(eq(practiceQuizzes.id, practiceQuizId))
      .returning();
    
    return updated;
  }

  async getPracticeQuizAnswers(practiceQuizId: number): Promise<PracticeQuizQuestion[]> {
    return await db
      .select()
      .from(practiceQuizQuestions)
      .where(eq(practiceQuizQuestions.practiceQuizId, practiceQuizId));
  }

  // Distinct chapter options (includes fallback to subject for legacy rows)
  async getChapterOptions(): Promise<string[]> {
    try {
      const rows = await db.select({ chapter: questions.chapter, subject: questions.subject }).from(questions);
      const set = new Set<string>();
      for (const r of rows as Array<{chapter: string | null, subject: string | null}>) {
        const ch = (r.chapter || '').trim();
        const subj = (r.subject || '').trim();
        if (ch) set.add(ch);
        if (subj) set.add(subj);
      }
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    } catch (error) {
      console.error("Error getting chapter options:", error);
      return [];
    }
  }

  // Notifications
  async getNotificationsByUser(userId: number): Promise<any[]> {
    try {
      const userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt));
      return userNotifications;
    } catch (error) {
      console.error("Error getting notifications by user:", error);
      return [];
    }
  }
}

export const storage = new Storage();

// Initialize sample data for demonstration
export async function initializeSampleData() {
  try {
    console.log("Initializing sample data...");
    
    // Create sample users (teacher and students)
    const sampleUsers = [
      {
        username: "teacher1",
        email: "teacher1@example.com",
        password: "password",
        firstName: "John",
        lastName: "Smith",
        role: "teacher"
      },
      {
        username: "student1",
        email: "student1@example.com",
        password: "password", 
        firstName: "Alice",
        lastName: "Johnson",
        role: "student"
      },
      {
        username: "student2", 
        email: "student2@example.com",
        password: "password",
        firstName: "Bob",
        lastName: "Wilson", 
        role: "student"
      }
    ];

    // Insert users if they don't exist
    for (const user of sampleUsers) {
      try {
        await db.insert(users).values(user).onConflictDoNothing();
      } catch (error) {
        // User might already exist, continue
      }
    }

    // Create sample questions - BSCS focused
    const sampleQuestions = [
      {
        teacherId: 1,
        content: "Explain the difference between encapsulation and abstraction in object-oriented programming.",
        type: "short_answer",
        answer: "Encapsulation is the practice of bundling data and methods that operate on that data within a single unit (class) and restricting access to some components. Abstraction is the concept of hiding complex implementation details while showing only essential features of an object.",
        subject: "Object-Oriented Programming",
        gradeLevel: "University",
        difficulty: "Medium"
      },
      {
        teacherId: 1,
        content: "What is the time complexity of searching for an element in a balanced binary search tree?",
        type: "short_answer", 
        answer: "O(log n) where n is the number of nodes in the tree.",
        subject: "Data Structures & Algorithms",
        gradeLevel: "University", 
        difficulty: "Easy"
      },
      {
        teacherId: 1,
        content: "Describe the purpose of the TCP three-way handshake in network communication.",
        type: "short_answer",
        answer: "The TCP three-way handshake establishes a reliable connection between client and server by exchanging SYN, SYN-ACK, and ACK packets to synchronize sequence numbers and ensure both parties are ready for data transmission.",
        subject: "Computer Networks",
        gradeLevel: "University",
        difficulty: "Medium"
      },
      {
        teacherId: 1,
        content: "What is database normalization and why is it important?",
        type: "short_answer",
        answer: "Database normalization is the process of organizing data to reduce redundancy and improve data integrity. It's important because it eliminates data duplication, reduces storage space, and prevents update anomalies.",
        subject: "Database Systems",
        gradeLevel: "University",
        difficulty: "Medium"
      },
      {
        teacherId: 1,
        content: "Explain the concept of version control in software development.",
        type: "short_answer",
        answer: "Version control is a system that tracks changes to files over time, allowing developers to collaborate, maintain history of changes, revert to previous versions, and manage different branches of development.",
        subject: "Software Engineering",
        gradeLevel: "University",
        difficulty: "Easy"
      }
    ];

    // Insert questions if they don't exist
    for (const question of sampleQuestions) {
      try {
        await db.insert(questions).values(question).onConflictDoNothing();
      } catch (error) {
        // Question might already exist, continue
      }
    }

    console.log("Sample data initialized successfully");
  } catch (error) {
    console.error("Error initializing sample data:", error);
  }
}