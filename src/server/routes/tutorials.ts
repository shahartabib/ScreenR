/**
 * Tutorial management routes
 */

import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import fs from 'fs';
import path from 'path';
import { getDb, findById, findAll, insert, update, remove } from '../db/index.js';
import { authMiddleware, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

interface Tutorial {
  id: string;
  org_id: string;
  title: string;
  description: string;
  target_url: string;
  status: string;
  thumbnail_url: string;
  duration: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface TutorialVersion {
  id: string;
  tutorial_id: string;
  version: number;
  project_data: string;
  created_by: string;
  created_at: string;
}

// List tutorials
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const { status, search } = req.query;

  let query = 'SELECT * FROM tutorials WHERE 1=1';
  const params: any[] = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (search) {
    query += ' AND (title LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY updated_at DESC';

  const tutorials = getDb().prepare(query).all(...params);
  res.json(tutorials);
});

// Get single tutorial
router.get('/:id', optionalAuth, (req: AuthRequest, res: Response) => {
  const tutorial = findById<Tutorial>('tutorials', req.params.id);

  if (!tutorial) {
    res.status(404).json({ error: 'Tutorial not found' });
    return;
  }

  // Get latest version data
  const version = getDb()
    .prepare(
      'SELECT * FROM tutorial_versions WHERE tutorial_id = ? ORDER BY version DESC LIMIT 1'
    )
    .get(tutorial.id) as TutorialVersion | undefined;

  res.json({
    ...tutorial,
    projectData: version ? JSON.parse(version.project_data) : null,
  });
});

// Create tutorial
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const { title, description, targetUrl, orgId } = req.body;

  if (!title) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }

  const tutorial = {
    id: uuid(),
    org_id: orgId || 'org-001',
    title,
    description: description || '',
    target_url: targetUrl || '',
    status: 'draft',
    thumbnail_url: '',
    duration: 0,
    created_by: req.user!.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  insert('tutorials', tutorial);

  // Create initial empty version
  const version = {
    id: uuid(),
    tutorial_id: tutorial.id,
    version: 1,
    project_data: JSON.stringify({
      id: tutorial.id,
      title: tutorial.title,
      description: tutorial.description,
      targetUrl: tutorial.target_url,
      duration: 0,
      createdAt: tutorial.created_at,
      layers: {
        video: { src: '', width: 1280, height: 720 },
        audio: { src: '', volume: 1 },
        subtitles: [],
        highlights: [],
        questions: [],
      },
      interactiveSteps: [],
    }),
    created_by: req.user!.id,
    created_at: new Date().toISOString(),
  };

  insert('tutorial_versions', version);

  res.status(201).json(tutorial);
});

// Update tutorial
router.put('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const tutorial = findById<Tutorial>('tutorials', req.params.id);

  if (!tutorial) {
    res.status(404).json({ error: 'Tutorial not found' });
    return;
  }

  const { title, description, targetUrl, status, projectData } = req.body;

  // Update tutorial metadata
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (targetUrl !== undefined) updates.target_url = targetUrl;
  if (status !== undefined) {
    updates.status = status;
    if (status === 'published') {
      updates.published_at = new Date().toISOString();
    }
  }

  update('tutorials', req.params.id, updates);

  // If projectData is provided, create new version
  if (projectData) {
    const lastVersion = getDb()
      .prepare(
        'SELECT version FROM tutorial_versions WHERE tutorial_id = ? ORDER BY version DESC LIMIT 1'
      )
      .get(req.params.id) as { version: number } | undefined;

    const newVersion = {
      id: uuid(),
      tutorial_id: req.params.id,
      version: (lastVersion?.version || 0) + 1,
      project_data: JSON.stringify(projectData),
      created_by: req.user!.id,
      created_at: new Date().toISOString(),
    };

    insert('tutorial_versions', newVersion);
  }

  res.json({ success: true });
});

// Delete tutorial
router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const tutorial = findById<Tutorial>('tutorials', req.params.id);

  if (!tutorial) {
    res.status(404).json({ error: 'Tutorial not found' });
    return;
  }

  // Delete versions
  getDb()
    .prepare('DELETE FROM tutorial_versions WHERE tutorial_id = ?')
    .run(req.params.id);

  // Delete assets
  getDb()
    .prepare('DELETE FROM tutorial_assets WHERE tutorial_id = ?')
    .run(req.params.id);

  // Delete questions
  getDb()
    .prepare('DELETE FROM questions WHERE tutorial_id = ?')
    .run(req.params.id);

  // Delete tutorial
  remove('tutorials', req.params.id);

  res.json({ success: true });
});

// Duplicate tutorial
router.post('/:id/duplicate', authMiddleware, (req: AuthRequest, res: Response) => {
  const original = findById<Tutorial>('tutorials', req.params.id);

  if (!original) {
    res.status(404).json({ error: 'Tutorial not found' });
    return;
  }

  const newTutorial = {
    id: uuid(),
    org_id: original.org_id,
    title: `${original.title} (Copy)`,
    description: original.description,
    target_url: original.target_url,
    status: 'draft',
    thumbnail_url: '',
    duration: original.duration,
    created_by: req.user!.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  insert('tutorials', newTutorial);

  // Copy latest version
  const version = getDb()
    .prepare(
      'SELECT * FROM tutorial_versions WHERE tutorial_id = ? ORDER BY version DESC LIMIT 1'
    )
    .get(original.id) as TutorialVersion | undefined;

  if (version) {
    const projectData = JSON.parse(version.project_data);
    projectData.id = newTutorial.id;
    projectData.title = newTutorial.title;

    insert('tutorial_versions', {
      id: uuid(),
      tutorial_id: newTutorial.id,
      version: 1,
      project_data: JSON.stringify(projectData),
      created_by: req.user!.id,
      created_at: new Date().toISOString(),
    });
  }

  res.status(201).json(newTutorial);
});

// Get version history
router.get('/:id/versions', authMiddleware, (req: AuthRequest, res: Response) => {
  const versions = getDb()
    .prepare(
      `SELECT v.id, v.version, v.created_at, u.name as created_by_name
       FROM tutorial_versions v
       LEFT JOIN users u ON v.created_by = u.id
       WHERE v.tutorial_id = ?
       ORDER BY v.version DESC`
    )
    .all(req.params.id);

  res.json(versions);
});

// Restore version
router.post('/:id/versions/:versionId/restore', authMiddleware, (req: AuthRequest, res: Response) => {
  const version = findById<TutorialVersion>('tutorial_versions', req.params.versionId);

  if (!version || version.tutorial_id !== req.params.id) {
    res.status(404).json({ error: 'Version not found' });
    return;
  }

  // Create new version from old
  const lastVersion = getDb()
    .prepare(
      'SELECT version FROM tutorial_versions WHERE tutorial_id = ? ORDER BY version DESC LIMIT 1'
    )
    .get(req.params.id) as { version: number };

  insert('tutorial_versions', {
    id: uuid(),
    tutorial_id: req.params.id,
    version: lastVersion.version + 1,
    project_data: version.project_data,
    created_by: req.user!.id,
    created_at: new Date().toISOString(),
  });

  update('tutorials', req.params.id, { updated_at: new Date().toISOString() });

  res.json({ success: true });
});

export default router;
