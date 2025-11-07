import { pgTable, text, serial, integer, boolean, timestamp, json, varchar, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("student"), // "student" or "teacher"
  createdAt: timestamp("created_at").defaultNow(),
});

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  chapter: text("chapter"), // nullable - for organizing questions within subjects
  gradeLevel: text("grade_level").notNull(),
  type: text("type").notNull(), // short_answer (BSCS focus)
  content: text("content").notNull(),
  answer: text("answer").notNull(),
  difficulty: text("difficulty").notNull(), // easy, medium, hard
  createdAt: timestamp("created_at").defaultNow(),
});

export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull().references(() => users.id),
  classId: integer("class_id").notNull().references(() => classes.id),
  title: text("title").notNull(),
  subject: text("subject").notNull(),
  gradeLevel: text("grade_level").notNull(),
  duration: integer("duration").notNull(), // in minutes
  scheduledAt: timestamp("scheduled_at"),
  status: text("status").notNull().default("draft"), // draft, scheduled, active, completed
  createdAt: timestamp("created_at").defaultNow(),
});

export const quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull().references(() => quizzes.id),
  questionId: integer("question_id").notNull().references(() => questions.id),
  order: integer("order").notNull(),
});

export const studentQuizzes = pgTable("student_quizzes", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => users.id),
  quizId: integer("quiz_id").notNull().references(() => quizzes.id),
  score: integer("score"),
  status: text("status").notNull().default("assigned"), // assigned, in_progress, completed
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  // Proctoring additions
  questionOrder: json("question_order"), // array of question IDs in fixed randomized order for this attempt
  endsAt: timestamp("ends_at"), // when the attempt should auto-submit
  enforceFullscreen: boolean("enforce_fullscreen").notNull().default(true),
});

export const studentAnswers = pgTable("student_answers", {
  id: serial("id").primaryKey(),
  studentQuizId: integer("student_quiz_id").notNull().references(() => studentQuizzes.id),
  questionId: integer("question_id").notNull().references(() => questions.id),
  answer: text("answer").notNull(),
  codeAnswer: text("code_answer"), // For code-based questions
  codeOutput: text("code_output"), // Execution output
  codeError: text("code_error"), // Compilation/runtime errors
  score: integer("score"),
  feedback: text("feedback"),
  aiAnalysis: json("ai_analysis"),
});

export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  gradeLevel: text("grade_level").notNull(),
});

export const classStudents = pgTable("class_students", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull().references(() => classes.id),
  studentId: integer("student_id").notNull().references(() => users.id),
});

// Practice quiz tables
export const practiceQuizzes = pgTable("practice_quizzes", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => users.id),
  subject: text("subject").notNull(),
  chapter: text("chapter"), // nullable - tracks which chapter was selected
  questionCount: integer("question_count").notNull(),
  score: integer("score"),
  status: text("status").notNull().default("in_progress"), // in_progress, completed
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const practiceQuizQuestions = pgTable("practice_quiz_questions", {
  id: serial("id").primaryKey(),
  practiceQuizId: integer("practice_quiz_id").notNull().references(() => practiceQuizzes.id),
  questionId: integer("question_id").notNull().references(() => questions.id),
  answer: text("answer"),
  score: integer("score"),
  feedback: text("feedback"),
  aiAnalysis: json("ai_analysis"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  uniqueQuizQuestion: unique().on(t.practiceQuizId, t.questionId)
}));

// Notification system
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // quiz_assigned, practice_result, etc.
  read: boolean("read").notNull().default(false),
  relatedId: integer("related_id"), // Can be a quizId, practiceQuizId, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Proctoring: attempt events for logging
export const attemptEvents = pgTable("attempt_events", {
  id: serial("id").primaryKey(),
  studentQuizId: integer("student_quiz_id").notNull().references(() => studentQuizzes.id),
  type: text("type").notNull(), // tab_blur, visibility_hidden, fullscreen_exit, suspicious_face, timeout_submit, manual_submit
  details: json("details"), // optional metadata (timestamps, confidence, etc.)
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true })
  .extend({
    confirmPassword: z.string(),
  });

export const insertQuestionSchema = createInsertSchema(questions)
  .omit({ id: true, createdAt: true });

export const insertQuizSchema = createInsertSchema(quizzes)
  .omit({ id: true, createdAt: true })
  .extend({
    scheduledAt: z.coerce.date().optional(),
  });

export const insertStudentQuizSchema = createInsertSchema(studentQuizzes)
  .omit({ id: true, score: true, startedAt: true, completedAt: true });

export const insertStudentAnswerSchema = createInsertSchema(studentAnswers)
  .omit({ id: true, score: true, feedback: true, aiAnalysis: true });

export const insertClassSchema = createInsertSchema(classes)
  .omit({ id: true });

export const insertPracticeQuizSchema = createInsertSchema(practiceQuizzes)
  .omit({ id: true, createdAt: true, completedAt: true, score: true });

export const insertPracticeQuizQuestionSchema = createInsertSchema(practiceQuizQuestions)
  .omit({ id: true, createdAt: true, answer: true, score: true, feedback: true, aiAnalysis: true });

export const insertNotificationSchema = createInsertSchema(notifications)
  .omit({ id: true, createdAt: true, read: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;

export type QuizQuestion = typeof quizQuestions.$inferSelect;

export type StudentQuiz = typeof studentQuizzes.$inferSelect;
export type InsertStudentQuiz = z.infer<typeof insertStudentQuizSchema>;

export type StudentAnswer = typeof studentAnswers.$inferSelect;
export type InsertStudentAnswer = z.infer<typeof insertStudentAnswerSchema>;

export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;

export type ClassStudent = typeof classStudents.$inferSelect;

export type PracticeQuiz = typeof practiceQuizzes.$inferSelect;
export type InsertPracticeQuiz = z.infer<typeof insertPracticeQuizSchema>;

export type PracticeQuizQuestion = typeof practiceQuizQuestions.$inferSelect;
export type InsertPracticeQuizQuestion = z.infer<typeof insertPracticeQuizQuestionSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
