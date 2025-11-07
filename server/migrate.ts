
import { db, client } from './db';
import { sql } from 'drizzle-orm';

async function createTables() {
  console.log('Creating database tables...');
  
  // Create users table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Create questions table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      teacher_id INTEGER NOT NULL REFERENCES users(id),
      subject TEXT NOT NULL,
      grade_level TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      answer TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Create quizzes table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS quizzes (
      id SERIAL PRIMARY KEY,
      teacher_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      grade_level TEXT NOT NULL,
      duration INTEGER NOT NULL,
      scheduled_at TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  // Ensure class_id exists
  await db.execute(sql`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS class_id INTEGER REFERENCES classes(id);`);

  // Create quiz_questions table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS quiz_questions (
      id SERIAL PRIMARY KEY,
      quiz_id INTEGER NOT NULL REFERENCES quizzes(id),
      question_id INTEGER NOT NULL REFERENCES questions(id),
      "order" INTEGER NOT NULL
    );
  `);

  // Create student_quizzes table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS student_quizzes (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES users(id),
      quiz_id INTEGER NOT NULL REFERENCES quizzes(id),
      score INTEGER,
      status TEXT NOT NULL DEFAULT 'assigned',
      started_at TIMESTAMP,
      completed_at TIMESTAMP
    );
  `);

  // Proctoring: add columns to student_quizzes if missing
  await db.execute(sql`ALTER TABLE student_quizzes ADD COLUMN IF NOT EXISTS question_order JSONB;`);
  await db.execute(sql`ALTER TABLE student_quizzes ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP;`);
  await db.execute(sql`ALTER TABLE student_quizzes ADD COLUMN IF NOT EXISTS enforce_fullscreen BOOLEAN NOT NULL DEFAULT TRUE;`);

  // Create student_answers table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS student_answers (
      id SERIAL PRIMARY KEY,
      student_quiz_id INTEGER NOT NULL REFERENCES student_quizzes(id),
      question_id INTEGER NOT NULL REFERENCES questions(id),
      answer TEXT NOT NULL,
      code_answer TEXT,
      code_output TEXT,
      code_error TEXT,
      score INTEGER,
      feedback TEXT,
      ai_analysis JSONB
    );
  `);

  // Proctoring: create attempt_events table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS attempt_events (
      id SERIAL PRIMARY KEY,
      student_quiz_id INTEGER NOT NULL REFERENCES student_quizzes(id),
      type TEXT NOT NULL,
      details JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_attempt_events_student_quiz_id ON attempt_events(student_quiz_id);`);

  // Create classes table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS classes (
      id SERIAL PRIMARY KEY,
      teacher_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      grade_level TEXT NOT NULL
    );
  `);

  // Create class_students table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS class_students (
      id SERIAL PRIMARY KEY,
      class_id INTEGER NOT NULL REFERENCES classes(id),
      student_id INTEGER NOT NULL REFERENCES users(id)
    );
  `);

  // Create practice_quizzes table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS practice_quizzes (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES users(id),
      subject TEXT NOT NULL,
      question_count INTEGER NOT NULL,
      score INTEGER,
      status TEXT NOT NULL DEFAULT 'in_progress',
      created_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP
    );
  `);

  // Create practice_quiz_questions table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS practice_quiz_questions (
      id SERIAL PRIMARY KEY,
      practice_quiz_id INTEGER NOT NULL REFERENCES practice_quizzes(id),
      question_id INTEGER NOT NULL REFERENCES questions(id),
      answer TEXT,
      score INTEGER,
      feedback TEXT,
      ai_analysis JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(practice_quiz_id, question_id)
    );
  `);

  // Create notifications table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      read BOOLEAN NOT NULL DEFAULT FALSE,
      related_id INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('All tables created successfully!');
}

export { createTables };

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createTables()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
