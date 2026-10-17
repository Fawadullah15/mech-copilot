import { db, resetDatabase } from '../db/client.js';
import { createProject } from '../services/projectService.js';
import { createConversation, addMessage } from '../services/conversationService.js';

// Seed data
const projectsSeed = [
  {
    id: 'proj-gearbox',
    name: 'Gearbox Assembly',
    description: 'Two-stage spur gearbox for industrial conveyor drive system. Includes input shaft, intermediate shaft, output shaft, and housing design.',
    type: 'Power Transmission',
    status: 'In Progress',
    progress: 72,
    lastModified: '2026-09-17T06:30:00Z',
    created: '2026-08-15T09:00:00Z',
    parameters: {
      materialId: 'aisi-4140',
      diameter: 45,
      length: 320,
      torque: 500,
      force: 12000,
      rpm: 1450,
      safetyFactor: 2.0,
      temperature: 60,
    },
    tags: ['gearbox', 'power-transmission', 'industrial'],
  }
];

const initialMessages = [
  {
    id: 'msg-sys-welcome',
    role: 'assistant',
    content: "Hello! I'm the Mechanical Engineering Copilot. How can I help you with your design today?",
    timestamp: new Date().toISOString(),
    type: 'general',
  }
];

try {
  console.log('Resetting database...');
  resetDatabase();

  console.log('Seeding projects...');
  for (const proj of projectsSeed) {
    createProject(proj);
    const threadId = `thread-${proj.id}-default`;
    createConversation(threadId, proj.id, 'Shaft Sizing & Verification', proj.lastModified);
    
    // Add initial AI context message
    addMessage(threadId, {
      ...initialMessages[0],
      id: `init-${proj.id}`,
      content: `Initialized Copilot context for **${proj.name}** (${proj.type}). Parameters loaded: Torque=${proj.parameters.torque} Nm, RPM=${proj.parameters.rpm}, Material=${proj.parameters.materialId}.`,
      timestamp: proj.lastModified
    });
  }

  console.log('✅ Database seeded successfully.');
} catch (error) {
  console.error('❌ Failed to seed database:', error);
}
