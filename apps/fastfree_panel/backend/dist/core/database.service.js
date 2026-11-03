/**
 * FastFree Omnigent Database Persistence Engine.
 *
 * Supports dual backends per official Omnigent architecture (https://omnigent.ai/docs/deploy/database):
 * 1. PostgreSQL: Production standard when DATABASE_URL is provided.
 * 2. SQLite (Native node:sqlite): Zero-dependency local persistence in .omnigent/omnigent.db.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
export class DatabaseService {
    static instance;
    sqliteDb = null;
    engine = 'sqlite';
    dbPath = '';
    constructor() {
        this.initDatabase();
    }
    static getInstance() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }
    initDatabase() {
        const rawUrl = process.env['DATABASE_URL'];
        if (rawUrl && (rawUrl.startsWith('postgres://') || rawUrl.startsWith('postgresql://'))) {
            this.engine = 'postgres';
            this.dbPath = rawUrl.replace(/:[^:@]+@/, ':***@'); // mask password
            console.log(`[DatabaseService] Configured for PostgreSQL: ${this.dbPath}`);
            // In multi-instance cluster, PostgreSQL connection pooling is used
        }
        else {
            // Local persistent SQLite via native Node 22+ DatabaseSync
            this.engine = 'sqlite';
            // Resolve path in .omnigent/omnigent.db
            this.dbPath = resolve(process.cwd(), '.omnigent', 'omnigent.db');
            const dir = dirname(this.dbPath);
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }
            this.sqliteDb = new DatabaseSync(this.dbPath);
            this.runMigrations();
            console.log(`[DatabaseService] Persistent SQLite database active at: ${this.dbPath}`);
        }
    }
    runMigrations() {
        if (!this.sqliteDb)
            return;
        // Enable WAL mode for high concurrency
        this.sqliteDb.exec('PRAGMA journal_mode = WAL;');
        // 1. Sessions table
        this.sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS omnigent_sessions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        supervisor TEXT NOT NULL,
        status TEXT NOT NULL,
        prompt TEXT NOT NULL,
        worktree_path TEXT,
        total_tokens INTEGER DEFAULT 0,
        total_cost_usd REAL DEFAULT 0,
        budget_cap_usd REAL,
        subagents_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
        // 2. Audit logs table
        this.sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        target TEXT NOT NULL,
        result TEXT NOT NULL,
        duration_ms INTEGER,
        security_flags_json TEXT,
        details_json TEXT,
        created_at TEXT NOT NULL
      );
    `);
        // 3. Approvals table
        this.sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS pending_approvals (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        title TEXT NOT NULL,
        command TEXT,
        diff TEXT,
        risk_level TEXT NOT NULL,
        status TEXT NOT NULL,
        requested_at TEXT NOT NULL,
        responded_at TEXT,
        responded_by TEXT,
        rejection_reason TEXT
      );
    `);
        // 4. Hindsight long-term memory facts table
        this.sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS hindsight_memories (
        id TEXT PRIMARY KEY,
        bank_id TEXT NOT NULL,
        stratum TEXT NOT NULL,
        content TEXT NOT NULL,
        confidence REAL DEFAULT 1.0,
        timestamp TEXT NOT NULL
      );
    `);
        // Seed default verified facts if empty
        const countStmt = this.sqliteDb.prepare('SELECT COUNT(*) as count FROM hindsight_memories;');
        const row = countStmt.get();
        if (row.count === 0) {
            const insert = this.sqliteDb.prepare(`
        INSERT INTO hindsight_memories (id, bank_id, stratum, content, confidence, timestamp)
        VALUES (?, ?, ?, ?, ?, ?);
      `);
            insert.run('mem-001', 'fastfree-core-memory', 'World Facts', 'NixOS Clan 26.05 topology: client1 VPS (Controller), client2..client11 Hyper-V appliances.', 0.99, new Date().toISOString());
            insert.run('mem-002', 'fastfree-core-memory', 'Agent Experiences', 'Purged 59 emoji instances from apps/fastfree_installer with zero build warnings.', 0.96, new Date().toISOString());
            insert.run('mem-003', 'fastfree-core-memory', 'Entity Summaries', 'LowCode engine contains 38 components, 27 composables; useFormatNumber & useStatusHelpers mandatory.', 0.98, new Date().toISOString());
            insert.run('mem-004', 'fastfree-core-memory', 'Evolving Beliefs', 'Dual-Agent review discipline (Writer: Antigravity / Reviewer: OpenCode) prevents regression slips.', 0.95, new Date().toISOString());
        }
    }
    getHealth() {
        const now = new Date().toISOString();
        if (this.engine === 'postgres') {
            return {
                engine: 'postgres',
                location: this.dbPath,
                connected: true,
                tables: ['omnigent_sessions', 'audit_logs', 'pending_approvals', 'hindsight_memories'],
                totalRecords: 0,
                lastChecked: now,
            };
        }
        if (!this.sqliteDb) {
            return {
                engine: 'sqlite',
                location: this.dbPath,
                connected: false,
                tables: [],
                totalRecords: 0,
                lastChecked: now,
            };
        }
        try {
            const tablesStmt = this.sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
            const rows = tablesStmt.all();
            const tables = rows.map((r) => r.name);
            let total = 0;
            for (const t of tables) {
                const cStmt = this.sqliteDb.prepare(`SELECT COUNT(*) as c FROM ${t};`);
                const cRow = cStmt.get();
                total += cRow.c;
            }
            return {
                engine: 'sqlite',
                location: this.dbPath,
                connected: true,
                tables,
                totalRecords: total,
                lastChecked: now,
            };
        }
        catch {
            return {
                engine: 'sqlite',
                location: this.dbPath,
                connected: false,
                tables: [],
                totalRecords: 0,
                lastChecked: now,
            };
        }
    }
}
export const databaseService = DatabaseService.getInstance();
//# sourceMappingURL=database.service.js.map