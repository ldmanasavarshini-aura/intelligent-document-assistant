import 'dotenv/config';
import { existsSync, readFileSync } from 'node:fs';
import { closeDatabase, initializeDatabase, insertMigratedUser } from './db.js';

if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL to the destination PostgreSQL connection string before running this migration.');
  process.exitCode = 1;
} else {
  try {
    const userFile = new URL('./users.json', import.meta.url);
    if (!existsSync(userFile)) throw new Error('server/users.json was not found. The local account data was left untouched.');
    const parsed = JSON.parse(readFileSync(userFile, 'utf8'));
    const users = Array.isArray(parsed) ? parsed : [parsed];
    for (const user of users) {
      if (!user.id || !user.name || !user.email || !user.salt || !user.passwordHash || !user.createdAt) {
        throw new Error('The local account file has an unexpected format. No records were migrated.');
      }
    }
    await initializeDatabase();
    let imported = 0;
    for (const user of users) if (await insertMigratedUser(user)) imported++;
    console.log(`Migration finished: ${imported} imported, ${users.length - imported} already present. The local JSON file was not changed.`);
  } catch (error) {
    console.error(`Migration failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}
