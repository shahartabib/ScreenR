/**
 * User management routes
 */

import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb, findById, findAll, insert, update, remove } from '../db/index.js';
import { authMiddleware, requireRole, AuthRequest, hashPassword } from '../middleware/auth.js';

const router = Router();

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

// List users (admin only)
router.get('/', authMiddleware, requireRole('admin'), (req: AuthRequest, res: Response) => {
  const { role, search } = req.query;

  let query = 'SELECT id, email, name, role, created_at FROM users WHERE 1=1';
  const params: any[] = [];

  if (role) {
    query += ' AND role = ?';
    params.push(role);
  }

  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY created_at DESC';

  const users = getDb().prepare(query).all(...params);
  res.json(users);
});

// Get user by ID
router.get('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  // Users can view themselves, admins can view anyone
  if (req.user!.role !== 'admin' && req.user!.id !== req.params.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const user = getDb()
    .prepare('SELECT id, email, name, role, avatar_url, created_at FROM users WHERE id = ?')
    .get(req.params.id);

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Get user's organizations
  const orgs = getDb()
    .prepare(
      `SELECT o.id, o.name, uo.role
       FROM organizations o
       JOIN user_organizations uo ON o.id = uo.org_id
       WHERE uo.user_id = ?`
    )
    .all(req.params.id);

  res.json({ ...user, organizations: orgs });
});

// Create user (admin only)
router.post('/', authMiddleware, requireRole('admin'), (req: AuthRequest, res: Response) => {
  const { email, password, name, role } = req.body;

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
    role: role || 'viewer',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  insert('users', user);

  res.status(201).json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
});

// Update user
router.put('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  // Users can update themselves, admins can update anyone
  if (req.user!.role !== 'admin' && req.user!.id !== req.params.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const user = findById<User>('users', req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const { name, email, role, password } = req.body;
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (name) updates.name = name;
  if (email) updates.email = email;

  // Only admins can change roles
  if (role && req.user!.role === 'admin') {
    updates.role = role;
  }

  if (password) {
    updates.password_hash = hashPassword(password);
  }

  update('users', req.params.id, updates);

  res.json({ success: true });
});

// Delete user (admin only)
router.delete('/:id', authMiddleware, requireRole('admin'), (req: AuthRequest, res: Response) => {
  const user = findById<User>('users', req.params.id);

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Don't allow deleting yourself
  if (req.user!.id === req.params.id) {
    res.status(400).json({ error: 'Cannot delete yourself' });
    return;
  }

  // Remove from organizations
  getDb()
    .prepare('DELETE FROM user_organizations WHERE user_id = ?')
    .run(req.params.id);

  // Delete user
  remove('users', req.params.id);

  res.json({ success: true });
});

// Add user to organization
router.post(
  '/:id/organizations',
  authMiddleware,
  requireRole('admin'),
  (req: AuthRequest, res: Response) => {
    const { orgId, role } = req.body;

    if (!orgId) {
      res.status(400).json({ error: 'Organization ID is required' });
      return;
    }

    // Check if already member
    const existing = getDb()
      .prepare('SELECT * FROM user_organizations WHERE user_id = ? AND org_id = ?')
      .get(req.params.id, orgId);

    if (existing) {
      // Update role
      getDb()
        .prepare('UPDATE user_organizations SET role = ? WHERE user_id = ? AND org_id = ?')
        .run(role || 'member', req.params.id, orgId);
    } else {
      insert('user_organizations', {
        user_id: req.params.id,
        org_id: orgId,
        role: role || 'member',
      });
    }

    res.json({ success: true });
  }
);

// Remove user from organization
router.delete(
  '/:id/organizations/:orgId',
  authMiddleware,
  requireRole('admin'),
  (req: AuthRequest, res: Response) => {
    getDb()
      .prepare('DELETE FROM user_organizations WHERE user_id = ? AND org_id = ?')
      .run(req.params.id, req.params.orgId);

    res.json({ success: true });
  }
);

export default router;
