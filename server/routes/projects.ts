import { Router } from 'express';
import { z } from 'zod';
import { getAllProjects, getProjectById, createProject, updateProject, deleteProject, ensureDefaultProjectSeeded } from '../services/projectService.js';
import { getConversationsByProjectId, createConversation, getMessagesByConversationId } from '../services/conversationService.js';
import {
  getVersionsByProjectId,
  getVersionById,
  createDesignVersion,
  restoreDesignVersion,
  deleteDesignVersion,
} from '../services/versionService.js';
import { isTestMode } from '../db/client.js';

export const router = Router();

// Validation schemas
const idSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);

const designParametersSchema = z.object({
  materialId: z.string().max(50).optional(),
  diameter: z.number().positive().max(10000).optional(),
  length: z.number().positive().max(100000).optional(),
  torque: z.number().nonnegative().max(1000000).optional(),
  force: z.number().nonnegative().max(1000000).optional(),
  rpm: z.number().nonnegative().max(100000).optional(),
  safetyFactor: z.number().positive().max(100).optional(),
  temperature: z.number().min(-273).max(2000).optional(),
}).strict();

const createProjectSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(1000),
  type: z.string().max(50),
  status: z.string().max(50),
  progress: z.number().min(0).max(100),
  lastModified: z.string().datetime(),
  created: z.string().datetime(),
  parameters: designParametersSchema,
  tags: z.array(z.string().max(50)).max(20),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  type: z.string().max(50).optional(),
  status: z.string().max(50).optional(),
  progress: z.number().min(0).max(100).optional(),
  parameters: designParametersSchema.optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

// Get all projects
router.get('/', (req, res) => {
  let projects = getAllProjects();
  if (projects.length === 0 && !isTestMode()) {
    ensureDefaultProjectSeeded();
    projects = getAllProjects();
  }
  res.json(projects);
});

// Explicit sample workspace initialization
router.post('/init-sample', (req, res) => {
  const seeded = ensureDefaultProjectSeeded();
  const projects = getAllProjects();
  res.status(200).json({ seeded, count: projects.length, projects });
});

// Get single project
router.get('/:id', (req, res) => {
  const idResult = idSchema.safeParse(req.params.id);
  if (!idResult.success) return res.status(400).json({ error: 'Invalid project ID format' });

  const project = getProjectById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

// Create project
router.post('/', (req, res) => {
  const parseResult = createProjectSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid project data', details: parseResult.error.format() });
  }

  try {
    const project = createProject(parseResult.data);
    res.status(201).json(project);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update project
router.patch('/:id', (req, res) => {
  const idResult = idSchema.safeParse(req.params.id);
  if (!idResult.success) return res.status(400).json({ error: 'Invalid project ID format' });

  const parseResult = updateProjectSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid update data', details: parseResult.error.format() });
  }

  try {
    const project = updateProject(req.params.id, parseResult.data);
    res.json(project);
  } catch (error: any) {
    if (error.message === 'Project not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

// Delete project
router.delete('/:id', (req, res) => {
  const idResult = idSchema.safeParse(req.params.id);
  if (!idResult.success) return res.status(400).json({ error: 'Invalid project ID format' });

  deleteProject(req.params.id);
  res.status(204).send();
});

// Get conversations for project
router.get('/:id/conversations', (req, res) => {
  const idResult = idSchema.safeParse(req.params.id);
  if (!idResult.success) return res.status(400).json({ error: 'Invalid project ID format' });

  const project = getProjectById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  
  const conversations = getConversationsByProjectId(req.params.id);
  const fullConversations = conversations.map(c => ({
    ...c,
    messages: getMessagesByConversationId(c.id)
  }));
  
  res.json(fullConversations);
});

// Create conversation for project
router.post('/:id/conversations', (req, res) => {
  const idResult = idSchema.safeParse(req.params.id);
  if (!idResult.success) return res.status(400).json({ error: 'Invalid project ID format' });

  const convSchema = z.object({
    id: idSchema,
    title: z.string().min(1).max(200),
    createdAt: z.string().datetime().optional()
  });

  const parseResult = convSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid conversation data', details: parseResult.error.format() });
  }

  const { id: convId, title, createdAt } = parseResult.data;
  const project = getProjectById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const conversation = createConversation(convId, req.params.id, title, createdAt || new Date().toISOString());
  res.status(201).json({ ...conversation, messages: [] });
});

// ─── Design Version Endpoints ──────────────────────────────────────

const createVersionSchema = z.object({
  id: idSchema.optional(),
  label: z.string().min(1).max(200),
  notes: z.string().max(1000).optional(),
  version: z.string().max(50).optional(),
  author: z.string().max(100).optional(),
  parameters: designParametersSchema,
  materialId: z.string().max(100).optional(),
  materialName: z.string().max(200).optional(),
  factorOfSafety: z.number().nonnegative().optional(),
  status: z.enum(['pass', 'warning', 'fail']).optional(),
  calculationSummary: z.string().max(2000).optional(),
});

// List all versions for a project
router.get('/:id/versions', (req, res) => {
  const idResult = idSchema.safeParse(req.params.id);
  if (!idResult.success) return res.status(400).json({ error: 'Invalid project ID format' });

  const project = getProjectById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  try {
    const versions = getVersionsByProjectId(req.params.id);
    res.json(versions);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve design versions' });
  }
});

// Create a new design snapshot
router.post('/:id/versions', (req, res) => {
  const idResult = idSchema.safeParse(req.params.id);
  if (!idResult.success) return res.status(400).json({ error: 'Invalid project ID format' });

  const project = getProjectById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const parseResult = createVersionSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid version data', details: parseResult.error.format() });
  }

  try {
    const newVersion = createDesignVersion({
      ...parseResult.data,
      projectId: req.params.id,
    });
    res.status(201).json(newVersion);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create design version' });
  }
});

// Get a specific snapshot by ID
router.get('/:id/versions/:versionId', (req, res) => {
  const idResult = idSchema.safeParse(req.params.id);
  const versionIdResult = idSchema.safeParse(req.params.versionId);
  if (!idResult.success || !versionIdResult.success) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  const project = getProjectById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const version = getVersionById(req.params.id, req.params.versionId);
  if (!version) return res.status(404).json({ error: 'Version not found' });

  res.json(version);
});

// Restore a design snapshot
router.post('/:id/versions/:versionId/restore', (req, res) => {
  const idResult = idSchema.safeParse(req.params.id);
  const versionIdResult = idSchema.safeParse(req.params.versionId);
  if (!idResult.success || !versionIdResult.success) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  const project = getProjectById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  try {
    const result = restoreDesignVersion(req.params.id, req.params.versionId);
    res.json({
      message: 'Design version restored successfully',
      project: result.project,
      restoredVersion: result.restoredVersion,
    });
  } catch (err: any) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    res.status(400).json({ error: err.message || 'Failed to restore design version' });
  }
});

// Delete a design snapshot
router.delete('/:id/versions/:versionId', (req, res) => {
  const idResult = idSchema.safeParse(req.params.id);
  const versionIdResult = idSchema.safeParse(req.params.versionId);
  if (!idResult.success || !versionIdResult.success) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  const project = getProjectById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const deleted = deleteDesignVersion(req.params.id, req.params.versionId);
  if (!deleted) {
    return res.status(404).json({ error: 'Version not found' });
  }

  res.status(204).send();
});

