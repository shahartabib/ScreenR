/**
 * Branding and customization routes
 */

import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDb, findById, insert, update } from '../db/index.js';
import { authMiddleware, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Configure file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads/branding';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.svg', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

interface Organization {
  id: string;
  name: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  custom_css: string;
}

// Get organization branding
router.get('/:orgId', authMiddleware, (req: AuthRequest, res: Response) => {
  const org = findById<Organization>('organizations', req.params.orgId);

  if (!org) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }

  res.json({
    id: org.id,
    name: org.name,
    logoUrl: org.logo_url,
    primaryColor: org.primary_color,
    secondaryColor: org.secondary_color,
    customCss: org.custom_css,
  });
});

// Update organization branding
router.put('/:orgId', authMiddleware, (req: AuthRequest, res: Response) => {
  const { name, primaryColor, secondaryColor, customCss } = req.body;

  const org = findById<Organization>('organizations', req.params.orgId);
  if (!org) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }

  const updates: Record<string, any> = {};

  if (name !== undefined) updates.name = name;
  if (primaryColor !== undefined) updates.primary_color = primaryColor;
  if (secondaryColor !== undefined) updates.secondary_color = secondaryColor;
  if (customCss !== undefined) updates.custom_css = customCss;

  if (Object.keys(updates).length > 0) {
    update('organizations', req.params.orgId, updates);
  }

  res.json({ success: true });
});

// Upload logo
router.post(
  '/:orgId/logo',
  authMiddleware,
  upload.single('logo'),
  (req: AuthRequest, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const logoUrl = `/uploads/branding/${req.file.filename}`;

    update('organizations', req.params.orgId, { logo_url: logoUrl });

    res.json({ logoUrl });
  }
);

// Get brand preview CSS
router.get('/:orgId/preview-css', (req: AuthRequest, res: Response) => {
  const org = findById<Organization>('organizations', req.params.orgId);

  if (!org) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }

  const css = `
:root {
  --primary-color: ${org.primary_color || '#4ecdc4'};
  --secondary-color: ${org.secondary_color || '#2d2d44'};
}

.mode-btn.active {
  background: var(--primary-color);
}

.progress-fill {
  background: var(--primary-color);
}

.highlight.circle {
  border-color: var(--primary-color);
  box-shadow: 0 0 20px ${org.primary_color}80;
}

.question-option.correct,
.completion-screen h2,
.score-panel .score-value {
  color: var(--primary-color);
}

.summary-panel,
.question-card,
.video-wrapper {
  background: var(--secondary-color);
}

${org.custom_css || ''}
`;

  res.setHeader('Content-Type', 'text/css');
  res.send(css);
});

// Create organization
router.post('/', authMiddleware, requireRole('admin'), (req: AuthRequest, res: Response) => {
  const { name, primaryColor, secondaryColor } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Organization name is required' });
    return;
  }

  const org = {
    id: uuid(),
    name,
    logo_url: '',
    primary_color: primaryColor || '#4ecdc4',
    secondary_color: secondaryColor || '#2d2d44',
    custom_css: '',
    created_at: new Date().toISOString(),
  };

  insert('organizations', org);

  // Add creator as owner
  insert('user_organizations', {
    user_id: req.user!.id,
    org_id: org.id,
    role: 'owner',
  });

  res.status(201).json(org);
});

// List user's organizations
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const orgs = getDb()
    .prepare(
      `SELECT o.*, uo.role as user_role
       FROM organizations o
       JOIN user_organizations uo ON o.id = uo.org_id
       WHERE uo.user_id = ?`
    )
    .all(req.user!.id);

  res.json(orgs);
});

export default router;
