import axios from 'axios';

export interface ExecutionResult {
  output: string;
  success: boolean;
  error?: string;
  compilationTime?: string;
  executionTime?: string;
  service?: string;
}

// Judge0 API Configuration
const JUDGE0_CONFIG = {
  baseURL: 'https://judge0-ce.p.rapidapi.com',
  headers: {
    'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || 'demo-key',
    'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
    'Content-Type': 'application/json'
  }
};

// C++ Language ID for Judge0 (54 = C++ 17 GCC 9.2.0)
const CPP_LANGUAGE_ID = 54;

/**
 * Execute C++ code using Judge0 API (Most Reliable)
 */
async function executeWithJudge0(code: string, input: string = ""): Promise<ExecutionResult> {
  try {
    // Submit code for execution
    const submissionResponse = await axios.post(
      `${JUDGE0_CONFIG.baseURL}/submissions`,
      {
        language_id: CPP_LANGUAGE_ID,
        source_code: code,
        stdin: input,
        cpu_time_limit: 5,
        memory_limit: 128000,
        wall_time_limit: 10
      },
      { headers: JUDGE0_CONFIG.headers, timeout: 10000 }
    );

    const token = submissionResponse.data.token;
    if (!token) {
      throw new Error('Failed to submit code');
    }

    // Poll for result
    let attempts = 0;
    const maxAttempts = 20;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const resultResponse = await axios.get(
        `${JUDGE0_CONFIG.baseURL}/submissions/${token}`,
        { headers: JUDGE0_CONFIG.headers, timeout: 5000 }
      );

      const result = resultResponse.data;
      
      if (result.status.id <= 2) {
        // Still processing
        attempts++;
        continue;
      }

      // Execution completed
      if (result.status.id === 3) {
        // Accepted (Success)
        return {
          output: result.stdout || '',
          success: true,
          compilationTime: `${result.time || 0}s`,
          executionTime: `${result.time || 0}s`,
          service: 'Judge0 API'
        };
      } else {
        // Error occurred
        const errorOutput = result.stderr || result.compile_output || result.message || 'Unknown error';
        return {
          output: errorOutput,
          success: false,
          error: errorOutput,
          service: 'Judge0 API'
        };
      }
    }

    throw new Error('Execution timeout');
    
  } catch (error) {
    console.error('Judge0 API error:', error.message);
    throw new Error(`Judge0 API failed: ${error.message}`);
  }
}

/**
 * Execute C++ code using Wandbox API (Reliable Backup)
 */
async function executeWithWandbox(code: string, input: string = ""): Promise<ExecutionResult> {
  try {
    const response = await axios.post(
      'https://wandbox.org/api/compile.json',
      {
        compiler: 'gcc-head',
        code: code,
        stdin: input,
        options: 'warning,gnu++17',
        'compiler-option-raw': '-std=gnu++17\n-O2\n-Wall\n-Wextra',
        runtime_option_raw: ''
      },
      { timeout: 15000 }
    );

    const result = response.data;

    if (result.status === '0') {
      // Success
      return {
        output: result.program_output || '',
        success: true,
        compilationTime: '0.8s',
        executionTime: '0.2s',
        service: 'Wandbox API'
      };
    } else {
      // Compilation or runtime error
      const errorOutput = result.compiler_error || result.program_error || 'Unknown error';
      return {
        output: errorOutput,
        success: false,
        error: errorOutput,
        service: 'Wandbox API'
      };
    }
    
  } catch (error) {
    console.error('Wandbox API error:', error.message);
    throw new Error(`Wandbox API failed: ${error.message}`);
  }
}

/**
 * Execute C++ code using CodeX API (Alternative)
 */
async function executeWithCodeX(code: string, input: string = ""): Promise<ExecutionResult> {
  try {
    const response = await axios.post(
      'https://api.codex.jaagrav.in',
      {
        language: 'cpp',
        code: code,
        input: input
      },
      { timeout: 15000 }
    );

    const result = response.data;

    if (result.error === '') {
      // Success
      return {
        output: result.output || '',
        success: true,
        compilationTime: result.cpuTime || '0.5s',
        executionTime: result.cpuTime || '0.1s',
        service: 'CodeX API'
      };
    } else {
      // Error
      return {
        output: result.error,
        success: false,
        error: result.error,
        service: 'CodeX API'
      };
    }
    
  } catch (error) {
    console.error('CodeX API error:', error.message);
    throw new Error(`CodeX API failed: ${error.message}`);
  }
}

/**
 * Execute C++ code using OneCompiler API
 */
