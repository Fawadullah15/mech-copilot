import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Archive,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  History,
  Layers,
  FileText,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type {
  Product,
  ProductWithRevisions,
  ProductRevision,
  ItemType,
  LifecycleStatus,
} from '../types/manufacturing';
import {
  fetchProducts,
  fetchProductById,
  createProduct,
  updateProduct,
  archiveProduct,
  deleteProduct,
  createProductRevision,
  releaseProductRevision,
  obsoleteProductRevision,
  CreateProductPayload,
  UpdateProductPayload,
  CreateRevisionPayload,
} from '../services/productApi';
import { fetchBOMs } from '../services/bomApi';
import type { BOMHeader } from '../types/manufacturing';

export default function ProductsManagementPage() {
  const { setActivePage } = useApp();

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [includeArchived, setIncludeArchived] = useState<boolean>(false);

  // Detail & Selection states
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRevisions | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [associatedBOMs, setAssociatedBOMs] = useState<BOMHeader[]>([]);

  // Modals & Drawers
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [isNewRevOpen, setIsNewRevOpen] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Creation Form State
  const [createForm, setCreateForm] = useState<CreateProductPayload>({
    item_code: '',
    name: '',
    description: '',
    item_type: 'COMPONENT',
    base_unit: 'EA',
    lifecycle_status: 'ACTIVE',
    initial_revision_code: 'A',
    initial_revision_notes: 'Initial engineering baseline',
  });

  // Edit Form State
  const [editForm, setEditForm] = useState<UpdateProductPayload>({
    name: '',
    description: '',
    item_type: 'COMPONENT',
    base_unit: 'EA',
    lifecycle_status: 'ACTIVE',
  });

  // New Revision Form State
  const [newRevForm, setNewRevForm] = useState<CreateRevisionPayload>({
    revision_code: '',
    notes: '',
    effective_date: new Date().toISOString().split('T')[0],
  });

  // Load products list
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProducts({
        search: search.trim() || undefined,
        item_type: typeFilter !== 'ALL' ? (typeFilter as ItemType) : undefined,
        lifecycle_status: statusFilter !== 'ALL' ? (statusFilter as LifecycleStatus) : undefined,
        is_archived: includeArchived ? 1 : 0,
      });
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter, includeArchived]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Load product detail when selected
  const loadProductDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    setActionError(null);
    try {
      const prod = await fetchProductById(id);
      setSelectedProduct(prod);
      setEditForm({
        name: prod.name,
        description: prod.description,
        item_type: prod.item_type,
        base_unit: prod.base_unit,
        lifecycle_status: prod.lifecycle_status,
      });

      // Load associated BOMs
      const boms = await fetchBOMs({ parent_product_id: id });
      setAssociatedBOMs(boms);
    } catch (err: any) {
      setActionError(err.message || 'Failed to load product details');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      loadProductDetail(selectedProductId);
    } else {
      setSelectedProduct(null);
      setAssociatedBOMs([]);
    }
  }, [selectedProductId, loadProductDetail]);

  // Flash message helper
  const notifySuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const finished = products.filter((p) => p.item_type === 'FINISHED_PRODUCT').length;
    const subassemblies = products.filter((p) => p.item_type === 'SUBASSEMBLY').length;
    const components = products.filter((p) => p.item_type === 'COMPONENT').length;
    const rawMaterials = products.filter((p) => p.item_type === 'RAW_MATERIAL').length;
    const total = products.length;
    return { finished, subassemblies, components, rawMaterials, total };
  }, [products]);

  // Handle Create Product
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      if (!createForm.item_code.trim()) throw new Error('Item code is required');
      if (!createForm.name.trim()) throw new Error('Product name is required');

      const created = await createProduct({
        ...createForm,
        item_code: createForm.item_code.trim().toUpperCase(),
        base_unit: createForm.base_unit.trim().toUpperCase(),
      });

      setIsCreateOpen(false);
      setCreateForm({
        item_code: '',
        name: '',
        description: '',
        item_type: 'COMPONENT',
        base_unit: 'EA',
        lifecycle_status: 'ACTIVE',
        initial_revision_code: 'A',
        initial_revision_notes: 'Initial engineering baseline',
      });
      notifySuccess(`Product '${created.item_code}' successfully created.`);
      await loadProducts();
      setSelectedProductId(created.id);
    } catch (err: any) {
      setActionError(err.message || 'Failed to create product');
    }
  };

  // Handle Update Product
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;
    setActionError(null);
    try {
      const updated = await updateProduct(selectedProductId, editForm);
      setSelectedProduct(updated);
      setIsEditOpen(false);
      notifySuccess(`Product '${updated.item_code}' updated successfully.`);
      await loadProducts();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update product');
    }
  };

  // Handle Archive Product
  const handleArchive = async (id: string) => {
    if (!window.confirm('Are you sure you want to archive this product?')) return;
    setActionError(null);
    try {
      const archived = await archiveProduct(id);
      notifySuccess(`Product '${archived.item_code}' archived.`);
      await loadProducts();
      if (selectedProductId === id) {
        setSelectedProduct(archived);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to archive product');
    }
  };

  // Handle Delete Product
  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Permanently delete product '${code}'? This cannot be undone.`)) return;
    setActionError(null);
    try {
      await deleteProduct(id);
      notifySuccess(`Product '${code}' deleted.`);
      setSelectedProductId(null);
      await loadProducts();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete product');
    }
  };

  // Handle Create Revision
  const handleCreateRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;
    setActionError(null);
    try {
      if (!newRevForm.revision_code.trim()) throw new Error('Revision code is required');
      await createProductRevision(selectedProductId, {
        revision_code: newRevForm.revision_code.trim().toUpperCase(),
        notes: newRevForm.notes,
        effective_date: newRevForm.effective_date,
      });

      setIsNewRevOpen(false);
      setNewRevForm({
        revision_code: '',
        notes: '',
        effective_date: new Date().toISOString().split('T')[0],
      });
      notifySuccess('New draft revision created.');
      await loadProductDetail(selectedProductId);
    } catch (err: any) {
      setActionError(err.message || 'Failed to create revision');
    }
  };

  // Handle Release Revision
  const handleReleaseRevision = async (revId: string, revCode: string) => {
    if (!selectedProductId) return;
    if (!window.confirm(`Release revision '${revCode}'? Once released, this engineering revision is locked and immutable.`)) return;
    setActionError(null);
    try {
      await releaseProductRevision(selectedProductId, revId);
      notifySuccess(`Revision '${revCode}' released successfully.`);
      await loadProductDetail(selectedProductId);
    } catch (err: any) {
      setActionError(err.message || 'Failed to release revision');
    }
  };

  // Handle Obsolete Revision
  const handleObsoleteRevision = async (revId: string, revCode: string) => {
    if (!selectedProductId) return;
    if (!window.confirm(`Mark revision '${revCode}' as obsolete?`)) return;
    setActionError(null);
    try {
      await obsoleteProductRevision(selectedProductId, revId);
      notifySuccess(`Revision '${revCode}' marked as obsolete.`);
      await loadProductDetail(selectedProductId);
    } catch (err: any) {
      setActionError(err.message || 'Failed to obsolete revision');
    }
  };

  // Badge helpers
  const getItemTypeBadge = (type: ItemType) => {
    switch (type) {
      case 'FINISHED_PRODUCT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">FINISHED PRODUCT</span>;
      case 'SUBASSEMBLY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">SUBASSEMBLY</span>;
      case 'COMPONENT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">COMPONENT</span>;
      case 'RAW_MATERIAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">RAW MATERIAL</span>;
      case 'CONSUMABLE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">CONSUMABLE</span>;
    }
  };

  const getStatusBadge = (status: LifecycleStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-950 text-emerald-300 border border-emerald-700/50">ACTIVE</span>;
      case 'DRAFT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-yellow-950 text-yellow-300 border border-yellow-700/50">DRAFT</span>;
      case 'PHASED_OUT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-950 text-amber-300 border border-amber-700/50">PHASED OUT</span>;
      case 'ARCHIVED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700">ARCHIVED</span>;
    }
  };

  const getRevisionStatusBadge = (status: 'DRAFT' | 'RELEASED' | 'OBSOLETE') => {
    switch (status) {
      case 'RELEASED':
        return <span className="flex items-center gap-1 text-[10px] font-mono font-semibold text-emerald-400"><Lock size={10} /> RELEASED</span>;
      case 'DRAFT':
        return <span className="text-[10px] font-mono font-semibold text-yellow-400">DRAFT</span>;
      case 'OBSOLETE':
        return <span className="text-[10px] font-mono font-semibold text-slate-400">OBSOLETE</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto bg-[#111315] text-[#F0F1F2] font-sans animate-fade-in">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#2A2E35]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Manufacturing Operations Master
            </span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Package className="text-cyan-400" size={24} />
            Product Master & Engineering Revisions
          </h1>
          <p className="text-xs text-[#969DA5] mt-0.5">
            Central repository of machine products, subassemblies, manufactured parts, and raw materials.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadProducts()}
            disabled={loading}
            className="px-3 py-2 text-xs font-mono font-medium rounded-[3px] bg-[#191C1F] hover:bg-[#22262A] text-slate-300 border border-[#34393F] transition-colors flex items-center gap-1.5"
            title="Refresh product catalog"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => {
              setActionError(null);
              setIsCreateOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold uppercase tracking-wider rounded-[3px] bg-[#64D6C5] hover:bg-[#52bead] text-navy-950 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={15} />
            New Product
          </button>
        </div>
      </div>

      {/* ─── Notifications & Alerts ─── */}
      {successMessage && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-[3px] text-xs font-mono text-emerald-200 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-950/80 border border-red-500/40 rounded-[3px] text-xs font-mono text-red-200 flex items-center gap-2 animate-fade-in">
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── Metrics / Stats Ribbon ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
        <div className="bg-[#14171A] border border-[#2A2E35] p-3 rounded-[3px]">
          <span className="text-[10px] text-[#6C737D] uppercase tracking-wider block">Total Items</span>
          <span className="text-lg font-bold text-white">{stats.total}</span>
        </div>
        <div className="bg-[#14171A] border border-[#2A2E35] p-3 rounded-[3px]">
          <span className="text-[10px] text-emerald-400 uppercase tracking-wider block">Finished Machines</span>
          <span className="text-lg font-bold text-emerald-300">{stats.finished}</span>
        </div>
        <div className="bg-[#14171A] border border-[#2A2E35] p-3 rounded-[3px]">
          <span className="text-[10px] text-cyan-400 uppercase tracking-wider block">Subassemblies</span>
          <span className="text-lg font-bold text-cyan-300">{stats.subassemblies}</span>
        </div>
        <div className="bg-[#14171A] border border-[#2A2E35] p-3 rounded-[3px]">
          <span className="text-[10px] text-blue-400 uppercase tracking-wider block">Components</span>
          <span className="text-lg font-bold text-blue-300">{stats.components}</span>
        </div>
        <div className="bg-[#14171A] border border-[#2A2E35] p-3 rounded-[3px]">
          <span className="text-[10px] text-amber-400 uppercase tracking-wider block">Raw Materials</span>
          <span className="text-lg font-bold text-amber-300">{stats.rawMaterials}</span>
        </div>
      </div>

      {/* ─── Search & Filters Bar ─── */}
      <div className="bg-[#14171A] border border-[#2A2E35] p-3 rounded-[3px] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6C737D]" />
          <input
            type="text"
            placeholder="Search by Item Code, Description, or Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#191C1F] border border-[#2A2E35] focus:border-[#64D6C5] rounded-[3px] text-slate-100 placeholder-[#6C737D] outline-hidden font-mono text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 font-mono text-slate-400">
            <Filter size={13} className="text-[#64D6C5]" />
            <span className="text-[10px] uppercase">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#191C1F] border border-[#2A2E35] text-slate-200 rounded-[3px] px-2 py-1 outline-hidden text-xs"
            >
              <option value="ALL">All Types</option>
              <option value="FINISHED_PRODUCT">Finished Products</option>
              <option value="SUBASSEMBLY">Subassemblies</option>
              <option value="COMPONENT">Components</option>
              <option value="RAW_MATERIAL">Raw Materials</option>
              <option value="CONSUMABLE">Consumables</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-slate-400">
            <span className="text-[10px] uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#191C1F] border border-[#2A2E35] text-slate-200 rounded-[3px] px-2 py-1 outline-hidden text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="PHASED_OUT">Phased Out</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <label className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="rounded-[2px] bg-[#191C1F] border-[#34393F] text-[#64D6C5] focus:ring-0"
            />
            <span>Show Archived</span>
          </label>
        </div>
      </div>

      {/* ─── Product Catalog Table ─── */}
      <div className="bg-[#14171A] border border-[#2A2E35] rounded-[3px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#191C1F] border-b border-[#2A2E35] font-mono text-[10px] uppercase tracking-wider text-[#969DA5]">
                <th className="py-2.5 px-3">Item Code</th>
                <th className="py-2.5 px-3">Name & Description</th>
                <th className="py-2.5 px-3">Classification</th>
                <th className="py-2.5 px-2 text-center">Unit</th>
                <th className="py-2.5 px-3">Lifecycle</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#22262A] font-mono">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#969DA5]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={20} className="animate-spin text-[#64D6C5]" />
                      <span>Loading manufacturing product catalog...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#969DA5]">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Package size={28} className="mx-auto text-[#6C737D]" />
                      <p className="font-semibold text-slate-200">No products found</p>
                      <p className="text-[11px] text-[#6C737D]">
                        No manufacturing components match the search criteria or catalog is empty.
                      </p>
                      <button
                        onClick={() => setIsCreateOpen(true)}
                        className="mt-2 px-3 py-1.5 text-xs font-semibold bg-[#64D6C5] text-navy-950 rounded-[3px] hover:bg-[#52bead]"
                      >
                        Create First Product
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((prod) => (
                  <tr
                    key={prod.id}
                    onClick={() => setSelectedProductId(prod.id)}
                    className={`hover:bg-[#1C2024] cursor-pointer transition-colors ${
                      selectedProductId === prod.id ? 'bg-[#22262A]' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#64D6C5]">{prod.item_code}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 max-w-xs truncate font-sans">
                      <div className="font-medium text-slate-100 truncate">{prod.name}</div>
                      {prod.description && (
                        <div className="text-[11px] text-[#6C737D] truncate">{prod.description}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {getItemTypeBadge(prod.item_type)}
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-300 font-bold whitespace-nowrap">
                      {prod.base_unit}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {getStatusBadge(prod.lifecycle_status)}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedProductId(prod.id)}
                          className="px-2 py-1 bg-[#191C1F] hover:bg-[#2A2E35] text-slate-200 border border-[#34393F] rounded-[2px] text-[10px] font-mono"
                          title="Inspect Product & Revisions"
                        >
                          Details →
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Slide-Over Product Details & Revision Drawer ─── */}
      {selectedProductId && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[540px] bg-[#14171A] border-l border-[#2A2E35] shadow-2xl flex flex-col font-sans animate-fade-in">
          {/* Drawer Header */}
          <div className="p-4 bg-[#191C1F] border-b border-[#2A2E35] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-[#64D6C5]" />
              <div>
                <span className="font-mono text-xs font-bold text-[#64D6C5]">
                  {selectedProduct?.item_code || 'Loading...'}
                </span>
                <h2 className="text-sm font-bold text-white truncate max-w-sm">
                  {selectedProduct?.name || 'Product Details'}
                </h2>
              </div>
            </div>
            <button
              onClick={() => setSelectedProductId(null)}
              className="p-1 hover:bg-[#22262A] text-slate-400 hover:text-white rounded-[3px] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
            {loadingDetail ? (
              <div className="py-20 text-center text-[#969DA5] flex flex-col items-center gap-2 font-mono">
                <RefreshCw size={24} className="animate-spin text-[#64D6C5]" />
                <span>Loading product specifications & revision history...</span>
              </div>
            ) : selectedProduct ? (
              <>
                {actionError && (
                  <div className="p-2.5 bg-red-950 border border-red-500/40 rounded-[3px] font-mono text-[11px] text-red-200 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-400 shrink-0" />
                    <span>{actionError}</span>
                  </div>
                )}

                {/* Classification Badges */}
                <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-[#2A2E35]">
                  {getItemTypeBadge(selectedProduct.item_type)}
                  {getStatusBadge(selectedProduct.lifecycle_status)}
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#22262A] text-slate-300 border border-[#34393F]">
                    Base Unit: <strong>{selectedProduct.base_unit}</strong>
                  </span>
                </div>

                {/* Core Specifications Card */}
                <div className="bg-[#191C1F] border border-[#2A2E35] rounded-[3px] p-3 space-y-2">
                  <div className="flex justify-between items-center text-[11px] font-mono text-[#969DA5] border-b border-[#2A2E35] pb-1.5">
                    <span className="uppercase font-bold text-[#64D6C5]">Product Master Details</span>
                    <button
                      onClick={() => setIsEditOpen(true)}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <Edit2 size={11} /> Edit Specs
                    </button>
                  </div>

                  <p className="text-slate-300 text-xs leading-relaxed">
                    {selectedProduct.description || 'No description provided.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                    <div>
                      <span className="text-[#6C737D] block text-[9px] uppercase">Internal ID</span>
                      <span className="text-slate-300 truncate block">{selectedProduct.id}</span>
                    </div>
                    <div>
                      <span className="text-[#6C737D] block text-[9px] uppercase">Created At</span>
                      <span className="text-slate-300">{new Date(selectedProduct.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* ─── Engineering Revisions Section ─── */}
                <div className="bg-[#191C1F] border border-[#2A2E35] rounded-[3px] p-3 space-y-3">
                  <div className="flex justify-between items-center text-[11px] font-mono text-[#969DA5] border-b border-[#2A2E35] pb-1.5">
                    <span className="uppercase font-bold text-[#64D6C5] flex items-center gap-1.5">
                      <History size={13} /> Engineering Revisions
                    </span>
                    <button
                      onClick={() => setIsNewRevOpen(true)}
                      className="px-2 py-0.5 bg-[#22262A] hover:bg-[#2A2E35] text-cyan-300 border border-[#34393F] rounded-[2px] text-[10px] flex items-center gap-1"
                    >
                      <Plus size={10} /> New Revision
                    </button>
                  </div>

                  <div className="space-y-2">
                    {selectedProduct.revisions.map((rev) => (
                      <div
                        key={rev.id}
                        className="p-2.5 bg-[#14171A] border border-[#2A2E35] rounded-[3px] space-y-1.5 font-mono text-xs"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white text-sm">
                            Revision {rev.revision_code}
                          </span>
                          {getRevisionStatusBadge(rev.revision_status)}
                        </div>

                        {rev.notes && (
                          <div className="text-[11px] text-slate-300 font-sans">
                            {rev.notes}
                          </div>
                        )}

                        <div className="flex justify-between items-center text-[10px] text-[#6C737D] pt-1 border-t border-[#22262A]">
                          <span>Effective: {rev.effective_date ? new Date(rev.effective_date).toLocaleDateString() : 'Immediate'}</span>
                          <div className="flex items-center gap-2">
                            {rev.revision_status === 'DRAFT' && (
                              <button
                                onClick={() => handleReleaseRevision(rev.id, rev.revision_code)}
                                className="text-emerald-400 hover:text-emerald-300 underline"
                              >
                                Release Revision
                              </button>
                            )}
                            {rev.revision_status === 'RELEASED' && (
                              <button
                                onClick={() => handleObsoleteRevision(rev.id, rev.revision_code)}
                                className="text-amber-400 hover:text-amber-300 underline"
                              >
                                Mark Obsolete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ─── Associated Bills of Materials ─── */}
                <div className="bg-[#191C1F] border border-[#2A2E35] rounded-[3px] p-3 space-y-2 font-mono text-xs">
                  <div className="flex justify-between items-center text-[11px] text-[#969DA5] border-b border-[#2A2E35] pb-1.5">
                    <span className="uppercase font-bold text-[#64D6C5] flex items-center gap-1.5">
                      <Layers size={13} /> Associated Bills of Materials
                    </span>
                    <button
                      onClick={() => setActivePage('boms')}
                      className="text-cyan-400 hover:text-cyan-300 text-[10px] flex items-center gap-0.5"
                    >
                      BOM Workstation →
                    </button>
                  </div>

                  {associatedBOMs.length === 0 ? (
                    <div className="py-3 text-center text-[#6C737D] text-[11px]">
                      No Bills of Materials defined for this product.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {associatedBOMs.map((b) => (
                        <div
                          key={b.id}
                          className="p-2 bg-[#14171A] border border-[#2A2E35] rounded-[2px] flex justify-between items-center text-xs"
                        >
                          <div>
                            <span className="font-bold text-white">{b.bom_code}</span>
                            <span className="text-[#6C737D] ml-2 text-[10px]">[{b.alt_code}]</span>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              b.status === 'RELEASED'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-yellow-950 text-yellow-400 border border-yellow-800'
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Danger Zone Actions */}
                <div className="pt-2 flex justify-between items-center border-t border-[#2A2E35] font-mono text-xs">
                  <button
                    onClick={() => handleArchive(selectedProduct.id)}
                    className="px-3 py-1.5 bg-[#22262A] hover:bg-[#2A2E35] text-amber-400 border border-[#34393F] rounded-[3px] flex items-center gap-1.5"
                  >
                    <Archive size={13} /> Archive Product
                  </button>
                  <button
                    onClick={() => handleDelete(selectedProduct.id, selectedProduct.item_code)}
                    className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 rounded-[3px] flex items-center gap-1.5"
                  >
                    <Trash2 size={13} /> Delete Product
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* ─── Modal: Create Product ─── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#14171A] border border-[#2A2E35] rounded-[4px] max-w-md w-full p-5 space-y-4 shadow-2xl font-sans animate-fade-in">
            <div className="flex justify-between items-center pb-2 border-b border-[#2A2E35]">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-[#64D6C5]" />
                <h3 className="font-bold text-white text-sm">Create New Manufacturing Product</h3>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-[#6C737D] hover:text-white">
                <X size={18} />
              </button>
            </div>

            {actionError && (
              <div className="p-2.5 bg-red-950 border border-red-500/40 rounded-[3px] font-mono text-[11px] text-red-200">
                {actionError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-[#969DA5] text-[10px] uppercase mb-1">Item Code / Part Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CNC-M01, SPDL-ASSY, BRG-6205"
                  value={createForm.item_code}
                  onChange={(e) => setCreateForm({ ...createForm, item_code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-1.5 bg-[#191C1F] border border-[#2A2E35] focus:border-[#64D6C5] rounded-[3px] text-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[#969DA5] text-[10px] uppercase mb-1">Product / Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3-Axis CNC Vertical Mill, Precision Spindle"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#191C1F] border border-[#2A2E35] focus:border-[#64D6C5] rounded-[3px] text-white outline-hidden font-sans"
                />
              </div>

              <div>
                <label className="block text-[#969DA5] text-[10px] uppercase mb-1">Classification Type *</label>
                <select
                  value={createForm.item_type}
                  onChange={(e) => setCreateForm({ ...createForm, item_type: e.target.value as ItemType })}
                  className="w-full px-3 py-1.5 bg-[#191C1F] border border-[#2A2E35] text-white rounded-[3px] outline-hidden"
                >
                  <option value="FINISHED_PRODUCT">Finished Product</option>
                  <option value="SUBASSEMBLY">Subassembly</option>
                  <option value="COMPONENT">Component</option>
                  <option value="RAW_MATERIAL">Raw Material</option>
                  <option value="CONSUMABLE">Consumable</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#969DA5] text-[10px] uppercase mb-1">Base Unit *</label>
                  <select
                    value={createForm.base_unit}
                    onChange={(e) => setCreateForm({ ...createForm, base_unit: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#191C1F] border border-[#2A2E35] text-white rounded-[3px] outline-hidden"
                  >
                    <option value="EA">EA (Each)</option>
                    <option value="SET">SET</option>
                    <option value="KG">KG (Kilograms)</option>
                    <option value="M">M (Meters)</option>
                    <option value="MM">MM (Millimeters)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#969DA5] text-[10px] uppercase mb-1">Initial Rev</label>
                  <input
                    type="text"
                    value={createForm.initial_revision_code}
                    onChange={(e) => setCreateForm({ ...createForm, initial_revision_code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 bg-[#191C1F] border border-[#2A2E35] text-white rounded-[3px] outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#969DA5] text-[10px] uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Manufacturing purpose, technical notes, or specs..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#191C1F] border border-[#2A2E35] text-white rounded-[3px] outline-hidden font-sans text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#2A2E35]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 bg-[#22262A] text-slate-300 rounded-[3px] hover:bg-[#2A2E35]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#64D6C5] text-navy-950 font-semibold rounded-[3px] hover:bg-[#52bead]"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Edit Product Metadata ─── */}
      {isEditOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#14171A] border border-[#2A2E35] rounded-[4px] max-w-md w-full p-5 space-y-4 shadow-2xl font-sans animate-fade-in">
            <div className="flex justify-between items-center pb-2 border-b border-[#2A2E35]">
              <h3 className="font-bold text-white text-sm">Edit Product: {selectedProduct.item_code}</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-[#6C737D] hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-[#969DA5] text-[10px] uppercase mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#191C1F] border border-[#2A2E35] text-white rounded-[3px] outline-hidden font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#969DA5] text-[10px] uppercase mb-1">Item Type</label>
                  <select
                    value={editForm.item_type}
                    onChange={(e) => setEditForm({ ...editForm, item_type: e.target.value as ItemType })}
                    className="w-full px-3 py-1.5 bg-[#191C1F] border border-[#2A2E35] text-white rounded-[3px] outline-hidden"
                  >
                    <option value="FINISHED_PRODUCT">Finished Product</option>
                    <option value="SUBASSEMBLY">Subassembly</option>
                    <option value="COMPONENT">Component</option>
                    <option value="RAW_MATERIAL">Raw Material</option>
                    <option value="CONSUMABLE">Consumable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#969DA5] text-[10px] uppercase mb-1">Lifecycle Status</label>
                  <select
                    value={editForm.lifecycle_status}
                    onChange={(e) => setEditForm({ ...editForm, lifecycle_status: e.target.value as LifecycleStatus })}
                    className="w-full px-3 py-1.5 bg-[#191C1F] border border-[#2A2E35] text-white rounded-[3px] outline-hidden"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="DRAFT">Draft</option>
                    <option value="PHASED_OUT">Phased Out</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#969DA5] text-[10px] uppercase mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#191C1F] border border-[#2A2E35] text-white rounded-[3px] outline-hidden font-sans text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#2A2E35]">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-3 py-1.5 bg-[#22262A] text-slate-300 rounded-[3px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#64D6C5] text-navy-950 font-semibold rounded-[3px]"
                >
                  Update Metadata
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: New Revision ─── */}
      {isNewRevOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#14171A] border border-[#2A2E35] rounded-[4px] max-w-md w-full p-5 space-y-4 shadow-2xl font-sans animate-fade-in">
            <div className="flex justify-between items-center pb-2 border-b border-[#2A2E35]">
              <h3 className="font-bold text-white text-sm">Create Revision for {selectedProduct.item_code}</h3>
              <button onClick={() => setIsNewRevOpen(false)} className="text-[#6C737D] hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRevision} className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-[#969DA5] text-[10px] uppercase mb-1">Revision Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B, C, 02"
                  value={newRevForm.revision_code}
                  onChange={(e) => setNewRevForm({ ...newRevForm, revision_code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-1.5 bg-[#191C1F] border border-[#2A2E35] text-white rounded-[3px] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[#969DA5] text-[10px] uppercase mb-1">Effective Date</label>
                <input
                  type="date"
                  value={newRevForm.effective_date}
                  onChange={(e) => setNewRevForm({ ...newRevForm, effective_date: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#191C1F] border border-[#2A2E35] text-white rounded-[3px] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[#969DA5] text-[10px] uppercase mb-1">Engineering Change Notes</label>
                <textarea
                  rows={3}
                  placeholder="Reason for revision, tolerance tweaks, drawing revisions..."
                  value={newRevForm.notes}
                  onChange={(e) => setNewRevForm({ ...newRevForm, notes: e.target.value })}
                  className="w-full px-3 py-1.5 bg-[#191C1F] border border-[#2A2E35] text-white rounded-[3px] outline-hidden font-sans text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#2A2E35]">
                <button
                  type="button"
                  onClick={() => setIsNewRevOpen(false)}
                  className="px-3 py-1.5 bg-[#22262A] text-slate-300 rounded-[3px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#64D6C5] text-navy-950 font-semibold rounded-[3px]"
                >
                  Create Draft Revision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
