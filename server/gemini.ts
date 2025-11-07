import axios, { AxiosError } from "axios";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_SUBJECT = "Object-Oriented Programming with C++";

const GEMINI_BASE_PROMPT = `You are an impartial AI grader for Object-Oriented Programming with C++ assessments. Each submission can contain prose explanations and C++ code snippets.

Evaluate the submission holistically against these criteria:
1. Correctness of concepts, syntax, and semantics.
2. Depth of explanation and demonstrated understanding.
3. Level of detail, including discussion of trade-offs and design reasoning.
4. Presence and quality of illustrative examples.

Assign one letter grade only, using these definitions:
- A: Exceptional mastery; precise, thorough, and well-explained with strong examples.
- B: Strong command; minor gaps but largely correct with solid explanations/examples.
- C: Adequate understanding; noticeable issues yet demonstrates core concepts.
- D: Limited grasp; substantial mistakes or missing reasoning/examples.
- F: Fundamentally incorrect or incoherent.

Respond with deterministic JSON that exactly matches this shape:
{
  "submissionId": "<repeat the submission id provided>",
  "letterGrade": "<A|B|C|D|F>",
  "model": "gemini-2.5-pro"
}

Do not include scores, feedback, or additional fields. The JSON object must be the only content in your response.`;

interface GeminiGradeRequestQuestion {
  questionId: number;
  prompt: string;
  correctAnswer: string;
  studentAnswer: string;
}

export interface GeminiGradeRequest {
  submissionId: string;
  quizType: "assigned" | "practice";
  studentId: number;
  quizId?: number;
  practiceQuizId?: number;
  subject?: string;
  questions: GeminiGradeRequestQuestion[];
  metadata?: Record<string, unknown>;
}

type GeminiLetterGrade = "A" | "B" | "C" | "D" | "F";

export interface GeminiGradeResponse {
  submissionId: string;
  letterGrade: GeminiLetterGrade;
  model: string;
  latencyMs?: number;
  rawResponse?: unknown;
}

class GeminiClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor({ apiKey, model, timeoutMs = 30000 }: { apiKey?: string; model?: string; timeoutMs?: number }) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    this.apiKey = apiKey;
    this.model = model ?? "gemini-2.5-pro";
    this.timeoutMs = timeoutMs;
  }

  async grade(request: GeminiGradeRequest): Promise<GeminiGradeResponse> {
    const payload = this.buildPayload(request);
    const url = `${GEMINI_API_URL}/${encodeURIComponent(this.model)}:generateContent?key=${this.apiKey}`;

    try {
      const start = Date.now();
      const response = await axios.post(url, payload, {
        timeout: this.timeoutMs,
        headers: {
          "Content-Type": "application/json",
        },
      });

      const latencyMs = Date.now() - start;
      return this.transformResponse(request, response.data, latencyMs);
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  private buildPayload(request: GeminiGradeRequest) {
    const submissionBlock = this.formatSubmission(request);

    return {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: GEMINI_BASE_PROMPT,
            },
            {
              text: submissionBlock,
            },
          ],
        },
      ],
      responseSchema: {
        type: "object",
        properties: {
          submissionId: { type: "string" },
          letterGrade: { type: "string", enum: ["A", "B", "C", "D", "F"] },
          model: { type: "string" },
        },
        required: ["submissionId", "letterGrade"],
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE",
        },
      ],
      generationConfig: {
        temperature: 0,
        topP: 0.8,
      },
    };
  }

  private formatSubmission(request: GeminiGradeRequest): string {
    const subject = request.subject ?? DEFAULT_SUBJECT;

    const headerLines = [
      `SUBMISSION_ID: ${request.submissionId}`,
      `QUIZ_TYPE: ${request.quizType}`,
      `SUBJECT: ${subject}`,
      `STUDENT_ID: ${request.studentId}`,
    ];

    if (request.quizId) {
      headerLines.push(`QUIZ_ID: ${request.quizId}`);
    }

    if (request.practiceQuizId) {
      headerLines.push(`PRACTICE_QUIZ_ID: ${request.practiceQuizId}`);
    }

    const questionBlocks = request.questions
      .map((question) => {
        return [
          `QUESTION_ID: ${question.questionId}`,
          `PROMPT:\n${question.prompt}`,
          `CORRECT_ANSWER:\n${question.correctAnswer}`,
          `STUDENT_ANSWER:\n${question.studentAnswer}`,
        ].join("\n\n");
      })
      .join("\n\n---\n\n");

    const metadataBlock = request.metadata
      ? `\n\nMETADATA (JSON):\n${JSON.stringify(request.metadata, null, 2)}`
      : "";

    return [headerLines.join("\n"), "\nQUESTIONS:\n", questionBlocks, metadataBlock].join("");
  }

  private transformResponse(request: GeminiGradeRequest, data: any, latencyMs: number): GeminiGradeResponse {
    const letterGrade = this.normalizeLetterGrade(data?.letterGrade);

    return {
      submissionId: typeof data?.submissionId === "string" ? data.submissionId : request.submissionId,
      letterGrade,
      model: typeof data?.model === "string" ? data.model : this.model,
      latencyMs,
      rawResponse: data,
    };
  }

  private normalizeLetterGrade(letter: unknown): GeminiLetterGrade {
    if (letter === "A" || letter === "B" || letter === "C" || letter === "D" || letter === "F") {
      return letter;
    }
    return "F";
  }

  private normalizeError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const message = axiosError.response?.data?.error?.message ?? axiosError.message;
      const status = axiosError.response?.status;
      return new Error(`Gemini API error${status ? ` (${status})` : ""}: ${message}`);
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error("Unknown error when calling Gemini");
  }
}

let singleton: GeminiClient | null = null;

export function getGeminiClient(): GeminiClient {
  if (!singleton) {
    singleton = new GeminiClient({
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL,
      timeoutMs: process.env.GEMINI_TIMEOUT_MS ? Number(process.env.GEMINI_TIMEOUT_MS) : undefined,
    });
  }
  return singleton;
}

export async function gradeWithGemini(request: GeminiGradeRequest): Promise<GeminiGradeResponse> {
  const client = getGeminiClient();
  return client.grade(request);
}