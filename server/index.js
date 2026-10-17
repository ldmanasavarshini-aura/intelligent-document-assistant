import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { registerAuthRoutes, requireAuth } from './auth.js';
import { initializeDatabase } from './db.js';

const app = express();
const port = Number(process.env.PORT || 3001);
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.includes(origin));
  },
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
registerAuthRoutes(app);

app.get('/api/health', (_req, res) => res.json({ ok: true, aiConfigured: Boolean(process.env.OPENAI_API_KEY) }));

app.post('/api/ask', requireAuth, async (req, res) => {
  const { question, document } = req.body || {};
  if (typeof question !== 'string' || !question.trim()) return res.status(400).json({ error: 'A question is required.' });
  if (typeof document?.content !== 'string' || !document.content.trim()) return res.status(400).json({ error: 'A readable document is required.' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI is not configured. The browser will use its local document assistant.' });

  try {
    const response = await fetch(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'You are Clarity, a careful document assistant. Answer using only the provided document. Say plainly when the document does not contain an answer. Be concise and useful. Cite supporting passages inline as [1], [2], referring to numbered excerpts below. Never invent page numbers.' },
          { role: 'user', content: `Document: ${document.name || 'Untitled'}\n\n${document.content.slice(0, 100000)}\n\nQuestion: ${question}` }
        ]
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: data.error?.message || 'The AI provider could not answer right now.' });
    const answer = data.choices?.[0]?.message?.content;
    if (!answer) return res.status(502).json({ error: 'The AI provider returned an empty answer.' });
    const sources = [...answer.matchAll(/\[(\d+)\]/g)].map(match => Number(match[1])).filter((n, i, all) => all.indexOf(n) === i).slice(0, 4).map(n => {
      const lines = document.content.split(/\n+/).map(line => line.trim()).filter(line => line.length > 24);
      return { excerpt: (lines[n - 1] || lines[0] || '').slice(0, 110), page: n };
    });
    res.json({ answer, sources });
  } catch (error) {
    console.error('Assistant request failed:', error.message);
    res.status(502).json({ error: 'Could not reach the AI provider.' });
  }
});

await initializeDatabase();
app.listen(port, '0.0.0.0', () => console.log(`Clarity API listening on port ${port}`));
