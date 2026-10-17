import React, { useState } from 'react';
import {
  Search,
  Check,
  Layers,
  ArrowUpDown,
  Filter,
  SlidersHorizontal,
  ChevronRight,
  GitCompare,
  Zap,
  Info,
  X,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Material } from '../types';
import EngineeringStatusSymbol from '../components/brand/EngineeringStatusSymbol';
import Badge from '../components/ui/Badge';

export default function MaterialsPage() {
  const { allMaterials, selectedMaterial, selectMaterial, setActivePage, sendCopilotMessage } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [minYield, setMinYield] = useState<number>(0);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isCompareDrawerOpen, setIsCompareDrawerOpen] = useState(false);

  const categories = ['All', 'Carbon Steel', 'Alloy Steel', 'Stainless Steel', 'Aluminum Alloy', 'Titanium Alloy', 'Brass / Bronze'];

  const filteredMaterials = allMaterials.filter((mat) => {
    const matchesSearch =
      mat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mat.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mat.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || mat.category.toLowerCase().includes(selectedCategory.toLowerCase().split(' ')[0]);
    const matchesYield = mat.yieldStrength >= minYield;

    return matchesSearch && matchesCategory && matchesYield;
  });

  const getCostBadgeVariant = (category: string) => {
    switch (category) {
      case 'Low':
        return 'pass';
      case 'Medium':
        return 'info';
      case 'High':
        return 'warning';
      case 'Very High':
        return 'critical';
      default:
        return 'neutral';
    }
  };

  const toggleCompare = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= 3) return [prev[1], prev[2], id];
      return [...prev, id];
    });
  };

  const comparedMaterials = allMaterials.filter((m) => compareIds.includes(m.id));

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fade-in text-gray-100 max-w-7xl mx-auto flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-navy-800">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-accent mb-1">
            Materials Science Library
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
            Engineering Alloys & Metallurgical Database
          </h1>
          <p className="text-xs lg:text-sm text-gray-400 mt-1">
            Isotropic mechanical properties calibrated for stress, torsional shear, and fatigue life.
          </p>
        </div>

        {compareIds.length > 0 && (
          <button
            onClick={() => setIsCompareDrawerOpen(true)}
            className="btn-primary text-xs flex items-center gap-2 py-2 px-4 rounded-lg shadow-md shadow-accent/20 animate-pulse"
          >
            <GitCompare size={14} />
            <span>Compare Selected ({compareIds.length}/3)</span>
          </button>
        )}
      </div>

      {/* Category Pills & Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                selectedCategory === cat
                  ? 'bg-accent text-white font-semibold'
                  : 'bg-navy-900 hover:bg-navy-850 text-gray-400 hover:text-white border border-navy-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search & Min Yield Slider */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-navy-900/60 p-3 rounded-xl border border-navy-800">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by alloy designation or application..."
              className="input-field pl-9 w-full bg-navy-950 text-xs py-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto text-xs font-mono text-gray-400">
            <span>Min Yield:</span>
            <input
              type="range"
              min={0}
              max={1000}
              step={50}
              value={minYield}
              onChange={(e) => setMinYield(Number(e.target.value))}
              className="w-32 accent-accent cursor-pointer"
            />
            <span className="w-16 text-right text-accent-light font-bold">
              {minYield > 0 ? `${minYield} MPa` : 'Any'}
            </span>
          </div>
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-navy-900 rounded-2xl border border-navy-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans">
            <thead className="bg-navy-950 border-b border-navy-800 text-[11px] font-mono text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-10 text-center">Cmp</th>
                <th className="py-3 px-4">Alloy Designation</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Yield Strength (σ_y)</th>
                <th className="py-3 px-4">Tensile Strength (σ_u)</th>
                <th className="py-3 px-4">Density (ρ)</th>
                <th className="py-3 px-4">Modulus (E)</th>
                <th className="py-3 px-4">Relative Cost</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800 text-xs">
              {filteredMaterials.map((mat) => {
                const isSelected = selectedMaterial.id === mat.id;
                const isCompared = compareIds.includes(mat.id);

                return (
                  <tr
                    key={mat.id}
                    onClick={() => selectMaterial(mat.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-accent/10 hover:bg-accent/15'
                        : 'hover:bg-navy-850/60'
                    }`}
                  >
                    <td className="py-3 px-4 text-center" onClick={(e) => toggleCompare(mat.id, e)}>
                      <input
                        type="checkbox"
                        checked={isCompared}
                        onChange={() => {}}
                        className="rounded accent-accent cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isSelected ? 'text-accent-light' : 'text-white'}`}>
                          {mat.name}
                        </span>
                        {isSelected && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-accent/20 text-accent-light border border-accent/30 font-bold">
                            Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-xs">{mat.category}</td>
                    <td className="py-3 px-4 font-mono font-bold text-gray-200">
                      {mat.yieldStrength} MPa
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-300">
                      {mat.tensileStrength} MPa
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-400">
                      {mat.density} kg/m³
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-400">
                      {mat.elasticModulus} GPa
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={getCostBadgeVariant(mat.costCategory)} size="sm">
                        {mat.costCategory}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          selectMaterial(mat.id);
                          setActivePage('workspace');
                        }}
                        className="btn-ghost text-[11px] py-1 px-2.5 rounded hover:bg-navy-800 text-accent"
                      >
                        Apply to CAD →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Material Detail Card */}
      {selectedMaterial && (
        <div className="p-6 rounded-2xl bg-navy-900 border border-navy-750 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-navy-950 text-accent border border-navy-800">
                  Active Rotor Alloy
                </span>
                <span className="text-xs text-gray-400 font-mono">{selectedMaterial.category}</span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1">{selectedMaterial.name}</h2>
              <p className="text-xs text-gray-300 max-w-3xl leading-relaxed mt-1">
                {selectedMaterial.description}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => sendCopilotMessage(`Analyze mechanical suitability of ${selectedMaterial.name} for current torque and bending loads`)}
                className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3 rounded-lg"
              >
                <Sparkles size={13} className="text-accent" />
                <span>Ask Copilot about Alloy</span>
              </button>
              <button
                onClick={() => setActivePage('workspace')}
                className="btn-primary text-xs py-2 px-4 rounded-lg shadow-sm shadow-accent/20"
              >
                Open in Workspace
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <div className="bg-navy-950 p-3 rounded-xl border border-navy-800 font-mono text-xs">
              <span className="text-gray-500 block text-[10px] uppercase">Yield / Tensile</span>
              <span className="text-white font-bold text-sm">
                {selectedMaterial.yieldStrength} / {selectedMaterial.tensileStrength} MPa
              </span>
            </div>
            <div className="bg-navy-950 p-3 rounded-xl border border-navy-800 font-mono text-xs">
              <span className="text-gray-500 block text-[10px] uppercase">Stiffness (E)</span>
              <span className="text-white font-bold text-sm">{selectedMaterial.elasticModulus} GPa</span>
            </div>
            <div className="bg-navy-950 p-3 rounded-xl border border-navy-800 font-mono text-xs">
              <span className="text-gray-500 block text-[10px] uppercase">Poisson's Ratio</span>
              <span className="text-white font-bold text-sm">{selectedMaterial.poissonsRatio}</span>
            </div>
            <div className="bg-navy-950 p-3 rounded-xl border border-navy-800 font-mono text-xs">
              <span className="text-gray-500 block text-[10px] uppercase">Thermal Expansion</span>
              <span className="text-white font-bold text-sm">{selectedMaterial.thermalExpansion} µm/(m·°C)</span>
            </div>
          </div>
        </div>
      )}

      {/* Compare Modal / Drawer */}
      {isCompareDrawerOpen && comparedMaterials.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col overflow-hidden">
            <div className="p-5 border-b border-navy-800 flex items-center justify-between bg-navy-950">
              <div className="flex items-center gap-2">
                <GitCompare size={18} className="text-accent" />
                <h3 className="text-base font-bold text-white">Alloy Metallurgical Comparison</h3>
              </div>
              <button
                onClick={() => setIsCompareDrawerOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded hover:bg-navy-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-3 gap-4">
                {comparedMaterials.map((m) => (
                  <div key={m.id} className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-3">
                    <h4 className="font-bold text-white text-sm truncate">{m.name}</h4>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-navy-900 text-gray-400 block truncate">
                      {m.category}
                    </span>
                    <div className="space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Yield:</span>
                        <span className="text-emerald-400 font-bold">{m.yieldStrength} MPa</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Tensile:</span>
                        <span className="text-gray-200">{m.tensileStrength} MPa</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Density:</span>
                        <span className="text-gray-200">{m.density} kg/m³</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Modulus:</span>
                        <span className="text-gray-200">{m.elasticModulus} GPa</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Cost:</span>
                        <span className="text-cyan-400">{m.costCategory}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        selectMaterial(m.id);
                        setIsCompareDrawerOpen(false);
                      }}
                      className="w-full btn-primary text-xs py-1.5 rounded-lg"
                    >
                      Select Alloy
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-navy-800 bg-navy-950 flex justify-end">
              <button
                onClick={() => setIsCompareDrawerOpen(false)}
                className="btn-secondary text-xs px-4 py-1.5 rounded-lg"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

