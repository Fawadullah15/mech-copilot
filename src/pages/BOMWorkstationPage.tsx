import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layers,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  X,
  ChevronRight,
  ShieldCheck,
  Lock,
  GitFork,
  ArrowRight,
  ExternalLink,
  Info,
  Package,
  Boxes,
  Zap,
  Sliders,
  Sparkles,
  Check,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type {
  BOMHeader,
  BOMWithLines,
  BOMLineWithComponent,
  BOMStatus,
  SupplyClassification,
  PreferredSourcing,
  ItemType,
  BOMValidationResult,
  ExplodedBOMResult,
  ExplodedBOMNode,
  SummarizedComponentRequirement,
  Product,
} from '../types/manufacturing';
import {
  fetchBOMs,
  fetchBOMById,
  createBOM,
  deleteBOM,
  addBOMLine,
  updateBOMLine,
  deleteBOMLine,
  validateBOM,
  releaseBOM,
  explodeBOM,
  CreateBOMPayload,
  AddBOMLinePayload,
  UpdateBOMLinePayload,
} from '../services/bomApi';
import { fetchProducts } from '../services/productApi';

type BOMTab = 'directory' | 'editor' | 'explosion' | 'validation';

export default function BOMWorkstationPage() {
  const { setActivePage } = useApp();

  // Active Tab
  const [activeTab, setActiveTab] = useState<BOMTab>('directory');

  // Directory Data States
  const [boms, setBoms] = useState<BOMHeader[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Directory Filters
  const [directorySearch, setDirectorySearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Active BOM Detail States
  const [selectedBomId, setSelectedBomId] = useState<string | null>(null);
  const [selectedBOM, setSelectedBOM] = useState<BOMWithLines | null>(null);
  const [loadingBOM, setLoadingBOM] = useState<boolean>(false);

  // Explosion Workspace States
  const [targetQuantity, setTargetQuantity] = useState<number>(1);
  const [explosionResult, setExplosionResult] = useState<ExplodedBOMResult | null>(null);
  const [loadingExplosion, setLoadingExplosion] = useState<boolean>(false);
  const [explosionViewMode, setExplosionViewMode] = useState<'tree' | 'rollup'>('tree');
  const [rollupSupplyFilter, setRollupSupplyFilter] = useState<'ALL' | 'MAKE' | 'BUY'>('ALL');

  // Validation States
  const [validationResult, setValidationResult] = useState<BOMValidationResult | null>(null);
  const [loadingValidation, setLoadingValidation] = useState<boolean>(false);

  // Modals
  const [isCreateBOMOpen, setIsCreateBOMOpen] = useState<boolean>(false);
  const [isAddLineOpen, setIsAddLineOpen] = useState<boolean>(false);
  const [editingLine, setEditingLine] = useState<BOMLineWithComponent | null>(null);
  const [deletingLineId, setDeletingLineId] = useState<string | null>(null);
  const [deletingBomId, setDeletingBomId] = useState<string | null>(null);
  const [isReleaseConfirmOpen, setIsReleaseConfirmOpen] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Create BOM Form State
  const [createBOMForm, setCreateBOMForm] = useState<CreateBOMPayload>({
    parent_product_id: '',
    bom_code: '',
    alt_code: '01',
    base_quantity: 1,
    unit: 'EA',
    notes: '',
  });

  // Add / Edit Line Form State
  const [lineForm, setLineForm] = useState<{
    line_number: number;
    component_product_id: string;
    quantity: number;
    unit: string;
    scrap_percentage: number;
    supply_classification: SupplyClassification;
    preferred_sourcing: PreferredSourcing;
    notes: string;
  }>({
    line_number: 10,
    component_product_id: '',
    quantity: 1,
    unit: 'EA',
    scrap_percentage: 0,
    supply_classification: 'BUY',
    preferred_sourcing: 'LOCAL',
    notes: '',
  });

  // Load BOMs and Products
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [bomsData, productsData] = await Promise.all([
        fetchBOMs(),
        fetchProducts({ is_archived: 0 }),
      ]);
      setBoms(bomsData);
      setProducts(productsData);

      // Auto-select first BOM if none selected
      if (!selectedBomId && bomsData.length > 0) {
        setSelectedBomId(bomsData[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load initial manufacturing data');
    } finally {
      setLoading(false);
    }
  }, [selectedBomId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load Active BOM Details
  const loadBOMDetails = useCallback(async (bomId: string) => {
    try {
      setLoadingBOM(true);
      const data = await fetchBOMById(bomId);
      setSelectedBOM(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to load BOM ${bomId}`);
    } finally {
      setLoadingBOM(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBomId) {
      loadBOMDetails(selectedBomId);
    } else {
      setSelectedBOM(null);
    }
  }, [selectedBomId, loadBOMDetails]);

  // Flash Message Helper
  const flashSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Directory KPI Stats
  const stats = useMemo(() => {
    const total = boms.length;
    const draft = boms.filter((b) => b.status === 'DRAFT').length;
    const released = boms.filter((b) => b.status === 'RELEASED').length;
    const obsolete = boms.filter((b) => b.status === 'OBSOLETE').length;
    return { total, draft, released, obsolete };
  }, [boms]);

  // Filtered BOMs
  const filteredBOMs = useMemo(() => {
    return boms.filter((bom) => {
      if (statusFilter !== 'ALL' && bom.status !== statusFilter) return false;
      if (directorySearch.trim()) {
        const q = directorySearch.toLowerCase();
        const matchesCode = bom.bom_code.toLowerCase().includes(q);
        const matchesAlt = bom.alt_code?.toLowerCase().includes(q);
        const matchesParent = bom.parent_product_id.toLowerCase().includes(q);
        if (!matchesCode && !matchesAlt && !matchesParent) return false;
      }
      return true;
    });
  }, [boms, directorySearch, statusFilter]);

  // Handlers for switching views
  const handleOpenEditor = (bomId: string) => {
    setSelectedBomId(bomId);
    setActiveTab('editor');
  };

  const handleOpenExplosion = (bomId: string) => {
    setSelectedBomId(bomId);
    setActiveTab('explosion');
    triggerExplosion(bomId, targetQuantity);
  };

  const handleOpenValidation = (bomId: string) => {
    setSelectedBomId(bomId);
    setActiveTab('validation');
    triggerValidation(bomId);
  };

  // Run Explosion
  const triggerExplosion = async (bomId: string, qty: number) => {
    try {
      setLoadingExplosion(true);
      setError(null);
      const res = await explodeBOM(bomId, qty);
      setExplosionResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'BOM explosion failed');
    } finally {
      setLoadingExplosion(false);
    }
  };

  // Run Validation
  const triggerValidation = async (bomId: string) => {
    try {
      setLoadingValidation(true);
      setError(null);
      const res = await validateBOM(bomId);
      setValidationResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'BOM validation check failed');
    } finally {
      setLoadingValidation(false);
    }
  };

  // Release BOM Action
  const handleExecuteRelease = async () => {
    if (!selectedBomId) return;
    try {
      setLoading(true);
      setModalError(null);
      const updated = await releaseBOM(selectedBomId);
      setSelectedBOM(updated);
      setIsReleaseConfirmOpen(false);
      flashSuccess(`BOM ${updated.bom_code} successfully RELEASED for production!`);
      // Refresh list
      const updatedList = await fetchBOMs();
      setBoms(updatedList);
      // Refresh validation
      await triggerValidation(selectedBomId);
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to release BOM');
    } finally {
      setLoading(false);
    }
  };

  // Create BOM
  const handleCreateBOM = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setModalError(null);
      if (!createBOMForm.parent_product_id) {
        setModalError('Please select a parent product.');
        return;
      }
      if (!createBOMForm.bom_code.trim()) {
        setModalError('BOM Code is required.');
        return;
      }

      const created = await createBOM(createBOMForm);
      flashSuccess(`BOM ${created.bom_code} created successfully.`);
      setIsCreateBOMOpen(false);
      // Reload list and select it
      const list = await fetchBOMs();
      setBoms(list);
      setSelectedBomId(created.id);
      setActiveTab('editor');
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to create BOM');
    }
  };

  // Add / Edit Line Submit
  const handleSaveLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBomId) return;

    try {
      setModalError(null);
      if (!lineForm.component_product_id) {
        setModalError('Please select a component product.');
        return;
      }
      if (lineForm.quantity <= 0) {
        setModalError('Quantity must be greater than 0.');
        return;
      }

      if (editingLine) {
        const updatePayload: UpdateBOMLinePayload = {
          line_number: lineForm.line_number,
          quantity: lineForm.quantity,
          unit: lineForm.unit,
          scrap_percentage: lineForm.scrap_percentage,
          supply_classification: lineForm.supply_classification,
          preferred_sourcing: lineForm.preferred_sourcing,
          notes: lineForm.notes,
        };
        await updateBOMLine(selectedBomId, editingLine.id, updatePayload);
        flashSuccess(`Line #${lineForm.line_number} updated.`);
      } else {
        const addPayload: AddBOMLinePayload = {
          line_number: lineForm.line_number,
          component_product_id: lineForm.component_product_id,
          quantity: lineForm.quantity,
          unit: lineForm.unit,
          scrap_percentage: lineForm.scrap_percentage,
          supply_classification: lineForm.supply_classification,
          preferred_sourcing: lineForm.preferred_sourcing,
          notes: lineForm.notes,
        };
        await addBOMLine(selectedBomId, addPayload);
        flashSuccess(`Component added to BOM.`);
      }

      setIsAddLineOpen(false);
      setEditingLine(null);
      await loadBOMDetails(selectedBomId);
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to save BOM line');
    }
  };

  // Delete Line
  const handleDeleteLine = async (lineId: string) => {
    if (!selectedBomId) return;
    try {
      await deleteBOMLine(selectedBomId, lineId);
      flashSuccess('BOM line deleted.');
      setDeletingLineId(null);
      await loadBOMDetails(selectedBomId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete line');
    }
  };

  // Delete BOM
  const handleDeleteBOM = async (bomId: string) => {
    try {
      await deleteBOM(bomId);
      flashSuccess('BOM deleted successfully.');
      setDeletingBomId(null);
      if (selectedBomId === bomId) {
        setSelectedBomId(null);
        setSelectedBOM(null);
      }
      const list = await fetchBOMs();
      setBoms(list);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete BOM');
    }
  };

  // Helper for Discrete Units (Procurement Ceiling)
  const isDiscreteUnit = (unit: string) => {
    const u = unit.toUpperCase().trim();
    return ['EA', 'SET', 'PC', 'PCS', 'UNIT', 'UNITS', 'PKG', 'BOX'].includes(u);
  };

  // Calculate Procurement Quantity
  const calculateProcurementQuantity = (grossQty: number, unit: string) => {
    if (isDiscreteUnit(unit)) {
      return Math.ceil(grossQty);
    }
    return grossQty;
  };

  // Status Badge Component
  const renderStatusBadge = (status: BOMStatus) => {
    switch (status) {
      case 'RELEASED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Lock size={10} /> RELEASED
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Edit2 size={10} /> DRAFT
          </span>
        );
      case 'OBSOLETE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
            OBSOLETE
          </span>
        );
    }
  };

  // Supply Badge Component
  const renderSupplyBadge = (classification: SupplyClassification) => {
    return classification === 'MAKE' ? (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
        MAKE
      </span>
    ) : (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
        BUY
      </span>
    );
  };

  // Sourcing Badge Component
  const renderSourcingBadge = (sourcing: PreferredSourcing) => {
    const map: Record<PreferredSourcing, { color: string; label: string }> = {
      INTERNAL: { color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', label: 'INTERNAL' },
      LOCAL: { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'LOCAL' },
      IMPORTED: { color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'IMPORTED' },
      ANY: { color: 'text-gray-400 bg-gray-500/10 border-gray-500/20', label: 'ANY' },
    };
    const s = map[sourcing] || map.ANY;
    return (
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${s.color}`}>
        {s.label}
      </span>
    );
  };

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: ExplodedBOMNode) => {
    const hasChildren = node.children && node.children.length > 0;
    const paddingLeft = `${node.level * 28 + 12}px`;

    return (
      <React.Fragment key={node.node_id}>
        <tr className="border-b border-[#22262A] hover:bg-[#191C1F]/60 transition-colors text-xs font-mono">
          <td className="py-2.5 pr-3 text-left" style={{ paddingLeft }}>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[#22262A] text-[10px] text-[#969DA5] shrink-0">
                L{node.level}
              </span>
              {hasChildren && <ChevronDown size={14} className="text-[#64D6C5] shrink-0" />}
              <span className="font-semibold text-[#F0F1F2]">{node.component_item_code}</span>
              <span className="text-[#969DA5] font-sans truncate max-w-[200px]" title={node.component_name}>
                {node.component_name}
              </span>
              {node.missing_bom && (
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-500/10 text-red-400 border border-red-500/20">
                  Missing BOM
                </span>
              )}
            </div>
          </td>
          <td className="py-2.5 px-3">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#22262A] text-[#969DA5]">
              {node.item_type}
            </span>
          </td>
          <td className="py-2.5 px-3">
            {renderSupplyBadge(node.supply_classification)}
          </td>
          <td className="py-2.5 px-3">
            {renderSourcingBadge(node.preferred_sourcing)}
          </td>
          <td className="py-2.5 px-3 text-right text-[#F0F1F2]">
            {node.unit_quantity} {node.unit}
          </td>
          <td className="py-2.5 px-3 text-right text-[#969DA5]">
            {node.net_required_quantity} {node.unit}
          </td>
          <td className="py-2.5 px-3 text-right text-[#969DA5]">
            {node.scrap_percentage > 0 ? (
              <span className="text-amber-400">+{node.scrap_percentage}%</span>
            ) : (
              '0%'
            )}
          </td>
          <td className="py-2.5 px-3 text-right font-bold text-[#64D6C5]">
            {node.gross_required_quantity} {node.unit}
          </td>
        </tr>
        {hasChildren && node.children.map((child) => renderTreeNode(child))}
      </React.Fragment>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#111315] text-[#F0F1F2] overflow-y-auto">
      {/* Top Header */}
      <div className="border-b border-[#22262A] bg-[#14171A] px-6 py-4 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-[#191C1F] border border-[#34393F] flex items-center justify-center text-[#64D6C5]">
                <GitFork size={18} />
              </div>
              <h1 className="text-lg font-bold tracking-tight text-[#F0F1F2]">
                Bill of Materials Workstation
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[#22262A] text-[#969DA5] border border-[#34393F]">
                Multi-Level Engine
              </span>
            </div>
            <p className="text-xs text-[#969DA5] mt-1">
              Hierarchical engineering BOMs, scrap-adjusted explosion rollups, and revision-controlled release validation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setModalError(null);
                setCreateBOMForm({
                  parent_product_id: products.length > 0 ? products[0].id : '',
                  bom_code: '',
                  alt_code: '01',
                  base_quantity: 1,
                  unit: products.length > 0 ? products[0].base_unit : 'EA',
                  notes: '',
                });
                setIsCreateBOMOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-[4px] bg-[#64D6C5] text-[#111315] font-semibold text-xs flex items-center gap-1.5 hover:bg-[#52beaf] transition-colors shadow-xs"
            >
              <Plus size={14} /> Create BOM
            </button>
            <button
              onClick={loadInitialData}
              className="p-1.5 rounded-[4px] bg-[#191C1F] hover:bg-[#22262A] text-[#969DA5] hover:text-[#F0F1F2] border border-[#34393F] transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="mt-3 px-3 py-2 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <X size={12} />
            </button>
          </div>
        )}
        {successMessage && (
          <div className="mt-3 px-3 py-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-300">
              <X size={12} />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-4 border-b border-[#22262A] -mb-4 pt-1">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'directory'
                ? 'border-[#64D6C5] text-[#64D6C5]'
                : 'border-transparent text-[#969DA5] hover:text-[#F0F1F2]'
            }`}
          >
            <Layers size={14} />
            <span>BOM Directory</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#22262A] text-[#969DA5]">
              {boms.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'editor'
                ? 'border-[#64D6C5] text-[#64D6C5]'
                : 'border-transparent text-[#969DA5] hover:text-[#F0F1F2]'
            }`}
          >
            <GitFork size={14} />
            <span>Hierarchical Editor</span>
            {selectedBOM && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#22262A] text-[#64D6C5]">
                {selectedBOM.bom_code}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('explosion');
              if (selectedBomId && !explosionResult) {
                triggerExplosion(selectedBomId, targetQuantity);
              }
            }}
            className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'explosion'
                ? 'border-[#64D6C5] text-[#64D6C5]'
                : 'border-transparent text-[#969DA5] hover:text-[#F0F1F2]'
            }`}
          >
            <Boxes size={14} />
            <span>Explosion Workspace</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('validation');
              if (selectedBomId && !validationResult) {
                triggerValidation(selectedBomId);
              }
            }}
            className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'validation'
                ? 'border-[#64D6C5] text-[#64D6C5]'
                : 'border-transparent text-[#969DA5] hover:text-[#F0F1F2]'
            }`}
          >
            <ShieldCheck size={14} />
            <span>Validation & Release</span>
            {selectedBOM?.status === 'RELEASED' && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                LOCKED
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        {/* ========================================================================= */}
        {/* TAB 1: BOM DIRECTORY */}
        {/* ========================================================================= */}
        {activeTab === 'directory' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3.5 rounded bg-[#191C1F] border border-[#22262A]">
                <span className="text-[11px] text-[#969DA5] uppercase font-mono">Total BOMs</span>
                <p className="text-xl font-bold font-mono text-[#F0F1F2] mt-1">{stats.total}</p>
              </div>
              <div className="p-3.5 rounded bg-[#191C1F] border border-[#22262A]">
                <span className="text-[11px] text-amber-400 uppercase font-mono">Draft State</span>
                <p className="text-xl font-bold font-mono text-amber-400 mt-1">{stats.draft}</p>
              </div>
              <div className="p-3.5 rounded bg-[#191C1F] border border-[#22262A]">
                <span className="text-[11px] text-emerald-400 uppercase font-mono">Released (Locked)</span>
                <p className="text-xl font-bold font-mono text-emerald-400 mt-1">{stats.released}</p>
              </div>
              <div className="p-3.5 rounded bg-[#191C1F] border border-[#22262A]">
                <span className="text-[11px] text-gray-400 uppercase font-mono">Obsolete</span>
                <p className="text-xl font-bold font-mono text-gray-400 mt-1">{stats.obsolete}</p>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#191C1F] p-3 rounded border border-[#22262A]">
              <div className="relative w-full sm:w-80">
                <Search size={14} className="absolute left-3 top-2.5 text-[#969DA5]" />
                <input
                  type="text"
                  placeholder="Search BOM code, item code, alt..."
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded bg-[#14171A] border border-[#34393F] text-xs text-[#F0F1F2] focus:outline-hidden focus:border-[#64D6C5]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-[#969DA5] flex items-center gap-1">
                  <Filter size={12} /> Status:
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded bg-[#14171A] border border-[#34393F] text-xs text-[#F0F1F2] focus:outline-hidden focus:border-[#64D6C5]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="RELEASED">Released</option>
                  <option value="OBSOLETE">Obsolete</option>
                </select>
              </div>
            </div>

            {/* BOM Table */}
            <div className="border border-[#22262A] rounded bg-[#14171A] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#22262A] bg-[#191C1F] text-[11px] font-mono text-[#969DA5]">
                    <th className="py-2.5 px-3">BOM Code</th>
                    <th className="py-2.5 px-3">Parent Item Code</th>
                    <th className="py-2.5 px-3">Alt</th>
                    <th className="py-2.5 px-3">Base Quantity</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Last Updated</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#22262A] text-xs font-mono">
                  {filteredBOMs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#969DA5]">
                        <Layers size={28} className="mx-auto mb-2 opacity-40 text-[#64D6C5]" />
                        <p className="text-sm font-sans">No Bill of Materials found</p>
                        <p className="text-xs mt-1 text-[#636A73]">
                          {boms.length === 0
                            ? 'Create your first engineering BOM to get started.'
                            : 'No BOMs match the active search filters.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredBOMs.map((bom) => {
                      const isSelected = selectedBomId === bom.id;
                      return (
                        <tr
                          key={bom.id}
                          className={`hover:bg-[#191C1F] transition-colors ${
                            isSelected ? 'bg-[#191C1F]/80' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-semibold text-[#64D6C5] flex items-center gap-2">
                            <span>{bom.bom_code}</span>
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#64D6C5]" />
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[#F0F1F2]">
                            {bom.parent_product_id}
                          </td>
                          <td className="py-2.5 px-3 text-[#969DA5]">{bom.alt_code || '01'}</td>
                          <td className="py-2.5 px-3 text-[#F0F1F2]">
                            {bom.base_quantity} {bom.unit}
                          </td>
                          <td className="py-2.5 px-3">{renderStatusBadge(bom.status)}</td>
                          <td className="py-2.5 px-3 text-[#969DA5] text-[11px]">
                            {new Date(bom.updated_at).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditor(bom.id)}
                                className="px-2 py-1 rounded bg-[#22262A] hover:bg-[#34393F] text-[#F0F1F2] text-[11px] transition-colors"
                                title="Edit BOM Hierarchy"
                              >
                                Editor
                              </button>
                              <button
                                onClick={() => handleOpenExplosion(bom.id)}
                                className="px-2 py-1 rounded bg-[#22262A] hover:bg-[#34393F] text-[#64D6C5] text-[11px] transition-colors"
                                title="Explode BOM"
                              >
                                Explode
                              </button>
                              <button
                                onClick={() => handleOpenValidation(bom.id)}
                                className="px-2 py-1 rounded bg-[#22262A] hover:bg-[#34393F] text-amber-400 text-[11px] transition-colors"
                                title="Validate & Release"
                              >
                                Validate
                              </button>
                              {bom.status === 'DRAFT' && (
                                <button
                                  onClick={() => setDeletingBomId(bom.id)}
                                  className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-colors"
                                  title="Delete Draft BOM"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: HIERARCHICAL BOM EDITOR */}
        {/* ========================================================================= */}
        {activeTab === 'editor' && (
          <div className="space-y-6">
            {/* Active BOM Banner */}
            {selectedBOM ? (
              <div className="bg-[#191C1F] border border-[#22262A] rounded p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold font-mono text-[#64D6C5]">
                        {selectedBOM.bom_code}
                      </span>
                      <span className="text-xs text-[#969DA5]">
                        (Alt: {selectedBOM.alt_code || '01'})
                      </span>
                      {renderStatusBadge(selectedBOM.status)}
                    </div>
                    <div className="text-xs text-[#969DA5] mt-1 flex items-center gap-4">
                      <span>
                        Parent Product: <strong className="text-[#F0F1F2]">{selectedBOM.parent_product?.item_code || selectedBOM.parent_product_id}</strong>
                      </span>
                      <span>
                        Base Output: <strong className="text-[#F0F1F2]">{selectedBOM.base_quantity} {selectedBOM.unit}</strong>
                      </span>
                      <span>
                        Total Direct Lines: <strong className="text-[#F0F1F2]">{selectedBOM.lines?.length || 0}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenExplosion(selectedBOM.id)}
                      className="px-3 py-1.5 rounded bg-[#22262A] hover:bg-[#34393F] text-[#64D6C5] text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Boxes size={13} /> Explode Multi-Level
                    </button>
                    <button
                      onClick={() => handleOpenValidation(selectedBOM.id)}
                      className="px-3 py-1.5 rounded bg-[#22262A] hover:bg-[#34393F] text-amber-400 text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <ShieldCheck size={13} /> Run Validation
                    </button>
                  </div>
                </div>

                {/* Immutability Notice for RELEASED BOM */}
                {selectedBOM.status === 'RELEASED' && (
                  <div className="mt-4 p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                    <Lock size={14} className="shrink-0" />
                    <span>
                      <strong>BOM is RELEASED & Locked:</strong> In compliance with engineering revision control, components cannot be added, edited, or removed from released configurations. Create an alternate revision to make changes.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center bg-[#191C1F] border border-[#22262A] rounded">
                <Layers size={32} className="mx-auto mb-2 text-[#969DA5]" />
                <p className="text-sm font-semibold text-[#F0F1F2]">No BOM Selected</p>
                <p className="text-xs text-[#969DA5] mt-1">
                  Select a Bill of Materials from the Directory to edit its components.
                </p>
                <button
                  onClick={() => setActiveTab('directory')}
                  className="mt-3 px-3 py-1.5 rounded bg-[#22262A] hover:bg-[#34393F] text-xs font-mono text-[#64D6C5]"
                >
                  Return to Directory
                </button>
              </div>
            )}

            {/* Lines Table & Management */}
            {selectedBOM && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#969DA5]">
                      Direct Components & Subassemblies ({selectedBOM.lines?.length || 0})
                    </h3>
                  </div>

                  {selectedBOM.status === 'DRAFT' && (
                    <button
                      onClick={() => {
                        setModalError(null);
                        setEditingLine(null);
                        const nextLineNum = (selectedBOM.lines?.length || 0) * 10 + 10;
                        setLineForm({
                          line_number: nextLineNum,
                          component_product_id: products.length > 0 ? products[0].id : '',
                          quantity: 1,
                          unit: products.length > 0 ? products[0].base_unit : 'EA',
                          scrap_percentage: 0,
                          supply_classification: 'BUY',
                          preferred_sourcing: 'LOCAL',
                          notes: '',
                        });
                        setIsAddLineOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded bg-[#22262A] hover:bg-[#34393F] text-[#64D6C5] text-xs font-medium flex items-center gap-1.5 border border-[#34393F] transition-colors"
                    >
                      <Plus size={13} /> Add Component Line
                    </button>
                  )}
                </div>

                <div className="border border-[#22262A] rounded bg-[#14171A] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#22262A] bg-[#191C1F] text-[11px] font-mono text-[#969DA5]">
                        <th className="py-2.5 px-3 w-16">Line #</th>
                        <th className="py-2.5 px-3">Component Item Code</th>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Supply</th>
                        <th className="py-2.5 px-3">Sourcing</th>
                        <th className="py-2.5 px-3 text-right">Quantity</th>
                        <th className="py-2.5 px-3 text-right">Scrap %</th>
                        <th className="py-2.5 px-3">Notes</th>
                        {selectedBOM.status === 'DRAFT' && (
                          <th className="py-2.5 px-3 text-right w-24">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#22262A] text-xs font-mono">
                      {!selectedBOM.lines || selectedBOM.lines.length === 0 ? (
                        <tr>
                          <td
                            colSpan={selectedBOM.status === 'DRAFT' ? 10 : 9}
                            className="py-10 text-center text-[#969DA5]"
                          >
                            <Boxes size={24} className="mx-auto mb-2 opacity-40 text-[#64D6C5]" />
                            <p className="font-sans">No components defined in this BOM yet.</p>
                            {selectedBOM.status === 'DRAFT' && (
                              <p className="text-[11px] text-[#636A73] mt-1">
                                Click "Add Component Line" to construct this assembly hierarchy.
                              </p>
                            )}
                          </td>
                        </tr>
                      ) : (
                        selectedBOM.lines.map((line) => (
                          <tr key={line.id} className="hover:bg-[#191C1F] transition-colors">
                            <td className="py-2.5 px-3 text-[#969DA5] font-mono">
                              #{line.line_number}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-[#64D6C5]">
                              {line.component_item_code}
                            </td>
                            <td className="py-2.5 px-3 text-[#F0F1F2] font-sans">
                              {line.component_name}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#22262A] text-[#969DA5]">
                                {line.component_item_type}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {renderSupplyBadge(line.supply_classification)}
                            </td>
                            <td className="py-2.5 px-3">
                              {renderSourcingBadge(line.preferred_sourcing)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-[#F0F1F2]">
                              {line.quantity} {line.unit}
                            </td>
                            <td className="py-2.5 px-3 text-right text-[#969DA5]">
                              {line.scrap_percentage > 0 ? (
                                <span className="text-amber-400">+{line.scrap_percentage}%</span>
                              ) : (
                                '0%'
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-[#969DA5] font-sans truncate max-w-[150px]">
                              {line.notes || '-'}
                            </td>
                            {selectedBOM.status === 'DRAFT' && (
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingLine(line);
                                      setLineForm({
                                        line_number: line.line_number,
                                        component_product_id: line.component_product_id,
                                        quantity: line.quantity,
                                        unit: line.unit,
                                        scrap_percentage: line.scrap_percentage,
                                        supply_classification: line.supply_classification,
                                        preferred_sourcing: line.preferred_sourcing,
                                        notes: line.notes || '',
                                      });
                                      setIsAddLineOpen(true);
                                    }}
                                    className="p-1 rounded text-[#969DA5] hover:text-[#64D6C5] hover:bg-[#22262A] transition-colors"
                                    title="Edit Line"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    onClick={() => setDeletingLineId(line.id)}
                                    className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-colors"
                                    title="Delete Line"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

        {/* ========================================================================= */}
        {/* TAB 3: BOM EXPLOSION WORKSPACE */}
        {/* ========================================================================= */}
        {activeTab === 'explosion' && (
          <div className="space-y-6">
            {/* Multiplier & Calculation Control Bar */}
            <div className="bg-[#191C1F] border border-[#22262A] rounded p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div>
                    <label className="text-[11px] text-[#969DA5] uppercase font-mono block">
                      Target Production Output
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        min="0.001"
                        step="any"
                        value={targetQuantity}
                        onChange={(e) => setTargetQuantity(parseFloat(e.target.value) || 1)}
                        className="w-28 px-3 py-1 rounded bg-[#14171A] border border-[#34393F] text-sm font-mono text-[#F0F1F2] focus:outline-hidden focus:border-[#64D6C5]"
                      />
                      <span className="text-xs font-mono text-[#969DA5]">
                        {selectedBOM?.unit || 'Units'}
                      </span>
                    </div>
                  </div>

                  {/* Preset Multipliers */}
                  <div className="flex items-center gap-1.5 self-end">
                    {[1, 5, 10, 50, 100].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => {
                          setTargetQuantity(preset);
                          if (selectedBomId) triggerExplosion(selectedBomId, preset);
                        }}
                        className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                          targetQuantity === preset
                            ? 'bg-[#64D6C5] text-[#111315] font-bold'
                            : 'bg-[#22262A] text-[#969DA5] hover:text-[#F0F1F2]'
                        }`}
                      >
                        {preset}×
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (selectedBomId) triggerExplosion(selectedBomId, targetQuantity);
                    }}
                    className="px-3 py-1.5 rounded bg-[#64D6C5] text-[#111315] font-semibold text-xs flex items-center gap-1.5 hover:bg-[#52beaf] transition-colors"
                  >
                    <Zap size={14} className={loadingExplosion ? 'animate-spin' : ''} />
                    Explode Requirements
                  </button>
                </div>
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center justify-between border-t border-[#22262A] mt-4 pt-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExplosionViewMode('tree')}
                    className={`px-3 py-1.5 rounded text-xs font-mono transition-colors flex items-center gap-1.5 ${
                      explosionViewMode === 'tree'
                        ? 'bg-[#22262A] text-[#64D6C5] border border-[#34393F]'
                        : 'text-[#969DA5] hover:text-[#F0F1F2]'
                    }`}
                  >
                    <GitFork size={13} /> Multi-Level Indented Tree
                  </button>
                  <button
                    onClick={() => setExplosionViewMode('rollup')}
                    className={`px-3 py-1.5 rounded text-xs font-mono transition-colors flex items-center gap-1.5 ${
                      explosionViewMode === 'rollup'
                        ? 'bg-[#22262A] text-[#64D6C5] border border-[#34393F]'
                        : 'text-[#969DA5] hover:text-[#F0F1F2]'
                    }`}
                  >
                    <Boxes size={13} /> Flat Rollup & Procurement Summary
                  </button>
                </div>

                {explosionResult && (
                  <div className="text-[11px] font-mono text-[#969DA5] flex items-center gap-2">
                    <span>Engine: {explosionResult.engine_version}</span>
                    <span>•</span>
                    <span>Calculated: {new Date(explosionResult.calculation_timestamp).toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Subassemblies missing BOM warning */}
            {explosionResult && explosionResult.unresolved_subassemblies?.length > 0 && (
              <div className="p-3 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">Unresolved Subassembly BOMs:</strong> The following subassemblies do not have an active BOM registered and could not be exploded further down:
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                    {explosionResult.unresolved_subassemblies.map((u) => (
                      <li key={u.product_id}>
                        {u.item_code} ({u.name}) — Path: <span className="font-mono">{u.path}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* VIEW A: MULTI-LEVEL INDENTED TREE */}
            {explosionViewMode === 'tree' && (
              <div className="border border-[#22262A] rounded bg-[#14171A] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#22262A] bg-[#191C1F] text-[11px] font-mono text-[#969DA5]">
                        <th className="py-2.5 px-3">Hierarchical Structure (Item / Code)</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Supply</th>
                        <th className="py-2.5 px-3">Sourcing</th>
                        <th className="py-2.5 px-3 text-right">Unit Qty</th>
                        <th className="py-2.5 px-3 text-right">Net Required</th>
                        <th className="py-2.5 px-3 text-right">Scrap %</th>
                        <th className="py-2.5 px-3 text-right">Gross Required</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#22262A]">
                      {!explosionResult || explosionResult.hierarchy.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-[#969DA5]">
                            <Zap size={24} className="mx-auto mb-2 opacity-40 text-[#64D6C5]" />
                            <p className="font-sans">No explosion data available.</p>
                            <p className="text-xs text-[#636A73] mt-1">
                              Click "Explode Requirements" above to calculate multi-level quantities.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        explosionResult.hierarchy.map((node) => renderTreeNode(node))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW B: FLAT ROLLUP & PROCUREMENT SUMMARY */}
            {explosionViewMode === 'rollup' && (
              <div className="space-y-4">
                {/* Supply Filter Tabs */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#969DA5]">Filter Rollup:</span>
                  {(['ALL', 'MAKE', 'BUY'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setRollupSupplyFilter(filter)}
                      className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                        rollupSupplyFilter === filter
                          ? 'bg-[#64D6C5] text-[#111315] font-bold'
                          : 'bg-[#191C1F] text-[#969DA5] hover:text-[#F0F1F2] border border-[#22262A]'
                      }`}
                    >
                      {filter} Items
                    </button>
                  ))}
                </div>

                <div className="border border-[#22262A] rounded bg-[#14171A] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#22262A] bg-[#191C1F] text-[11px] font-mono text-[#969DA5]">
                        <th className="py-2.5 px-3">Component Item Code</th>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Supply</th>
                        <th className="py-2.5 px-3">Sourcing</th>
                        <th className="py-2.5 px-3 text-right">Net Qty</th>
                        <th className="py-2.5 px-3 text-right">Scrap Allowance</th>
                        <th className="py-2.5 px-3 text-right">Gross Qty</th>
                        <th className="py-2.5 px-3 text-right bg-[#191C1F]/90 text-[#64D6C5]">
                          Practical Procurement Suggestion
                        </th>
                        <th className="py-2.5 px-3 text-center">Usages</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#22262A] text-xs font-mono">
                      {!explosionResult || explosionResult.summary.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-12 text-center text-[#969DA5]">
                            <Boxes size={24} className="mx-auto mb-2 opacity-40 text-[#64D6C5]" />
                            <p className="font-sans">No summary items available.</p>
                          </td>
                        </tr>
                      ) : (
                        explosionResult.summary
                          .filter((item) => {
                            if (rollupSupplyFilter !== 'ALL' && item.supply_classification !== rollupSupplyFilter) {
                              return false;
                            }
                            return true;
                          })
                          .map((item) => {
                            const procurementQty = calculateProcurementQuantity(
                              item.total_gross_quantity,
                              item.unit
                            );
                            const isDiscrete = isDiscreteUnit(item.unit);

                            return (
                              <tr key={item.product_id} className="hover:bg-[#191C1F] transition-colors">
                                <td className="py-2.5 px-3 font-semibold text-[#64D6C5]">
                                  {item.item_code}
                                </td>
                                <td className="py-2.5 px-3 text-[#F0F1F2] font-sans">
                                  {item.name}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#22262A] text-[#969DA5]">
                                    {item.item_type}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  {renderSupplyBadge(item.supply_classification)}
                                </td>
                                <td className="py-2.5 px-3">
                                  {renderSourcingBadge(item.preferred_sourcing)}
                                </td>
                                <td className="py-2.5 px-3 text-right text-[#969DA5]">
                                  {item.total_net_quantity.toFixed(2)} {item.unit}
                                </td>
                                <td className="py-2.5 px-3 text-right text-[#969DA5]">
                                  {item.scrap_allowance_quantity > 0 ? (
                                    <span className="text-amber-400">
                                      +{item.scrap_allowance_quantity.toFixed(2)}
                                    </span>
                                  ) : (
                                    '0.00'
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right text-[#F0F1F2]">
                                  {item.total_gross_quantity.toFixed(2)} {item.unit}
                                </td>
                                <td className="py-2.5 px-3 text-right bg-[#191C1F]/50 font-bold text-[#64D6C5]">
                                  {isDiscrete ? (
                                    <span>
                                      {procurementQty} {item.unit}
                                      <span className="text-[10px] text-[#969DA5] ml-1 font-normal">
                                        (ceil)
                                      </span>
                                    </span>
                                  ) : (
                                    <span>
                                      {item.total_gross_quantity.toFixed(3)} {item.unit}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span
                                    className="px-1.5 py-0.5 rounded text-[10px] bg-[#22262A] text-[#969DA5]"
                                    title={item.usage_paths.join('\n')}
                                  >
                                    {item.usage_count} branch{item.usage_count > 1 ? 'es' : ''}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

                {/* Practical procurement explanation footnote */}
                <div className="p-3 rounded bg-[#191C1F] border border-[#22262A] text-[11px] text-[#969DA5] flex items-center gap-2">
                  <Info size={14} className="text-[#64D6C5] shrink-0" />
                  <span>
                    <strong>Practical Whole-Unit Procurement Rule:</strong> Discrete components (e.g. EA, SET, PCS) round up to the next integer for purchase order calculations to ensure whole units are ordered, while raw materials (e.g. KG, M, MM) remain exact to 3 decimal places without rounding.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: VALIDATION & RELEASE INTERFACE */}
        {/* ========================================================================= */}
        {activeTab === 'validation' && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-[#191C1F] border border-[#22262A] rounded p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-[#F0F1F2]">
                    BOM Diagnostic Validation & Release
                  </h3>
                  <p className="text-xs text-[#969DA5] mt-1">
                    Verifies circular dependencies, missing subassembly definitions, unit consistency, and engineering completeness.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => selectedBomId && triggerValidation(selectedBomId)}
                    className="px-3 py-1.5 rounded bg-[#22262A] hover:bg-[#34393F] text-[#F0F1F2] text-xs font-medium flex items-center gap-1.5 border border-[#34393F] transition-colors"
                  >
                    <RefreshCw size={13} className={loadingValidation ? 'animate-spin' : ''} />
                    Re-run Diagnostics
                  </button>

                  {selectedBOM?.status === 'DRAFT' && (
                    <button
                      onClick={() => setIsReleaseConfirmOpen(true)}
                      disabled={!validationResult || !validationResult.valid || validationResult.errors.length > 0}
                      className={`px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        validationResult && validationResult.valid && validationResult.errors.length === 0
                          ? 'bg-emerald-500 text-[#111315] hover:bg-emerald-400'
                          : 'bg-emerald-500/20 text-emerald-500/40 cursor-not-allowed'
                      }`}
                    >
                      <Lock size={13} /> Release BOM for Production
                    </button>
                  )}
                </div>
              </div>

              {/* Status Banner */}
              {validationResult && (
                <div className="mt-4 pt-4 border-t border-[#22262A]">
                  <div className="flex items-center gap-3">
                    {validationResult.errors.length === 0 ? (
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Check size={16} />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                        <X size={16} />
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-bold text-[#F0F1F2]">
                        {validationResult.errors.length === 0
                          ? 'BOM Structure Valid & Ready for Release'
                          : 'Validation Failures Detected'}
                      </div>
                      <div className="text-xs text-[#969DA5]">
                        Checked at: {new Date(validationResult.checked_at).toLocaleTimeString()} •{' '}
                        {validationResult.errors.length} error(s), {validationResult.warnings.length} warning(s)
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Validation Findings */}
            {validationResult && (
              <div className="space-y-4">
                {/* Errors List */}
                {validationResult.errors.length > 0 && (
                  <div className="border border-red-500/30 rounded bg-red-500/5 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-red-400 font-semibold text-xs uppercase tracking-wider font-mono">
                      <AlertTriangle size={15} />
                      <span>Release-Blocking Errors ({validationResult.errors.length})</span>
                    </div>
                    <ul className="space-y-1.5 pl-5 list-disc text-xs text-red-300 font-sans">
                      {validationResult.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings List */}
                {validationResult.warnings.length > 0 && (
                  <div className="border border-amber-500/30 rounded bg-amber-500/5 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wider font-mono">
                      <Info size={15} />
                      <span>Advisory Warnings ({validationResult.warnings.length})</span>
                    </div>
                    <ul className="space-y-1.5 pl-5 list-disc text-xs text-amber-300 font-sans">
                      {validationResult.warnings.map((warn, idx) => (
                        <li key={idx}>{warn}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Passed Checks */}
                {validationResult.errors.length === 0 && (
                  <div className="border border-emerald-500/30 rounded bg-emerald-500/5 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider font-mono">
                      <CheckCircle2 size={15} />
                      <span>All Integrity Checks Passed</span>
                    </div>
                    <p className="text-xs text-emerald-300/80">
                      No circular dependency cycles detected. Direct components resolve accurately. Supply classifications and base units are aligned.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CREATE BOM */}
      {/* ========================================================================= */}
      {isCreateBOMOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-[#191C1F] border border-[#34393F] rounded shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-5 py-4 border-b border-[#22262A] flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#F0F1F2] flex items-center gap-2">
                <Plus size={16} className="text-[#64D6C5]" /> Create Bill of Materials
              </h2>
              <button
                onClick={() => setIsCreateBOMOpen(false)}
                className="text-[#969DA5] hover:text-[#F0F1F2]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateBOM} className="p-5 space-y-4">
              {modalError && (
                <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {modalError}
                </div>
              )}

              <div>
                <label className="text-[11px] text-[#969DA5] font-mono block mb-1">
                  Parent Finished Product or Subassembly *
                </label>
                <select
                  value={createBOMForm.parent_product_id}
                  onChange={(e) => {
                    const prodId = e.target.value;
                    const prod = products.find((p) => p.id === prodId);
                    setCreateBOMForm({
                      ...createBOMForm,
                      parent_product_id: prodId,
                      bom_code: prod ? `BOM-${prod.item_code}-01` : createBOMForm.bom_code,
                      unit: prod ? prod.base_unit : 'EA',
                    });
                  }}
                  className="w-full px-3 py-1.5 rounded bg-[#14171A] border border-[#34393F] text-xs text-[#F0F1F2] focus:outline-hidden focus:border-[#64D6C5]"
                  required
                >
                  <option value="">Select a product...</option>
                  {products
                    .filter(
                      (p) =>
                        p.item_type === 'FINISHED_PRODUCT' ||
                        p.item_type === 'SUBASSEMBLY'
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.item_code} — {p.name} ({p.item_type})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#969DA5] font-mono block mb-1">
                    BOM Code *
                  </label>
                  <input
                    type="text"
                    value={createBOMForm.bom_code}
                    onChange={(e) => setCreateBOMForm({ ...createBOMForm, bom_code: e.target.value })}
                    className="w-full px-3 py-1.5 rounded bg-[#14171A] border border-[#34393F] text-xs font-mono text-[#F0F1F2] focus:outline-hidden focus:border-[#64D6C5]"
                    placeholder="BOM-PRD-01"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#969DA5] font-mono block mb-1">
                    Alternate Code
                  </label>
                  <input
                    type="text"
                    value={createBOMForm.alt_code}
                    onChange={(e) => setCreateBOMForm({ ...createBOMForm, alt_code: e.target.value })}
                    className="w-full px-3 py-1.5 rounded bg-[#14171A] border border-[#34393F] text-xs font-mono text-[#F0F1F2] focus:outline-hidden focus:border-[#64D6C5]"
                    placeholder="01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#969DA5] font-mono block mb-1">
                    Base Output Quantity
                  </label>
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    value={createBOMForm.base_quantity}
                    onChange={(e) =>
                      setCreateBOMForm({
                        ...createBOMForm,
                        base_quantity: parseFloat(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-1.5 rounded bg-[#14171A] border border-[#34393F] text-xs font-mono text-[#F0F1F2] focus:outline-hidden focus:border-[#64D6C5]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#969DA5] font-mono block mb-1">
                    Unit of Measure
                  </label>
                  <input
                    type="text"
                    value={createBOMForm.unit}
                    onChange={(e) => setCreateBOMForm({ ...createBOMForm, unit: e.target.value })}
                    className="w-full px-3 py-1.5 rounded bg-[#14171A] border border-[#34393F] text-xs font-mono text-[#F0F1F2] focus:outline-hidden focus:border-[#64D6C5]"
                    placeholder="EA"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[#969DA5] font-mono block mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={createBOMForm.notes}
                  onChange={(e) => setCreateBOMForm({ ...createBOMForm, notes: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-[#14171A] border border-[#34393F] text-xs text-[#F0F1F2] focus:outline-hidden focus:border-[#64D6C5]"
                  placeholder="Primary manufacturing routing notes..."
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#22262A]">
                <button
                  type="button"
                  onClick={() => setIsCreateBOMOpen(false)}
                  className="px-3 py-1.5 rounded bg-[#22262A] text-xs text-[#969DA5] hover:text-[#F0F1F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#64D6C5] text-[#111315] font-semibold text-xs hover:bg-[#52beaf] transition-colors"
                >
                  Create BOM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT LINE */}
      {/* ========================================================================= */}
      {isAddLineOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-[#191C1F] border border-[#34393F] rounded shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-5 py-4 border-b border-[#22262A] flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#F0F1F2] flex items-center gap-2">
                {editingLine ? (
                  <>
                    <Edit2 size={16} className="text-[#64D6C5]" /> Edit Component Line #{editingLine.line_number}
                  </>
                ) : (
                  <>
                    <Plus size={16} className="text-[#64D6C5]" /> Add Component Line
                  </>
                )}
              </h2>
              <button
                onClick={() => setIsAddLineOpen(false)}
                className="text-[#969DA5] hover:text-[#F0F1F2]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveLine} className="p-5 space-y-4">
              {modalError && (
                <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-[11px] text-[#969DA5] font-mono block mb-1">
                    Line #
                  </label>
                  <input
                    type="number"
                    value={lineForm.line_number}
                    onChange={(e) =>
                      setLineForm({ ...lineForm, line_number: parseInt(e.target.value) || 10 })
                    }
                    className="w-full px-3 py-1.5 rounded bg-[#14171A] border border-[#34393F] text-xs font-mono text-[#F0F1F2] focus:outline-hidden focus:border-[#64D6C5]"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] text-[#969DA5] font-mono block mb-1">
                    Component Product *
                  </label>
                  <select
                    disabled={!!editingLine}
                    value={lineForm.component_product_id}
                    onChange={(e) => {
                      const prodId = e.target.value;
                      const prod = products.find((p) => p.id === prodId);
                      setLineForm({
                        ...lineForm,
                        component_product_id: prodId,
                        unit: prod ? prod.base_unit : lineForm.unit,
                      });
                    }}
                    className="w-full px-3 py-1.5 rounded bg-[#14171A] border border-[#34393F] text-xs text-[#F0F1F2] focus:outline-hidden focus:border-[#64D6C5] disabled:opacity-50"
                    required
                  >
                    <option value="">Select component product...</option>
                    {products
                      .filter((p) => p.id !== selectedBOM?.parent_product_id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.item_code} — {p.name} ({p.item_type})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-[#969DA5] font-mono block mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    value={lineForm.quantity}
                    onChange={(e) =>
                      setLineForm({ ...lineForm, quantity: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-1.5 rounded bg-[#14171A] border border-[#34393F] text-xs font-mono text-[#F0F1F2] focus:outline-hidden focus:border-[#64D6C5]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#969DA5] font-mono block mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={lineForm.unit}
                    onChange={(e) => setLineForm({ ...lineForm, unit: e.target.value })}
                    className="w-full px-3 py-1.5 rounded bg-[#14171A] border border-[#34393F] text-xs font-mono text-[#F0F1F2] focus:outline-hidden focus:border-[#64D6C5]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#969DA5] font-mono block mb-1">
                    Scrap %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={lineForm.scrap_percentage}
                    onChange={(e) =>
                      setLineForm({
                        ...lineForm,
                        scrap_percentage: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-1.5 rounded bg-[#14171A] border border-[#34393F] text-xs font-mono text-[#F0F1F2] focus:outline-hidden focus:border-[#64D6C5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#969DA5] font-mono block mb-1">
                    Supply Classification
                  </label>
                  <select
                    value={lineForm.supply_classification}
                    onChange={(e) =>
                      setLineForm({
                        ...lineForm,
                        supply_classification: e.target.value as SupplyClassification,
                      })
                    }
                    className="w-full px-3 py-1.5 rounded bg-[#14171A] border border-[#34393F] text-xs text-[#F0F1F2] focus:outline-hidden focus:border-[#64D6C5]"
                  >
                    <option value="MAKE">MAKE (Fabricated / Machined)</option>
                    <option value="BUY">BUY (Purchased standard)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[#969DA5] font-mono block mb-1">
                    Preferred Sourcing
                  </label>
                  <select
                    value={lineForm.preferred_sourcing}
                    onChange={(e) =>
                      setLineForm({
                        ...lineForm,
                        preferred_sourcing: e.target.value as PreferredSourcing,
                      })
                    }
                    className="w-full px-3 py-1.5 rounded bg-[#14171A] border border-[#34393F] text-xs text-[#F0F1F2] focus:outline-hidden focus:border-[#64D6C5]"
                  >
                    <option value="INTERNAL">INTERNAL (Internal Shop)</option>
                    <option value="LOCAL">LOCAL (Domestic Vendor)</option>
                    <option value="IMPORTED">IMPORTED (Overseas)</option>
                    <option value="ANY">ANY (Flexible / Spot)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[#969DA5] font-mono block mb-1">Notes</label>
                <input
                  type="text"
                  value={lineForm.notes}
                  onChange={(e) => setLineForm({ ...lineForm, notes: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-[#14171A] border border-[#34393F] text-xs text-[#F0F1F2] focus:outline-hidden focus:border-[#64D6C5]"
                  placeholder="Assembly step notes, torque specs, or vendor ref..."
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#22262A]">
                <button
                  type="button"
                  onClick={() => setIsAddLineOpen(false)}
                  className="px-3 py-1.5 rounded bg-[#22262A] text-xs text-[#969DA5] hover:text-[#F0F1F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#64D6C5] text-[#111315] font-semibold text-xs hover:bg-[#52beaf] transition-colors"
                >
                  {editingLine ? 'Save Changes' : 'Add Line'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRM RELEASE */}
      {/* ========================================================================= */}
      {isReleaseConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#191C1F] border border-[#34393F] rounded shadow-2xl p-5 space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 text-emerald-400">
              <Lock size={22} />
              <h3 className="text-sm font-bold text-[#F0F1F2]">Release BOM for Production</h3>
            </div>

            <p className="text-xs text-[#969DA5] leading-relaxed">
              Are you sure you want to release BOM <strong className="text-[#F0F1F2]">{selectedBOM?.bom_code}</strong>?
            </p>
            <div className="p-3 rounded bg-[#14171A] border border-[#22262A] text-[11px] text-[#969DA5] space-y-1">
              <div>• Freezes all components and line quantities.</div>
              <div>• Prevents accidental edits on the shop floor.</div>
              <div>• Releasing is permanent and establishes an immutable engineering baseline.</div>
            </div>

            {modalError && (
              <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {modalError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsReleaseConfirmOpen(false)}
                className="px-3 py-1.5 rounded bg-[#22262A] text-xs text-[#969DA5] hover:text-[#F0F1F2]"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRelease}
                className="px-4 py-1.5 rounded bg-emerald-500 text-[#111315] font-bold text-xs hover:bg-emerald-400 transition-colors"
              >
                Confirm & Release
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE LINE CONFIRM */}
      {/* ========================================================================= */}
      {deletingLineId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-[#191C1F] border border-[#34393F] rounded shadow-2xl p-5 space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-[#F0F1F2] flex items-center gap-2">
              <Trash2 size={16} className="text-red-400" /> Remove BOM Component Line
            </h3>
            <p className="text-xs text-[#969DA5]">
              Are you sure you want to remove this line from the Bill of Materials?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingLineId(null)}
                className="px-3 py-1.5 rounded bg-[#22262A] text-xs text-[#969DA5] hover:text-[#F0F1F2]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteLine(deletingLineId)}
                className="px-3 py-1.5 rounded bg-red-500 text-white font-semibold text-xs hover:bg-red-600 transition-colors"
              >
                Delete Line
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE BOM CONFIRM */}
      {/* ========================================================================= */}
      {deletingBomId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-[#191C1F] border border-[#34393F] rounded shadow-2xl p-5 space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-[#F0F1F2] flex items-center gap-2">
              <Trash2 size={16} className="text-red-400" /> Delete Draft BOM
            </h3>
            <p className="text-xs text-[#969DA5]">
              Are you sure you want to delete this draft Bill of Materials? All associated component lines will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingBomId(null)}
                className="px-3 py-1.5 rounded bg-[#22262A] text-xs text-[#969DA5] hover:text-[#F0F1F2]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteBOM(deletingBomId)}
                className="px-3 py-1.5 rounded bg-red-500 text-white font-semibold text-xs hover:bg-red-600 transition-colors"
              >
                Delete BOM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
