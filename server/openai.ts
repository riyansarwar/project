import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "your-api-key" });

/**
 * Returns subject-specific grading criteria for different CS subjects.
 * Supports multiple subjects with specialized evaluation criteria.
 */
function getSubjectSpecificGradingCriteria(subject: string): string {
  // Normalize subject name for comparison
  const normalizedSubject = subject.toLowerCase().trim();
  
  // Support for Data Structures and Algorithms
  if (normalizedSubject.includes("data struct") || normalizedSubject.includes("algorithm")) {
    return `
      For Data Structures and Algorithms questions, evaluate based on:
      
      1. Correctness (0-10):
         - Algorithm correctness: Does the solution produce correct results?
         - Edge case handling: Does it handle boundary conditions and special cases?
         - Time complexity: Is the time complexity appropriate for the problem?
         - Space complexity: Is the space complexity optimized?
      
      2. Completeness (0-10):
         - Problem understanding: Does the solution address all requirements?
         - Analysis thoroughness: Is the complexity analysis complete and accurate?
         - Implementation details: Are all necessary steps implemented?
         - Testing considerations: Are potential test cases addressed?
      
      3. Relevance (0-10):
         - Algorithm selection: Is the most appropriate algorithm chosen?
         - Data structure selection: Is the most efficient data structure used?
         - Optimization techniques: Are appropriate optimizations applied?
         - Code readability: Is the solution well-structured and documented?
      
      Key concepts to check for understanding:
      - Time and space complexity analysis (Big O notation)
      - Array and linked data structures (arrays, linked lists, stacks, queues)
      - Tree and graph algorithms (traversal, shortest path, etc.)
      - Searching and sorting techniques
      - Dynamic programming
      - Greedy algorithms
      - Divide and conquer approaches
      - Hashing and indexing
      
      Common misconceptions to identify:
      - Incorrect complexity analysis
      - Inefficient algorithm selection
      - Confusion between similar data structures
      - Overlooking edge cases
      - Unnecessary complexity in solutions
    `;
  }
  
  // Support for Database Systems and SQL
  else if (normalizedSubject.includes("database") || normalizedSubject.includes("sql")) {
    return `
      For Database Systems and SQL questions, evaluate based on:
      
      1. Correctness (0-10):
         - Query correctness: Does the SQL query return the expected results?
         - Syntax accuracy: Is the SQL syntax valid?
         - Schema design: Is the database schema properly designed?
         - Normalization: Are normalization principles correctly applied?
      
      2. Completeness (0-10):
         - Query coverage: Does the solution address all requirements?
         - Constraint handling: Are all necessary constraints defined?
         - Transaction management: Is transaction behavior considered?
         - Security considerations: Are access controls properly implemented?
      
      3. Relevance (0-10):
         - Query optimization: Is the SQL query optimized for performance?
         - Index usage: Are appropriate indexes defined or utilized?
         - Join techniques: Are the most efficient join methods used?
         - Advanced features: Is appropriate use made of views, stored procedures, etc.?
      
      Key concepts to check for understanding:
      - Relational database design
      - SQL query construction (SELECT, JOIN, GROUP BY, etc.)
      - Indexing and query optimization
      - Normalization forms (1NF, 2NF, 3NF, BCNF)
      - Transaction properties (ACID)
      - Entity-relationship modeling
      - Database security principles
      - NoSQL concepts where applicable
      
      Common misconceptions to identify:
      - Inefficient query patterns (e.g., SELECT * when unnecessary)
      - Denormalization without purpose
      - Missing join conditions
      - Improper use of aggregation functions
      - Lack of transaction boundaries
    `;
  }
  
  // Support for Web Development
  else if (normalizedSubject.includes("web") || normalizedSubject.includes("javascript") || normalizedSubject.includes("frontend")) {
    return `
      For Web Development questions, evaluate based on:
      
      1. Correctness (0-10):
         - Functionality: Does the solution work as expected?
         - Standards compliance: Does it follow web standards (HTML5, CSS3, ES6+)?
         - Framework usage: Are framework patterns correctly implemented?
         - Responsiveness: Does it handle different screen sizes?
      
      2. Completeness (0-10):
         - Feature implementation: Are all required features implemented?
         - Cross-browser compatibility: Will it work across browsers?
         - Error handling: Are network and user errors handled gracefully?
         - Performance considerations: Is loading and interaction optimized?
      
      3. Relevance (0-10):
         - Best practices: Does the code follow modern web development practices?
         - Component design: Are components modular and reusable?
         - State management: Is application state handled appropriately?
         - Security awareness: Are common vulnerabilities addressed?
      
      Key concepts to check for understanding:
      - DOM manipulation
      - Asynchronous programming (Promises, async/await)
      - Component-based architecture
      - State management patterns
      - API integration
      - Client-side routing
      - Responsive design principles
      - Web security fundamentals
      
      Common misconceptions to identify:
      - Callback hell without proper async handling
      - Direct DOM manipulation in component frameworks
      - Inefficient rendering patterns
      - Security vulnerabilities (XSS, CSRF)
      - Poor state management practices
    `;
  }
  
  // Support for Machine Learning and AI
  else if (normalizedSubject.includes("machine learning") || normalizedSubject.includes("artificial intelligence") || normalizedSubject.includes("data science")) {
    return `
      For Machine Learning and AI questions, evaluate based on:
      
      1. Correctness (0-10):
         - Mathematical accuracy: Are the mathematical foundations correct?
         - Algorithm implementation: Is the ML algorithm properly implemented?
         - Model evaluation: Are evaluation metrics appropriately selected and calculated?
         - Data handling: Is data preprocessing correctly handled?
      
      2. Completeness (0-10):
         - Problem framing: Is the problem correctly framed as an ML task?
         - Feature engineering: Are appropriate features selected/created?
         - Model selection: Is the most suitable model chosen for the problem?
         - Validation approach: Is cross-validation or appropriate testing used?
      
      3. Relevance (0-10):
         - Model tuning: Are hyperparameters appropriately selected?
         - Overfitting prevention: Are regularization techniques applied when needed?
         - Interpretability: Is model interpretation considered?
         - Deployment considerations: Are production concerns addressed?
      
      Key concepts to check for understanding:
      - Supervised vs. unsupervised learning
      - Classification vs. regression
      - Model evaluation metrics
      - Feature selection and engineering
      - Cross-validation techniques
      - Bias-variance tradeoff
      - Regularization methods
      - Neural network fundamentals
      
      Common misconceptions to identify:
      - Training/test data leakage
      - Inappropriate evaluation metrics
      - Ignoring feature scaling
      - Overfitting without recognition
      - Misinterpreting model outputs
    `;
  }
  
  // Support for Operating Systems
  else if (normalizedSubject.includes("operating system") || normalizedSubject.includes("os")) {
    return `
      For Operating Systems questions, evaluate based on:
      
      1. Correctness (0-10):
         - Conceptual accuracy: Are OS concepts correctly explained?
         - Implementation details: Are implementation mechanisms accurately described?
         - Process management: Are process/thread concepts properly understood?
         - Memory management: Are memory allocation strategies correctly applied?
      
      2. Completeness (0-10):
         - Coverage of key components: Are all relevant OS components addressed?
         - Synchronization handling: Are race conditions and deadlocks considered?
         - Resource management: Are CPU, memory, and I/O resources properly managed?
         - Security considerations: Are protection mechanisms addressed?
      
      3. Relevance (0-10):
         - Design principles: Are OS design principles correctly applied?
         - Algorithm selection: Are appropriate scheduling/paging algorithms chosen?
         - System calls: Is the interaction between user and kernel space properly handled?
         - Performance considerations: Are efficiency tradeoffs recognized?
      
      Key concepts to check for understanding:
      - Process/thread management
      - CPU scheduling algorithms
      - Memory management (paging, segmentation)
      - Virtual memory
      - File systems
      - I/O systems
      - Synchronization mechanisms
      - Deadlock prevention and handling
      
      Common misconceptions to identify:
      - Confusion between processes and threads
      - Misunderstanding of virtual memory
      - Incorrect synchronization primitives
      - Overlooking context switching costs
      - File system implementation errors
    `;
  }
  
  // Default for Object-Oriented Programming with C++ (our primary focus)
  else {
    return `
      For Object-Oriented Programming with C++ questions, evaluate based on:
      
      1. Correctness (0-10):
         - Syntax accuracy: Is the C++ code syntactically correct?
         - Logic validity: Does the solution work as intended?
         - OOP principles: Are the appropriate OOP concepts correctly applied?
         - Memory management: Is memory properly allocated and deallocated?
      
      2. Completeness (0-10):
         - Implementation thoroughness: Are all requirements addressed?
         - Edge case handling: Are boundary conditions considered?
         - Error handling: Is there proper exception handling?
         - Documentation: Are classes, methods, and logic sufficiently documented?
      
      3. Relevance (0-10):
         - Solution approach: Is the most appropriate OOP approach used?
         - Efficiency: Is the implementation efficient in terms of time and space complexity?
         - Style and standards: Does the code follow C++ best practices?
         - Design patterns: Are appropriate design patterns utilized when beneficial?
      
      Key concepts to check for understanding:
      - Classes, objects, and instances
      - Encapsulation and information hiding
      - Inheritance and code reuse
      - Polymorphism (compile-time and runtime)
      - Abstract classes and interfaces
      - Virtual functions and method overriding
      - Constructors, destructors, and memory management
      - Operator overloading
      - Templates and generic programming
      - Exception handling
      - STL usage and understanding
      
      Common misconceptions to identify:
      - Confusion between inheritance and composition
      - Misunderstanding of virtual functions and polymorphism
      - Improper memory management leading to leaks
      - Incorrect overriding vs. overloading
      - Inefficient use of STL containers
      - Poor encapsulation practices
    `;
  }
}

