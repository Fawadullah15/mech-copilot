import { API_BASE_URL } from './chatApi';
import type {
  Product,
  ProductWithRevisions,
  ProductRevision,
  ItemType,
  LifecycleStatus,
} from '../types/manufacturing';

export interface ProductQueryFilters {
  search?: string;
  item_type?: ItemType;
  lifecycle_status?: LifecycleStatus;
  is_archived?: number;
}

export interface CreateProductPayload {
  item_code: string;
  name: string;
  description?: string;
  item_type: ItemType;
  base_unit: string;
  lifecycle_status?: LifecycleStatus;
  initial_revision_code?: string;
  initial_revision_notes?: string;
}

export interface UpdateProductPayload {
  name?: string;
  description?: string;
  item_type?: ItemType;
  base_unit?: string;
  lifecycle_status?: LifecycleStatus;
}

export interface CreateRevisionPayload {
  revision_code: string;
  notes?: string;
  effective_date?: string;
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

export async function fetchProducts(filters: ProductQueryFilters = {}): Promise<Product[]> {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.item_type) params.append('item_type', filters.item_type);
  if (filters.lifecycle_status) params.append('lifecycle_status', filters.lifecycle_status);
  if (filters.is_archived !== undefined) params.append('is_archived', String(filters.is_archived));

  const url = `${API_BASE_URL}/api/products${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url);
  const data = await parseJsonResponse<{ count: number; products: Product[] }>(res, 'Failed to fetch products');
  return data.products || [];
}

export async function fetchProductById(id: string): Promise<ProductWithRevisions> {
  const res = await fetch(`${API_BASE_URL}/api/products/${id}`);
  return parseJsonResponse<ProductWithRevisions>(res, `Failed to fetch product ${id}`);
}

export async function createProduct(payload: CreateProductPayload): Promise<ProductWithRevisions> {
  const res = await fetch(`${API_BASE_URL}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<ProductWithRevisions>(res, 'Failed to create product');
}

export async function updateProduct(id: string, payload: UpdateProductPayload): Promise<ProductWithRevisions> {
  const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<ProductWithRevisions>(res, `Failed to update product ${id}`);
}

export async function archiveProduct(id: string): Promise<ProductWithRevisions> {
  const res = await fetch(`${API_BASE_URL}/api/products/${id}/archive`, {
    method: 'POST',
  });
  return parseJsonResponse<ProductWithRevisions>(res, `Failed to archive product ${id}`);
}

export async function deleteProduct(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to delete product ${id}`);
  }
}

export async function fetchProductRevisions(productId: string): Promise<ProductRevision[]> {
  const res = await fetch(`${API_BASE_URL}/api/products/${productId}/revisions`);
  const data = await parseJsonResponse<{ count: number; revisions: ProductRevision[] }>(res, 'Failed to fetch product revisions');
  return data.revisions || [];
}

export async function createProductRevision(productId: string, payload: CreateRevisionPayload): Promise<ProductRevision> {
  const res = await fetch(`${API_BASE_URL}/api/products/${productId}/revisions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<ProductRevision>(res, 'Failed to create product revision');
}

export async function releaseProductRevision(productId: string, revisionId: string, effectiveDate?: string): Promise<ProductRevision> {
  const res = await fetch(`${API_BASE_URL}/api/products/${productId}/revisions/${revisionId}/release`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ effective_date: effectiveDate }),
  });
  return parseJsonResponse<ProductRevision>(res, 'Failed to release product revision');
}

export async function obsoleteProductRevision(productId: string, revisionId: string): Promise<ProductRevision> {
  const res = await fetch(`${API_BASE_URL}/api/products/${productId}/revisions/${revisionId}/obsolete`, {
    method: 'POST',
  });
  return parseJsonResponse<ProductRevision>(res, 'Failed to obsolete product revision');
}
