import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeSampleData } from "./storage";
import { createServer } from "http";
import { createTables } from "./migrate";
import { WebSocketServer } from 'ws';
import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  // Ensure DB tables/columns exist (adds missing columns like question_order, ends_at, etc.)
  try { await createTables(); } catch (e) { console.error("Migration failed:", e); }

  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // Create HTTP server once here
  const server = createServer(app);

  // Attach WebSocket server for monitoring
  // Message protocol (JSON):
  // { type: 'register', role: 'student'|'teacher', userId, quizId }
  // { type: 'request_webcam', studentId, quizId } from teacher
  // { type: 'webcam_consent', quizId, teacherId, approved: boolean } from student
  // { type: 'frame', quizId, studentId, dataUrl } from student when approved

  const wss = new WebSocketServer({ server, path: '/ws' });

  type WSClient = {
    ws: import('ws');
    role: 'student'|'teacher'|null;
    userId: number|null;
    quizId: number|null;
  };

  const clients = new Set<WSClient>();

  function send(ws: import('ws'), msg: any) {
    try { ws.send(JSON.stringify(msg)); } catch {}
  }

  function broadcast(filter: (c: WSClient)=>boolean, msg: any) {
    for (const c of clients) {
      if (filter(c)) send(c.ws, msg);
    }
  }

  // Track consent state: key `${quizId}:${studentId}` -> teacherId who is approved
  const consentMap = new Map<string, number>();

  wss.on('connection', (ws, req) => {
    const client: WSClient = { ws, role: null, userId: null, quizId: null };
    clients.add(client);
    try { log(`WS connected from ${req.socket.remoteAddress}`); } catch {}

    ws.on('message', (data) => {
      let msg: any;
      try { msg = JSON.parse(String(data)); } catch { return; }

      if (msg.type === 'register') {
        client.role = msg.role;
        client.userId = msg.userId ?? null;
        client.quizId = msg.quizId ?? null;
        try { log(`WS register: role=${client.role} user=${client.userId} quiz=${client.quizId}`); } catch {}
        return;
      }

      if (msg.type === 'request_webcam' && client.role === 'teacher') {
        const { studentId, quizId } = msg;
        try { log(`WS request_webcam quiz=${quizId} student=${studentId} from teacher=${client.userId}`); } catch {}
        // forward consent request to target student (for this quiz)
        broadcast(c => c.role === 'student' && c.userId === studentId && c.quizId === quizId, {
          type: 'webcam_consent_request',
          quizId,
          teacherId: client.userId,
        });
        return;
      }

      if (msg.type === 'webcam_consent' && client.role === 'student') {
        const { quizId, teacherId, approved } = msg;
        const key = `${quizId}:${client.userId}`;
        if (approved) consentMap.set(key, teacherId);
        else consentMap.delete(key);
        try { log(`WS consent: quiz=${quizId} student=${client.userId} -> teacher=${teacherId} approved=${approved}`); } catch {}
        // notify the requesting teacher
        broadcast(c => c.role === 'teacher' && c.userId === teacherId, {
          type: 'webcam_consent_result',
          quizId,
          studentId: client.userId,
          approved,
        });
        return;
      }

      if (msg.type === 'frame' && client.role === 'student') {
        const { quizId, dataUrl } = msg;
        const key = `${quizId}:${client.userId}`;
        const approvedTeacherId = consentMap.get(key);
        if (!approvedTeacherId) return; // no consent, drop
        // forward frame to the approved teacher
        broadcast(c => c.role === 'teacher' && c.userId === approvedTeacherId, {
          type: 'frame',
          quizId,
          studentId: client.userId,
          dataUrl,
          ts: Date.now(),
        });
        return;
      }
    });

    ws.on('error', (e) => { try { log(`WS error: ${String(e)}`); } catch {} });
    ws.on('close', () => {
      // Cleanup consent for this student if disconnects
      if (client.role === 'student' && client.userId && client.quizId) {
        const key = `${client.quizId}:${client.userId}`;
        consentMap.delete(key);
      }
      clients.delete(client);
      try { log(`WS closed for role=${client.role} user=${client.userId}`); } catch {}
    });
  });

  // Store simulation state per WebSocket connection
  const simulationStates = new WeakMap();

  // Simulation function for C++ execution when compiler is not available
  function simulateCodeExecution(code: string, ws: any) {
    // Initialize simulation state for this connection
    const state = {
      code: code,
      step: 0,
      inputs: [],
      finished: false,
      needsInput: code.includes('cin') || code.includes('scanf') || code.includes('getline'),
      outputStatements: []
    };
    simulationStates.set(ws, state);

    // Basic code validation
    const hasIncludes = code.includes('#include');
    const hasMain = code.includes('main');

    if (!hasIncludes) {
      ws.send(JSON.stringify({
        type: 'output', 
        data: 'Compilation error: Missing #include statements\n'
      }));
      ws.send(JSON.stringify({ type: 'finished' }));
      return;
    }

    if (!hasMain) {
      ws.send(JSON.stringify({
        type: 'output', 
        data: 'Compilation error: Missing main() function\n'
      }));
      ws.send(JSON.stringify({ type: 'finished' }));
      return;
    }

    ws.send(JSON.stringify({ type: 'output', data: '=== Compilation Successful ===\n' }));
    ws.send(JSON.stringify({ type: 'output', data: '=== Program Output ===\n' }));

    // Extract cout statements for later display
    const coutMatches = code.match(/cout\s*<<\s*[^;]+;/g);
    if (coutMatches) {
      state.outputStatements = coutMatches.map(match => {
        const stringMatch = match.match(/"([^"]+)"/);
        return stringMatch ? stringMatch[1] : 'cout << [expression]';
      });
    }

    // Start the simulation flow
    setTimeout(() => continueSimulation(ws), 300);
  }

  // Continue simulation execution
  function continueSimulation(ws: any) {
    const state = simulationStates.get(ws);
    if (!state || state.finished) return;

    // Show output statements first
    if (state.step < state.outputStatements.length) {
      const output = state.outputStatements[state.step];
      ws.send(JSON.stringify({ type: 'output', data: output + '\n' }));
      state.step++;
      
      // Check if we need input after this output
      if (state.needsInput && state.inputs.length === 0) {
        setTimeout(() => {
          ws.send(JSON.stringify({ type: 'input_request', prompt: 'Enter input: ' }));
        }, 200);
      } else {
        setTimeout(() => continueSimulation(ws), 300);
      }
      return;
    }

    // If we need input and haven't gotten any
    if (state.needsInput && state.inputs.length === 0) {
      ws.send(JSON.stringify({ type: 'input_request', prompt: 'Enter input: ' }));
      return;
    }

    // Finish simulation
    state.finished = true;
    ws.send(JSON.stringify({ type: 'output', data: '\n=== Program finished with exit code 0 ===\n' }));
    ws.send(JSON.stringify({ type: 'finished' }));
    simulationStates.delete(ws);
  }

  // Handle input during simulation
  function handleSimulationInput(ws: any, inputData: string) {
    const state = simulationStates.get(ws);
    if (!state || state.finished) return false;

    state.inputs.push(inputData);
    ws.send(JSON.stringify({ type: 'output', data: `Input received: ${inputData}\n` }));
    
    // Continue simulation after input
    setTimeout(() => continueSimulation(ws), 200);
    return true;
  }

  // WebSocket server for interactive code execution
  const codeWss = new WebSocketServer({ server, path: '/ws/code' });

  codeWss.on('connection', (ws) => {
    console.log('🔗 WebSocket client connected');
    ws.send(JSON.stringify({ type: 'connected', message: 'Connected to code execution service' }));
    let currentProcess: any = null;
    let codeFile: string = '';
    let exeFile: string = '';
    let inputRequested = false;

    const cleanup = () => {
      if (currentProcess) {
        currentProcess.kill();
        currentProcess = null;
      }
      if (codeFile && fs.existsSync(codeFile)) fs.unlinkSync(codeFile);
      if (exeFile && fs.existsSync(exeFile)) fs.unlinkSync(exeFile);
      codeFile = '';
      exeFile = '';
      inputRequested = false;
      
      // Clean up simulation state
      simulationStates.delete(ws);
    };

    ws.on('message', (data) => {
      let msg: any;
      try { msg = JSON.parse(String(data)); } catch { return; }

      if (msg.type === 'run') {
        cleanup();
        const code = msg.code;
        const tempDir = os.tmpdir();
        codeFile = path.join(tempDir, `code_${Date.now()}.cpp`);
        exeFile = path.join(tempDir, `exe_${Date.now()}`);
        fs.writeFileSync(codeFile, code);

        exec(`g++ "${codeFile}" -o "${exeFile}"`, (error, stdout, stderr) => {
          if (error) {
            // Check if g++ is not found - provide fallback simulation
            if (error.message.includes("'g++' is not recognized") || error.code === 'ENOENT') {
              ws.send(JSON.stringify({ type: 'output', data: 'C++ Compiler not found - Using simulation mode\n' }));
              
              // Use the simulation code execution logic
              simulateCodeExecution(code, ws);
              return;
            }
            
            ws.send(JSON.stringify({ type: 'output', data: stderr || error.message }));
            ws.send(JSON.stringify({ type: 'finished' }));
            return;
          }

          currentProcess = spawn(exeFile, [], { stdio: ['pipe', 'pipe', 'pipe'] });

          // Monitor for input requests and handle output
          inputRequested = false;
          currentProcess.stdout.on('data', (data: Buffer) => {
            const output = data.toString();
            ws.send(JSON.stringify({ type: 'output', data: output }));
            
            // Check if the program is waiting for input by looking for common patterns
            if (!inputRequested && (output.includes('Enter') || output.includes('Input') || output.includes(':') || output.endsWith('?'))) {
              inputRequested = true;
              setTimeout(() => {
                if (currentProcess && !currentProcess.killed) {
                  ws.send(JSON.stringify({ type: 'input_request', prompt: '> ' }));
                }
              }, 100);
            }
          });

          currentProcess.stderr.on('data', (data: Buffer) => {
            ws.send(JSON.stringify({ type: 'output', data: data.toString() }));
          });

          currentProcess.on('close', (code: number) => {
            ws.send(JSON.stringify({ type: 'output', data: `\nProgram finished with exit code ${code}\n` }));
            ws.send(JSON.stringify({ type: 'finished' }));
            cleanup();
          });

          // Also send initial input request if code likely needs input
          if (code.includes('cin') || code.includes('scanf') || code.includes('getline')) {
            setTimeout(() => {
              if (currentProcess && !currentProcess.killed && !inputRequested) {
                inputRequested = true;
                ws.send(JSON.stringify({ type: 'input_request', prompt: '> ' }));
              }
            }, 500);
          }
        });
      } else if (msg.type === 'input') {
        // Try simulation input handler first
        if (handleSimulationInput(ws, msg.data)) {
          return;
        }
        
        // Otherwise handle real process input
        if (currentProcess && !currentProcess.killed) {
          currentProcess.stdin.write(msg.data + '\n');
          // Reset input request flag so we can request input again if needed
          inputRequested = false;
        }
      } else if (msg.type === 'stop') {
        cleanup();
        ws.send(JSON.stringify({ type: 'output', data: '\nExecution stopped\n' }));
        ws.send(JSON.stringify({ type: 'finished' }));
      }
    });

    ws.on('close', () => {
      cleanup();
    });

    ws.on('error', () => {
      cleanup();
    });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

// PASTE THIS IN ITS PLACE
const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server is live and listening on port ${PORT}`);
});
})();