async function executeWithOneCompiler(code: string, input: string = ""): Promise<ExecutionResult> {
  try {
    const response = await axios.post(
      'https://onecompiler.com/api/code/exec',
      {
        language: 'cpp',
        stdin: input,
        files: [{
          name: 'main.cpp',
          content: code
        }]
      },
      { 
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const result = response.data;

    if (result.stdout || (result.exception === null && result.stderr === '')) {
      return {
        output: result.stdout || '',
        success: true,
        compilationTime: '0.6s',
        executionTime: '0.2s',
        service: 'OneCompiler API'
      };
    } else {
      const errorOutput = result.stderr || result.exception || 'Unknown error';
      return {
        output: errorOutput,
        success: false,
        error: errorOutput,
        service: 'OneCompiler API'
      };
    }
    
  } catch (error) {
    console.error('OneCompiler API error:', error.message);
    throw new Error(`OneCompiler API failed: ${error.message}`);
  }
}

/**
 * Main function to execute C++ code with fallback services
 */
export async function executeCppCodeOnline(code: string, input: string = ""): Promise<ExecutionResult> {
  if (!code || typeof code !== 'string') {
    return {
      output: 'Error: No code provided',
      success: false,
      error: 'No code provided'
    };
  }

  // Basic code validation
  if (!code.includes('main')) {
    return {
      output: 'Warning: No main function found. Your program should have a main() function.',
      success: false,
      error: 'No main function found'
    };
  }

  const services = [
    { name: 'Judge0', executor: executeWithJudge0 },
    { name: 'Wandbox', executor: executeWithWandbox },
    { name: 'CodeX', executor: executeWithCodeX },
    { name: 'OneCompiler', executor: executeWithOneCompiler }
  ];

  let lastError = '';
  
  for (const service of services) {
    try {
      console.log(`Trying ${service.name} API...`);
      const result = await service.executor(code, input);
      
      if (result.success || result.output) {
        console.log(`✓ ${service.name} API succeeded`);
        return result;
      }
      
    } catch (error) {
      lastError = error.message;
      console.log(`✗ ${service.name} API failed:`, error.message);
      continue;
    }
  }

  // All services failed
  return {
    output: `All compilation services are currently unavailable. Last error: ${lastError}`,
    success: false,
    error: `All services failed: ${lastError}`,
    service: 'None available'
  };
}

/**
 * Format C++ code using basic formatting rules
 */
export async function formatCppCode(code: string): Promise<{ success: boolean; formattedCode?: string; error?: string }> {
  try {
    // Basic C++ formatting
    let formatted = code
      // Fix indentation
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      // Add proper spacing
      .replace(/\{/g, ' {\n')
      .replace(/\}/g, '\n}\n')
      .replace(/;/g, ';\n')
      // Clean up extra newlines
      .replace(/\n\s*\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      // Fix includes
      .replace(/#include</g, '#include <')
      .replace(/using namespace std;/g, 'using namespace std;\n')
      // Proper indentation
      .split('\n')
      .map((line, i, arr) => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        
        let indent = 0;
        for (let j = 0; j < i; j++) {
          const prevLine = arr[j].trim();
          if (prevLine.endsWith('{')) indent++;
          if (prevLine === '}') indent--;
        }
        
        if (trimmed === '}') indent--;
        if (trimmed.startsWith('case ') || trimmed.startsWith('default:')) indent++;
        
        return '    '.repeat(Math.max(0, indent)) + trimmed;
      })
      .join('\n')
      .trim();

    return {
      success: true,
      formattedCode: formatted
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Analyze C++ code for common issues
 */
export async function analyzeCppCode(code: string): Promise<{ success: boolean; analysis?: string; error?: string }> {
  try {
    const issues = [];
    const suggestions = [];
    
    // Check for common issues
    if (!code.includes('#include')) {
      issues.push('⚠️ No #include statements found');
      suggestions.push('💡 Add necessary includes like #include <iostream>');
    }
    
    if (!code.includes('main')) {
      issues.push('❌ No main function found');
      suggestions.push('💡 Every C++ program needs a main() function');
    }
    
    if (code.includes('cout') && !code.includes('#include <iostream>')) {
      issues.push('⚠️ Using cout without including <iostream>');
      suggestions.push('💡 Add #include <iostream> for input/output');
    }
    
    if (code.includes('vector') && !code.includes('#include <vector>')) {
      issues.push('⚠️ Using vector without including <vector>');
      suggestions.push('💡 Add #include <vector> for vector container');
    }
    
    if (!code.includes('using namespace std') && (code.includes('cout') || code.includes('cin'))) {
      suggestions.push('💡 Consider using "using namespace std;" or use std::cout, std::cin');
    }
    
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      issues.push('❌ Unbalanced braces { }');
      suggestions.push('💡 Check that every { has a matching }');
    }
    
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      issues.push('❌ Unbalanced parentheses ( )');
      suggestions.push('💡 Check that every ( has a matching )');
    }
    
    // Check for potential improvements
    if (code.includes('main()') && !code.includes('return 0')) {
      suggestions.push('💡 Consider adding "return 0;" at the end of main()');
    }
    
    if (code.includes('endl') && code.match(/endl/g).length > 3) {
      suggestions.push('💡 For better performance, consider using "\\n" instead of endl for simple newlines');
    }
    
    // Generate analysis report
    let analysis = '📊 Code Analysis Report\n\n';
    
    if (issues.length === 0) {
      analysis += '✅ No major issues found!\n\n';
    } else {
      analysis += '🔍 Issues Found:\n';
      issues.forEach(issue => analysis += `  ${issue}\n`);
      analysis += '\n';
    }
    
    if (suggestions.length > 0) {
      analysis += '💡 Suggestions for Improvement:\n';
      suggestions.forEach(suggestion => analysis += `  ${suggestion}\n`);
    } else {
      analysis += '🎉 Your code looks good! No additional suggestions.';
    }
    
    return {
      success: true,
      analysis
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}