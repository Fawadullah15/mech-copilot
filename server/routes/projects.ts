import { Router } from 'express';
import { z } from 'zod';
import { getAllProjects, getProjectById, createProject, updateProject, deleteProject } from '../services/projectService.js';
import { getConversationsByProjectId, createConversation, getMessagesByConversationId } from '../services/conversationService.js';

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
  const projects = getAllProjects();
  res.json(projects);
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
