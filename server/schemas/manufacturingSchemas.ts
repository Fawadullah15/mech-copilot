import { z } from 'zod';

export const itemTypeSchema = z.enum([
  'FINISHED_PRODUCT',
  'SUBASSEMBLY',
  'COMPONENT',
  'RAW_MATERIAL',
  'CONSUMABLE',
]);

export const lifecycleStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'PHASED_OUT',
  'ARCHIVED',
]);

export const revisionStatusSchema = z.enum([
  'DRAFT',
  'RELEASED',
  'OBSOLETE',
]);

export const bomStatusSchema = z.enum([
  'DRAFT',
  'RELEASED',
  'OBSOLETE',
]);

export const supplyClassificationSchema = z.enum([
  'MAKE',
  'BUY',
]);

export const preferredSourcingSchema = z.enum([
  'INTERNAL',
  'LOCAL',
  'IMPORTED',
  'ANY',
]);

export const baseUnitSchema = z.string()
  .min(1, 'Base unit cannot be empty')
  .max(16, 'Base unit too long')
  .toUpperCase();

export const createProductSchema = z.object({
  item_code: z.string()
    .min(2, 'Item code must be at least 2 characters')
    .max(64, 'Item code must be at most 64 characters')
    .regex(/^[A-Za-z0-9_\-\.]+$/, 'Item code can only contain alphanumeric characters, hyphens, dots, and underscores'),
  name: z.string()
    .min(1, 'Product name is required')
    .max(256, 'Product name must be at most 256 characters'),
  description: z.string().max(2048).optional().default(''),
  item_type: itemTypeSchema,
  base_unit: baseUnitSchema.default('EA'),
  lifecycle_status: lifecycleStatusSchema.optional().default('ACTIVE'),
  initial_revision_code: z.string().max(16).optional().default('A'),
  initial_revision_notes: z.string().max(1024).optional().default('Initial engineering release baseline'),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  description: z.string().max(2048).optional(),
  item_type: itemTypeSchema.optional(),
  base_unit: baseUnitSchema.optional(),
  lifecycle_status: lifecycleStatusSchema.optional(),
});

export const productQuerySchema = z.object({
  search: z.string().max(100).optional(),
  item_type: itemTypeSchema.optional(),
  lifecycle_status: lifecycleStatusSchema.optional(),
  is_archived: z.preprocess((v) => (v === 'true' || v === '1' ? 1 : v === 'false' || v === '0' ? 0 : undefined), z.number().int().min(0).max(1).optional()),
  limit: z.preprocess((v) => (v ? Number(v) : undefined), z.number().int().min(1).max(500).optional().default(100)),
  offset: z.preprocess((v) => (v ? Number(v) : undefined), z.number().int().min(0).optional().default(0)),
});

export const createProductRevisionSchema = z.object({
  revision_code: z.string()
    .min(1, 'Revision code is required')
    .max(16, 'Revision code must be at most 16 characters')
    .regex(/^[A-Za-z0-9_\-\.]+$/, 'Revision code can only contain alphanumeric characters, hyphens, and underscores'),
  notes: z.string().max(2048).optional().default(''),
  effective_date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
});

export const createBOMSchema = z.object({
  parent_product_id: z.string().min(1, 'Parent product ID is required'),
  parent_revision_id: z.string().min(1).optional().nullable(),
  bom_code: z.string()
    .min(2, 'BOM code must be at least 2 characters')
    .max(64, 'BOM code must be at most 64 characters')
    .regex(/^[A-Za-z0-9_\-\.]+$/, 'BOM code can only contain alphanumeric characters, hyphens, and underscores'),
  alt_code: z.string().max(32).optional().default('PRIMARY'),
  base_quantity: z.number().positive('Base quantity must be greater than zero').optional().default(1.0),
  unit: baseUnitSchema.optional().default('EA'),
  notes: z.string().max(2048).optional().default(''),
});

export const updateBOMSchema = z.object({
  alt_code: z.string().max(32).optional(),
  base_quantity: z.number().positive().optional(),
  unit: baseUnitSchema.optional(),
  notes: z.string().max(2048).optional(),
});

export const bomQuerySchema = z.object({
  parent_product_id: z.string().optional(),
  status: bomStatusSchema.optional(),
  search: z.string().max(100).optional(),
});

export const addBOMLineSchema = z.object({
  line_number: z.number().int().positive('Line number must be a positive integer').optional(),
  component_product_id: z.string().min(1, 'Component product ID is required'),
  component_revision_id: z.string().min(1).optional().nullable(),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unit: baseUnitSchema,
  scrap_percentage: z.number().min(0, 'Scrap percentage cannot be negative').max(99.99, 'Scrap percentage must be less than 100%').optional().default(0.0),
  supply_classification: supplyClassificationSchema,
  preferred_sourcing: preferredSourcingSchema.optional().default('ANY'),
  notes: z.string().max(1024).optional().default(''),
});

export const updateBOMLineSchema = z.object({
  line_number: z.number().int().positive().optional(),
  component_revision_id: z.string().min(1).optional().nullable(),
  quantity: z.number().positive().optional(),
  unit: baseUnitSchema.optional(),
  scrap_percentage: z.number().min(0).max(99.99).optional(),
  supply_classification: supplyClassificationSchema.optional(),
  preferred_sourcing: preferredSourcingSchema.optional(),
  notes: z.string().max(1024).optional(),
});

export const explodeBOMQuerySchema = z.object({
  quantity: z.preprocess((v) => (v ? Number(v) : 1.0), z.number().positive('Explosion target quantity must be greater than zero').default(1.0)),
});
