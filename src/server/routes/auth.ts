/**
 * Authentication routes
 */

import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb, findById, insert } from '../db/index.js';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  authMiddleware,
  AuthRequest,
} from '../middleware/auth.js';

const router = Router();

interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
}

// Register new user
router.post('/register', (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ error: 'Email, password, and name are required' });
    return;
  }

  // Check if email exists
  const existing = getDb()
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(email);

  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const user = {
    id: uuid(),
    email,
    password_hash: hashPassword(password),
    name,
    role: 'viewer',
  };

  insert('users', user);

  const token = generateToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  res.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    token,
  });
});

// Login
router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = getDb()
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email) as User | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  res.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    token,
  });
});

// Get current user
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = findById<User>('users', req.user!.id);

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
});

// Update profile
router.put('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const { name, currentPassword, newPassword } = req.body;
  const userId = req.user!.id;

  const user = findById<User>('users', userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };

  if (name) {
    updates.name = name;
  }

  if (currentPassword && newPassword) {
    if (!verifyPassword(currentPassword, user.password_hash)) {
      res.status(400).json({ error: 'Current password is incorrect' });
      return;
    }
    updates.password_hash = hashPassword(newPassword);
  }

  const keys = Object.keys(updates);
  const values = Object.values(updates);
  const setClause = keys.map((k) => `${k} = ?`).join(', ');

  getDb()
    .prepare(`UPDATE users SET ${setClause} WHERE id = ?`)
    .run(...values, userId);

  res.json({ success: true });
});

export default router;
