import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "app.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        lm_studio_url TEXT DEFAULT 'http://localhost:1234',
        encrypted_system_prompt TEXT,
        system_prompt_iv TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }
  return db;
}

export interface User {
  id: string;
  username: string;
  password_hash: string;
  lm_studio_url: string;
  encrypted_system_prompt: string | null;
  system_prompt_iv: string | null;
  created_at: string;
}

export function createUser(id: string, username: string, passwordHash: string): User {
  const database = getDb();
  database
    .prepare("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)")
    .run(id, username, passwordHash);
  return findUserByUsername(username)!;
}

export function findUserByUsername(username: string): User | undefined {
  const database = getDb();
  return database.prepare("SELECT * FROM users WHERE username = ?").get(username) as
    | User
    | undefined;
}

export function findUserById(id: string): User | undefined {
  const database = getDb();
  return database.prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;
}

export function updateLmStudioUrl(userId: string, url: string): void {
  const database = getDb();
  database.prepare("UPDATE users SET lm_studio_url = ? WHERE id = ?").run(url, userId);
}

export function updateSystemPrompt(
  userId: string,
  encryptedPrompt: string,
  iv: string
): void {
  const database = getDb();
  database
    .prepare(
      "UPDATE users SET encrypted_system_prompt = ?, system_prompt_iv = ? WHERE id = ?"
    )
    .run(encryptedPrompt, iv, userId);
}

export function clearSystemPrompt(userId: string): void {
  const database = getDb();
  database
    .prepare(
      "UPDATE users SET encrypted_system_prompt = NULL, system_prompt_iv = NULL WHERE id = ?"
    )
    .run(userId);
}
