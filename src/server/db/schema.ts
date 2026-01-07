/**
 * Database Schema for ScreenR
 */

export const SCHEMA = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'creator', 'viewer')),
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Organizations/Brands table
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#4ecdc4',
  secondary_color TEXT DEFAULT '#2d2d44',
  custom_css TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User-Organization membership
CREATE TABLE IF NOT EXISTS user_organizations (
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  PRIMARY KEY (user_id, org_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

-- Tutorials/Projects table
CREATE TABLE IF NOT EXISTS tutorials (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  target_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  thumbnail_url TEXT,
  duration INTEGER DEFAULT 0,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME,
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Tutorial versions (for edit history)
CREATE TABLE IF NOT EXISTS tutorial_versions (
  id TEXT PRIMARY KEY,
  tutorial_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  project_data TEXT NOT NULL,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tutorial_id) REFERENCES tutorials(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Tutorial assets (screenshots, videos, audio)
CREATE TABLE IF NOT EXISTS tutorial_assets (
  id TEXT PRIMARY KEY,
  tutorial_id TEXT NOT NULL,
  type TEXT CHECK (type IN ('screenshot', 'video', 'audio')),
  file_path TEXT NOT NULL,
  step_id TEXT,
  order_index INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tutorial_id) REFERENCES tutorials(id)
);

-- Questions bank
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  tutorial_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT CHECK (question_type IN ('multiple-choice', 'true-false', 'click-target')),
  options TEXT,
  correct_answer TEXT,
  feedback_correct TEXT,
  feedback_incorrect TEXT,
  points INTEGER DEFAULT 10,
  at_time INTEGER,
  order_index INTEGER,
  FOREIGN KEY (tutorial_id) REFERENCES tutorials(id)
);

-- Learning sessions (for analytics)
CREATE TABLE IF NOT EXISTS learning_sessions (
  id TEXT PRIMARY KEY,
  tutorial_id TEXT NOT NULL,
  user_id TEXT,
  anonymous_id TEXT,
  mode TEXT CHECK (mode IN ('show-me', 'guide-me', 'test-me')),
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  score INTEGER,
  max_score INTEGER,
  time_spent INTEGER,
  FOREIGN KEY (tutorial_id) REFERENCES tutorials(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Session events (detailed tracking)
CREATE TABLE IF NOT EXISTS session_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  step_id TEXT,
  data TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES learning_sessions(id)
);

-- API keys for integrations
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  permissions TEXT DEFAULT '["read"]',
  last_used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

-- Publish configurations
CREATE TABLE IF NOT EXISTS publish_configs (
  id TEXT PRIMARY KEY,
  tutorial_id TEXT NOT NULL,
  embed_enabled INTEGER DEFAULT 1,
  public_link_enabled INTEGER DEFAULT 0,
  password_protected INTEGER DEFAULT 0,
  password_hash TEXT,
  allowed_domains TEXT,
  scorm_enabled INTEGER DEFAULT 0,
  scorm_version TEXT DEFAULT '2004',
  lti_enabled INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tutorial_id) REFERENCES tutorials(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tutorials_org ON tutorials(org_id);
CREATE INDEX IF NOT EXISTS idx_tutorials_status ON tutorials(status);
CREATE INDEX IF NOT EXISTS idx_sessions_tutorial ON learning_sessions(tutorial_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_events_session ON session_events(session_id);
`;

export const SEED_DATA = `
-- Insert default admin user (password: admin123)
INSERT OR IGNORE INTO users (id, email, password_hash, name, role)
VALUES ('admin-001', 'admin@screenr.local', '$2b$10$wvkt1bO3xCF6ZFxEPwls7uymhQVmRkmIy0fqhqgOeAYTskemKTSGG', 'Admin User', 'admin');

-- Insert default organization
INSERT OR IGNORE INTO organizations (id, name, primary_color, secondary_color)
VALUES ('org-001', 'ScreenR Demo', '#4ecdc4', '#2d2d44');

-- Link admin to org
INSERT OR IGNORE INTO user_organizations (user_id, org_id, role)
VALUES ('admin-001', 'org-001', 'owner');

-- Insert demo Gmail tutorial
INSERT OR IGNORE INTO tutorials (id, org_id, title, description, target_url, status, duration, created_by, created_at, updated_at, published_at)
VALUES ('demo-gmail-compose', 'org-001', 'How to Compose a New Email in Gmail', 'Learn how to write and send a new email using Gmail.', 'https://mail.google.com', 'published', 45000, 'admin-001', '2024-12-07T10:00:00.000Z', '2024-12-07T10:00:00.000Z', '2024-12-07T10:00:00.000Z');

-- Insert demo tutorial question
INSERT OR IGNORE INTO questions (id, tutorial_id, question_text, question_type, options, correct_answer, feedback_correct, feedback_incorrect, points, at_time, order_index)
VALUES ('q-gmail-1', 'demo-gmail-compose', 'Where is the Compose button located in Gmail?', 'multiple-choice', '["Top right corner","Top left corner","Bottom of the page","In the settings menu"]', '1', 'Correct! The Compose button is in the top left corner of Gmail.', 'Not quite. The Compose button is located in the top left corner of Gmail.', 10, 8000, 0);

-- Insert publish config for demo
INSERT OR IGNORE INTO publish_configs (id, tutorial_id, embed_enabled, public_link_enabled)
VALUES ('pub-gmail-demo', 'demo-gmail-compose', 1, 1);
`;
