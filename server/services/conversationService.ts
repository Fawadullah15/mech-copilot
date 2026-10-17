import { db } from '../db/client.js';

export function getConversationsByProjectId(projectId: string) {
  const stmt = db.prepare('SELECT * FROM conversations WHERE projectId = ? ORDER BY createdAt ASC');
  return stmt.all(projectId) as any[];
}

export function getConversationById(id: string) {
  const stmt = db.prepare('SELECT * FROM conversations WHERE id = ?');
  return stmt.get(id) as any;
}

export function createConversation(id: string, projectId: string, title: string, createdAt: string) {
  const stmt = db.prepare('INSERT INTO conversations (id, projectId, title, createdAt) VALUES (?, ?, ?, ?)');
  stmt.run(id, projectId, title, createdAt);
  return { id, projectId, title, createdAt };
}

export function getMessagesByConversationId(conversationId: string) {
  const stmt = db.prepare('SELECT * FROM messages WHERE conversationId = ? ORDER BY timestamp ASC');
  const rows = stmt.all(conversationId) as any[];
  return rows.map(mapMessageFromDb);
}

export function addMessage(conversationId: string, message: any) {
  const stmt = db.prepare(`
    INSERT INTO messages (id, conversationId, role, content, timestamp, type, structuredData, actions, reasoningChain, saved, engineeringResult)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    message.id,
    conversationId,
    message.role,
    message.content,
    message.timestamp,
    message.type || null,
    message.structuredData ? JSON.stringify(message.structuredData) : null,
    message.actions ? JSON.stringify(message.actions) : null,
    message.reasoningChain ? JSON.stringify(message.reasoningChain) : null,
    message.saved ? 1 : 0,
    message.engineeringResult ? JSON.stringify(message.engineeringResult) : null
  );
  return message;
}

function mapMessageFromDb(row: any) {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    timestamp: row.timestamp,
    ...(row.type ? { type: row.type } : {}),
    ...(row.structuredData ? { structuredData: JSON.parse(row.structuredData) } : {}),
    ...(row.actions ? { actions: JSON.parse(row.actions) } : {}),
    ...(row.reasoningChain ? { reasoningChain: JSON.parse(row.reasoningChain) } : {}),
    ...(row.saved ? { saved: true } : {}),
    ...(row.engineeringResult ? { engineeringResult: JSON.parse(row.engineeringResult) } : {})
  };
}
