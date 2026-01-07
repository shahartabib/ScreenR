/**
 * Database connection and initialization
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { SCHEMA, SEED_DATA } from './schema.js';

const DB_PATH = process.env.DB_PATH || './data/screenr.db';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    // Initialize schema
    db.exec(SCHEMA);

    // Run seed data
    try {
      db.exec(SEED_DATA);
    } catch (e) {
      // Ignore if already seeded
    }
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Generic CRUD helpers
export function findById<T>(table: string, id: string): T | undefined {
  const stmt = getDb().prepare(`SELECT * FROM ${table} WHERE id = ?`);
  return stmt.get(id) as T | undefined;
}

export function findAll<T>(table: string, where?: Record<string, any>): T[] {
  let query = `SELECT * FROM ${table}`;
  const params: any[] = [];

  if (where && Object.keys(where).length > 0) {
    const conditions = Object.entries(where).map(([key, value]) => {
      params.push(value);
      return `${key} = ?`;
    });
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  const stmt = getDb().prepare(query);
  return stmt.all(...params) as T[];
}

export function insert<T extends Record<string, any>>(table: string, data: T): T {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => '?').join(', ');

  const stmt = getDb().prepare(
    `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`
  );
  stmt.run(...values);
  return data;
}

export function update<T extends Record<string, any>>(
  table: string,
  id: string,
  data: Partial<T>
): boolean {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const setClause = keys.map((key) => `${key} = ?`).join(', ');

  const stmt = getDb().prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`);
  const result = stmt.run(...values, id);
  return result.changes > 0;
}

export function remove(table: string, id: string): boolean {
  const stmt = getDb().prepare(`DELETE FROM ${table} WHERE id = ?`);
  const result = stmt.run(id);
  return result.changes > 0;
}
