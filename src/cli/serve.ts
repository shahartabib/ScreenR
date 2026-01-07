/**
 * Simple server to view generated tutorials
 */

import express from 'express';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3000;
const PROJECTS_DIR = './output/projects';

// Serve static files from project directories
app.use('/projects', express.static(PROJECTS_DIR));

// List all projects
app.get('/', (req, res) => {
  let projects: string[] = [];

  if (fs.existsSync(PROJECTS_DIR)) {
    projects = fs.readdirSync(PROJECTS_DIR).filter((f) => {
      const projectPath = path.join(PROJECTS_DIR, f);
      return fs.statSync(projectPath).isDirectory();
    });
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>ScreenR - Tutorial Projects</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e;
      color: #fff;
      padding: 40px;
    }
    h1 { color: #4ecdc4; }
    .project-list {
      display: grid;
      gap: 20px;
      max-width: 800px;
    }
    .project-card {
      background: #2d2d44;
      padding: 24px;
      border-radius: 12px;
      text-decoration: none;
      color: #fff;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .project-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(0,0,0,0.3);
    }
    .project-card h3 {
      margin: 0 0 8px 0;
      color: #4ecdc4;
    }
    .project-card p {
      margin: 0;
      opacity: 0.7;
      font-size: 14px;
    }
    .empty {
      color: #888;
      font-style: italic;
    }
  </style>
</head>
<body>
  <h1>🎬 ScreenR Projects</h1>
  <div class="project-list">
    ${
      projects.length > 0
        ? projects
            .map((id) => {
              const projectJsonPath = path.join(PROJECTS_DIR, id, 'project.json');
              let title = id;
              let description = '';

              if (fs.existsSync(projectJsonPath)) {
                try {
                  const project = JSON.parse(fs.readFileSync(projectJsonPath, 'utf-8'));
                  title = project.title || id;
                  description = project.description || '';
                } catch {}
              }

              return `
                <a href="/projects/${id}/index.html" class="project-card">
                  <h3>${title}</h3>
                  <p>${description}</p>
                  <p style="margin-top: 8px; font-size: 12px; opacity: 0.5;">ID: ${id}</p>
                </a>
              `;
            })
            .join('')
        : '<p class="empty">No projects yet. Run `npm run demo` to create one.</p>'
    }
  </div>
</body>
</html>
  `;

  res.send(html);
});

app.listen(PORT, () => {
  console.log(`\n🎬 ScreenR Server running at http://localhost:${PORT}`);
  console.log(`\n   View your tutorial projects in the browser.\n`);
});
