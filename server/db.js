import pg from 'pg';

const { Pool } = pg;
let pool;

export function databaseEnabled() {
  return Boolean(process.env.DATABASE_URL);
}

export async function initializeDatabase() {
  if (!databaseEnabled()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL is required in production. Add a managed PostgreSQL connection string.');
    }
    return;
  }

  pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);
  `);
}

function requirePool() {
  if (!pool) throw new Error('The PostgreSQL database has not been initialized.');
  return pool;
}

export async function findUserByEmail(email) {
  const { rows } = await requirePool().query(
    'SELECT id, name, email, salt, password_hash AS "passwordHash", created_at AS "createdAt" FROM users WHERE email = $1',
    [email]
  );
  return rows[0] || null;
}

export async function findUserById(id) {
  const { rows } = await requirePool().query(
    'SELECT id, name, email, salt, password_hash AS "passwordHash", created_at AS "createdAt" FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

export async function createUser(user) {
  const { rows } = await requirePool().query(
    `INSERT INTO users (id, name, email, salt, password_hash, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, email, salt, password_hash AS "passwordHash", created_at AS "createdAt"`,
    [user.id, user.name, user.email, user.salt, user.passwordHash, user.createdAt]
  );
  return rows[0];
}

export async function createSession(tokenHash, userId, expiresAt) {
  const db = requirePool();
  await db.query('DELETE FROM sessions WHERE expires_at <= NOW()');
  await db.query(
    'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
    [tokenHash, userId, expiresAt]
  );
}

export async function findSessionUser(tokenHash) {
  const { rows } = await requirePool().query(
    `SELECT u.id, u.name, u.email
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
    [tokenHash]
  );
  return rows[0] || null;
}

export async function deleteSession(tokenHash) {
  await requirePool().query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
}

export async function closeDatabase() {
  if (pool) await pool.end();
}

export async function insertMigratedUser(user) {
  const { rowCount } = await requirePool().query(
    `INSERT INTO users (id, name, email, salt, password_hash, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT DO NOTHING`,
    [user.id, user.name, user.email.toLowerCase(), user.salt, user.passwordHash, user.createdAt]
  );
  return rowCount === 1;
}
