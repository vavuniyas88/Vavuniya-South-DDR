import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, {type NextFunction, type Request, type Response} from 'express';
import {createServer as createViteServer} from 'vite';

type Role = 'admin' | 'officer';
type DutyStatus = 'saved' | 'submitted' | 'approved';

interface StoredUser {
  id: string;
  fullName: string;
  username: string;
  designation: string;
  role: Role;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

interface PublicUser {
  id: string;
  fullName: string;
  username: string;
  designation: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

interface DutyRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  description: string;
  remarks: string;
  status: DutyStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedById: string | null;
  approvedByName: string | null;
}

interface RegistryDatabase {
  users: StoredUser[];
  duties: DutyRecord[];
}

interface AuthenticatedRequest extends Request {
  authUser?: PublicUser;
}

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'registry.json');
const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16
    ? process.env.SESSION_SECRET.trim()
    : crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_REGEX = /^\d{4}-\d{2}$/;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {recursive: true});
  }
}

function readDb(): RegistryDatabase {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    const empty: RegistryDatabase = {users: [], duties: []};
    writeDb(empty);
    return empty;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<RegistryDatabase>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      duties: Array.isArray(parsed.duties) ? parsed.duties : [],
    };
  } catch {
    return {users: [], duties: []};
  }
}

function writeDb(db: RegistryDatabase): void {
  ensureDataDir();
  const tmpFile = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) {
    return false;
  }
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) {
    return false;
  }
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  const actualBuf = crypto.scryptSync(password, salt, 64);
  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    designation: user.designation,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function signToken(userId: string, role: Role): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      role,
      exp: Date.now() + TOKEN_TTL_MS,
    }),
    'utf8',
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string): {sub: string; role: Role; exp: number} | null {
  const parts = token.split('.');
  if (parts.length !== 2) {
    return null;
  }
  const [payload, sig] = parts;
  if (!payload || !sig) {
    return null;
  }
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: unknown;
      role?: unknown;
      exp?: unknown;
    };
    if (
      typeof decoded.sub !== 'string' ||
      (decoded.role !== 'admin' && decoded.role !== 'officer') ||
      typeof decoded.exp !== 'number' ||
      decoded.exp < Date.now()
    ) {
      return null;
    }
    return {sub: decoded.sub, role: decoded.role, exp: decoded.exp};
  } catch {
    return null;
  }
}

function getEnvAdminPasscode(): string {
  return (process.env.ADMIN_INITIAL_PASSWORD || '').trim();
}

function hasAnyAdmin(db: RegistryDatabase): boolean {
  return db.users.some((u) => u.role === 'admin');
}

function sanitizeText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().slice(0, maxLen);
}

