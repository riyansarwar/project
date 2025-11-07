import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";
import dotenv from "dotenv";
import path from "path";

// 👇 Point dotenv to your actual .env file
dotenv.config({
  path: path.resolve("C:/Users/pro3/Downloads/PerceiveGrade/PerceiveGrade/.env"),
});

// Export schema tables and types
export {
  users,
  questions,
  quizzes,
  classes,
  classStudents,
  practiceQuizzes,
  practiceQuizQuestions,
  notifications,
  studentQuizzes,
  studentAnswers,
  attemptEvents,
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
} from "@shared/schema";

// Read DB URL from environment
const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set. Please add your database connection string.");
}

// Create postgres connection
const client = postgres(databaseUrl);

// Create drizzle instance
export const db = drizzle(client, { schema });

// Export client for direct queries
export { client };
