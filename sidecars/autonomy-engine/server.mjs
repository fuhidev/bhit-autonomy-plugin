/**
 * @fileoverview BHIT Autonomy Engine - Persistent Daemon & UI Sidecar Server
 *
 * Solves the in-session Cron/Timer loss when Antigravity closes or restarts:
 * 1. Runs continuously with `restart_policy: "always"` as a native Antigravity Sidecar.
 * 2. Persists project schedules and execution history in SQLite (`autonomy_engine.db`).
 * 3. Automatically discovers autonomous workspaces (`.agents/cognition/STATE.md`) and
 *    resolves their active `conversationId` from `conversation_summaries.db`.
 * 4. Executes a 30-second heartbeat loop that detects due/overdue Open Loops,
 *    One-shot Timers, and Cron slots, waking the Agent via `agentapi send-message`.
 * 5. Serves an interactive Aux Pane & Sidebar Dashboard UI (`ui.html`).
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Dynamically import sidecar_sdk (supports both --import register_loader.js and direct fallback)
let SidecarApp, Response;
try {
  const sdk = await import('sidecar_sdk');
  SidecarApp = sdk.SidecarApp;
  Response = sdk.Response;
} catch {
  const fallbackSdkPath = join(homedir(), '.gemini', 'config', 'node_modules', 'sidecar_sdk', 'index.mjs');
  const sdk = await import(pathToFileURL(fallbackSdkPath).href);
  SidecarApp = sdk.SidecarApp;
  Response = sdk.Response;
}

// Persistent Data Directory
const DATA_DIR =
  process.env.ANTIGRAVITY_EXECUTABLE_DATA_DIR ||
  join(homedir(), '.gemini', 'antigravity', 'plugin_data', 'bhit-autonomy-plugin');
mkdirSync(DATA_DIR, { recursive: true });

const ENGINE_DB_PATH = join(DATA_DIR, 'autonomy_engine.db');
const db = new DatabaseSync(ENGINE_DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    workspace_path TEXT PRIMARY KEY,
    project_id TEXT DEFAULT '',
    name TEXT DEFAULT '',
    active_conversation_id TEXT DEFAULT '',
    auto_wake INTEGER DEFAULT 1,
    last_checked_at TEXT DEFAULT '',
    last_woken_at TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS execution_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_path TEXT NOT NULL,
    task_key TEXT UNIQUE NOT NULL,
    task_type TEXT NOT NULL,
    scheduled_for TEXT NOT NULL,
    triggered_at TEXT NOT NULL,
    conversation_id TEXT DEFAULT '',
    status TEXT NOT NULL,
    message TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS custom_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_path TEXT NOT NULL,
    schedule_type TEXT NOT NULL,
    cron_or_time TEXT NOT NULL,
    task_description TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    last_run_slot TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );
`);

const ENGINE_START_TIME = Date.now();
let lastTickTime = null;
let tickCount = 0;

/**
 * Formats a Date object as local YYYY-MM-DD HH:MM:SS
 */
function formatLocalTime(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/**
 * Parses a local timestamp string "YYYY-MM-DD HH:MM" or "YYYY-MM-DD HH:MM:SS"
 */
function parseLocalTimestamp(str) {
  if (!str) return null;
  const clean = str.trim();
  const m = clean.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s || 0));
}

/**
 * Converts a file:/// URI to a normalized Windows/POSIX path
 */
