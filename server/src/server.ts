import express from "express";
import http from "http";
import cors from "cors";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { config } from "./utils/config";
import { handleConnection, handleMessage, handleDisconnection } from "./handlers/websocket-handler";
import { startPracticeSession, getSupportedLanguages } from "./handlers/routes";


const app = express();
app.use(cors());
app.use(express.json());

// API routes
app.get('/languages', getSupportedLanguages);
app.post('/api/practice/start', startPracticeSession);

// Health check
app.get('/', (req, res) => {
  res.json({
    service: 'VocaLearn Backend',
    version: '2.0.0',
    status: 'running',
    endpoints: ['/languages', '/api/practice/start', '/test-html/']
  });
});

// Serve test HTML files
app.use('/test-html', express.static(path.join(__dirname, '..', 'test-html')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// WebSocket connection handling
wss.on("connection", async (ws, req) => {
  await handleConnection(ws, req);
  
  // Timeout management
  let timeoutId = setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket connection timed out');
      ws.send(JSON.stringify({ error: 'Connection timed out' }));
      ws.close();
    }
  }, 60000);

  // Message handling
  ws.on("message", async (data: Buffer) => {
    try {
      // Reset timeout on activity
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          console.log('WebSocket connection timed out');
          ws.send(JSON.stringify({ error: 'Connection timed out' }));
          ws.close();
        }
      }, 60000);

      await handleMessage(ws, data);
    } catch (error) {
      ws.send(JSON.stringify({
        error: `Processing failed: ${(error as Error).message}`,
      }));
    }
  });

  // Disconnection handling
  ws.on("close", () => {
    clearTimeout(timeoutId);
    handleDisconnection(ws);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server listening on port : ${PORT}`));
