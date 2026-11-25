import { API_BASE_URL } from './chatApi';
import type {
  BOMHeader,
  BOMWithLines,
  BOMLineWithComponent,
  BOMValidationResult,
  ExplodedBOMResult,
  BOMStatus,
  SupplyClassification,
  PreferredSourcing,
} from '../types/manufacturing';

export interface BOMQueryFilters {
  parent_product_id?: string;
  status?: BOMStatus;
  search?: string;
}

export interface CreateBOMPayload {
  parent_product_id: string;
  parent_revision_id?: string | null;
  bom_code: string;
  alt_code?: string;
  base_quantity?: number;
  unit?: string;
  notes?: string;
}

export interface UpdateBOMPayload {
  alt_code?: string;
  base_quantity?: number;
  unit?: string;
  notes?: string;
}

export interface AddBOMLinePayload {
  line_number?: number;
  component_product_id: string;
  component_revision_id?: string | null;
  quantity: number;
  unit: string;
  scrap_percentage?: number;
  supply_classification: SupplyClassification;
  preferred_sourcing?: PreferredSourcing;
  notes?: string;
}

export interface UpdateBOMLinePayload {
  line_number?: number;
  component_revision_id?: string | null;
  quantity?: number;
  unit?: string;
  scrap_percentage?: number;
  supply_classification?: SupplyClassification;
  preferred_sourcing?: PreferredSourcing;
  notes?: string;
}

async function parseJsonResponse<T>(res: Response, fallbackErrMsg: string): Promise<T> {
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('text/html')) {
    throw new Error('Backend returned HTML (endpoint not found or offline)');
  }
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || fallbackErrMsg);
  }
  return res.json();
}

export async function fetchBOMs(filters: BOMQueryFilters = {}): Promise<BOMHeader[]> {
  const params = new URLSearchParams();
  if (filters.parent_product_id) params.append('parent_product_id', filters.parent_product_id);
  if (filters.status) params.append('status', filters.status);
  if (filters.search) params.append('search', filters.search);

  const url = `${API_BASE_URL}/api/boms${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url);
  const data = await parseJsonResponse<{ count: number; boms: BOMHeader[] }>(res, 'Failed to fetch BOMs');
  return data.boms || [];
}

export async function fetchBOMById(id: string): Promise<BOMWithLines> {
  const res = await fetch(`${API_BASE_URL}/api/boms/${id}`);
  return parseJsonResponse<BOMWithLines>(res, `Failed to fetch BOM ${id}`);
}

export async function createBOM(payload: CreateBOMPayload): Promise<BOMWithLines> {
  const res = await fetch(`${API_BASE_URL}/api/boms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<BOMWithLines>(res, 'Failed to create BOM');
}

export async function updateBOM(id: string, payload: UpdateBOMPayload): Promise<BOMWithLines> {
  const res = await fetch(`${API_BASE_URL}/api/boms/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<BOMWithLines>(res, `Failed to update BOM ${id}`);
}

export async function deleteBOM(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/boms/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to delete BOM ${id}`);
  }
}

export async function addBOMLine(bomId: string, payload: AddBOMLinePayload): Promise<BOMLineWithComponent> {
  const res = await fetch(`${API_BASE_URL}/api/boms/${bomId}/lines`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<BOMLineWithComponent>(res, 'Failed to add BOM line');
}

export async function updateBOMLine(bomId: string, lineId: string, payload: UpdateBOMLinePayload): Promise<BOMLineWithComponent> {
  const res = await fetch(`${API_BASE_URL}/api/boms/${bomId}/lines/${lineId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<BOMLineWithComponent>(res, `Failed to update BOM line ${lineId}`);
}

export async function deleteBOMLine(bomId: string, lineId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/boms/${bomId}/lines/${lineId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to delete BOM line ${lineId}`);
  }
}

export async function validateBOM(bomId: string): Promise<BOMValidationResult> {
  const res = await fetch(`${API_BASE_URL}/api/boms/${bomId}/validate`, {
    method: 'POST',
  });
  return parseJsonResponse<BOMValidationResult>(res, 'Failed to validate BOM');
}

export async function releaseBOM(bomId: string): Promise<BOMWithLines> {
  const res = await fetch(`${API_BASE_URL}/api/boms/${bomId}/release`, {
    method: 'POST',
  });
  return parseJsonResponse<BOMWithLines>(res, 'Failed to release BOM');
}

export async function obsoleteBOM(bomId: string): Promise<BOMWithLines> {
  const res = await fetch(`${API_BASE_URL}/api/boms/${bomId}/obsolete`, {
    method: 'POST',
  });
  return parseJsonResponse<BOMWithLines>(res, 'Failed to obsolete BOM');
}

export async function explodeBOM(bomId: string, quantity: number = 1.0): Promise<ExplodedBOMResult> {
  const res = await fetch(`${API_BASE_URL}/api/boms/${bomId}/explode?quantity=${quantity}`);
  return parseJsonResponse<ExplodedBOMResult>(res, 'Failed to explode BOM');
}