function uriToPath(uri) {
  if (!uri || !uri.startsWith('file:///')) return '';
  try {
    let raw = decodeURIComponent(uri.slice('file:///'.length));
    if (process.platform === 'win32') {
      raw = raw.replace(/\//g, '\\');
    }
    return resolve(raw);
  } catch {
    return '';
  }
}

/**
 * Extracts the pinned Orchestrator Conversation ID from `.agents/cognition/STATE.md`.
 * Sidecar strictly uses this ID from STATE.md as the single source of truth.
 */
function parseOrchestratorConversationId(stateRaw) {
  if (!stateRaw) return '';
  const uuidRegex = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
  for (const line of stateRaw.split('\n')) {
    if (/Orchestrator\s+Conversation(?:\s+ID)?|Conversation\s+ID\s+điều\s+phối/i.test(line)) {
      const m = line.match(uuidRegex);
      if (m) return m[1].toLowerCase();
    }
  }
  return '';
}

/**
 * Writes or updates the `Orchestrator Conversation ID` directly inside `.agents/cognition/STATE.md`.
 */
function writeOrchestratorConversationIdToState(workspacePath, convId) {
  if (!workspacePath || !convId) return false;
  const statePath = join(workspacePath, '.agents', 'cognition', 'STATE.md');
  if (!existsSync(statePath)) return false;

  let content = readFileSync(statePath, 'utf-8');
  const bulletRegex = /(^\s*-\s*\*\*Orchestrator Conversation(?:\s+ID)?\*\*:\s*)(.*)$/im;
  const tableRegex = /(\|\s*\*\*Orchestrator Conversation(?:\s+ID)?\*\*\s*\|\s*)([^|]+)(\|)/im;

  if (bulletRegex.test(content)) {
    content = content.replace(bulletRegex, `$1\`${convId}\``);
  } else if (tableRegex.test(content)) {
    content = content.replace(tableRegex, `$1\`${convId}\` $3`);
  } else if (/##\s*4\.[^\n]*\r?\n/i.test(content)) {
    content = content.replace(/(##\s*4\.[^\n]*\r?\n)/i, `$1- **Orchestrator Conversation ID**: \`${convId}\`\n`);
  } else {
    content += `\n- **Orchestrator Conversation ID**: \`${convId}\`\n`;
  }

  writeFileSync(statePath, content, 'utf-8');
  return true;
}

/**
 * Checks whether a specific conversationId exists and is not killed in `conversation_summaries.db`.
 */
function getConversationById(conversationId) {
  if (!conversationId) return { exists: false, killed: false, row: null };
  const convDbPath = join(homedir(), '.gemini', 'antigravity', 'conversation_summaries.db');
  if (!existsSync(convDbPath)) {
    return { exists: true, killed: false, row: null };
  }

  let convDb;
  try {
    convDb = new DatabaseSync(convDbPath, { readOnly: true });
    const row = convDb
      .prepare(
        `SELECT conversation_id, title, preview, last_modified_time, project_id, status, killed
         FROM conversation_summaries
         WHERE conversation_id = ?`
      )
      .get(conversationId);
    if (!row) {
      return { exists: false, killed: false, row: null };
    }
    return {
      exists: Number(row.killed) === 0,
      killed: Number(row.killed) !== 0,
      row,
    };
  } catch (err) {
    console.error('[autonomy-engine] Error checking conversation_id in DB:', err.message);
    return { exists: true, killed: false, row: null };
  } finally {
    try {
      convDb?.close();
    } catch {}
  }
}

/**
 * Looks up the latest active top-level conversationId for a projectId or workspacePath
 * from Antigravity's conversation_summaries.db (used ONLY to resolve projectId or capture newly created conversationId)
 */
function findLatestConversation(projectId, workspacePath) {
  const convDbPath = join(homedir(), '.gemini', 'antigravity', 'conversation_summaries.db');
  if (!existsSync(convDbPath)) return null;

  let convDb;
  try {
    convDb = new DatabaseSync(convDbPath, { readOnly: true });
    if (projectId) {
      const stmt = convDb.prepare(`
        SELECT conversation_id, title, preview, last_modified_time, status
        FROM conversation_summaries
        WHERE project_id = ? AND nesting_depth = 0 AND killed = 0
        ORDER BY last_modified_time DESC
        LIMIT 5
      `);
      const rows = stmt.all(projectId);
      if (rows.length > 0) return rows[0];
    }

    if (workspacePath) {
      const normLower = workspacePath.toLowerCase().replace(/\\/g, '/');
      const baseName = workspacePath.split(/[\\/]/).pop().toLowerCase();
      const stmt = convDb.prepare(`
        SELECT conversation_id, title, preview, last_modified_time, workspace_uris, project_id, status
        FROM conversation_summaries
        WHERE nesting_depth = 0 AND killed = 0
        ORDER BY last_modified_time DESC
        LIMIT 50
      `);
      const rows = stmt.all();
      for (const r of rows) {
        try {
          const uris = JSON.parse(r.workspace_uris || '[]');
          for (const u of uris) {
            const p = uriToPath(u).toLowerCase().replace(/\\/g, '/');
            if (p === normLower || p.endsWith('/' + baseName)) {
              return r;
            }
          }
        } catch {}
      }
    }
  } catch (err) {
    console.error('[autonomy-engine] Error reading conversation_summaries.db:', err.message);
  } finally {
    try {
      convDb?.close();
    } catch {}
  }
  return null;
}

/**
 * Scans ~/.gemini/config/projects/*.json and combines with any registered projects
 * in `autonomy_engine.db` to discover all workspaces with `.agents/cognition/STATE.md`.
 */
function discoverAutonomousProjects(extraWorkspaceUris = []) {
  const projectsDir = join(homedir(), '.gemini', 'config', 'projects');
  const discovered = new Map();

  // 1. Load already registered projects from DB
  const existingRows = db.prepare('SELECT * FROM projects').all();
  for (const row of existingRows) {
    if (existsSync(join(row.workspace_path, '.agents', 'cognition', 'STATE.md'))) {
      discovered.set(row.workspace_path.toLowerCase(), { ...row });
    }
  }

  // 2. Scan Antigravity project config files
  if (existsSync(projectsDir)) {
    for (const file of readdirSync(projectsDir)) {
      if (!file.endsWith('.json')) continue;
      try {
        const data = JSON.parse(readFileSync(join(projectsDir, file), 'utf-8'));
        const pid = data.id || '';
        const name = data.name || '';
        const resources = data?.projectResources?.resources || [];
        for (const res of resources) {
          const wPath = uriToPath(res.folderUri);
          if (!wPath) continue;
          const stateMd = join(wPath, '.agents', 'cognition', 'STATE.md');
          if (existsSync(stateMd)) {
            const key = wPath.toLowerCase();
            const existing = discovered.get(key);
            discovered.set(key, {
              workspace_path: wPath,
              project_id: pid || existing?.project_id || '',
              name: name || existing?.name || wPath.split(/[\\/]/).pop(),
              active_conversation_id: existing?.active_conversation_id || '',
              auto_wake: existing ? existing.auto_wake : 1,
              last_checked_at: existing?.last_checked_at || '',
              last_woken_at: existing?.last_woken_at || '',
            });
          }
        }
      } catch {}
    }
  }

  // 3. Check extra workspace URIs passed from active UI iframe
  for (const uri of extraWorkspaceUris) {
    const wPath = uriToPath(uri);
    if (!wPath) continue;
    const stateMd = join(wPath, '.agents', 'cognition', 'STATE.md');
    if (existsSync(stateMd)) {
      const key = wPath.toLowerCase();
      if (!discovered.has(key)) {
        discovered.set(key, {
          workspace_path: wPath,
          project_id: '',
          name: wPath.split(/[\\/]/).pop(),
          active_conversation_id: '',
          auto_wake: 1,
          last_checked_at: '',
          last_woken_at: '',
        });
      }
    }
  }

  // 4. Resolve Orchestrator Conversation ID strictly from STATE.md and upsert into DB
  const upsertStmt = db.prepare(`
    INSERT INTO projects (workspace_path, project_id, name, active_conversation_id, auto_wake, last_checked_at, last_woken_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(workspace_path) DO UPDATE SET
      project_id = CASE WHEN excluded.project_id != '' THEN excluded.project_id ELSE projects.project_id END,
      name = CASE WHEN excluded.name != '' THEN excluded.name ELSE projects.name END,
      active_conversation_id = excluded.active_conversation_id
  `);

  const result = [];
  for (const proj of discovered.values()) {
    const statePath = join(proj.workspace_path, '.agents', 'cognition', 'STATE.md');
    const stateRaw = existsSync(statePath) ? readFileSync(statePath, 'utf-8') : '';
    const stateConvId = parseOrchestratorConversationId(stateRaw);

    if (!proj.project_id) {
      const latestForPid = findLatestConversation('', proj.workspace_path);
      if (latestForPid?.project_id) {
        proj.project_id = latestForPid.project_id;
      }
    }

    if (stateConvId) {
      const check = getConversationById(stateConvId);
      if (check.exists && !check.killed) {
        proj.active_conversation_id = stateConvId;
        proj.conversation_title = check.row?.preview || check.row?.title || '';
        proj.conversation_status = 'PINNED_STATE';
        if (!proj.project_id && check.row?.project_id) {
          proj.project_id = check.row.project_id;
        }
      } else {
        proj.active_conversation_id = '';
        proj.conversation_title = '';
        proj.conversation_status = 'DELETED_IN_STATE';
      }
    } else {
      proj.active_conversation_id = '';
      proj.conversation_title = '';
      proj.conversation_status = 'EMPTY_IN_STATE';
    }

    upsertStmt.run(
      proj.workspace_path,
      proj.project_id || '',
      proj.name || '',
      proj.active_conversation_id || '',
      proj.auto_wake ?? 1,
      proj.last_checked_at || '',
      proj.last_woken_at || ''
    );
    result.push(proj);
  }

  return result;
}

/**
 * Parses `.agents/cognition/STATE.md`, `INBOX.md`, `SOUL.md`, `DREAMS.md`, and `data.db`
 */
function parseProjectCognition(workspacePath) {
  const cogDir = join(workspacePath, '.agents', 'cognition');
  const statePath = join(cogDir, 'STATE.md');
  const inboxPath = join(cogDir, 'INBOX.md');
  const soulPath = join(cogDir, 'SOUL.md');
  const dreamsPath = join(cogDir, 'DREAMS.md');

  const now = new Date();
  const stateRaw = existsSync(statePath) ? readFileSync(statePath, 'utf-8') : '';
  const inboxRaw = existsSync(inboxPath) ? readFileSync(inboxPath, 'utf-8') : '';
  const soulRaw = existsSync(soulPath) ? readFileSync(soulPath, 'utf-8') : '';
  const dreamsRaw = existsSync(dreamsPath) ? readFileSync(dreamsPath, 'utf-8') : '';

  // 1. Parse Goal Progress
  const goalProgress = {
    cycle: '',
    metrics: [],
    goalGap: '',
  };
  const cycleMatch = stateRaw.match(/-\s*\*\*Chu kỳ hiện tại\*\*:\s*(.+)/i);
  if (cycleMatch) goalProgress.cycle = cycleMatch[1].trim();
  const gapMatch = stateRaw.match(/-\s*\*\*Khoảng cách đến mục tiêu[^*]*\*\*:\s*(.+)/i);
  if (gapMatch) goalProgress.goalGap = gapMatch[1].trim();

  const sec1Match = stateRaw.match(/##\s*1\..*?([\s\S]*?)(?=---|##\s*2\.)/i);
  if (sec1Match) {
    for (const line of sec1Match[1].split('\n')) {
      const m = line.match(/^\s{2,}-\s+(.+)/);
      if (m) goalProgress.metrics.push(m[1].trim());
    }
  }

  // 2. Parse Open Loops
  const openLoops = [];
  const sec2Match = stateRaw.match(/##\s*2\..*?([\s\S]*?)(?=---|##\s*3\.)/i);
  if (sec2Match) {
    for (const line of sec2Match[1].split('\n')) {
      const m = line.match(/^\s*-\s*\[([ xX])\]\s*`?(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?)`?\s*-\s*(.+)/);
      if (m) {
        const done = m[1].toLowerCase() === 'x';
        const timeStr = m[2].trim();
        const desc = m[3].trim();
        const dt = parseLocalTimestamp(timeStr);
        let status = done ? 'DONE' : 'UPCOMING';
        let diffMinutes = null;
        if (dt) {
          const diffMs = dt.getTime() - now.getTime();
          diffMinutes = Math.ceil(diffMs / 60000);
          if (!done) {
            if (diffMs <= 0) status = 'OVERDUE';
            else if (diffMinutes <= 30) status = 'DUE_SOON';
          }
        }
        openLoops.push({
          done,
          timeStr,
          description: desc,
          status,
          diffMinutes,
        });
      }
    }
  }

  // 3. Parse Section 4 Schedules (supports both bullet list and markdown table)
  const schedules = [];
  const sec4Match = stateRaw.match(/##\s*4\..*?([\s\S]*?)(?=---|##\s*5\.|$)/i);
  if (sec4Match) {
    const sec4 = sec4Match[1];

    // Check bullet format:
    // - **Cron nền an toàn**: `0 */2 * * *` (... TaskId: `task-68`)
    // - **Timer nhịp kế tiếp (One-shot Timer)**: `2026-10-24 12:30:00` (TaskId: `task-284`)
    // - **Tác vụ dự kiến khi thức dậy...**: ...
    const cronBullet = sec4.match(/Cron[^:]*:\s*`([^`]+)`(?:.*?TaskId:\s*`([^`]+)`)?/i);
    if (cronBullet) {
      schedules.push({
        type: 'CRON',
        expression: cronBullet[1].trim(),
        taskId: cronBullet[2] || 'N/A',
        task: 'Kiểm tra bàn làm việc STATE.md định kỳ (Daemon Heartbeat)',
        status: 'ACTIVE',
      });
    }

    const timerBullet = sec4.match(/One-shot Timer[^*]*\*\*:\s*`([^`]+)`(?:.*?TaskId:\s*`([^`]+)`)?/i);
    const plannedTaskBullet = sec4.match(/-\s*\*\*Tác vụ dự kiến[^*]*\*\*:\s*(.+)/i);
    if (timerBullet) {
      const timeStr = timerBullet[1].trim();
      const dt = parseLocalTimestamp(timeStr);
      const diffMs = dt ? dt.getTime() - now.getTime() : null;
      const diffMinutes = diffMs !== null ? Math.ceil(diffMs / 60000) : null;
      schedules.push({
        type: 'TIMER',
        expression: timeStr,
        taskId: timerBullet[2] || 'N/A',
        task: plannedTaskBullet ? plannedTaskBullet[1].trim() : 'Thực thi tác vụ kế tiếp trong STATE.md',
        status: diffMs !== null && diffMs <= 0 ? 'OVERDUE' : 'ACTIVE',
        diffMinutes,
      });
    }

    // Also parse table rows if formatted as table
    for (const line of sec4.split('\n')) {
      if (!line.trim().startsWith('|') || line.includes('---') || line.includes('Loại Schedule')) continue;
      const cols = line
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);
      if (cols.length >= 4) {
        const rawType = cols[0].replace(/\*/g, '');
        if (/Orchestrator\s+Conversation/i.test(rawType)) continue;
        const taskId = cols[1].replace(/`/g, '');
        const expr = cols[2].replace(/`/g, '');
        const taskDesc = cols[3].replace(/`/g, '');
        if (expr.includes('[YYYY')) continue;
        const isCron = rawType.toLowerCase().includes('cron');
        const dt = !isCron ? parseLocalTimestamp(expr) : null;
        const diffMs = dt ? dt.getTime() - now.getTime() : null;
        const diffMinutes = diffMs !== null ? Math.ceil(diffMs / 60000) : null;
        schedules.push({
          type: isCron ? 'CRON' : 'TIMER',
          expression: expr,
          taskId,
          task: taskDesc,
          status: diffMs !== null && diffMs <= 0 ? 'OVERDUE' : 'ACTIVE',
          diffMinutes,
        });
      }
    }
  }

  // 4. Parse Daily Signals
  const signals = [];
  const sec5Match = stateRaw.match(/##\s*5\..*?([\s\S]*?)$/i);
  if (sec5Match) {
    for (const line of sec5Match[1].split('\n')) {
      const m = line.match(/^\s*-\s*`?\[?(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\]?`?\s*(#[a-zA-Z0-9_-]+)?\s*:?\s*(.+)/);
      if (m) {
        signals.push({
          time: m[1],
          tag: m[2] || '#signal',
          text: m[3].trim(),
        });
      }
    }
  }

  // 5. Parse INBOX.md Proposals
  const inboxItems = [];
  const proposalRegex = /###\s*\[?(#[A-Z0-9-]+)\]?\s*(.+)\n([\s\S]*?)(?=\n---|\n##\s+\d|###\s*\[?#|$)/g;
  let pm;
  while ((pm = proposalRegex.exec(inboxRaw)) !== null) {
    const id = pm[1].trim();
    const title = pm[2].trim();
    const body = pm[3].trim();
    const statusMatch = body.match(/-\s*\*\*Trạng thái\*\*:\s*`?([A-Z_]+)`?/i);
    const reasonMatch = body.match(/-\s*\*\*(?:Lý do|Nội dung)[^*]*\*\*:\s*(.+)/i);
    const goalMatch = body.match(/-\s*\*\*Mục tiêu[^*]*\*\*:\s*(.+)/i);

    // Parse detail markdown link if available
    const docMatch =
      body.match(/-\s*\*\*(?:Tài liệu|Tài liệu chi tiết|Chi tiết)[^*]*\*\*:\s*\[([^\]]+)\]\(([^)]+)\)/i) ||
      body.match(/\[([^\]]+)\]\((file:\/\/\/[^)]+|\.[^)]+)\)/i);
    let detailLink = '';
    let detailTitle = '';
    let detailPath = '';
    if (docMatch) {
      detailTitle = docMatch[1].trim();
      let rawLink = docMatch[2].trim();
      if (rawLink.startsWith('file:///')) {
        detailPath = uriToPath(rawLink);
        if (existsSync(detailPath)) {
          detailLink = pathToFileURL(detailPath).href;
        } else {
          detailLink = rawLink;
        }
      } else {
        detailPath = resolve(workspacePath, rawLink.replace(/^\.\/?/, ''));
        detailLink = pathToFileURL(detailPath).href;
      }
    }

    inboxItems.push({
      id,
      title,
      status: statusMatch ? statusMatch[1].toUpperCase() : 'PENDING',
      reason: reasonMatch ? reasonMatch[1].trim() : '',
      goal: goalMatch ? goalMatch[1].trim() : '',
      detailLink,
      detailPath,
      detailTitle: detailTitle || 'Xem chi tiết',
      rawBody: body,
    });
  }

  // 6. Inspect SQLite data.db if present
  const dbStats = [];
  const dataDbPath = join(workspacePath, 'data.db');
  if (existsSync(dataDbPath)) {
    let projDb;
    try {
      projDb = new DatabaseSync(dataDbPath, { readOnly: true });
      const tables = projDb
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        .all();
      for (const t of tables) {
        try {
          const countRow = projDb.prepare(`SELECT COUNT(*) AS cnt FROM "${t.name}"`).get();
          dbStats.push({ table: t.name, count: countRow?.cnt ?? 0 });
        } catch {}
      }
    } catch {} finally {
      try {
        projDb?.close();
      } catch {}
    }
  }

  // 7. Custom schedules from autonomy_engine.db
  const customSchedules = db
    .prepare('SELECT * FROM custom_schedules WHERE workspace_path = ? ORDER BY id DESC')
    .all(workspacePath);

  // 8. Recent execution logs
  const logs = db
    .prepare('SELECT * FROM execution_logs WHERE workspace_path = ? ORDER BY id DESC LIMIT 15')
    .all(workspacePath);

  return {
    goalProgress,
    openLoops,
    schedules,
    signals,
    inboxItems,
    dbStats,
    customSchedules,
    logs,
    hasSoul: Boolean(soulRaw),
    hasDreams: Boolean(dreamsRaw),
  };
}

/**
 * Checks if a 5-field cron expression matches the current minute or has a due slot
 * Supports `0 * /N * * *` (every N hours), `* /N * * * *` (every N minutes), and fixed `M H * * *`
 */
function getCronCurrentSlot(cronExpr, now = new Date()) {
  const parts = cronExpr.trim().replace(/^CRON_TZ=\S+\s+/, '').split(/\s+/);
  if (parts.length < 5) return null;
  const [minField, hourField] = parts;
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const H = now.getHours();
  const M = now.getMinutes();

  // Every N hours: `0 */2 * * *`
  const stepHourMatch = hourField.match(/^\*\/(\d+)$/);
  if (stepHourMatch) {
    const step = parseInt(stepHourMatch[1], 10);
    const targetMin = minField === '*' ? 0 : parseInt(minField, 10) || 0;
    const slotHour = Math.floor(H / step) * step;
    if (H > slotHour || (H === slotHour && M >= targetMin)) {
      return `${y}-${m}-${d} ${String(slotHour).padStart(2, '0')}:${String(targetMin).padStart(2, '0')}`;
    }
  }

  // Every N minutes: `*/30 * * * *`
  const stepMinMatch = minField.match(/^\*\/(\d+)$/);
  if (stepMinMatch && hourField === '*') {
    const step = parseInt(stepMinMatch[1], 10);
    const slotMin = Math.floor(M / step) * step;
    return `${y}-${m}-${d} ${String(H).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}`;
  }

  // Fixed daily time: `M H * * *`
  if (/^\d+$/.test(minField) && /^\d+$/.test(hourField)) {
    const targetMin = parseInt(minField, 10);
    const targetHour = parseInt(hourField, 10);
    if (H > targetHour || (H === targetHour && M >= targetMin)) {
      return `${y}-${m}-${d} ${String(targetHour).padStart(2, '0')}:${String(targetMin).padStart(2, '0')}`;
    }
  }

  return null;
}

// Initialize SidecarApp
const app = new SidecarApp();

/**
 * Sends a wakeup message strictly to the project's `Orchestrator Conversation ID` in `STATE.md`.
 * If `STATE.md` is empty or the conversation was deleted, creates a new conversation and writes its ID into `STATE.md`.
 */
function triggerProjectWakeup(proj, { taskKey, extraTaskKeys = [], taskType, scheduledFor, prompt }) {
  const existing = db.prepare('SELECT id FROM execution_logs WHERE task_key = ?').get(taskKey);
  if (existing) {
    return { skipped: true, reason: 'Already triggered for this slot' };
  }

  const nowStr = formatLocalTime();
  const statePath = join(proj.workspace_path, '.agents', 'cognition', 'STATE.md');
  const stateRaw = existsSync(statePath) ? readFileSync(statePath, 'utf-8') : '';
  const stateConvId = parseOrchestratorConversationId(stateRaw);

  let convId = '';
  if (stateConvId) {
    const check = getConversationById(stateConvId);
    if (check.exists && !check.killed) {
      convId = stateConvId;
    }
  }

  try {
    let apiRes;
    if (convId) {
      apiRes = app.sendMessage(convId, prompt, { projectId: proj.project_id || undefined });
    } else {
      apiRes = app.startConversation(prompt, { projectId: proj.project_id || undefined });
      let newConvId =
        apiRes?.conversationId ||
        apiRes?.conversation_id ||
        apiRes?.response?.conversationId ||
        apiRes?.response?.conversation_id ||
        apiRes?.response?.newConversation?.conversationId ||
        apiRes?.response?.startConversation?.conversationId ||
        '';
      if (!newConvId) {
        const rawMatches = JSON.stringify(apiRes || {}).match(
          /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
        );
        if (rawMatches) {
          const found = rawMatches.find((id) => id.toLowerCase() !== (proj.project_id || '').toLowerCase());
          if (found) newConvId = found.toLowerCase();
        }
      }
      if (!newConvId) {
        const latest = findLatestConversation(proj.project_id, proj.workspace_path);
        if (latest?.conversation_id) newConvId = latest.conversation_id;
      }
      if (newConvId) {
        convId = newConvId;
        writeOrchestratorConversationIdToState(proj.workspace_path, newConvId);
        proj.active_conversation_id = newConvId;
        db.prepare('UPDATE projects SET active_conversation_id = ? WHERE workspace_path = ?').run(
          newConvId,
          proj.workspace_path
        );
      }
    }

    const logStmt = db.prepare(`
      INSERT OR IGNORE INTO execution_logs (workspace_path, task_key, task_type, scheduled_for, triggered_at, conversation_id, status, message)
      VALUES (?, ?, ?, ?, ?, ?, 'SUCCESS', ?)
    `);
    logStmt.run(
      proj.workspace_path,
      taskKey,
      taskType,
      scheduledFor,
      nowStr,
      convId || 'new-conversation',
      prompt.slice(0, 300)
    );
    for (const extraKey of extraTaskKeys) {
      logStmt.run(
        proj.workspace_path,
        extraKey,
        taskType,
        scheduledFor,
        nowStr,
        convId || 'new-conversation',
        prompt.slice(0, 300)
      );
    }

    db.prepare('UPDATE projects SET last_woken_at = ?, last_checked_at = ? WHERE workspace_path = ?').run(
      nowStr,
      nowStr,
      proj.workspace_path
    );

    console.log(`[autonomy-engine] Woke project ${proj.name} (${convId || 'new'}) for ${taskKey}`);
    return { ok: true, conversationId: convId, apiRes };
  } catch (err) {
    db.prepare(`
      INSERT OR IGNORE INTO execution_logs (workspace_path, task_key, task_type, scheduled_for, triggered_at, conversation_id, status, message)
      VALUES (?, ?, ?, ?, ?, ?, 'ERROR', ?)
    `).run(proj.workspace_path, taskKey, taskType, scheduledFor, nowStr, convId || '', err.message);
    console.error(`[autonomy-engine] Failed waking ${proj.name}:`, err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Background Scheduler Tick:
 * Inspects all autonomous projects and automatically triggers due/overdue timers, open loops, or custom schedules!
 */
function runSchedulerTick() {
  lastTickTime = formatLocalTime();
  tickCount++;

  try {
    const projects = discoverAutonomousProjects();
    const now = new Date();
    const nowStr = formatLocalTime(now);

    for (const proj of projects) {
      db.prepare('UPDATE projects SET last_checked_at = ? WHERE workspace_path = ?').run(nowStr, proj.workspace_path);
      if (!proj.auto_wake) continue;

      const cog = parseProjectCognition(proj.workspace_path);

      // 1 & 2. Collect and coalesce all due/overdue STATE.md Timers (Section 4) and Open Loops (Section 2)
      const dueStateItems = [];
      for (const sched of cog.schedules) {
        if (sched.type === 'TIMER' && sched.status === 'OVERDUE') {
          const taskKey = `${proj.workspace_path}::timer::${sched.expression}`;
          const alreadyRun = db.prepare('SELECT id FROM execution_logs WHERE task_key = ?').get(taskKey);
          if (!alreadyRun) {
            dueStateItems.push({
              taskKey,
              taskType: 'STATE_TIMER',
              scheduledFor: sched.expression,
              line: `- [One-shot Timer] \`${sched.expression}\` (TaskId: \`${sched.taskId}\`): ${sched.task}`,
            });
          }
        }
      }

      for (const loop of cog.openLoops) {
        if (!loop.done && loop.status === 'OVERDUE') {
          const taskKey = `${proj.workspace_path}::openloop::${loop.timeStr}`;
          const alreadyRun = db.prepare('SELECT id FROM execution_logs WHERE task_key = ?').get(taskKey);
          if (!alreadyRun) {
            dueStateItems.push({
              taskKey,
              taskType: 'OPEN_LOOP',
              scheduledFor: loop.timeStr,
              line: `- [Open Loop] [ ] \`${loop.timeStr}\` - ${loop.description}`,
            });
          }
        }
      }

      if (dueStateItems.length > 0) {
        const primary = dueStateItems[0];
        const extraTaskKeys = dueStateItems.slice(1).map((item) => item.taskKey);
        const taskType = dueStateItems.length > 1 ? 'STATE_WAKEUP' : primary.taskType;
        const prompt =
          `⚡ [BHIT AUTONOMY ENGINE - AUTO WAKEUP]\n` +
          `Thời điểm hiện tại: ${nowStr}\n` +
          `Phát hiện lịch trình / vòng lặp đến hạn trong STATE.md:\n` +
          `${dueStateItems.map((i) => i.line).join('\n')}\n\n` +
          `Hãy thực hiện quy trình OODA Loop:\n` +
          `1. Đọc \`.agents/cognition/STATE.md\` và \`.agents/cognition/INBOX.md\`.\n` +
          `2. Gọi \`manage_task(Action: "list")\` để kiểm tra và đồng bộ lại lịch \`/schedule\` nếu phiên vừa khởi động lại.\n` +
          `3. Thực thi ngay nhiệm vụ đến hạn, đánh dấu \`[x]\` cho Open Loop khi hoàn thành, cập nhật kết quả vào \`STATE.md\` và đặt Timer cho mốc tiếp theo.`;

        triggerProjectWakeup(proj, {
          taskKey: primary.taskKey,
          extraTaskKeys,
          taskType,
          scheduledFor: primary.scheduledFor,
          prompt,
        });
      }

      // 3. Check custom persistent schedules in autonomy_engine.db
      for (const cs of cog.customSchedules) {
        if (!cs.enabled) continue;
        if (cs.schedule_type === 'TIMER') {
          const dt = parseLocalTimestamp(cs.cron_or_time);
          if (dt && dt.getTime() <= now.getTime()) {
            const taskKey = `${proj.workspace_path}::custom_timer::${cs.id}::${cs.cron_or_time}`;
            const prompt =
              `⚡ [BHIT AUTONOMY ENGINE - CUSTOM SCHEDULE WAKEUP]\n` +
              `Thời điểm hiện tại: ${nowStr}\n` +
              `Lịch hẹn cố định (#${cs.id} - \`${cs.cron_or_time}\`) đã đến hạn:\n` +
              `Nhiệm vụ: ${cs.task_description}\n\n` +
              `Hãy đọc \`STATE.md\`, thực thi nhiệm vụ và cập nhật tiến độ.`;
            const res = triggerProjectWakeup(proj, {
              taskKey,
              taskType: 'CUSTOM_TIMER',
              scheduledFor: cs.cron_or_time,
              prompt,
            });
            if (res.ok) {
              db.prepare('UPDATE custom_schedules SET enabled = 0, last_run_slot = ? WHERE id = ?').run(nowStr, cs.id);
            }
          }
        } else if (cs.schedule_type === 'CRON') {
          const slot = getCronCurrentSlot(cs.cron_or_time, now);
          if (slot && slot !== cs.last_run_slot) {
            const taskKey = `${proj.workspace_path}::custom_cron::${cs.id}::${slot}`;
            const prompt =
              `⚡ [BHIT AUTONOMY ENGINE - PERSISTENT CRON HEARTBEAT]\n` +
              `Thời điểm hiện tại: ${nowStr} (Cron: \`${cs.cron_or_time}\`, Slot: \`${slot}\`)\n` +
              `Nhiệm vụ định kỳ: ${cs.task_description}\n\n` +
              `Hãy đọc \`STATE.md\` và \`INBOX.md\`, đối soát \`manage_task(Action: "list")\`, xử lý các việc đến hạn và cập nhật \`STATE.md\`.`;
            const res = triggerProjectWakeup(proj, {
              taskKey,
              taskType: 'CUSTOM_CRON',
              scheduledFor: slot,
              prompt,
            });
            if (res.ok || res.skipped) {
              db.prepare('UPDATE custom_schedules SET last_run_slot = ? WHERE id = ?').run(slot, cs.id);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[autonomy-engine] Scheduler tick error:', err.message);
  }
}

// Serve Dashboard HTML UI
app.page('/', () => readFileSync(join(__dirname, 'ui.html'), 'utf-8'));

// API: Get Full Dashboard State
app.api('/api/dashboard', (data) => {
  const extraUris = Array.isArray(data.workspaceUris) ? data.workspaceUris : [];
  const projects = discoverAutonomousProjects(extraUris);
  const selectedWorkspace =
    data.workspacePath ||
    (extraUris.length > 0 ? uriToPath(extraUris[0]) : '') ||
    (projects[0]?.workspace_path ?? '');

  let activeProject = projects.find(
    (p) => p.workspace_path.toLowerCase() === selectedWorkspace.toLowerCase()
  );
  if (!activeProject && projects.length > 0) {
    activeProject = projects[0];
  }

  const cognition = activeProject ? parseProjectCognition(activeProject.workspace_path) : null;

  return {
    daemon: {
      status: 'RUNNING',
      uptimeSeconds: Math.floor((Date.now() - ENGINE_START_TIME) / 1000),
      lastTickTime,
      tickCount,
      serverTime: formatLocalTime(),
      dbPath: ENGINE_DB_PATH,
    },
    projects,
    activeProject,
    cognition,
  };
});

// API: Wake Agent Now (Manual Trigger / Reconcile / Specific Open Loop / Dreamer)
app.api('/api/wake-now', (data) => {
  const { workspacePath, mode, loopTime, loopDescription, customPrompt } = data;
  const projects = discoverAutonomousProjects();
  const proj = projects.find((p) => p.workspace_path.toLowerCase() === (workspacePath || '').toLowerCase());
  if (!proj) {
    throw new Error('Không tìm thấy dự án tự chủ tương ứng.');
  }

  const nowStr = formatLocalTime();
  let prompt = '';
  let taskType = mode || 'MANUAL_WAKE';

  if (mode === 'RECONCILE') {
    prompt =
      `⚡ [BHIT AUTONOMY ENGINE - SCHEDULE RECONCILIATION]\n` +
      `Thời điểm hiện tại: ${nowStr}\n` +
      `Người vận hành vừa yêu cầu Đồng bộ & Khôi phục Lịch trình Tự chủ (Schedule Reconciliation) từ bảng điều khiển BHIT Autonomy Engine.\n\n` +
      `Hãy thực hiện ngay:\n` +
      `1. Đọc \`.agents/cognition/STATE.md\` và \`.agents/cognition/INBOX.md\`.\n` +
      `2. Gọi \`manage_task(Action: "list")\` để kiểm tra các \`TaskId\` hiện tại. Nếu các \`TaskId\` ghi trong \`STATE.md\` đã bị hủy (do tắt/mở lại Antigravity), hãy đặt lại \`schedule\` (Cron định kỳ + One-shot Timer cho mốc kế tiếp) và cập nhật mã \`TaskId\` mới vào \`STATE.md\`.\n` +
      `3. Nếu có Open Loop nào đã quá hạn, hãy thực thi bù ngay lập tức!`;
  } else if (mode === 'OPEN_LOOP') {
    prompt =
      `⚡ [BHIT AUTONOMY ENGINE - EXECUTE OPEN LOOP]\n` +
      `Thời điểm hiện tại: ${nowStr}\n` +
      `Thực thi ngay Open Loop từ STATE.md:\n` +
      `- [ ] \`${loopTime}\` - ${loopDescription}\n\n` +
      `Hãy đọc \`STATE.md\`, thực thi tác vụ này (hoặc giao cho \`autonomous-worker\`), sau đó đánh dấu \`[x]\` và cập nhật kết quả vào \`STATE.md\`.`;
  } else if (mode === 'DREAMER') {
    prompt =
      `🌙 [BHIT AUTONOMY ENGINE - COGNITIVE DREAMER]\n` +
      `Thời điểm hiện tại: ${nowStr}\n` +
      `Hãy kích hoạt Subagent \`cognitive-dreamer\` thực hiện chu trình hợp nhất ký ức 3 pha (Light Sleep -> REM Sleep -> Deep Sleep) từ \`STATE.md\` sang \`DREAMS.md\` và \`MEMORY.md\`.`;
  } else {
    prompt = customPrompt || `⚡ [BHIT AUTONOMY ENGINE] Kiểm tra STATE.md và thực thi tác vụ tiếp theo.`;
  }

  const uniqueKey = `${proj.workspace_path}::manual::${Date.now()}`;
  return triggerProjectWakeup(proj, {
    taskKey: uniqueKey,
    taskType,
    scheduledFor: loopTime || nowStr,
    prompt,
  });
});

// API: Approve or Reject an INBOX.md proposal directly from UI
app.api('/api/inbox-decision', (data) => {
  const { workspacePath, inboxId, decision, userNote, wakeAgent } = data;
  if (!workspacePath || !inboxId || !['APPROVED', 'REJECTED'].includes(decision)) {
    throw new Error('Tham số phê duyệt không hợp lệ.');
  }

  const inboxPath = join(workspacePath, '.agents', 'cognition', 'INBOX.md');
  if (!existsSync(inboxPath)) {
    throw new Error('Không tìm thấy tệp INBOX.md');
  }

  let content = readFileSync(inboxPath, 'utf-8');
  const escapedId = inboxId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sectionRegex = new RegExp(`(###\\s*\\[?${escapedId}\\]?[\\s\\S]*?-\\s*\\*\\*Trạng thái\\*\\*:\\s*)` + '`?[A-Z_]+`?([^\\n]*)', 'i');

  if (!sectionRegex.test(content)) {
    throw new Error(`Không tìm thấy mục ${inboxId} trong INBOX.md`);
  }

  const noteSuffix = userNote ? ` *(Ghi chú phê duyệt lúc ${formatLocalTime()}: ${userNote})*` : ` *(Cập nhật từ BHIT Autonomy UI lúc ${formatLocalTime()})*`;
  content = content.replace(sectionRegex, `$1\`${decision}\`${noteSuffix}`);
  writeFileSync(inboxPath, content, 'utf-8');

  let wakeResult = null;
  if (wakeAgent) {
    const projects = discoverAutonomousProjects();
    const proj = projects.find((p) => p.workspace_path.toLowerCase() === workspacePath.toLowerCase());
    if (proj) {
      const prompt =
        `📬 [BHIT AUTONOMY ENGINE - INBOX ${decision}]\n` +
        `Người vận hành vừa cập nhật trạng thái đề xuất **${inboxId}** trong \`.agents/cognition/INBOX.md\` thành \`${decision}\`${userNote ? ` với chỉ đạo: "${userNote}"` : ''}.\n` +
        (decision === 'APPROVED'
          ? `Hãy đọc \`.agents/cognition/INBOX.md\` và đọc file nháp chi tiết (nếu có) trong \`.agents/cognition/drafts/\` để thực thi tác vụ. Sau khi hoàn thành thực thi, hãy XÓA HOÀN TOÀN file nháp và cập nhật \`STATE.md\`!`
          : `Hãy XÓA HOÀN TOÀN file nháp chi tiết (nếu có) trong \`.agents/cognition/drafts/\`, hủy bỏ tác vụ và tiếp tục lịch trình trong \`STATE.md\`!`);
      wakeResult = triggerProjectWakeup(proj, {
        taskKey: `${proj.workspace_path}::inbox::${inboxId}::${Date.now()}`,
        taskType: `INBOX_${decision}`,
        scheduledFor: formatLocalTime(),
        prompt,
      });
    }
  }

  return { ok: true, inboxId, decision, wakeResult };
});

// API: Toggle Open Loop checkbox in STATE.md
app.api('/api/toggle-open-loop', (data) => {
  const { workspacePath, timeStr, done } = data;
  const statePath = join(workspacePath, '.agents', 'cognition', 'STATE.md');
  if (!existsSync(statePath)) throw new Error('Không tìm thấy STATE.md');

  let content = readFileSync(statePath, 'utf-8');
  const escapedTime = timeStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(-\\s*\\[)[ xX](\\]\\s*\`?${escapedTime}\`?)`);
  content = content.replace(regex, `$1${done ? 'x' : ' '}$2`);
  writeFileSync(statePath, content, 'utf-8');
  return { ok: true };
});

// API: Toggle Auto-Wake for a project
app.api('/api/toggle-auto-wake', (data) => {
  const { workspacePath, autoWake } = data;
  db.prepare('UPDATE projects SET auto_wake = ? WHERE workspace_path = ?').run(autoWake ? 1 : 0, workspacePath);
  return { ok: true, autoWake: Boolean(autoWake) };
});

// API: Add Persistent Schedule
app.api('/api/add-schedule', (data) => {
  const { workspacePath, scheduleType, cronOrTime, taskDescription } = data;
  if (!workspacePath || !cronOrTime || !taskDescription) {
    throw new Error('Vui lòng nhập đầy đủ thời gian/cron và mô tả nhiệm vụ.');
  }
  db.prepare(`
    INSERT INTO custom_schedules (workspace_path, schedule_type, cron_or_time, task_description, enabled, created_at)
    VALUES (?, ?, ?, ?, 1, ?)
  `).run(workspacePath, scheduleType || 'TIMER', cronOrTime.trim(), taskDescription.trim(), formatLocalTime());
  return { ok: true };
});

// API: Delete Persistent Schedule
app.api('/api/delete-schedule', (data) => {
  const { id } = data;
  db.prepare('DELETE FROM custom_schedules WHERE id = ?').run(id);
  return { ok: true };
});

// API: Open File in Antigravity IDE / System Editor as fallback
app.api('/api/open-file', (data) => {
  const { fileUri, filePath } = data;
  let targetPath = filePath || uriToPath(fileUri);
  if (!targetPath && fileUri?.startsWith('file:///')) {
    targetPath = decodeURIComponent(fileUri.slice('file:///'.length)).replace(/\//g, '\\');
  }
  if (!targetPath || !existsSync(targetPath)) {
    throw new Error('Không tìm thấy file: ' + (targetPath || fileUri || ''));
  }

  const ideCmd = 'C:\\Users\\fuhid\\AppData\\Local\\Programs\\Antigravity IDE\\bin\\antigravity-ide.cmd';
  if (existsSync(ideCmd)) {
    spawn(ideCmd, ['-r', targetPath], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  } else {
    spawn('cmd.exe', ['/c', 'start', '""', targetPath], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  }
  return { ok: true, path: targetPath };
});

// Start HTTP Server & Persistent Background Daemon Loop
await app.run();
console.log('[autonomy-engine] Persistent Scheduler & UI Sidecar started.');
setTimeout(runSchedulerTick, 4000);
setInterval(runSchedulerTick, 30000);
