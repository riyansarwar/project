export async function gradeAnswer(
  quizId: number,
  questionId: number,
  answer: string
): Promise<{
  id: number;
  score: number;
  feedback: string;
  aiAnalysis: any;
}> {
  const response = await fetch(`/api/student-quizzes/${quizId}/submit-answer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      questionId,
      answer
    }),
    credentials: 'include'
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to grade answer');
  }

  return await response.json();
}

export interface GeneratedQuestion {
  id: number;
  subject: string;
  type: string;
  difficulty: string;
  content: string;
  answer: string;
  gradeLevel: string;
  teacherId: number;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedQuestionCandidate {
  question: string;
  correctAnswer: string;
  difficulty: string;
  type: string;
  subject: string;
  gradeLevel: string;
}

export async function generatePersonalizedQuestion(
  subject: string,
  topic: string,
  difficulty: number | string,
  studentLevel: string,
  previousPerformance?: string,
  count: number = 10,
  adaptiveDifficulty: boolean = false
): Promise<{
  candidates: GeneratedQuestionCandidate[];
  message: string;
}> {
  try {
    const response = await fetch('/api/ai/generate-candidates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject,
        topic,
        difficulty,
        studentLevel,
        previousPerformance,
        count,
        adaptiveDifficulty
      }),
      credentials: 'include'
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Handle specific error cases
      if (errorText.includes('rate limit') || errorText.includes('quota')) {
        throw new Error('OpenAI rate limit exceeded. Please try again later or generate fewer questions.');
      } else if (errorText.includes('insufficient_quota')) {
        throw new Error('OpenAI API quota exceeded. Please check your API key or try again later.');
      }
      
      throw new Error(errorText || 'Failed to generate personalized questions');
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating questions:', error);
    
    // If it's already an Error object with a message, pass it through
    if (error instanceof Error) {
      throw error;
    }
    
    // Generic fallback
    throw new Error('Failed to generate questions. Please try again later.');
  }
}

export async function saveSelectedQuestions(
  selectedQuestions: GeneratedQuestionCandidate[]
): Promise<{
  questions: GeneratedQuestion[];
  message: string;
}> {
  try {
    const response = await fetch('/api/ai/save-questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        questions: selectedQuestions
      }),
      credentials: 'include'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to save selected questions');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving questions:', error);
    
    // If it's already an Error object with a message, pass it through
    if (error instanceof Error) {
      throw error;
    }
    
    // Generic fallback
    throw new Error('Failed to save questions. Please try again later.');
  }
}

export async function getPerformanceInsights(
  studentData: any,
  subject: string
): Promise<{
  learningGaps: string[];
  strengths: string[];
  recommendedFocus: string[];
  teachingStrategies: string[];
}> {
  const response = await fetch('/api/analytics/insights', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      studentData,
      subject
    }),
    credentials: 'include'
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to generate performance insights');
  }

  return await response.json();
}
