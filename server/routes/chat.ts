import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { processChatRequest, getAIProviderStatus } from '../services/llm.js';
import { getProjectById } from '../services/projectService.js';
import { createConversation, getConversationById, addMessage } from '../services/conversationService.js';

const router = Router();

// Endpoint to retrieve active AI Provider status
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const force = req.query.force === 'true';
    const status = await getAIProviderStatus(force);
    res.json(status);
  } catch (err) {
    next(err);
  }
});

const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});

const userMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
  timestamp: z.string(),
}).passthrough(); // allows other fields

const chatRequestSchema = z.object({
  projectId: z.string().optional(),
  conversationId: z.string().optional(),
  userMessage: userMessageSchema.optional(),
  messages: z.array(chatMessageSchema).min(1).refine((arr) => arr.some((m) => m.content.trim().length > 0), {
    message: 'At least one non-empty message is required',
  }),
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = chatRequestSchema.safeParse(req.body);
    
    if (!result.success) {
      res.status(400).json({ error: 'Invalid request structure', details: result.error.format() });
      return;
    }

    const { projectId, conversationId, userMessage, messages } = result.data;
    let project = null;
    if (projectId) {
      project = getProjectById(projectId);
    }
    
    // 1. Auto-create conversation if necessary and persist user message
    if (projectId && conversationId && userMessage) {
      if (project) {
        let conv = getConversationById(conversationId);
        if (!conv) {
          // Auto-create
          createConversation(conversationId, projectId, 'Copilot Chat', new Date().toISOString());
        }
        // Save user message
        addMessage(conversationId, userMessage);
      }
    }

    console.log('[API] LLM/Copilot request received');
    const cleanMessages = messages.filter((m) => m.content.trim().length > 0);
    const responseData = await processChatRequest(
      cleanMessages,
      project ? { ...project.parameters, id: project.id, projectId: project.id } : (projectId ? { id: projectId, projectId } : undefined)
    );

    // If a project was created during this request, update effective IDs
    let effectiveProjectId = projectId;
    let effectiveConversationId = conversationId;
    if (!effectiveProjectId && responseData?.action?.type === 'project_created') {
      effectiveProjectId = responseData.action.project.id;
      effectiveConversationId = `thread-${effectiveProjectId}-default`;
      if (userMessage) {
        try {
          addMessage(effectiveConversationId, userMessage);
        } catch (err) {
          console.warn('Failed to persist user message in created project thread:', err);
        }
      }
    }
    
    // 2. Persist assistant message
    if (effectiveProjectId && effectiveConversationId && responseData && responseData.message) {
      const p = getProjectById(effectiveProjectId);
      if (p) {
        let msgType = 'general';
        let structuredData = undefined;
        if (responseData.toolsUsed && responseData.toolsUsed.length > 0) {
          msgType = 'calculation';
          structuredData = [
            { label: 'Tools Used', value: responseData.toolsUsed.join(', ') }
          ];
        }

        const assistantMsgToSave = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: responseData.message.content,
          timestamp: new Date().toISOString(),
          type: msgType,
          structuredData,
          engineeringResult: responseData.engineeringResult || null,
          operationState: responseData.operationState,
          toolExecutionLogs: responseData.toolExecutionLogs,
          requirements: responseData.requirements,
          proposedChange: responseData.proposedChange,
        };
        addMessage(effectiveConversationId, assistantMsgToSave);
      }
    }

    res.json(responseData);
  } catch (error) {
    next(error);
  }
});

export { router as chatRouter };
