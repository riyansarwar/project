import { createServer } from "vite";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Get the directory name of the current file
const __dirname = dirname(fileURLToPath(import.meta.url));

async function startFrontendServer() {
  // Create Vite server
  const vite = await createServer({
    // Specify server options
    server: {
      port: 3000, // Use port 3000 for the frontend
      host: "0.0.0.0", // Listen on all network interfaces
      hmr: true, // Enable hot module replacement
    },
    // Root directory for frontend (client directory)
    root: resolve(__dirname, "./"),
    // Use clearScreen: false to prevent Vite from clearing the terminal
    clearScreen: false,
    // LogLevel can be 'info', 'warn', 'error', or 'silent'
    logLevel: "info",
  });

  // Start the server and print logs
  await vite.listen();
  console.log(`
Frontend development server running at:
- Local:   http://localhost:3000/
- Network: http://${getLocalIp()}:3000/
`);
}

// Helper function to get local IP address for display purposes
function getLocalIp(): string {
  const { networkInterfaces } = require("os");
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "0.0.0.0"; // Fallback
}

startFrontendServer().catch((err) => {
  console.error("Error starting frontend server:", err);
  process.exit(1);
});