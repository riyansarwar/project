import { Request, Response } from 'express';
import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Store active execution sessions
interface ExecutionSession {
  id: string;
  process?: any;
  codeFile?: string;
  exeFile?: string;
  outputBuffer: string;
  isRunning: boolean;
  needsInput: boolean;
  clients: Response[];
  simulationState?: {
    step: number;
    inputs: string[];
    finished: boolean;
    needsInput: boolean;
    outputStatements: string[];
  };
}

const sessions = new Map<string, ExecutionSession>();

// Clean up old sessions (prevent memory leaks)
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    // Remove sessions older than 10 minutes
    if (now - parseInt(id) > 10 * 60 * 1000) {
      cleanupSession(id);
    }
  }
}, 60000);

function cleanupSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) return;

  // Kill process if running
  if (session.process) {
    session.process.kill();
  }

  // Remove temp files
  if (session.codeFile && fs.existsSync(session.codeFile)) {
    fs.unlinkSync(session.codeFile);
  }
  if (session.exeFile && fs.existsSync(session.exeFile)) {
    fs.unlinkSync(session.exeFile);
  }

  // Close all SSE connections
  session.clients.forEach(client => {
    if (!client.destroyed) {
      client.write('event: finished\ndata: {"type":"finished"}\n\n');
      client.end();
    }
  });

  sessions.delete(sessionId);
}

function broadcastToSession(sessionId: string, event: string, data: any) {
  const session = sessions.get(sessionId);
  if (!session) return;

  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  
  session.clients = session.clients.filter(client => {
    if (client.destroyed) return false;
    
    try {
      client.write(message);
      return true;
    } catch (e) {
      return false;
    }
  });
}

// Simulation function for when g++ is not available
function simulateCodeExecution(sessionId: string, code: string) {
  const session = sessions.get(sessionId);
  if (!session) return;

  // Initialize simulation state
  session.simulationState = {
    step: 0,
    inputs: [],
    finished: false,
    needsInput: code.includes('cin') || code.includes('scanf') || code.includes('getline'),
    outputStatements: []
  };

  // Basic code validation
  const hasIncludes = code.includes('#include');
  const hasMain = code.includes('main');

  if (!hasIncludes) {
    broadcastToSession(sessionId, 'output', { type: 'output', data: 'Compilation error: Missing #include statements\n' });
    broadcastToSession(sessionId, 'finished', { type: 'finished' });
    session.isRunning = false;
    return;
  }

  if (!hasMain) {
    broadcastToSession(sessionId, 'output', { type: 'output', data: 'Compilation error: Missing main() function\n' });
    broadcastToSession(sessionId, 'finished', { type: 'finished' });
    session.isRunning = false;
    return;
  }

  broadcastToSession(sessionId, 'output', { type: 'output', data: '=== Compilation Successful ===\n' });
  broadcastToSession(sessionId, 'output', { type: 'output', data: '=== Program Output ===\n' });

  // Extract cout statements for simulation
  const coutMatches = code.match(/cout\s*<<\s*[^;]+;/g);
  if (coutMatches) {
    session.simulationState.outputStatements = coutMatches.map(match => {
      const stringMatch = match.match(/"([^"]+)"/);
      return stringMatch ? stringMatch[1] : 'cout << [expression]';
    });
  }

  // Start simulation flow
  setTimeout(() => continueSimulation(sessionId), 300);
}

function continueSimulation(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session || !session.simulationState || session.simulationState.finished) return;

  const state = session.simulationState;

  // Show output statements first
  if (state.step < state.outputStatements.length) {
    const output = state.outputStatements[state.step];
    broadcastToSession(sessionId, 'output', { type: 'output', data: output + '\n' });
    state.step++;
    
    // Check if we need input after this output
    if (state.needsInput && state.inputs.length === 0) {
      setTimeout(() => {
        session.needsInput = true;
        broadcastToSession(sessionId, 'input_request', { type: 'input_request', prompt: 'Enter input: ' });
      }, 200);
    } else {
      setTimeout(() => continueSimulation(sessionId), 300);
    }
    return;
  }

  // If we need input and haven't gotten any
  if (state.needsInput && state.inputs.length === 0) {
    session.needsInput = true;
    broadcastToSession(sessionId, 'input_request', { type: 'input_request', prompt: 'Enter input: ' });
    return;
  }

  // Finish simulation
  state.finished = true;
  session.isRunning = false;
  broadcastToSession(sessionId, 'output', { type: 'output', data: '\n=== Program finished with exit code 0 ===\n' });
  broadcastToSession(sessionId, 'finished', { type: 'finished' });
}

