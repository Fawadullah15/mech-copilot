import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { processChatRequest } from '../services/llm.js';
import { getProjectById } from '../services/projectService.js';
import { createConversation, getConversationById, addMessage } from '../services/conversationService.js';

const router = Router();

const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1),
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
  messages: z.array(chatMessageSchema).min(1),
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
    const responseData = await processChatRequest(messages, project?.parameters);
    
    // 2. Persist assistant message
    if (projectId && conversationId && responseData && responseData.message) {
      const project = getProjectById(projectId);
      if (project) {
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
          engineeringResult: responseData.engineeringResult || null
        };
        addMessage(conversationId, assistantMsgToSave);
      }
    }

    res.json(responseData);
  } catch (error) {
    next(error);
  }
});

export { router as chatRouter };
