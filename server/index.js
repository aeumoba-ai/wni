import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import roomsHandler from '../api/rooms.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

const app = express();
app.use(express.json());

// Mount the exact same serverless handler used by Vercel at /api/rooms
app.all('/api/rooms', (req, res) => roomsHandler(req, res));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mode: 'vercel-ready-guest-p2p' });
});

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Monopoli Negeri Konoha (Vercel-Ready Guest P2P) listening on http://0.0.0.0:${PORT}`);
});
