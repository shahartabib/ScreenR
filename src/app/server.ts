/**
 * ScreenR Studio Server
 * API server for the recording and editing application
 * Supports projects with multiple tutorials
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { chromium } from 'playwright';
import { detectElement, generateTranslations } from '../core/element-detector.js';
import {
  StudioProject,
  Tutorial,
  TutorialStep,
  RecordingSession,
  CreateProjectRequest,
  CreateTutorialRequest,
  ProjectListItem,
  TutorialListItem,
} from '../types/studio.js';

const app = express();
const PORT = process.env.PORT || 3005;

// Directories
const DATA_DIR = './data';
const PROJECTS_DIR = './data/projects';
const RECORDINGS_DIR = './output/recordings';
const SCREENSHOTS_DIR = './output/screenshots';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'src/app')));
app.use('/data', express.static(path.join(process.cwd(), 'data')));
app.use('/output', express.static(path.join(process.cwd(), 'output')));

// Ensure directories exist
[DATA_DIR, PROJECTS_DIR, RECORDINGS_DIR, SCREENSHOTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// In-memory storage for recording sessions
const recordingSessions: Map<string, RecordingSession> = new Map();

// ============================================
// PROJECT API
// ============================================

// Get all projects
app.get('/api/projects', (req, res) => {
  try {
    const projects: ProjectListItem[] = [];

    if (fs.existsSync(PROJECTS_DIR)) {
      const projectDirs = fs.readdirSync(PROJECTS_DIR);

      for (const dir of projectDirs) {
        const projectPath = path.join(PROJECTS_DIR, dir, 'project.json');
        if (fs.existsSync(projectPath)) {
          const project: StudioProject = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));

          // Find thumbnail from first tutorial's first step
          let thumbnail: string | undefined;
          if (project.tutorials.length > 0 && project.tutorials[0].steps.length > 0) {
            const firstStep = project.tutorials[0].steps[0];
            if (firstStep.screenshotFile) {
              thumbnail = `/data/projects/${project.id}/screenshots/${firstStep.screenshotFile}`;
            }
          }

          projects.push({
            id: project.id,
            name: project.name,
            description: project.description,
            targetUrl: project.targetUrl,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            tutorialCount: project.tutorials.length,
            thumbnail,
          });
        }
      }
    }

    // Sort by update date descending
    projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create new project
app.post('/api/projects', (req, res) => {
  try {
    const { name, description, targetUrl, settings }: CreateProjectRequest = req.body;

    if (!name || !targetUrl) {
      return res.status(400).json({ error: 'Missing required fields: name and targetUrl' });
    }

    const projectId = uuidv4();
    const now = new Date().toISOString();

    const project: StudioProject = {
      id: projectId,
      name,
      description,
      targetUrl,
      createdAt: now,
      updatedAt: now,
      tutorials: [],
      settings: {
        defaultLanguage: 'he',
        availableLanguages: ['he', 'en', 'ar'],
        viewport: { width: 1280, height: 720 },
        ...settings,
      },
    };

    // Create project directory
    const projectDir = path.join(PROJECTS_DIR, projectId);
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'screenshots'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'videos'), { recursive: true });

    // Save project
    fs.writeFileSync(path.join(projectDir, 'project.json'), JSON.stringify(project, null, 2));

    res.json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single project
app.get('/api/projects/:id', (req, res) => {
  try {
    const projectPath = path.join(PROJECTS_DIR, req.params.id, 'project.json');

    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update project
app.put('/api/projects/:id', (req, res) => {
  try {
    const projectPath = path.join(PROJECTS_DIR, req.params.id, 'project.json');

    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project: StudioProject = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
    const updates = req.body;

    // Update allowed fields
    if (updates.name) project.name = updates.name;
    if (updates.description !== undefined) project.description = updates.description;
    if (updates.targetUrl) project.targetUrl = updates.targetUrl;
    if (updates.settings) project.settings = { ...project.settings, ...updates.settings };

    project.updatedAt = new Date().toISOString();

    fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete project
app.delete('/api/projects/:id', (req, res) => {
  try {
    const projectDir = path.join(PROJECTS_DIR, req.params.id);

    if (!fs.existsSync(projectDir)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Remove directory recursively
    fs.rmSync(projectDir, { recursive: true });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TUTORIAL API
// ============================================

// Get tutorials for a project
app.get('/api/projects/:projectId/tutorials', (req, res) => {
  try {
    const projectPath = path.join(PROJECTS_DIR, req.params.projectId, 'project.json');

    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project: StudioProject = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));

    const tutorials: TutorialListItem[] = project.tutorials.map(t => {
      let thumbnail: string | undefined;
      if (t.steps.length > 0 && t.steps[0].screenshotFile) {
        thumbnail = `/data/projects/${project.id}/screenshots/${t.steps[0].screenshotFile}`;
      }

      return {
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        createdAt: t.createdAt,
        duration: t.duration,
        stepCount: t.steps.length,
        thumbnail,
      };
    });

    res.json(tutorials);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create tutorial (start recording)
app.post('/api/projects/:projectId/tutorials', async (req, res) => {
  try {
    const { title, description, prompt, url, credentials }: CreateTutorialRequest = req.body;
    const projectId = req.params.projectId;

    const projectPath = path.join(PROJECTS_DIR, projectId, 'project.json');
    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project: StudioProject = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));

    if (!title || !prompt) {
      return res.status(400).json({ error: 'Missing required fields: title and prompt' });
    }

    // Create tutorial
    const tutorialId = uuidv4();
    const now = new Date().toISOString();

    const tutorial: Tutorial = {
      id: tutorialId,
      title,
      description,
      prompt,
      createdAt: now,
      updatedAt: now,
      duration: 0,
      steps: [],
      status: 'recording',
    };

    // Add to project
    project.tutorials.push(tutorial);
    project.updatedAt = now;
    fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));

    // Create recording session
    const sessionId = uuidv4();
    const session: RecordingSession = {
      id: sessionId,
      projectId,
      tutorialId,
      status: 'pending',
      progress: 0,
      message: 'מתחיל הקלטה...',
      prompt,
      url: url || project.targetUrl,
      steps: [],
      startedAt: now,
    };

    recordingSessions.set(sessionId, session);

    // Start recording in background
    startRecording(session, project, credentials);

    res.json({ sessionId, tutorialId, status: 'started' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single tutorial
app.get('/api/projects/:projectId/tutorials/:tutorialId', (req, res) => {
  try {
    const projectPath = path.join(PROJECTS_DIR, req.params.projectId, 'project.json');

    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project: StudioProject = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
    const tutorial = project.tutorials.find(t => t.id === req.params.tutorialId);

    if (!tutorial) {
      return res.status(404).json({ error: 'Tutorial not found' });
    }

    res.json(tutorial);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update tutorial
app.put('/api/projects/:projectId/tutorials/:tutorialId', (req, res) => {
  try {
    const projectPath = path.join(PROJECTS_DIR, req.params.projectId, 'project.json');

    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project: StudioProject = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
    const tutorialIndex = project.tutorials.findIndex(t => t.id === req.params.tutorialId);

    if (tutorialIndex === -1) {
      return res.status(404).json({ error: 'Tutorial not found' });
    }

    const updates = req.body;
    const tutorial = project.tutorials[tutorialIndex];

    if (updates.title) tutorial.title = updates.title;
    if (updates.description !== undefined) tutorial.description = updates.description;

    tutorial.updatedAt = new Date().toISOString();
    project.updatedAt = tutorial.updatedAt;

    fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));
    res.json(tutorial);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete tutorial
app.delete('/api/projects/:projectId/tutorials/:tutorialId', (req, res) => {
  try {
    const projectPath = path.join(PROJECTS_DIR, req.params.projectId, 'project.json');

    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project: StudioProject = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
    const tutorialIndex = project.tutorials.findIndex(t => t.id === req.params.tutorialId);

    if (tutorialIndex === -1) {
      return res.status(404).json({ error: 'Tutorial not found' });
    }

    // Remove tutorial
    project.tutorials.splice(tutorialIndex, 1);
    project.updatedAt = new Date().toISOString();

    fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// STEP API
// ============================================

// Update step
app.put('/api/projects/:projectId/tutorials/:tutorialId/steps/:stepId', (req, res) => {
  try {
    const { projectId, tutorialId, stepId } = req.params;
    const updates = req.body;

    const projectPath = path.join(PROJECTS_DIR, projectId, 'project.json');
    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project: StudioProject = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
    const tutorial = project.tutorials.find(t => t.id === tutorialId);

    if (!tutorial) {
      return res.status(404).json({ error: 'Tutorial not found' });
    }

    const step = tutorial.steps.find(s => s.id === stepId);
    if (!step) {
      return res.status(404).json({ error: 'Step not found' });
    }

    // Update step
    if (updates.elementInfo) {
      step.elementInfo = { ...step.elementInfo, ...updates.elementInfo };
    }
    if (updates.position) {
      step.position = { ...step.position, ...updates.position };
    }
    if (updates.translations) {
      step.translations = { ...step.translations, ...updates.translations };
    }
    if (updates.highlightType) {
      step.highlightType = updates.highlightType;
    }

    tutorial.updatedAt = new Date().toISOString();
    project.updatedAt = tutorial.updatedAt;

    fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));
    res.json(step);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete step
app.delete('/api/projects/:projectId/tutorials/:tutorialId/steps/:stepId', (req, res) => {
  try {
    const { projectId, tutorialId, stepId } = req.params;

    const projectPath = path.join(PROJECTS_DIR, projectId, 'project.json');
    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project: StudioProject = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
    const tutorial = project.tutorials.find(t => t.id === tutorialId);

    if (!tutorial) {
      return res.status(404).json({ error: 'Tutorial not found' });
    }

    const stepIndex = tutorial.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) {
      return res.status(404).json({ error: 'Step not found' });
    }

    tutorial.steps.splice(stepIndex, 1);

    // Reorder remaining steps
    tutorial.steps.forEach((s, i) => {
      s.order = i;
    });

    tutorial.updatedAt = new Date().toISOString();
    project.updatedAt = tutorial.updatedAt;

    fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// RECORDING API
// ============================================

// Get recording session status
app.get('/api/recording/:sessionId', (req, res) => {
  const session = recordingSessions.get(req.params.sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Recording session not found' });
  }

  res.json(session);
});

// ============================================
// RECORDING LOGIC
// ============================================

async function startRecording(
  session: RecordingSession,
  project: StudioProject,
  credentials?: { username: string; password: string }
) {
  try {
    const updateProgress = (progress: number, message: string) => {
      session.progress = progress;
      session.message = message;
    };

    session.status = 'recording';
    updateProgress(5, 'מפעיל דפדפן...');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
      viewport: project.settings.viewport,
      recordVideo: {
        dir: RECORDINGS_DIR,
        size: project.settings.viewport,
      },
    });

    const page = await context.newPage();
    const startTime = Date.now();
    let stepCounter = 0;

    updateProgress(10, 'פותח את האתר...');
    await page.goto(session.url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Handle login if credentials provided
    if (credentials?.username && credentials?.password) {
      updateProgress(15, 'מתחבר למערכת...');

      const usernameSelectors = ['input[type="email"]', 'input[type="text"][name*="user"]', 'input[name="username"]', '#username', '#email'];
      const passwordSelectors = ['input[type="password"]', '#password'];

      for (const selector of usernameSelectors) {
        const field = await page.$(selector);
        if (field && await field.isVisible()) {
          await field.fill(credentials.username);
          break;
        }
      }

      for (const selector of passwordSelectors) {
        const field = await page.$(selector);
        if (field && await field.isVisible()) {
          await field.fill(credentials.password);
          break;
        }
      }

      const submitBtn = await page.$('button[type="submit"], input[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForLoadState('networkidle');
      }
    }

    updateProgress(25, 'מנתח את הדף ומזהה אלמנטים...');

    const formFields = await page.$$('input, button[type="submit"], select, textarea');
    const totalFields = formFields.length;
    let processedFields = 0;

    const projectScreenshotsDir = path.join(PROJECTS_DIR, project.id, 'screenshots');

    for (const field of formFields) {
      const fieldType = await field.getAttribute('type');
      const fieldTag = await field.evaluate(el => el.tagName.toLowerCase());

      if (fieldType === 'hidden') continue;

      const isVisible = await field.isVisible();
      if (!isVisible) continue;

      const detected = await detectElement(page, field, 'click');
      if (!detected) continue;

      processedFields++;
      const fieldProgress = 25 + Math.floor((processedFields / totalFields) * 40);
      updateProgress(fieldProgress, `מעבד שדה: ${detected.info.fieldName}`);

      await field.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      // Take screenshot
      stepCounter++;
      const screenshotFile = `${session.tutorialId}_step${stepCounter.toString().padStart(3, '0')}.png`;
      const screenshotPath = path.join(projectScreenshotsDir, screenshotFile);
      await page.screenshot({ path: screenshotPath });

      const timestamp = Date.now() - startTime;

      // Perform action based on field type
      let action = 'click';
      let value: string | undefined;

      if (fieldTag === 'input' && (fieldType === 'email' || fieldType === 'text')) {
        await field.click();
        await page.waitForTimeout(300);

        value = fieldType === 'email' ? 'demo@example.com' : 'טקסט לדוגמה';
        await field.fill(value);
        action = 'type';

        await page.waitForTimeout(500);
      } else if (fieldTag === 'button' || fieldType === 'submit') {
        await field.hover();
        action = 'hover';
        await page.waitForTimeout(500);
      } else if (fieldTag === 'select') {
        await field.click();
        action = 'click';
        await page.waitForTimeout(300);
        await page.keyboard.press('Escape');
      }

      // Re-detect with actual action
      const detectedElement = await detectElement(page, field, action, value);
      if (detectedElement) {
        const translations = generateTranslations(detectedElement.info);

        const step: TutorialStep = {
          id: `step-${stepCounter}`,
          order: stepCounter - 1,
          timestamp,
          duration: 2000,
          elementInfo: detectedElement.info,
          position: {
            x: detectedElement.x,
            y: detectedElement.y,
            width: Math.max(detectedElement.width, 5),
            height: Math.max(detectedElement.height, 3),
          },
          screenshotFile,
          highlightType: action === 'type' ? 'rectangle' : 'pulse',
          translations,
        };

        session.steps.push(step);
      }
    }

    updateProgress(70, 'מסיים הקלטה...');
    await page.waitForTimeout(1000);

    await page.close();
    const video = page.video();
    let videoPath: string | null = null;

    if (video) {
      videoPath = await video.path();
      session.videoPath = videoPath;
    }

    await context.close();
    await browser.close();

    // Update project with tutorial data
    updateProgress(85, 'שומר את הפרויקט...');

    const projectPath = path.join(PROJECTS_DIR, project.id, 'project.json');
    const updatedProject: StudioProject = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));

    const tutorialIndex = updatedProject.tutorials.findIndex(t => t.id === session.tutorialId);
    if (tutorialIndex !== -1) {
      const tutorial = updatedProject.tutorials[tutorialIndex];
      tutorial.steps = session.steps;
      tutorial.duration = Date.now() - startTime;
      tutorial.status = 'ready';
      tutorial.updatedAt = new Date().toISOString();

      if (videoPath) {
        // Copy video to project folder
        const videoFilename = `${session.tutorialId}.webm`;
        const destVideoPath = path.join(PROJECTS_DIR, project.id, 'videos', videoFilename);
        fs.copyFileSync(videoPath, destVideoPath);
        tutorial.videoFile = videoFilename;
      }

      updatedProject.updatedAt = tutorial.updatedAt;
      fs.writeFileSync(projectPath, JSON.stringify(updatedProject, null, 2));
    }

    session.status = 'complete';
    session.completedAt = new Date().toISOString();
    updateProgress(100, 'הושלם!');

  } catch (error: any) {
    console.error('Recording error:', error);
    session.status = 'error';
    session.error = error.message;
    session.message = 'שגיאה: ' + error.message;

    // Update tutorial status to error
    try {
      const projectPath = path.join(PROJECTS_DIR, session.projectId, 'project.json');
      if (fs.existsSync(projectPath)) {
        const project: StudioProject = JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
        const tutorial = project.tutorials.find(t => t.id === session.tutorialId);
        if (tutorial) {
          tutorial.status = 'error';
          fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));
        }
      }
    } catch (e) {
      console.error('Failed to update tutorial status:', e);
    }
  }
}

// Serve the app
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'src/app/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║                                                   ║
  ║   🎬 ScreenR Studio Server                        ║
  ║                                                   ║
  ║   Server running at: http://localhost:${PORT}       ║
  ║                                                   ║
  ║   Projects stored in: ${PROJECTS_DIR}                  ║
  ║                                                   ║
  ╚═══════════════════════════════════════════════════╝
  `);
});

export default app;
