import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { requireAuth, AuthenticatedRequest } from './server/authMiddleware';
import {
  generateStreamWithFallback,
  generateInsightsWithFallback,
  ChatMessageParam,
} from './server/geminiHelper';

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;
  const HOST = '0.0.0.0';

  // 1. Top-Level Request Deserialization (Ordering Guarantee)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 2. Health Check Endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Reflective Journal AI Server',
    });
  });

  // 3. Streaming Chat Endpoint (/api/chat)
  app.post('/api/chat', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    // Defensive payload ingestion
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const messagesRaw = Array.isArray(body.messages) ? body.messages : [];
    const userPrompt = typeof body.userPrompt === 'string' ? body.userPrompt.trim() : '';

    if (!userPrompt && messagesRaw.length === 0) {
      res.status(400).json({ error: 'Bad Request: "userPrompt" or "messages" must be provided.' });
      return;
    }

    // Build sanitised message list
    const messages: ChatMessageParam[] = [];

    for (const item of messagesRaw) {
      if (item && typeof item === 'object') {
        const role = item.role === 'model' ? 'model' : 'user';
        const content = typeof item.content === 'string' ? item.content.slice(0, 10000) : '';
        if (content.trim()) {
          messages.push({ role, content });
        }
      }
    }

    // If userPrompt is provided separately and not already the last message
    if (userPrompt) {
      const lastMsg = messages[messages.length - 1];
      if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== userPrompt) {
        messages.push({ role: 'user', content: userPrompt.slice(0, 10000) });
      }
    }

    if (messages.length === 0) {
      res.status(400).json({ error: 'Bad Request: No valid messages to process.' });
      return;
    }

    // Setup Server-Sent Events (SSE) headers
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    try {
      const result = await generateStreamWithFallback(messages, (chunkText: string) => {
        const payload = JSON.stringify({ text: chunkText });
        res.write(`data: ${payload}\n\n`);
      });

      // Send completion event
      const donePayload = JSON.stringify({
        done: true,
        model: result.modelUsed,
      });
      res.write(`data: ${donePayload}\n\n`);
      res.end();
    } catch (err: unknown) {
      console.error('[API /api/chat] Streaming error:', err);
      const errPayload = JSON.stringify({
        error: (err as Error).message || 'Streaming generation encountered an error.',
      });
      res.write(`data: ${errPayload}\n\n`);
      res.end();
    }
  });

  // 4. Automated Insights & Tagging Endpoint (/api/insights)
  app.post('/api/insights', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    // Defensive payload ingestion
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const content = typeof body.content === 'string' ? body.content.trim() : '';

    if (!content) {
      res.status(400).json({ error: 'Bad Request: "content" string is required.' });
      return;
    }

    try {
      const insights = await generateInsightsWithFallback(content);
      res.json(insights);
    } catch (err: unknown) {
      console.error('[API /api/insights] Insights error:', err);
      res.status(500).json({
        error: (err as Error).message || 'Failed to generate insights.',
        // Fallback default response so UI flow never breaks
        fallback: {
          title: 'Reflective Entry',
          sentiment: 'Reflective',
          tags: ['Personal'],
          summary: 'A thoughtful reflection.',
        },
      });
    }
  });

  // 5. Vite Middleware Setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Vite] Middleware mounted in development mode.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[Production] Static assets served from dist.');
  }

  // 6. Listen on Port 3000
  app.listen(PORT, HOST, () => {
    console.log(`[Server] Reflective Journal running on http://${HOST}:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[Server] Fatal server start error:', err);
  process.exit(1);
});
