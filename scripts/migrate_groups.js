import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../api/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    try {
        const migrationPath = path.join(__dirname, '../db/migrations/20240107000000_add_groups_and_campaigns.up.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Running migration...');
        await pool.query(sql);
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