interface GradingResult {
  score: number;
  feedback: string;
  analysis: {
    correctness: number;
    completeness: number;
    relevance: number;
    keypoints: string[];
    missingConcepts: string[];
    misconceptions: string[];
  };
}

export async function gradeStudentAnswer(
  question: string,
  correctAnswer: string,
  studentAnswer: string,
  subject: string = "Object-Oriented Programming with C++"
): Promise<GradingResult> {
  try {
    // Get specialized grading criteria based on the subject
    const gradingCriteria = getSubjectSpecificGradingCriteria(subject);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert educational assessment AI for university-level ${subject || "Object-Oriented Programming with C++"}. 
          You'll be grading a student's answer to a question with the following specific criteria:
          
          ${gradingCriteria}
          
          Provide a score from 0-100, detailed feedback, and analysis in JSON format.`
        },
        {
          role: "user",
          content: `
          QUESTION: ${question}
          CORRECT ANSWER: ${correctAnswer}
          STUDENT ANSWER: ${studentAnswer}
          
          Analyze the student's answer and provide a JSON response with:
          1. "score": A score from 0-100
          2. "feedback": Constructive feedback explaining the score with specific suggestions for improvement
          3. "analysis": Detailed analysis containing:
             - "correctness": Technical accuracy score (0-10)
             - "completeness": Concept coverage score (0-10)
             - "relevance": Focus on question score (0-10)
             - "keypoints": Array of key points correctly covered
             - "missingConcepts": Array of important concepts that were missed or underdeveloped
             - "misconceptions": Array of any detected misconceptions or errors
          `
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5, // Lower temperature for more consistent grading
      max_tokens: 1000
    });

    const contentStr = response.choices[0].message.content || "{}";
    const result = JSON.parse(contentStr);
    
    return {
      score: Math.round(result.score),
      feedback: result.feedback,
      analysis: {
        correctness: result.analysis.correctness,
        completeness: result.analysis.completeness,
        relevance: result.analysis.relevance,
        keypoints: result.analysis.keypoints || [],
        missingConcepts: result.analysis.missingConcepts || [],
        misconceptions: result.analysis.misconceptions || []
      }
    };
  } catch (error: any) {
    console.error("Error in AI grading:", error);
    // Fallback response in case of API error
    return {
      score: 0,
      feedback: "Error processing your answer. Please try again later.",
      analysis: {
        correctness: 0,
        completeness: 0,
        relevance: 0,
        keypoints: [],
        missingConcepts: ["Could not analyze due to technical error"],
        misconceptions: []
      }
    };
  }
}

export interface GeneratedQuestion {
  question: string;
  correctAnswer: string;
  difficulty: string;
  type: string;
  subject: string;
  gradeLevel: string;
}

/**
 * Calculates adaptive difficulty level based on student's previous performance
 * 
 * @param baseDifficulty - The base difficulty level set by the teacher (1-10)
 * @param previousPerformance - String describing student's previous performance 
 * @param adaptiveDifficultyEnabled - Whether adaptive difficulty is enabled
 * @returns Adjusted difficulty level (1-10)
 */
function calculateAdaptiveDifficulty(
  baseDifficulty: number | string, 
  previousPerformance?: string,
  adaptiveDifficultyEnabled: boolean = false
): number {
  // Convert string difficulty to number if needed
  const baseLevel = typeof baseDifficulty === 'string' ? parseInt(baseDifficulty) : baseDifficulty;
  
  // If adaptive difficulty is disabled or no previous performance data, return base difficulty
  if (!adaptiveDifficultyEnabled || !previousPerformance) {
    return baseLevel;
  }
  
  let performanceAdjustment = 0;
  const performanceText = previousPerformance.toLowerCase();
  
  // Extract performance indicators
  const hasExcellent = performanceText.includes('excellent') || performanceText.includes('outstanding');
  const hasGood = performanceText.includes('good') || performanceText.includes('well');
  const hasAverage = performanceText.includes('average') || performanceText.includes('ok');
  const hasPoor = performanceText.includes('poor') || performanceText.includes('struggling');
  
  // Extract score if present (looking for patterns like "85%" or "score: 72")
  const scoreMatch = performanceText.match(/(\d{1,3})[\s%]/);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : null;
  
  // Adjust based on qualitative assessment
  if (hasExcellent) performanceAdjustment += 2;
  else if (hasGood) performanceAdjustment += 1;
  else if (hasAverage) performanceAdjustment += 0;
  else if (hasPoor) performanceAdjustment -= 1;
  
  // Adjust based on numerical score if available
  if (score !== null) {
    if (score >= 90) performanceAdjustment += 2;
    else if (score >= 80) performanceAdjustment += 1;
    else if (score <= 60) performanceAdjustment -= 1;
    else if (score <= 40) performanceAdjustment -= 2;
  }
  
  // Calculate final difficulty (bounded between 1-10)
  const adjustedDifficulty = Math.min(10, Math.max(1, baseLevel + performanceAdjustment));
  
  console.log(`Adaptive difficulty: Base ${baseLevel}, Adjustment ${performanceAdjustment}, Final ${adjustedDifficulty}`);
  
  return adjustedDifficulty;
}

export async function generatePersonalizedQuestion(
  subject: string,
  topic: string,
  difficulty: number | string,
  studentLevel: string,
  previousPerformance?: string,
  count: number = 1,
  existingQuestions: any[] = [],
  adaptiveDifficultyEnabled: boolean = false
): Promise<GeneratedQuestion[]> {
  try {
    // Default subject to OOP with C++ if not specified directly
    const normalizedSubject = subject.toLowerCase().includes("object") || 
                             subject.toLowerCase().includes("oop") ? 
                             subject : "Object-Oriented Programming with C++";
    
    // Apply adaptive difficulty if enabled
    const effectiveDifficulty = calculateAdaptiveDifficulty(
      difficulty, 
      previousPerformance, 
      adaptiveDifficultyEnabled
    );
    
    console.log(`Question generation: ${adaptiveDifficultyEnabled ? 'Adaptive' : 'Standard'} difficulty - Base: ${difficulty}, Effective: ${effectiveDifficulty}`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert C++ Object-Oriented Programming instructor at a university. 
          Create challenging but educational programming questions that test understanding of OOP concepts.
          Your questions should be technically accurate and follow modern C++ best practices.
          
          CRITICAL INSTRUCTION: You MUST generate only short answer and coding problem questions:
          - Distribute the ${count} questions evenly between these two types:
            * short_answer (focused, concise questions about programming concepts)
            * coding_problem (practical C++ programming tasks)
          - Aim for approximately 50% short_answer and 50% coding_problem questions
          - For each question type, use different difficulty levels (easy, medium, hard)
          
          DIVERSITY REQUIREMENT:
          - CRITICAL: Each question MUST be SUBSTANTIALLY DIFFERENT from all others
          - AVOID common patterns and repetitive question structures
          - Ensure questions span completely different aspects of the topic
          - Target unique learning objectives with each question
          - Vary both question format and question content significantly
          - Create questions requiring different cognitive skills (analysis, application, evaluation)`
        },
        {
          role: "user",
          content: `
          Generate EXACTLY ${count} personalized C++ OOP questions about "${topic || "Object-Oriented Programming"}" with these requirements:
          
          QUESTION TYPE REQUIREMENTS (CRITICAL):
          1. CREATE ONLY these two question types:
             - 50% short_answer questions (conceptual questions with concise answers)
             - 50% coding_problem questions (practical C++ programming tasks)
          2. Each question MUST cover a DIFFERENT subtopic within ${topic || "Object-Oriented Programming"}
          3. Create questions with appropriate complexity for university-level C++ students
          4. Vary the difficulty: approx. 30% easy, 40% medium, 30% hard (target average: ${difficulty})
          5. Student's academic level: ${studentLevel}
          ${previousPerformance ? `6. Previous performance context: ${previousPerformance}` : ''}
          
          DIVERSITY REQUIREMENTS (VERY IMPORTANT):
          - CRITICAL: Each question must be unique and substantially different from previously generated questions
          - Vary question formats extensively (explanations, implementations, debugging, analysis, etc.)
          - Explore different corners and applications of the topic
          - Use diverse scenarios, problem contexts, and application domains
          - For coding problems, vary the required code structures significantly
          - For short answer questions, target completely different concepts
          
          RESPONSE FORMAT:
          Provide an array of question objects in this exact JSON structure:
          [
            {
              "question": "Question text here",
              "correctAnswer": "Detailed answer with explanations and properly formatted code when needed",
              "difficulty": "easy|medium|hard",
              "type": "short_answer|coding_problem",
              "subject": "${normalizedSubject}",
              "gradeLevel": "${studentLevel}"
            },
            // More questions following same structure
          ]

          CONTENT FOCUS:
          Cover these C++ OOP concepts:
          - Classes, objects, and instances
          - Encapsulation and access modifiers
          - Inheritance and code reuse
          - Polymorphism (runtime and compile-time)
          - Abstract classes and interfaces
          - Constructors/destructors and memory management
          - Operator overloading
          - Templates and generic programming
          - Exception handling and RAII
          - STL with OOP principles
          
          QUALITY REQUIREMENTS:
          - Coding problems must be complete with proper C++ syntax (C++11 or newer) and have valid expected outputs
          - Short answer questions must test deep understanding of OOP concepts
          - All questions must be technically accurate and focused on practical applications
          - All answers MUST be extremely comprehensive with detailed explanations
            * Include theory, practical application, and reasoning
            * For coding problems: provide complete working solution with line-by-line explanations
            * For short answer questions: explain all relevant concepts with examples and connections
            * Include edge cases, common mistakes, and best practices
          - Use completely different contexts, examples and scenarios in each question
          `
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8, // Slightly higher for more diversity
      max_tokens: 6000  // Significantly increased for extremely comprehensive answers
    });

    const contentStr = response.choices[0].message.content || "{}";
    const result = JSON.parse(contentStr);
    // Ensure the result is always an array, even if OpenAI returns a single object
    let questions = Array.isArray(result) ? result : (result.questions || [result]);
    
    // Per user request: focus only on short_answer and coding_problem questions
    const preferredTypes = ["short_answer", "coding_problem"];
    
    // Process the questions to ensure we only have short_answer and coding_problem types
    const processedQuestions = questions.map((q: any, index: number) => {
      // Convert all questions to either short_answer or coding_problem
      let type = q.type || "short_answer";
      
      // If the type is not one of our preferred types, convert it
      if (!preferredTypes.includes(type)) {
        // Alternate between short_answer and coding_problem
        type = preferredTypes[index % 2];
      }
      
      return {
        question: q.question,
        correctAnswer: q.correctAnswer,
        difficulty: q.difficulty || (index % 3 === 0 ? "easy" : (index % 3 === 1 ? "medium" : "hard")),
        type,
        subject: q.subject || (subject || "Object-Oriented Programming with C++"),
        gradeLevel: q.gradeLevel || (studentLevel || "University")
      };
    });
    
    return processedQuestions;
  } catch (error: any) {
    console.error("Error generating personalized question:", error);
    // Fallback response with single question
    // Create a varied set of fallback questions when API fails
    const defaultTypes = ["short_answer", "coding_problem"];
    const defaultDifficulties = ["easy", "medium", "hard"];
    
    const fallbackQuestions = [
      // Short answer questions
      {
        question: `What are the key concepts of ${topic || "Object-Oriented Programming"} in ${subject}?`,
        correctAnswer: "The key concepts include encapsulation, inheritance, polymorphism, and abstraction. These form the foundation of object-oriented design and implementation.",
        difficulty: "medium",
        type: "short_answer",
        subject: subject,
        gradeLevel: studentLevel
      },
      {
        question: `Define ${topic || "abstraction"} in the context of C++ programming.`,
        correctAnswer: "Abstraction is the concept of hiding complex implementation details while showing only the necessary features of an object. In C++, this is achieved through abstract classes and interfaces using pure virtual functions.",
        difficulty: "easy",
        type: "short_answer",
        subject: subject,
        gradeLevel: studentLevel
      },
      {
        question: `Explain the difference between compile-time and runtime ${topic || "polymorphism"} in C++.`,
        correctAnswer: "Compile-time polymorphism (static binding) is achieved through function overloading and operator overloading, determined at compile time. Runtime polymorphism (dynamic binding) is achieved through virtual functions and inheritance, with the specific function implementation determined at runtime based on the actual object type.",
        difficulty: "hard",
        type: "short_answer",
        subject: subject,
        gradeLevel: studentLevel
      },
      
      // Coding problem questions
      {
        question: `Create a C++ class that demonstrates ${topic || "encapsulation"} with proper access modifiers.`,
        correctAnswer: `\`\`\`cpp
class Student {
private:
    int id;
    std::string name;
    double gpa;
    
public:
    // Constructor
    Student(int studentId, std::string studentName, double studentGpa) 
        : id(studentId), name(studentName), gpa(studentGpa) {}
    
    // Getters
    int getId() const { return id; }
    std::string getName() const { return name; }
    double getGpa() const { return gpa; }
    
    // Setters with validation
    void setName(const std::string& newName) {
        if (!newName.empty()) {
            name = newName;
        }
    }
    
    void setGpa(double newGpa) {
        if (newGpa >= 0.0 && newGpa <= 4.0) {
            gpa = newGpa;
        }
    }
};
\`\`\``,
        difficulty: "medium",
        type: "coding_problem",
        subject: subject,
        gradeLevel: studentLevel
      },
      {
        question: `Implement a C++ program that demonstrates ${topic || "method overriding"} with a base class and a derived class.`,
        correctAnswer: `\`\`\`cpp
#include <iostream>
#include <string>

class Shape {
public:
    virtual double area() const {
        return 0.0;
    }
    virtual void display() const {
        std::cout << "This is a generic shape." << std::endl;
    }
};

class Circle : public Shape {
private:
    double radius;
public:
    Circle(double r) : radius(r) {}
    
    double area() const override {
        return 3.14159 * radius * radius;
    }
    
    void display() const override {
        std::cout << "This is a circle with radius " << radius 
                  << " and area " << area() << std::endl;
    }
};

int main() {
    Shape* shape = new Circle(5.0);
    shape->display();  // Calls the overridden method in Circle
    delete shape;
    return 0;
}
\`\`\``,
        difficulty: "medium",
        type: "coding_problem",
        subject: subject,
        gradeLevel: studentLevel
      },
      {
        question: `Create a template class in C++ that demonstrates ${topic || "generic programming"} principles.`,
        correctAnswer: `\`\`\`cpp
#include <iostream>
#include <vector>

template <typename T>
class Stack {
private:
    std::vector<T> elements;
    
public:
    // Push an element onto the stack
    void push(const T& element) {
        elements.push_back(element);
    }
    
    // Pop an element from the stack
    T pop() {
        if (isEmpty()) {
            throw std::out_of_range("Stack is empty");
        }
        
        T topElement = elements.back();
        elements.pop_back();
        return topElement;
    }
    
    // Check if the stack is empty
    bool isEmpty() const {
        return elements.empty();
    }
    
    // Get the size of the stack
    size_t size() const {
        return elements.size();
    }
    
    // Peek at the top element without removing it
    T& top() {
        if (isEmpty()) {
            throw std::out_of_range("Stack is empty");
        }
        return elements.back();
    }
};

int main() {
    // Create a stack of integers
    Stack<int> intStack;
    intStack.push(10);
    intStack.push(20);
    intStack.push(30);
    
    std::cout << "Size: " << intStack.size() << std::endl;  // Output: 3
    std::cout << "Top: " << intStack.top() << std::endl;    // Output: 30
    
    int popped = intStack.pop();
    std::cout << "Popped: " << popped << std::endl;        // Output: 30
    std::cout << "New size: " << intStack.size() << std::endl; // Output: 2
    
    // Create a stack of strings
    Stack<std::string> stringStack;
    stringStack.push("Hello");
    stringStack.push("World");
    
    std::cout << "Top string: " << stringStack.top() << std::endl; // Output: World
    
    return 0;
}
\`\`\``,
        difficulty: "hard",
        type: "coding_problem",
        subject: subject,
        gradeLevel: studentLevel
      }
    ];
    
    // Generate additional questions programmatically to reach desired count
    const numAdditionalQuestions = Math.max(0, count - fallbackQuestions.length);
    for (let i = 0; i < numAdditionalQuestions; i++) {
      const type = defaultTypes[i % defaultTypes.length];
      const difficulty = defaultDifficulties[Math.floor(i / defaultTypes.length) % defaultDifficulties.length];
      
      let question = "";
      let answer = "";
      
      if (type === "short_answer") {
        // Generate more short answer questions
        const concepts = [
          "multiple inheritance", "virtual destructors", "friend functions", 
          "const correctness", "the rule of three/five", "RAII principles",
          "smart pointers", "operator overloading", "function objects (functors)",
          "templates specialization", "STL containers"
        ];
        
        const conceptIndex = i % concepts.length;
        const concept = concepts[conceptIndex];
        
        question = `Explain the importance of ${concept} in C++ Object-Oriented Programming.`;
        
        if (concept === "multiple inheritance") {
          answer = "Multiple inheritance in C++ allows a class to inherit from more than one base class, enabling more complex class hierarchies and code reuse. It's powerful but comes with challenges like the diamond problem, which can be resolved using virtual inheritance. This feature supports more flexible designs but should be used judiciously to avoid overly complex class relationships.";
        } else if (concept === "virtual destructors") {
          answer = "Virtual destructors are crucial when dealing with inheritance hierarchies. When a derived class object is deleted through a base class pointer, a virtual destructor ensures the derived class destructor is called first, followed by the base class destructor. This prevents memory leaks by ensuring all resources allocated by derived classes are properly released.";
        } else if (concept === "friend functions") {
          answer = "Friend functions in C++ are non-member functions that have access to a class's private and protected members. They're useful for operations that need access to private data but aren't logically part of the class. Common use cases include operator overloading that requires access to the internal representation of multiple classes. While they break encapsulation in a controlled way, they should be used sparingly to maintain data hiding principles.";
        } else if (concept === "const correctness") {
          answer = "Const correctness is a design approach where methods that don't modify object state are marked 'const', and variables that shouldn't be modified are declared const. This creates self-documenting code, prevents accidental modifications, enables compiler optimizations, and supports logical constness through mutable members when needed. It's a fundamental practice for building robust C++ classes.";
        } else if (concept === "the rule of three/five") {
          answer = "The Rule of Three states that if a class requires a custom destructor, copy constructor, or copy assignment operator, it likely needs all three because they each manage resources. The Rule of Five extends this to include move constructor and move assignment operator in C++11. Following these rules ensures proper resource management and prevents memory leaks and undefined behavior in classes that manage resources like dynamic memory.";
        } else if (concept === "RAII principles") {
          answer = "Resource Acquisition Is Initialization (RAII) is a C++ programming idiom where resource management is tied to object lifetime. Resources (memory, files, locks) are acquired in constructors and released in destructors, ensuring automatic cleanup even when exceptions occur. This pattern prevents resource leaks and simplifies code by eliminating explicit cleanup, making C++ programs more robust and exception-safe.";
        } else {
          answer = `${concept} is an important concept in C++ OOP that helps developers write more efficient, maintainable, and robust code. It allows for better organization of code, improved performance, and enhanced ability to model complex systems. Understanding and correctly implementing ${concept} is essential for advanced C++ programming.`;
        }
      } else if (type === "coding_problem") {
        // Generate more coding problems
        const problems = [
          "smart pointers", "RAII", "operator overloading", 
          "template metaprogramming", "multiple inheritance",
          "exception handling", "STL algorithms"
        ];
        
        const problemIndex = i % problems.length;
        const problem = problems[problemIndex];
        
        if (problem === "smart pointers") {
          question = "Implement a resource management class in C++ that uses smart pointers to handle memory safely.";
          answer = `\`\`\`cpp
#include <iostream>
#include <memory>
#include <vector>
#include <string>

class Resource {
private:
    std::string name;
    size_t size;
    
public:
    Resource(const std::string& n, size_t s) : name(n), size(s) {
        std::cout << "Resource " << name << " created with size " << size << std::endl;
    }
    
    ~Resource() {
        std::cout << "Resource " << name << " destroyed" << std::endl;
    }
    
    void use() const {
        std::cout << "Using resource " << name << std::endl;
    }
    
    size_t getSize() const {
        return size;
    }
};

class ResourceManager {
private:
    std::vector<std::shared_ptr<Resource>> resources;
    
public:
    // Add a resource to manage
    void addResource(const std::string& name, size_t size) {
        resources.push_back(std::make_shared<Resource>(name, size));
    }
    
    // Get a resource by index (returns a shared_ptr to allow shared ownership)
    std::shared_ptr<Resource> getResource(size_t index) {
        if (index < resources.size()) {
            return resources[index];
        }
        return nullptr;
    }
    
    // Use all resources
    void useAllResources() const {
        for (const auto& res : resources) {
            res->use();
        }
    }
    
    // Get total resource size
    size_t getTotalSize() const {
        size_t total = 0;
        for (const auto& res : resources) {
            total += res->getSize();
        }
        return total;
    }
};

int main() {
    {
        ResourceManager manager;
        
        manager.addResource("Memory", 1024);
        manager.addResource("Database", 2048);
        manager.addResource("Network", 512);
        
        // Create a local scope and retain a resource outside the manager
        {
            std::shared_ptr<Resource> sharedResource = manager.getResource(1);
            
            // Use all resources
            manager.useAllResources();
            
            std::cout << "Total managed resource size: " << manager.getTotalSize() << std::endl;
            
            // This will keep the Database resource alive even after leaving this scope
            std::cout << "Keeping reference to: ";
            sharedResource->use();
        }
        
        // Resources are automatically cleaned when manager goes out of scope
        // except for the Database resource which is still referenced by sharedResource
    }
    // Now all resources are destroyed as all shared_ptrs are gone
    
    return 0;
}
\`\`\``;
        } else if (problem === "exception handling") {
          question = "Write a C++ program that demonstrates proper exception handling in a class hierarchy.";
          answer = `\`\`\`cpp
#include <iostream>
#include <stdexcept>
#include <memory>
#include <string>

// Base exception class for our application
class DatabaseException : public std::runtime_error {
public:
    DatabaseException(const std::string& message) 
        : std::runtime_error("Database Error: " + message) {}
};

// Derived specific exceptions
class ConnectionException : public DatabaseException {
public:
    ConnectionException(const std::string& message) 
        : DatabaseException("Connection failed: " + message) {}
};

class QueryException : public DatabaseException {
public:
    QueryException(const std::string& message) 
        : DatabaseException("Query failed: " + message) {}
};

class Database {
private:
    bool connected;
    std::string connectionString;
    
public:
    Database(const std::string& connStr) : connected(false), connectionString(connStr) {}
    
    ~Database() {
        try {
            if (connected) {
                disconnect();
            }
        } catch (const std::exception& e) {
            // Log error but don't throw from destructor
            std::cerr << "Error during cleanup: " << e.what() << std::endl;
        }
    }
    
    void connect() {
        // Simulate connection logic
        if (connectionString.empty()) {
            throw ConnectionException("Empty connection string");
        }
        
        if (connectionString == "invalid") {
            throw ConnectionException("Invalid credentials");
        }
        
        std::cout << "Connected to database" << std::endl;
        connected = true;
    }
    
    void disconnect() {
        if (!connected) {
            throw ConnectionException("Not connected");
        }
        
        std::cout << "Disconnected from database" << std::endl;
        connected = false;
    }
    
    void executeQuery(const std::string& query) {
        if (!connected) {
            throw QueryException("Not connected to database");
        }
        
        if (query.empty()) {
            throw QueryException("Empty query");
        }
        
        if (query == "DELETE FROM *") {
            throw QueryException("Dangerous query detected");
        }
        
        // Simulate query execution
        std::cout << "Executing query: " << query << std::endl;
    }
};

void demonstrateExceptionHandling() {
    try {
        // Attempt to work with a valid database
        std::cout << "--- Scenario 1: Valid Database ---" << std::endl;
        Database validDb("valid_connection");
        
        try {
            validDb.connect();
            validDb.executeQuery("SELECT * FROM users");
            validDb.disconnect();
        } catch (const ConnectionException& e) {
            std::cerr << "Connection error: " << e.what() << std::endl;
        } catch (const QueryException& e) {
            std::cerr << "Query error: " << e.what() << std::endl;
            // Always disconnect on query errors
            validDb.disconnect();
        } catch (const DatabaseException& e) {
            std::cerr << "General database error: " << e.what() << std::endl;
        }
        
        // Attempt to work with an invalid database
        std::cout << "\\n--- Scenario 2: Invalid Database ---" << std::endl;
        Database invalidDb("invalid");
        
        try {
            invalidDb.connect(); // This will throw
            invalidDb.executeQuery("SELECT * FROM users");
        } catch (const ConnectionException& e) {
            std::cerr << "Expected error: " << e.what() << std::endl;
        }
        
        // Attempt dangerous query
        std::cout << "\\n--- Scenario 3: Dangerous Query ---" << std::endl;
        Database db("valid_connection");
        db.connect();
        
        try {
            db.executeQuery("DELETE FROM *"); // This will throw
        } catch (const QueryException& e) {
            std::cerr << "Caught dangerous query: " << e.what() << std::endl;
        }
        
        db.disconnect();
        
    } catch (const std::exception& e) {
        std::cerr << "Unexpected exception: " << e.what() << std::endl;
    } catch (...) {
        std::cerr << "Unknown exception caught" << std::endl;
    }
}

int main() {
    demonstrateExceptionHandling();
    return 0;
}
\`\`\``;
        } else {
          question = `Create a C++ class that demonstrates ${problem} principles and best practices.`;
          answer = `\`\`\`cpp
// This is a placeholder implementation for a ${problem} example in C++
#include <iostream>
#include <string>

class Example {
private:
    // Class implementation would go here
    
public:
    // Public interface would be defined here
    void demonstrate() {
        std::cout << "Demonstrating ${problem} in C++" << std::endl;
    }
};

int main() {
    Example example;
    example.demonstrate();
    return 0;
}
\`\`\`

For a complete implementation of ${problem}, you would need to include specific elements such as:
1. Proper class design with appropriate access modifiers
2. Memory management considerations
3. Implementation of the specific ${problem} pattern
4. Examples of how the pattern is used in real-world scenarios
5. Consideration of performance implications`;
        }
      }
      
      fallbackQuestions.push({
        question,
        correctAnswer: answer,
        difficulty,
        type,
        subject,
        gradeLevel: studentLevel
      });
    }
    
    return fallbackQuestions;
  }
}

