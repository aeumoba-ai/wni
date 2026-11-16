import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import roomsHandler from '../api/rooms.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Strict JSON body limit to block oversized payload DoS
app.use(express.json({ limit: '16kb' }));

// Safe security headers (compatible with cross-origin live previews & WebRTC)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, mode: 'vercel-ready-guest-p2p', security: 'hardened' });
});

app.all('/api/rooms', (req, res) => roomsHandler(req, res));

// Reject malformed JSON cleanly without leaking stack traces
app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ error: 'Payload terlalu besar.' });
    return;
  }
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'Format JSON tidak valid.' });
    return;
  }
  next(err);
});

app.use(express.static(distDir));
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Monopoli Negeri Konoha server listening on http://0.0.0.0:${PORT}`);
});