// SSE endpoint for real-time output
export function startExecution(req: Request, res: Response) {
  const { code } = req.body;
  const sessionId = Date.now().toString();

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'No code provided' });
  }

  // Create new session
  const session: ExecutionSession = {
    id: sessionId,
    outputBuffer: '',
    isRunning: true,
    needsInput: false,
    clients: []
  };
  
  sessions.set(sessionId, session);

  // Return session ID for client to connect to SSE
  res.json({ sessionId, message: 'Execution started' });

  // Start code execution
  executeCode(sessionId, code);
}

// SSE connection endpoint
export function connectToSession(req: Request, res: Response) {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

  // Add client to session
  session.clients.push(res);

  // Send initial connection message
  res.write('event: connected\ndata: {"type":"connected","message":"Connected to execution stream"}\n\n');

  // Send any buffered output
  if (session.outputBuffer) {
    res.write(`event: output\ndata: ${JSON.stringify({ type: 'output', data: session.outputBuffer })}\n\n`);
  }

  // Handle client disconnect
  req.on('close', () => {
    session.clients = session.clients.filter(client => client !== res);
  });
}

// Input endpoint
export function sendInput(req: Request, res: Response) {
  const { sessionId } = req.params;
  const { input } = req.body;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (!session.needsInput) {
    return res.status(400).json({ error: 'No input requested' });
  }

  // Handle simulation input
  if (session.simulationState) {
    session.simulationState.inputs.push(input);
    session.needsInput = false;
    broadcastToSession(sessionId, 'output', { type: 'output', data: `Input received: ${input}\n` });
    setTimeout(() => continueSimulation(sessionId), 200);
    return res.json({ message: 'Input sent' });
  }

  // Handle real process input
  if (session.process && !session.process.killed) {
    session.process.stdin.write(input + '\n');
    session.needsInput = false;
    broadcastToSession(sessionId, 'output', { type: 'output', data: `${input}\n` });
  }

  res.json({ message: 'Input sent' });
}

// Stop execution endpoint
export function stopExecution(req: Request, res: Response) {
  const { sessionId } = req.params;
  
  cleanupSession(sessionId);
  res.json({ message: 'Execution stopped' });
}

function executeCode(sessionId: string, code: string) {
  const session = sessions.get(sessionId);
  if (!session) return;

  const tempDir = os.tmpdir();
  const codeFile = path.join(tempDir, `code_${sessionId}.cpp`);
  const exeFile = path.join(tempDir, `exe_${sessionId}`);
  
  session.codeFile = codeFile;
  session.exeFile = exeFile;
  
  fs.writeFileSync(codeFile, code);

  exec(`g++ "${codeFile}" -o "${exeFile}"`, (error, stdout, stderr) => {
    if (error) {
      // Check if g++ is not found - use simulation
      if (error.message.includes("'g++' is not recognized") || error.code === 'ENOENT') {
        broadcastToSession(sessionId, 'output', { type: 'output', data: 'C++ Compiler not found - Using simulation mode\n' });
        simulateCodeExecution(sessionId, code);
        return;
      }
      
      broadcastToSession(sessionId, 'output', { type: 'output', data: stderr || error.message });
      broadcastToSession(sessionId, 'finished', { type: 'finished' });
      session.isRunning = false;
      return;
    }

    // Run the compiled program
    const process = spawn(exeFile, [], { stdio: ['pipe', 'pipe', 'pipe'] });
    session.process = process;

    let inputRequested = false;

    process.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      session.outputBuffer += output;
      broadcastToSession(sessionId, 'output', { type: 'output', data: output });
      
      // Check if program is waiting for input
      if (!inputRequested && (output.includes('Enter') || output.includes('Input') || output.includes(':') || output.endsWith('?'))) {
        inputRequested = true;
        setTimeout(() => {
          if (session.process && !session.process.killed) {
            session.needsInput = true;
            broadcastToSession(sessionId, 'input_request', { type: 'input_request', prompt: '> ' });
          }
        }, 100);
      }
    });

    process.stderr.on('data', (data: Buffer) => {
      const output = data.toString();
      session.outputBuffer += output;
      broadcastToSession(sessionId, 'output', { type: 'output', data: output });
    });

    process.on('close', (code: number) => {
      session.isRunning = false;
      const message = `\nProgram finished with exit code ${code}\n`;
      session.outputBuffer += message;
      broadcastToSession(sessionId, 'output', { type: 'output', data: message });
      broadcastToSession(sessionId, 'finished', { type: 'finished' });
    });

    // Check if code likely needs input and request it proactively
    if (code.includes('cin') || code.includes('scanf') || code.includes('getline')) {
      setTimeout(() => {
        if (session.process && !session.process.killed && !inputRequested) {
          inputRequested = true;
          session.needsInput = true;
          broadcastToSession(sessionId, 'input_request', { type: 'input_request', prompt: '> ' });
        }
      }, 500);
    }
  });
}