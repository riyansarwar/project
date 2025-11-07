import { useState, useCallback } from 'react';

export interface CodeExecutionResult {
  output?: string;
  error?: string;
}

export function useCodeExecution() {
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [showInput, setShowInput] = useState(false);
  const [isConnected, setIsConnected] = useState(true); // HTTP is always "connected"
  const [currentCode, setCurrentCode] = useState<string>('');
  const [userInputs, setUserInputs] = useState<string[]>([]);

  const runCode = useCallback(async (code: string, input?: string) => {
    if (!code.trim()) {
      setError('No code to run');
      return;
    }

    try {
      setIsRunning(true);
      setOutput('Compiling and running code...\n');
      setError('');
      setShowInput(false);
      setCurrentCode(code);
      setUserInputs([]);

      // Check if the code contains cin statements (needs interactive input)
      const hasCinStatements = /cin\s*>>\s*[a-zA-Z_]/.test(code);
      
      if (hasCinStatements && !input) {
        // Interactive mode - start execution and wait for input
        await startInteractiveExecution(code);
      } else {
        // Non-interactive mode or input provided
        await executeWithProvidedInput(code, input);
      }
    } catch (err) {
      console.error('Execution error:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute code');
      setIsRunning(false);
    }
  }, []);

  const startInteractiveExecution = useCallback(async (code: string) => {
    // Start interactive execution - show input prompt immediately
    setOutput('Program started. Please enter input:\n');
    setInputPrompt('Enter value: ');
    setShowInput(true);
    // Keep isRunning true so user knows program is waiting for input
  }, []);

  const executeWithProvidedInput = useCallback(async (code: string, input?: string) => {
    const response = await fetch('/api/execute-cpp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, input }),
    });

    if (!response.ok) {
      throw new Error('Failed to execute code');
    }

    const result = await response.json();
    
    if (result.error) {
      setError(result.error);
    } else {
      setOutput(result.output || 'Program executed successfully');
    }
    setIsRunning(false);
  }, []);

  const sendInput = useCallback(async (input: string) => {
    if (!showInput || !currentCode) return;

    // Add the input to our collection
    const newInputs = [...userInputs, input];
    setUserInputs(newInputs);
    
    // Update output to show what user entered
    setOutput(prev => prev + `${input}\n`);
    setShowInput(false);

    try {
      // Count total inputs needed by parsing cin statements
      const cinMatches = currentCode.match(/cin\s*>>\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\s*>>\s*[a-zA-Z_][a-zA-Z0-9_]*)*)/g) || [];
      let totalInputsNeeded = 0;
      
      for (const match of cinMatches) {
        const variables = match.replace(/cin\s*>>\s*/, '').split('>>').map(v => v.trim());
        totalInputsNeeded += variables.filter(v => v && v.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)).length;
      }

      if (newInputs.length < totalInputsNeeded) {
        // Need more input
        setOutput(prev => prev + 'Enter next value: ');
        setInputPrompt(`Enter value (${newInputs.length + 1}/${totalInputsNeeded}): `);
        setShowInput(true);
        return;
      }

      // All inputs collected, execute the code
      const allInputs = newInputs.join('\n');
      setOutput(prev => prev + 'Executing program...\n');
      
      const response = await fetch('/api/execute-cpp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: currentCode, input: allInputs }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute code');
      }

      const result = await response.json();
      
      if (result.error) {
        setError(result.error);
        setIsRunning(false);
      } else {
        // Show final output
        setOutput(result.output || 'Program completed successfully');
        setIsRunning(false);
      }
    } catch (err) {
      console.error('Input execution error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process input');
      setIsRunning(false);
    }
  }, [showInput, currentCode, userInputs]);

  const stopExecution = useCallback(() => {
    setIsRunning(false);
    setShowInput(false);
    setOutput('');
    setError('');
  }, []);

  const reconnect = useCallback(() => {
    // For HTTP, we don't need to reconnect
    setError('');
    setIsConnected(true);
  }, []);

  return {
    isRunning,
    output,
    error,
    inputPrompt,
    showInput,
    isConnected,
    runCode,
    sendInput,
    stopExecution,
    clearOutput: () => setOutput(''),
    clearError: () => setError(''),
    reconnect
  };
}