/**
 * Manufacturing & Bill of Materials (BOM) Domain Types
 * Foundation Phase - Prompt 02
 */

export type ItemType =
  | 'FINISHED_PRODUCT'
  | 'SUBASSEMBLY'
  | 'COMPONENT'
  | 'RAW_MATERIAL'
  | 'CONSUMABLE';

export type LifecycleStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'PHASED_OUT'
  | 'ARCHIVED';

export type RevisionStatus =
  | 'DRAFT'
  | 'RELEASED'
  | 'OBSOLETE';

export type BOMStatus =
  | 'DRAFT'
  | 'RELEASED'
  | 'OBSOLETE';

export type SupplyClassification =
  | 'MAKE'
  | 'BUY';

export type PreferredSourcing =
  | 'INTERNAL'
  | 'LOCAL'
  | 'IMPORTED'
  | 'ANY';

export interface Product {
  id: string;
  item_code: string;
  name: string;
  description: string;
  item_type: ItemType;
  base_unit: string;
  lifecycle_status: LifecycleStatus;
  is_archived: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface ProductRevision {
  id: string;
  product_id: string;
  revision_code: string;
  revision_status: RevisionStatus;
  notes: string;
  effective_date: string | null;
  released_at: string | null;
  created_at: string;
}

export interface ProductWithRevisions extends Product {
  revisions: ProductRevision[];
  current_revision?: ProductRevision;
}

export interface BOMHeader {
  id: string;
  parent_product_id: string;
  parent_revision_id: string | null;
  bom_code: string;
  alt_code: string;
  status: BOMStatus;
  base_quantity: number;
  unit: string;
  notes: string;
  created_at: string;
  updated_at: string;
  released_at: string | null;
}

export interface BOMLine {
  id: string;
  bom_id: string;
  line_number: number;
  component_product_id: string;
  component_revision_id: string | null;
  quantity: number;
  unit: string;
  scrap_percentage: number;
  supply_classification: SupplyClassification;
  preferred_sourcing: PreferredSourcing;
  notes: string;
}

export interface BOMLineWithComponent extends BOMLine {
  component_item_code: string;
  component_name: string;
  component_item_type: ItemType;
  component_base_unit: string;
  component_revision_code?: string | null;
}

export interface BOMWithLines extends BOMHeader {
  parent_product?: Product;
  parent_revision?: ProductRevision | null;
  lines: BOMLineWithComponent[];
}

export interface BOMValidationResult {
  valid: boolean;
  bom_id: string;
  bom_code: string;
  errors: string[];
  warnings: string[];
  checked_at: string;
}

export interface ExplodedBOMNode {
  node_id: string;
  level: number;
  line_number: number;
  path: string[];
  path_string: string;
  parent_product_id: string;
  parent_item_code: string;
  parent_name: string;
  component_product_id: string;
  component_item_code: string;
  component_name: string;
  item_type: ItemType;
  supply_classification: SupplyClassification;
  preferred_sourcing: PreferredSourcing;
  unit: string;
  unit_quantity: number;
  scrap_percentage: number;
  net_required_quantity: number;
  gross_required_quantity: number;
  has_children: boolean;
  missing_bom: boolean;
  subassembly_bom_id?: string;
  children: ExplodedBOMNode[];
}

export interface SummarizedComponentRequirement {
  product_id: string;
  item_code: string;
  name: string;
  item_type: ItemType;
  supply_classification: SupplyClassification;
  preferred_sourcing: PreferredSourcing;
  unit: string;
  total_net_quantity: number;
  total_gross_quantity: number;
  scrap_allowance_quantity: number;
  usage_count: number;
  usage_paths: string[];
}

export interface ExplodedBOMResult {
  bom_id: string;
  bom_code: string;
  parent_product: {
    id: string;
    item_code: string;
    name: string;
    item_type: ItemType;
    base_unit: string;
  };
  target_quantity: number;
  hierarchy: ExplodedBOMNode[];
  summary: SummarizedComponentRequirement[];
  unresolved_subassemblies: {
    product_id: string;
    item_code: string;
    name: string;
    path: string;
  }[];
  calculation_timestamp: string;
  engine_version: string;
}