export async function generatePerformanceInsights(
  studentData: any,
  subject: string = "Object-Oriented Programming with C++"
): Promise<{
  learningGaps: string[];
  strengths: string[];
  recommendedFocus: string[];
  teachingStrategies: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert C++ programming instructor and educational analyst specializing in OOP. 
          Analyze student performance data on C++ programming assignments and provide detailed, actionable insights
          focused on improving their object-oriented programming skills.`
        },
        {
          role: "user",
          content: `
          Analyze the following student performance data for Object-Oriented Programming with C++:
          ${JSON.stringify(studentData)}
          
          Provide insights in JSON format with these specific C++ OOP-focused categories:
          1. "learningGaps": Array of specific C++ OOP concepts the student is struggling with
          2. "strengths": Array of C++ OOP concepts the student demonstrates mastery of
          3. "recommendedFocus": Array of specific C++ OOP topics and exercises to practice
          4. "teachingStrategies": Array of effective teaching approaches for addressing the identified gaps
          
          For each category, focus on:
          - Specific C++ language features (classes, templates, virtual functions, etc.)
          - Code organization principles (encapsulation, modularity)
          - Memory management patterns (RAII, smart pointers)
          - Design pattern understanding
          - Abstraction and inheritance implementation
          - Problem-solving approaches in an OOP context
          `
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.6, // Lower temperature for more consistent analysis
      max_tokens: 1500
    });

    const contentStr = response.choices[0].message.content || "{}";
    const result = JSON.parse(contentStr);
    
    return {
      learningGaps: result.learningGaps || [],
      strengths: result.strengths || [],
      recommendedFocus: result.recommendedFocus || [],
      teachingStrategies: result.teachingStrategies || []
    };
  } catch (error: any) {
    console.error("Error generating performance insights:", error);
    // Fallback response
    return {
      learningGaps: ["Unable to analyze learning gaps due to technical error"],
      strengths: ["Unable to analyze strengths due to technical error"],
      recommendedFocus: ["Review core concepts and fundamentals"],
      teachingStrategies: ["Consider standard teaching approaches until analysis is available"]
    };
  }
}
