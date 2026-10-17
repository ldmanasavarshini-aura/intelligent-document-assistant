import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const userFile = new URL('./users.json', import.meta.url);
const sessions = new Map();
let users = [];
try { if (existsSync(userFile)) users = JSON.parse(readFileSync(userFile, 'utf8')); } catch { users = []; }

function saveUsers() { writeFileSync(userFile, JSON.stringify(users, null, 2), { mode: 0o600 }); }
function tokenFrom(req) {
  const cookie = req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith('clarity_session='));
  return cookie ? decodeURIComponent(cookie.slice('clarity_session='.length)) : '';
}
function publicUser(user) { return { id: user.id, name: user.name, email: user.email }; }
function setSession(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `clarity_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}`);
}

export function requireAuth(req, res, next) {
  const token = tokenFrom(req);
  const session = sessions.get(token);
  if (!session || session.expires < Date.now()) {
    if (token) sessions.delete(token);
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }
  const user = users.find(entry => entry.id === session.userId);
  if (!user) return res.status(401).json({ error: 'Please sign in to continue.' });
  req.user = user;
  next();
}

export function registerAuthRoutes(app) {
  app.post('/api/auth/register', async (req, res) => {
    const name = String(req.body?.name || '').trim().slice(0, 80);
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (name.length < 2) return res.status(400).json({ error: 'Enter your name (at least 2 characters).' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (password.length < 8 || password.length > 200) return res.status(400).json({ error: 'Your password must be at least 8 characters.' });
    if (users.some(user => user.email === email)) return res.status(409).json({ error: 'An account with this email already exists. Sign in instead.' });
    const salt = randomBytes(16).toString('hex');
    const passwordHash = (await scrypt(password, salt, 64)).toString('hex');
    if (users.some(entry => entry.email === email)) return res.status(409).json({ error: 'An account with this email already exists. Sign in instead.' });
    const user = { id: randomBytes(16).toString('hex'), name, email, salt, passwordHash, createdAt: new Date().toISOString() };
    users.push(user);
    try { saveUsers(); } catch { users = users.filter(entry => entry.id !== user.id); return res.status(500).json({ error: 'Could not save your account. Please try again.' }); }
    const token = randomBytes(32).toString('base64url');
    sessions.set(token, { userId: user.id, expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
    setSession(res, token);
    res.status(201).json({ user: publicUser(user) });
  });

  app.post('/api/auth/login', async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const user = users.find(entry => entry.email === email);
    if (!user || !password || password.length > 200) return res.status(401).json({ error: 'That email and password combination did not match.' });
    const candidate = Buffer.from(await scrypt(password, user.salt, 64));
    const expected = Buffer.from(user.passwordHash, 'hex');
    if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) return res.status(401).json({ error: 'That email and password combination did not match.' });
    const token = randomBytes(32).toString('base64url');
    sessions.set(token, { userId: user.id, expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
    setSession(res, token);
    res.json({ user: publicUser(user) });
  });

  app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
  app.post('/api/auth/logout', (req, res) => {
    const token = tokenFrom(req);
    if (token) sessions.delete(token);
    res.setHeader('Set-Cookie', 'clarity_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    res.json({ ok: true });
  });
}
