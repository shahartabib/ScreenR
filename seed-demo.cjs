const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('./data/screenr.db');

// Read project.json
const projectPath = path.join(__dirname, 'output', 'projects', 'demo-gmail-compose', 'project.json');
const projectData = fs.readFileSync(projectPath, 'utf8');

// Insert tutorial
db.prepare(`
  INSERT OR REPLACE INTO tutorials (id, org_id, title, description, target_url, status, duration, created_by, created_at, updated_at, published_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  'demo-gmail-compose',
  'org-001',
  'How to Compose a New Email in Gmail',
  'Learn how to write and send a new email using Gmail.',
  'https://mail.google.com',
  'published',
  45000,
  'admin-001',
  '2024-12-07T10:00:00.000Z',
  '2024-12-07T10:00:00.000Z',
  '2024-12-07T10:00:00.000Z'
);

console.log('Tutorial inserted');

// Insert tutorial version with full project data
db.prepare(`
  INSERT OR REPLACE INTO tutorial_versions (id, tutorial_id, version, project_data, created_by, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`).run(
  'ver-gmail-001',
  'demo-gmail-compose',
  1,
  projectData,
  'admin-001',
  '2024-12-07T10:00:00.000Z'
);

console.log('Tutorial version inserted');

// Insert question
db.prepare(`
  INSERT OR REPLACE INTO questions (id, tutorial_id, question_text, question_type, options, correct_answer, feedback_correct, feedback_incorrect, points, at_time, order_index)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  'q-gmail-1',
  'demo-gmail-compose',
  'Where is the Compose button located in Gmail?',
  'multiple-choice',
  JSON.stringify(['Top right corner', 'Top left corner', 'Bottom of the page', 'In the settings menu']),
  '1',
  'Correct! The Compose button is in the top left corner of Gmail.',
  'Not quite. The Compose button is located in the top left corner of Gmail.',
  10,
  8000,
  0
);

console.log('Question inserted');

// Insert publish config
db.prepare(`
  INSERT OR REPLACE INTO publish_configs (id, tutorial_id, embed_enabled, public_link_enabled)
  VALUES (?, ?, ?, ?)
`).run('pub-gmail-demo', 'demo-gmail-compose', 1, 1);

console.log('Publish config inserted');

// Verify
const tutorials = db.prepare('SELECT id, title, status FROM tutorials').all();
console.log('Tutorials in database:', tutorials);

db.close();
console.log('Done!');
