import { DatabaseSync } from 'node:sqlite';
import { db as defaultDb } from '../db/client.js';

export type DocumentType =
  | 'DRAWING_SVG'
  | 'DRAWING_PNG'
  | 'REPORT_JSON'
  | 'REPORT_PDF'
  | 'MANUFACTURING_SPEC';

export type DocumentStatus = 'CURRENT' | 'OUTDATED' | 'SUPERSEDED' | 'DRAFT';

export interface EngineeringDocument {
  id: string;
  projectId: string;
  revisionId?: string;
  documentType: DocumentType;
  title: string;
  sourceRevision: string;
  isStale: boolean;
  status: DocumentStatus;
  fileLocation?: string;
  metadata: Record<string, any>;
  content?: string;
  createdAt: string;
}

export class DocumentService {
  private db: DatabaseSync;

  constructor(database: DatabaseSync = defaultDb) {
    this.db = database;
  }

  /**
   * Persists an engineering document record to SQLite.
   */
  public saveDocument(doc: Omit<EngineeringDocument, 'createdAt'> & { createdAt?: string }): EngineeringDocument {
    const fullDoc: EngineeringDocument = {
      ...doc,
      isStale: doc.isStale ?? false,
      status: doc.status ?? 'CURRENT',
      metadata: doc.metadata || {},
      createdAt: doc.createdAt || new Date().toISOString(),
    };

    const stmt = this.db.prepare(`
      INSERT INTO engineering_documents (
        id, projectId, revisionId, documentType, title, sourceRevision,
        isStale, status, fileLocation, metadata, content, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        sourceRevision = excluded.sourceRevision,
        isStale = excluded.isStale,
        status = excluded.status,
        fileLocation = excluded.fileLocation,
        metadata = excluded.metadata,
        content = excluded.content
    `);

    stmt.run(
      fullDoc.id,
      fullDoc.projectId,
      fullDoc.revisionId || null,
      fullDoc.documentType,
      fullDoc.title,
      fullDoc.sourceRevision,
      fullDoc.isStale ? 1 : 0,
      fullDoc.status,
      fullDoc.fileLocation || null,
      JSON.stringify(fullDoc.metadata),
      fullDoc.content || null,
      fullDoc.createdAt
    );

    return fullDoc;
  }

  /**
   * Retrieves all engineering documents for a project, optionally filtered by type.
   */
  public getDocumentsByProject(projectId: string, type?: DocumentType): EngineeringDocument[] {
    let sql = 'SELECT * FROM engineering_documents WHERE projectId = ?';
    const params: any[] = [projectId];

    if (type) {
      sql += ' AND documentType = ?';
      params.push(type);
    }
    sql += ' ORDER BY createdAt DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(this.mapRowToDocument);
  }

  /**
   * Retrieves a document by its unique ID.
   */
  public getDocumentById(id: string): EngineeringDocument | null {
    const row = this.db.prepare('SELECT * FROM engineering_documents WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapRowToDocument(row);
  }

  /**
   * Marks all existing documents for a project as stale when design parameters change.
   * Phase 9 Requirement: Revision & Document Consistency.
   */
  public markProjectDocumentsStale(projectId: string): number {
    const info = this.db.prepare(`
      UPDATE engineering_documents
      SET isStale = 1, status = 'OUTDATED'
      WHERE projectId = ? AND isStale = 0
    `).run(projectId);

    return (info as any).changes || 0;
  }

  /**
   * Retrieves the latest current document of a specific type.
   */
  public getLatestDocument(projectId: string, type: DocumentType): EngineeringDocument | null {
    const row = this.db.prepare(`
      SELECT * FROM engineering_documents
      WHERE projectId = ? AND documentType = ?
      ORDER BY createdAt DESC LIMIT 1
    `).get(projectId, type) as any;

    if (!row) return null;
    return this.mapRowToDocument(row);
  }

  private mapRowToDocument(row: any): EngineeringDocument {
    return {
      id: row.id,
      projectId: row.projectId,
      revisionId: row.revisionId || undefined,
      documentType: row.documentType as DocumentType,
      title: row.title,
      sourceRevision: row.sourceRevision,
      isStale: row.isStale === 1,
      status: row.status as DocumentStatus,
      fileLocation: row.fileLocation || undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      content: row.content || undefined,
      createdAt: row.createdAt,
    };
  }
}

export const documentService = new DocumentService();
