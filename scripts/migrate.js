import dotenv from 'dotenv';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Converted to JS-compatible runtime; remove TS types

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL environment variable');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const migrationsDir = path.resolve('db/migrations');

async function ensureMigrationTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function loadMigrations() {
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const map = {};
  for (const file of files) {
    const full = path.join(migrationsDir, file);
    const m = file.match(/^(\d+_[^\.]+)\.(up|down)\.sql$/);
    if (!m) {
      console.warn(`Skipping file with unexpected name pattern: ${file}`);
      continue;
    }
    const [_, base, dir] = m;
    const sql = fs.readFileSync(full, 'utf8');
    map[base] = map[base] || {};
    map[base][dir] = sql;
  }
  const entries = Object.entries(map)
    .map(([name, v]) => ({ name, up: v.up, down: v.down }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return entries;
}

async function getApplied() {
  const { rows } = await pool.query('SELECT name FROM schema_migrations ORDER BY name');
  return new Set(rows.map(r => r.name));
}

async function applyMigration(name, sql) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations(name) VALUES($1) ON CONFLICT (name) DO NOTHING', [name]);
    await client.query('COMMIT');
    console.log(`Applied: ${name}`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(`Failed applying ${name}:`, e.message);
    throw e;
  } finally {
    client.release();
  }
}

async function rollbackMigration(name, sql) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('DELETE FROM schema_migrations WHERE name = $1', [name]);
    await client.query('COMMIT');
    console.log(`Rolled back: ${name}`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(`Failed rollback ${name}:`, e.message);
    throw e;
  } finally {
    client.release();
  }
}

async function up() {
  await ensureMigrationTable();
  const migrations = loadMigrations();
  const applied = await getApplied();
  const pending = migrations.filter(m => !applied.has(m.name));
  for (const m of pending) {
    if (!m.up) throw new Error(`Missing up.sql for ${m.name}`);
    await applyMigration(m.name, m.up);
  }
  console.log('All pending migrations applied');
}

async function down() {
  await ensureMigrationTable();
  const migrations = loadMigrations();
  const applied = await getApplied();
  const appliedList = migrations.filter(m => applied.has(m.name));
  const last = appliedList[appliedList.length - 1];
  if (!last) {
    console.log('No migrations to rollback');
    return;
  }
  if (!last.down) throw new Error(`Missing down.sql for ${last.name}`);
  await rollbackMigration(last.name, last.down);
}

async function status() {
  await ensureMigrationTable();
  const migrations = loadMigrations();
  const applied = await getApplied();
  for (const m of migrations) {
    console.log(`${applied.has(m.name) ? '[X]' : '[ ]'} ${m.name}`);
  }
}

async function main() {
  const cmd = process.argv[2] || 'status';
  try {
    if (cmd === 'up') await up();
    else if (cmd === 'down') await down();
    else await status();
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});