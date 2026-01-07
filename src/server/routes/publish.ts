/**
 * Publish and embed routes
 */

import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import fs from 'fs';
import path from 'path';
import { getDb, findById, insert, update } from '../db/index.js';
import { authMiddleware, AuthRequest, hashPassword, verifyPassword } from '../middleware/auth.js';

const router = Router();

interface PublishConfig {
  id: string;
  tutorial_id: string;
  embed_enabled: number;
  public_link_enabled: number;
  password_protected: number;
  password_hash: string | null;
  allowed_domains: string | null;
  scorm_enabled: number;
  scorm_version: string;
  lti_enabled: number;
}

// Get publish settings
router.get('/:tutorialId', authMiddleware, (req: AuthRequest, res: Response) => {
  let config = getDb()
    .prepare('SELECT * FROM publish_configs WHERE tutorial_id = ?')
    .get(req.params.tutorialId) as PublishConfig | undefined;

  if (!config) {
    // Create default config
    config = {
      id: uuid(),
      tutorial_id: req.params.tutorialId,
      embed_enabled: 1,
      public_link_enabled: 0,
      password_protected: 0,
      password_hash: null,
      allowed_domains: null,
      scorm_enabled: 0,
      scorm_version: '2004',
      lti_enabled: 0,
    };
    insert('publish_configs', config);
  }

  res.json({
    embedEnabled: !!config.embed_enabled,
    publicLinkEnabled: !!config.public_link_enabled,
    passwordProtected: !!config.password_protected,
    allowedDomains: config.allowed_domains ? JSON.parse(config.allowed_domains) : [],
    scormEnabled: !!config.scorm_enabled,
    scormVersion: config.scorm_version,
    ltiEnabled: !!config.lti_enabled,
    embedCode: generateEmbedCode(req.params.tutorialId),
    publicLink: config.public_link_enabled
      ? `${process.env.APP_URL || 'http://localhost:3000'}/view/${req.params.tutorialId}`
      : null,
  });
});

// Update publish settings
router.put('/:tutorialId', authMiddleware, (req: AuthRequest, res: Response) => {
  const {
    embedEnabled,
    publicLinkEnabled,
    passwordProtected,
    password,
    allowedDomains,
    scormEnabled,
    scormVersion,
    ltiEnabled,
  } = req.body;

  const updates: Record<string, any> = {};

  if (embedEnabled !== undefined) updates.embed_enabled = embedEnabled ? 1 : 0;
  if (publicLinkEnabled !== undefined) updates.public_link_enabled = publicLinkEnabled ? 1 : 0;
  if (passwordProtected !== undefined) {
    updates.password_protected = passwordProtected ? 1 : 0;
    if (password) {
      updates.password_hash = hashPassword(password);
    }
  }
  if (allowedDomains !== undefined) {
    updates.allowed_domains = JSON.stringify(allowedDomains);
  }
  if (scormEnabled !== undefined) updates.scorm_enabled = scormEnabled ? 1 : 0;
  if (scormVersion !== undefined) updates.scorm_version = scormVersion;
  if (ltiEnabled !== undefined) updates.lti_enabled = ltiEnabled ? 1 : 0;

  // Check if config exists
  const existing = getDb()
    .prepare('SELECT id FROM publish_configs WHERE tutorial_id = ?')
    .get(req.params.tutorialId);

  if (existing) {
    update('publish_configs', (existing as any).id, updates);
  } else {
    insert('publish_configs', {
      id: uuid(),
      tutorial_id: req.params.tutorialId,
      ...updates,
    });
  }

  res.json({ success: true });
});

// Verify password for protected content
router.post('/:tutorialId/verify-password', (req: AuthRequest, res: Response) => {
  const { password } = req.body;

  const config = getDb()
    .prepare('SELECT * FROM publish_configs WHERE tutorial_id = ?')
    .get(req.params.tutorialId) as PublishConfig | undefined;

  if (!config || !config.password_protected || !config.password_hash) {
    res.json({ valid: true });
    return;
  }

  const valid = verifyPassword(password, config.password_hash);
  res.json({ valid });
});

// Generate SCORM package
router.post('/:tutorialId/scorm', authMiddleware, async (req: AuthRequest, res: Response) => {
  const tutorialId = req.params.tutorialId;
  const { version } = req.body;

  // Get tutorial data
  const tutorial = findById<any>('tutorials', tutorialId);
  if (!tutorial) {
    res.status(404).json({ error: 'Tutorial not found' });
    return;
  }

  const tutorialVersion = getDb()
    .prepare(
      'SELECT project_data FROM tutorial_versions WHERE tutorial_id = ? ORDER BY version DESC LIMIT 1'
    )
    .get(tutorialId) as { project_data: string } | undefined;

  if (!tutorialVersion) {
    res.status(400).json({ error: 'No tutorial content found' });
    return;
  }

  // In a real implementation, this would generate a proper SCORM package
  // For now, we'll return a placeholder response
  res.json({
    message: 'SCORM package generation would happen here',
    version: version || '2004',
    tutorialId,
    // downloadUrl would be provided after package is generated
  });
});

// Get embed player (public endpoint)
router.get('/:tutorialId/embed', async (req: AuthRequest, res: Response) => {
  const tutorialId = req.params.tutorialId;

  // Check publish config
  const config = getDb()
    .prepare('SELECT * FROM publish_configs WHERE tutorial_id = ?')
    .get(tutorialId) as PublishConfig | undefined;

  if (config && !config.embed_enabled) {
    res.status(403).json({ error: 'Embedding is disabled for this tutorial' });
    return;
  }

  // Check domain restriction
  const referer = req.headers.referer || req.headers.origin;
  if (config?.allowed_domains && referer) {
    const allowedDomains = JSON.parse(config.allowed_domains);
    const refererHost = new URL(referer).hostname;
    if (allowedDomains.length > 0 && !allowedDomains.includes(refererHost)) {
      res.status(403).json({ error: 'Domain not allowed' });
      return;
    }
  }

  // Get tutorial data
  const tutorialVersion = getDb()
    .prepare(
      'SELECT project_data FROM tutorial_versions WHERE tutorial_id = ? ORDER BY version DESC LIMIT 1'
    )
    .get(tutorialId) as { project_data: string } | undefined;

  if (!tutorialVersion) {
    res.status(404).json({ error: 'Tutorial not found' });
    return;
  }

  res.json({
    projectData: JSON.parse(tutorialVersion.project_data),
    passwordRequired: !!(config?.password_protected),
  });
});

function generateEmbedCode(tutorialId: string): string {
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  return `<iframe
  src="${baseUrl}/embed/${tutorialId}"
  width="100%"
  height="720"
  frameborder="0"
  allow="fullscreen"
  style="max-width: 1280px;"
></iframe>`;
}

export default router;
