/**
 * Reports and Analytics routes
 */

import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb, insert, update } from '../db/index.js';
import { authMiddleware, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Start a learning session
router.post('/sessions', optionalAuth, (req: AuthRequest, res: Response) => {
  const { tutorialId, mode, anonymousId } = req.body;

  if (!tutorialId || !mode) {
    res.status(400).json({ error: 'Tutorial ID and mode are required' });
    return;
  }

  const session = {
    id: uuid(),
    tutorial_id: tutorialId,
    user_id: req.user?.id || null,
    anonymous_id: anonymousId || uuid(),
    mode,
    started_at: new Date().toISOString(),
  };

  insert('learning_sessions', session);

  res.json({ sessionId: session.id });
});

// Record session event
router.post('/sessions/:sessionId/events', (req: AuthRequest, res: Response) => {
  const { eventType, stepId, data } = req.body;

  const event = {
    id: uuid(),
    session_id: req.params.sessionId,
    event_type: eventType,
    step_id: stepId || null,
    data: data ? JSON.stringify(data) : null,
    timestamp: new Date().toISOString(),
  };

  insert('session_events', event);

  res.json({ success: true });
});

// Complete session
router.put('/sessions/:sessionId/complete', (req: AuthRequest, res: Response) => {
  const { score, maxScore, timeSpent } = req.body;

  update('learning_sessions', req.params.sessionId, {
    completed_at: new Date().toISOString(),
    score: score || 0,
    max_score: maxScore || 0,
    time_spent: timeSpent || 0,
  });

  res.json({ success: true });
});

// Get tutorial analytics (dashboard)
router.get('/tutorials/:tutorialId', authMiddleware, (req: AuthRequest, res: Response) => {
  const tutorialId = req.params.tutorialId;
  const { startDate, endDate } = req.query;

  let dateFilter = '';
  const params: any[] = [tutorialId];

  if (startDate) {
    dateFilter += ' AND started_at >= ?';
    params.push(startDate);
  }
  if (endDate) {
    dateFilter += ' AND started_at <= ?';
    params.push(endDate);
  }

  // Total sessions
  const totalSessions = getDb()
    .prepare(`SELECT COUNT(*) as count FROM learning_sessions WHERE tutorial_id = ?${dateFilter}`)
    .get(...params) as { count: number };

  // Completed sessions
  const completedSessions = getDb()
    .prepare(
      `SELECT COUNT(*) as count FROM learning_sessions
       WHERE tutorial_id = ? AND completed_at IS NOT NULL${dateFilter}`
    )
    .get(...params) as { count: number };

  // Average score
  const avgScore = getDb()
    .prepare(
      `SELECT AVG(CAST(score AS FLOAT) / NULLIF(max_score, 0) * 100) as avg_score
       FROM learning_sessions
       WHERE tutorial_id = ? AND completed_at IS NOT NULL AND max_score > 0${dateFilter}`
    )
    .get(...params) as { avg_score: number | null };

  // Average time spent
  const avgTime = getDb()
    .prepare(
      `SELECT AVG(time_spent) as avg_time
       FROM learning_sessions
       WHERE tutorial_id = ? AND completed_at IS NOT NULL${dateFilter}`
    )
    .get(...params) as { avg_time: number | null };

  // Sessions by mode
  const byMode = getDb()
    .prepare(
      `SELECT mode, COUNT(*) as count
       FROM learning_sessions
       WHERE tutorial_id = ?${dateFilter}
       GROUP BY mode`
    )
    .all(...params);

  // Sessions over time (last 30 days)
  const sessionsOverTime = getDb()
    .prepare(
      `SELECT DATE(started_at) as date, COUNT(*) as count
       FROM learning_sessions
       WHERE tutorial_id = ? AND started_at >= DATE('now', '-30 days')
       GROUP BY DATE(started_at)
       ORDER BY date`
    )
    .all(tutorialId);

  // Score distribution
  const scoreDistribution = getDb()
    .prepare(
      `SELECT
         CASE
           WHEN (CAST(score AS FLOAT) / NULLIF(max_score, 0) * 100) >= 90 THEN '90-100'
           WHEN (CAST(score AS FLOAT) / NULLIF(max_score, 0) * 100) >= 80 THEN '80-89'
           WHEN (CAST(score AS FLOAT) / NULLIF(max_score, 0) * 100) >= 70 THEN '70-79'
           WHEN (CAST(score AS FLOAT) / NULLIF(max_score, 0) * 100) >= 60 THEN '60-69'
           ELSE 'Below 60'
         END as range,
         COUNT(*) as count
       FROM learning_sessions
       WHERE tutorial_id = ? AND completed_at IS NOT NULL AND max_score > 0${dateFilter}
       GROUP BY range`
    )
    .all(...params);

  res.json({
    summary: {
      totalSessions: totalSessions.count,
      completedSessions: completedSessions.count,
      completionRate:
        totalSessions.count > 0
          ? Math.round((completedSessions.count / totalSessions.count) * 100)
          : 0,
      averageScore: avgScore.avg_score ? Math.round(avgScore.avg_score) : null,
      averageTimeSpent: avgTime.avg_time ? Math.round(avgTime.avg_time / 1000) : null, // in seconds
    },
    byMode,
    sessionsOverTime,
    scoreDistribution,
  });
});

// Get organization-wide analytics
router.get('/overview', authMiddleware, (req: AuthRequest, res: Response) => {
  const { startDate, endDate } = req.query;

  let dateFilter = '';
  const params: any[] = [];

  if (startDate) {
    dateFilter += ' AND s.started_at >= ?';
    params.push(startDate);
  }
  if (endDate) {
    dateFilter += ' AND s.started_at <= ?';
    params.push(endDate);
  }

  // Total sessions across all tutorials
  const totalSessions = getDb()
    .prepare(`SELECT COUNT(*) as count FROM learning_sessions s WHERE 1=1${dateFilter}`)
    .get(...params) as { count: number };

  // Total unique users
  const uniqueUsers = getDb()
    .prepare(
      `SELECT COUNT(DISTINCT COALESCE(user_id, anonymous_id)) as count
       FROM learning_sessions s WHERE 1=1${dateFilter}`
    )
    .get(...params) as { count: number };

  // Top tutorials by sessions
  const topTutorials = getDb()
    .prepare(
      `SELECT t.id, t.title, COUNT(s.id) as session_count,
              AVG(CASE WHEN s.max_score > 0 THEN CAST(s.score AS FLOAT) / s.max_score * 100 END) as avg_score
       FROM tutorials t
       LEFT JOIN learning_sessions s ON t.id = s.tutorial_id
       WHERE 1=1${dateFilter.replace(/s\./g, '')}
       GROUP BY t.id
       ORDER BY session_count DESC
       LIMIT 10`
    )
    .all(...params);

  // Recent sessions
  const recentSessions = getDb()
    .prepare(
      `SELECT s.id, s.tutorial_id, t.title as tutorial_title, s.mode,
              s.started_at, s.completed_at, s.score, s.max_score,
              u.name as user_name
       FROM learning_sessions s
       LEFT JOIN tutorials t ON s.tutorial_id = t.id
       LEFT JOIN users u ON s.user_id = u.id
       ORDER BY s.started_at DESC
       LIMIT 20`
    )
    .all();

  res.json({
    summary: {
      totalSessions: totalSessions.count,
      uniqueUsers: uniqueUsers.count,
    },
    topTutorials,
    recentSessions,
  });
});

// Export session data (for SCORM/xAPI reporting)
router.get('/export/:tutorialId', authMiddleware, (req: AuthRequest, res: Response) => {
  const tutorialId = req.params.tutorialId;
  const { format } = req.query;

  const sessions = getDb()
    .prepare(
      `SELECT s.*, u.name as user_name, u.email as user_email
       FROM learning_sessions s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.tutorial_id = ?
       ORDER BY s.started_at DESC`
    )
    .all(tutorialId);

  if (format === 'csv') {
    const csv = [
      'Session ID,User,Email,Mode,Started,Completed,Score,Max Score,Time Spent',
      ...sessions.map((s: any) =>
        [
          s.id,
          s.user_name || 'Anonymous',
          s.user_email || '',
          s.mode,
          s.started_at,
          s.completed_at || '',
          s.score || '',
          s.max_score || '',
          s.time_spent || '',
        ].join(',')
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report-${tutorialId}.csv"`
    );
    res.send(csv);
  } else {
    res.json(sessions);
  }
});

export default router;