function isEndAfterStart(startTime: string, endTime: string): boolean {
  return TIME_REGEX.test(startTime) && TIME_REGEX.test(endTime) && endTime > startTime;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({error: 'Authentication required'});
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({error: 'Invalid or expired session'});
    return;
  }
  const db = readDb();
  const user = db.users.find((u) => u.id === decoded.sub);
  if (!user) {
    res.status(401).json({error: 'User account no longer exists'});
    return;
  }
  req.authUser = toPublicUser(user);
  next();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.authUser || req.authUser.role !== 'admin') {
    res.status(403).json({error: 'Administrator privileges required'});
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  if (allowedOrigins.length > 0) {
    app.use((req, res, next) => {
      const origin = req.headers.origin?.replace(/\/+$/, '');
      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      }
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }
      next();
    });
  }

  app.use(express.json({limit: '1mb'}));

  // Ensure DB directory exists on startup
  readDb();

  app.get('/api/health', (_req, res) => {
    res.json({ok: true});
  });

  app.get('/api/auth/status', (_req, res) => {
    const db = readDb();
    const envPass = getEnvAdminPasscode();
    const needsSetup = !hasAnyAdmin(db) && envPass.length === 0;
    res.json({needsSetup});
  });

  app.post('/api/auth/setup', (req, res) => {
    const db = readDb();
    const envPass = getEnvAdminPasscode();
    if (hasAnyAdmin(db) || envPass.length > 0) {
      res.status(403).json({error: 'Initial administrator setup is already completed'});
      return;
    }

    const fullName = sanitizeText(req.body?.fullName, 120);
    const username = sanitizeText(req.body?.username, 60).toLowerCase();
    const designation = sanitizeText(req.body?.designation, 120);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!fullName || !username || !designation || password.length < 4) {
      res.status(400).json({
        error: 'Full name, username, designation, and a password (min 4 characters) are required',
      });
      return;
    }

    if (!/^[a-z0-9._-]+$/.test(username)) {
      res.status(400).json({
        error: 'Username may only contain letters, numbers, dots, underscores, and hyphens',
      });
      return;
    }

    const now = new Date().toISOString();
    const adminUser: StoredUser = {
      id: crypto.randomUUID(),
      fullName,
      username,
      designation,
      role: 'admin',
      passwordHash: hashPassword(password),
      createdAt: now,
      updatedAt: now,
    };

    db.users.push(adminUser);
    writeDb(db);

    const token = signToken(adminUser.id, adminUser.role);
    res.status(201).json({token, user: toPublicUser(adminUser)});
  });

  app.post('/api/auth/login', (req, res) => {
    const username = sanitizeText(req.body?.username, 60).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!username || !password) {
      res.status(400).json({error: 'Username and password are required'});
      return;
    }

    const db = readDb();
    const envPass = getEnvAdminPasscode();

    // If ADMIN_INITIAL_PASSWORD is configured in environment, allow bootstrap admin login
    if (envPass.length > 0 && username === 'admin') {
      const existingAdmin = db.users.find((u) => u.username === 'admin');
      const passBuf = Buffer.from(password, 'utf8');
      const envBuf = Buffer.from(envPass, 'utf8');
      const matchesEnv =
        passBuf.length === envBuf.length && crypto.timingSafeEqual(passBuf, envBuf);

      if (matchesEnv) {
        let adminUser = existingAdmin;
        if (!adminUser) {
          const now = new Date().toISOString();
          adminUser = {
            id: crypto.randomUUID(),
            fullName: 'Administrator',
            username: 'admin',
            designation: 'Planning Officer / Admin',
            role: 'admin',
            passwordHash: hashPassword(envPass),
            createdAt: now,
            updatedAt: now,
          };
          db.users.push(adminUser);
          writeDb(db);
        }
        const token = signToken(adminUser.id, adminUser.role);
        res.json({token, user: toPublicUser(adminUser)});
        return;
      }
    }

    const user = db.users.find((u) => u.username.toLowerCase() === username);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({error: 'Invalid username or password'});
      return;
    }

    const token = signToken(user.id, user.role);
    res.json({token, user: toPublicUser(user)});
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({user: req.authUser});
  });

  // --- Admin User Management ---
  app.get('/api/users', requireAuth, requireAdmin, (_req, res) => {
    const db = readDb();
    const users = db.users
      .map(toPublicUser)
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
    res.json({users});
  });

  app.post('/api/users', requireAuth, requireAdmin, (req, res) => {
    const fullName = sanitizeText(req.body?.fullName, 120);
    const username = sanitizeText(req.body?.username, 60).toLowerCase();
    const designation = sanitizeText(req.body?.designation, 120);
    const role: Role = req.body?.role === 'admin' ? 'admin' : 'officer';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!fullName || !username || !designation || password.length < 4) {
      res.status(400).json({
        error: 'Full name, username, designation, and password (min 4 characters) are required',
      });
      return;
    }

    if (!/^[a-z0-9._-]+$/.test(username)) {
      res.status(400).json({
        error: 'Username may only contain letters, numbers, dots, underscores, and hyphens',
      });
      return;
    }

    const db = readDb();
    if (db.users.some((u) => u.username.toLowerCase() === username)) {
      res.status(409).json({error: 'Username already exists'});
      return;
    }

    const now = new Date().toISOString();
    const newUser: StoredUser = {
      id: crypto.randomUUID(),
      fullName,
      username,
      designation,
      role,
      passwordHash: hashPassword(password),
      createdAt: now,
      updatedAt: now,
    };

    db.users.push(newUser);
    writeDb(db);

    res.status(201).json({user: toPublicUser(newUser)});
  });

  app.patch('/api/users/:id', requireAuth, requireAdmin, (req, res) => {
    const targetId = sanitizeText(req.params.id, 100);
    const db = readDb();
    const userIndex = db.users.findIndex((u) => u.id === targetId);
    if (userIndex === -1) {
      res.status(404).json({error: 'User not found'});
      return;
    }

    const existing = db.users[userIndex];
    const fullName =
      req.body?.fullName !== undefined ? sanitizeText(req.body.fullName, 120) : existing.fullName;
    const username =
      req.body?.username !== undefined
        ? sanitizeText(req.body.username, 60).toLowerCase()
        : existing.username;
    const designation =
      req.body?.designation !== undefined
        ? sanitizeText(req.body.designation, 120)
        : existing.designation;
    const role: Role =
      req.body?.role === 'admin' || req.body?.role === 'officer' ? req.body.role : existing.role;
    const newPassword = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!fullName || !username || !designation) {
      res.status(400).json({error: 'Full name, username, and designation cannot be empty'});
      return;
    }

    if (!/^[a-z0-9._-]+$/.test(username)) {
      res.status(400).json({
        error: 'Username may only contain letters, numbers, dots, underscores, and hyphens',
      });
      return;
    }

    if (
      db.users.some((u) => u.id !== targetId && u.username.toLowerCase() === username)
    ) {
      res.status(409).json({error: 'Another user already uses this username'});
      return;
    }

    if (newPassword.length > 0 && newPassword.length < 4) {
      res.status(400).json({error: 'Password must be at least 4 characters'});
      return;
    }

    // Prevent demoting the last remaining admin
    if (existing.role === 'admin' && role !== 'admin') {
      const adminCount = db.users.filter((u) => u.role === 'admin').length;
      if (adminCount <= 1) {
        res.status(400).json({error: 'Cannot remove role from the only administrator'});
        return;
      }
    }

    const updated: StoredUser = {
      ...existing,
      fullName,
      username,
      designation,
      role,
      passwordHash: newPassword.length >= 4 ? hashPassword(newPassword) : existing.passwordHash,
      updatedAt: new Date().toISOString(),
    };

    db.users[userIndex] = updated;
    writeDb(db);
    res.json({user: toPublicUser(updated)});
  });

  app.delete('/api/users/:id', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
    const targetId = sanitizeText(req.params.id, 100);
    if (req.authUser?.id === targetId) {
      res.status(400).json({error: 'You cannot delete your own active administrator account'});
      return;
    }

    const db = readDb();
    const target = db.users.find((u) => u.id === targetId);
    if (!target) {
      res.status(404).json({error: 'User not found'});
      return;
    }

    if (target.role === 'admin') {
      const adminCount = db.users.filter((u) => u.role === 'admin').length;
      if (adminCount <= 1) {
        res.status(400).json({error: 'Cannot delete the only administrator'});
        return;
      }
    }

    db.users = db.users.filter((u) => u.id !== targetId);
    db.duties = db.duties.filter((d) => d.userId !== targetId);
    writeDb(db);
    res.json({deleted: true});
  });

  // --- Duty Entries ---
  app.get('/api/duties', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = readDb();
    const userMap = new Map(db.users.map((u) => [u.id, toPublicUser(u)]));

    const dateFilter = typeof req.query.date === 'string' ? req.query.date.trim() : '';
    const monthFilter = typeof req.query.month === 'string' ? req.query.month.trim() : '';
    const statusFilter = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const userIdFilter = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';

    let duties = db.duties;

    if (req.authUser?.role === 'officer') {
      duties = duties.filter((d) => d.userId === req.authUser?.id);
    } else {
      duties = duties.filter((d) => userMap.get(d.userId)?.role === 'officer');
      if (userIdFilter && userIdFilter !== 'all') {
        duties = duties.filter((d) => d.userId === userIdFilter);
      }
    }

    if (dateFilter && DATE_REGEX.test(dateFilter)) {
      duties = duties.filter((d) => d.date === dateFilter);
    }

    if (monthFilter && MONTH_REGEX.test(monthFilter)) {
      duties = duties.filter((d) => d.date.startsWith(monthFilter));
    }

    if (statusFilter === 'saved' || statusFilter === 'submitted' || statusFilter === 'approved') {
      duties = duties.filter((d) => d.status === statusFilter);
    }

    const enriched = duties
      .map((d) => {
        const owner = userMap.get(d.userId);
        return {
          ...d,
          officerName: owner?.fullName ?? 'Unknown Officer',
          officerUsername: owner?.username ?? '',
          officerDesignation: owner?.designation ?? '',
          officerRole: owner?.role ?? 'officer',
        };
      })
      .sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return a.startTime.localeCompare(b.startTime);
      });

    res.json({duties: enriched});
  });

  app.post('/api/duties', requireAuth, (req: AuthenticatedRequest, res) => {
    const authUser = req.authUser;
    if (!authUser) {
      res.status(401).json({error: 'Unauthorized'});
      return;
    }

    const date = sanitizeText(req.body?.date, 20);
    if (!DATE_REGEX.test(date)) {
      res.status(400).json({error: 'Valid date (YYYY-MM-DD) is required'});
      return;
    }

    const rawEntries = Array.isArray(req.body?.entries)
      ? req.body.entries
      : [
          {
            startTime: req.body?.startTime,
            endTime: req.body?.endTime,
            description: req.body?.description,
            remarks: req.body?.remarks,
          },
        ];

    if (rawEntries.length === 0 || rawEntries.length > 50) {
      res.status(400).json({error: 'Between 1 and 50 duty entries are allowed per save'});
      return;
    }

    const initialStatus: DutyStatus = req.body?.submitImmediately === true ? 'submitted' : 'saved';
    const now = new Date().toISOString();
    const created: DutyRecord[] = [];

    for (const item of rawEntries) {
      const startTime = sanitizeText(item?.startTime, 10);
      const endTime = sanitizeText(item?.endTime, 10);
      const description = sanitizeText(item?.description, 1000);
      const remarks = sanitizeText(item?.remarks, 500);

      if (!isEndAfterStart(startTime, endTime)) {
        res.status(400).json({
          error: 'Each duty must have a valid start time and an end time later than the start time',
        });
        return;
      }

      if (!description) {
        res.status(400).json({error: 'Duty description cannot be empty'});
        return;
      }

      created.push({
        id: crypto.randomUUID(),
        userId: authUser.id,
        date,
        startTime,
        endTime,
        description,
        remarks,
        status: initialStatus,
        createdAt: now,
        updatedAt: now,
        submittedAt: initialStatus === 'submitted' ? now : null,
        approvedAt: null,
        approvedById: null,
        approvedByName: null,
      });
    }

    const db = readDb();
    db.duties.push(...created);
    writeDb(db);

    res.status(201).json({duties: created});
  });

  app.patch('/api/duties/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const authUser = req.authUser;
    if (!authUser) {
      res.status(401).json({error: 'Unauthorized'});
      return;
    }

    const dutyId = sanitizeText(req.params.id, 100);
    const db = readDb();
    const idx = db.duties.findIndex((d) => d.id === dutyId);
    if (idx === -1) {
      res.status(404).json({error: 'Duty entry not found'});
      return;
    }

    const existing = db.duties[idx];
    if (existing.userId !== authUser.id && authUser.role !== 'admin') {
      res.status(403).json({error: 'You can only edit your own duties'});
      return;
    }

    if (existing.status === 'approved') {
      res.status(403).json({error: 'Approved duties are locked and cannot be edited'});
      return;
    }

    const date = req.body?.date !== undefined ? sanitizeText(req.body.date, 20) : existing.date;
    const startTime =
      req.body?.startTime !== undefined ? sanitizeText(req.body.startTime, 10) : existing.startTime;
    const endTime =
      req.body?.endTime !== undefined ? sanitizeText(req.body.endTime, 10) : existing.endTime;
    const description =
      req.body?.description !== undefined
        ? sanitizeText(req.body.description, 1000)
        : existing.description;
    const remarks =
      req.body?.remarks !== undefined ? sanitizeText(req.body.remarks, 500) : existing.remarks;

    if (!DATE_REGEX.test(date)) {
      res.status(400).json({error: 'Valid date (YYYY-MM-DD) is required'});
      return;
    }

    if (!isEndAfterStart(startTime, endTime)) {
      res.status(400).json({error: 'End time must be later than start time'});
      return;
    }

    if (!description) {
      res.status(400).json({error: 'Duty description cannot be empty'});
      return;
    }

    const updated: DutyRecord = {
      ...existing,
      date,
      startTime,
      endTime,
      description,
      remarks,
      updatedAt: new Date().toISOString(),
    };

    db.duties[idx] = updated;
    writeDb(db);
    res.json({duty: updated});
  });

  app.delete('/api/duties/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const authUser = req.authUser;
    if (!authUser) {
      res.status(401).json({error: 'Unauthorized'});
      return;
    }

    const dutyId = sanitizeText(req.params.id, 100);
    const db = readDb();
    const existing = db.duties.find((d) => d.id === dutyId);
    if (!existing) {
      res.status(404).json({error: 'Duty entry not found'});
      return;
    }

    if (existing.userId !== authUser.id && authUser.role !== 'admin') {
      res.status(403).json({error: 'You can only delete your own duties'});
      return;
    }

    if (existing.status === 'approved') {
      res.status(403).json({error: 'Approved duties are locked and cannot be deleted'});
      return;
    }

    db.duties = db.duties.filter((d) => d.id !== dutyId);
    writeDb(db);
    res.json({deleted: true});
  });

  app.post('/api/duties/submit', requireAuth, (req: AuthenticatedRequest, res) => {
    const authUser = req.authUser;
    if (!authUser) {
      res.status(401).json({error: 'Unauthorized'});
      return;
    }

    const ids: string[] = Array.isArray(req.body?.ids)
      ? req.body.ids.filter((v: unknown): v is string => typeof v === 'string')
      : [];
    const date = typeof req.body?.date === 'string' ? req.body.date.trim() : '';

    if (ids.length === 0 && !DATE_REGEX.test(date)) {
      res.status(400).json({error: 'Provide duty IDs or a valid date to submit'});
      return;
    }

    const db = readDb();
    const now = new Date().toISOString();
    let submittedCount = 0;

    db.duties = db.duties.map((duty) => {
      if (duty.userId !== authUser.id || duty.status !== 'saved') {
        return duty;
      }
      const matchesId = ids.length > 0 && ids.includes(duty.id);
      const matchesDate = ids.length === 0 && duty.date === date;
      if (matchesId || matchesDate) {
        submittedCount += 1;
        return {
          ...duty,
          status: 'submitted',
          submittedAt: now,
          updatedAt: now,
        };
      }
      return duty;
    });

    if (submittedCount === 0) {
      res.status(400).json({error: 'No saved duties found to submit'});
      return;
    }

    writeDb(db);
    res.json({submittedCount});
  });

  app.post('/api/duties/:id/approve', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
    const authUser = req.authUser;
    if (!authUser) {
      res.status(401).json({error: 'Unauthorized'});
      return;
    }

    const dutyId = sanitizeText(req.params.id, 100);
    const db = readDb();
    const idx = db.duties.findIndex((d) => d.id === dutyId);
    if (idx === -1) {
      res.status(404).json({error: 'Duty entry not found'});
      return;
    }

    const existing = db.duties[idx];
    if (existing.status === 'saved') {
      res.status(400).json({error: 'Cannot approve a draft duty that has not been submitted'});
      return;
    }

    const now = new Date().toISOString();
    const updated: DutyRecord = {
      ...existing,
      status: 'approved',
      approvedAt: existing.approvedAt ?? now,
      approvedById: authUser.id,
      approvedByName: authUser.fullName,
      updatedAt: now,
    };

    db.duties[idx] = updated;
    writeDb(db);
    res.json({duty: updated});
  });

  app.post('/api/duties/approve-batch', requireAuth, requireAdmin, (req: AuthenticatedRequest, res) => {
    const authUser = req.authUser;
    if (!authUser) {
      res.status(401).json({error: 'Unauthorized'});
      return;
    }

    const ids: string[] = Array.isArray(req.body?.ids)
      ? req.body.ids.filter((v: unknown): v is string => typeof v === 'string')
      : [];

    if (ids.length === 0) {
      res.status(400).json({error: 'Provide at least one duty ID to approve'});
      return;
    }

    const db = readDb();
    const now = new Date().toISOString();
    let approvedCount = 0;

    db.duties = db.duties.map((duty) => {
      if (ids.includes(duty.id) && duty.status === 'submitted') {
        approvedCount += 1;
        return {
          ...duty,
          status: 'approved',
          approvedAt: now,
          approvedById: authUser.id,
          approvedByName: authUser.fullName,
          updatedAt: now,
        };
      }
      return duty;
    });

    writeDb(db);
    res.json({approvedCount});
  });

  // Vite integration in dev vs static files in production
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
