import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { promisify } from 'node:util';
import {
  createSession as createDatabaseSession,
  createUser as createDatabaseUser,
  databaseEnabled,
  deleteSession as deleteDatabaseSession,
  findSessionUser,
  findUserByEmail,
} from './db.js';

const scrypt = promisify(scryptCallback);
const userFile = new URL('./users.json', import.meta.url);
const sessions = new Map();
let users = [];
try { if (existsSync(userFile)) users = JSON.parse(readFileSync(userFile, 'utf8')); } catch { users = []; }

function saveUsers() { writeFileSync(userFile, JSON.stringify(users, null, 2), { mode: 0o600 }); }
function tokenFrom(req) {
  const cookie = req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith('clarity_session='));
  if (!cookie) return '';
  try { return decodeURIComponent(cookie.slice('clarity_session='.length)); } catch { return ''; }
}
function tokenHash(token) { return createHash('sha256').update(token).digest('hex'); }
function publicUser(user) { return { id: user.id, name: user.name, email: user.email }; }
function setSession(res, token) {
  const production = process.env.NODE_ENV === 'production';
  const secure = production ? '; Secure' : '';
  const sameSite = production ? 'None' : 'Lax';
  res.setHeader('Set-Cookie', `clarity_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=604800${secure}`);
}
async function createSession(token, userId) {
  const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;
  if (databaseEnabled()) await createDatabaseSession(tokenHash(token), userId, new Date(expires));
  else sessions.set(token, { userId, expires });
}
async function getSessionUser(token) {
  if (databaseEnabled()) return findSessionUser(tokenHash(token));
  const session = sessions.get(token);
  if (!session || session.expires < Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  return users.find(entry => entry.id === session.userId) || null;
}

export async function requireAuth(req, res, next) {
  try {
    const token = tokenFrom(req);
    if (!token) return res.status(401).json({ error: 'Please sign in to continue.' });
    const user = await getSessionUser(token);
    if (!user) return res.status(401).json({ error: 'Please sign in to continue.' });
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function registerAuthRoutes(app) {
  app.post('/api/auth/register', async (req, res, next) => {
    try {
      const name = String(req.body?.name || '').trim().slice(0, 80);
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      if (name.length < 2) return res.status(400).json({ error: 'Enter your name (at least 2 characters).' });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address.' });
      if (password.length < 8 || password.length > 200) return res.status(400).json({ error: 'Your password must be at least 8 characters.' });
      const existing = databaseEnabled() ? await findUserByEmail(email) : users.find(user => user.email === email);
      if (existing) return res.status(409).json({ error: 'An account with this email already exists. Sign in instead.' });

      const salt = randomBytes(16).toString('hex');
      const passwordHash = (await scrypt(password, salt, 64)).toString('hex');
      const user = { id: randomBytes(16).toString('hex'), name, email, salt, passwordHash, createdAt: new Date().toISOString() };
      if (databaseEnabled()) {
        try { await createDatabaseUser(user); }
        catch (error) {
          if (error.code === '23505') return res.status(409).json({ error: 'An account with this email already exists. Sign in instead.' });
          throw error;
        }
      } else {
        users.push(user);
        try { saveUsers(); }
        catch { users = users.filter(entry => entry.id !== user.id); return res.status(500).json({ error: 'Could not save your account. Please try again.' }); }
      }

      const token = randomBytes(32).toString('base64url');
      await createSession(token, user.id);
      setSession(res, token);
      res.status(201).json({ user: publicUser(user) });
    } catch (error) { next(error); }
  });

  app.post('/api/auth/login', async (req, res, next) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const user = databaseEnabled() ? await findUserByEmail(email) : users.find(entry => entry.email === email);
      if (!user || !password || password.length > 200) return res.status(401).json({ error: 'That email and password combination did not match.' });
      const candidate = Buffer.from(await scrypt(password, user.salt, 64));
      const expected = Buffer.from(user.passwordHash, 'hex');
      if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) return res.status(401).json({ error: 'That email and password combination did not match.' });
      const token = randomBytes(32).toString('base64url');
      await createSession(token, user.id);
      setSession(res, token);
      res.json({ user: publicUser(user) });
    } catch (error) { next(error); }
  });

  app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
  app.post('/api/auth/logout', async (req, res, next) => {
    try {
      const token = tokenFrom(req);
      if (token) {
        if (databaseEnabled()) await deleteDatabaseSession(tokenHash(token));
        else sessions.delete(token);
      }
      const sameSite = process.env.NODE_ENV === 'production' ? 'None; Secure' : 'Lax';
      res.setHeader('Set-Cookie', `clarity_session=; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=0`);
      res.json({ ok: true });
    } catch (error) { next(error); }
  });
}
