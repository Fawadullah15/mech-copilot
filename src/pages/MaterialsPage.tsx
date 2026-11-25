import React, { useState, useMemo } from 'react';
import {
  Search,
  Check,
  GitCompare,
  Sparkles,
  X,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sliders,
  Scale,
  Gauge,
  Thermometer,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  evaluateMaterialSuitability,
  rankMaterialsForDesign,
  generateStiffnessStrengthInsight,
  getShearModulusGPa,
  DESIGN_LIMITS,
} from '../engineering/constraints';

export default function MaterialsPage() {
  const {
    allMaterials,
    selectedMaterial,
    selectMaterial,
    setActivePage,
    sendCopilotMessage,
    designParams,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'catalog' | 'suitability'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [minYield, setMinYield] = useState<number>(0);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isCompareDrawerOpen, setIsCompareDrawerOpen] = useState(false);

  const categories = [
    'All',
    'Carbon Steel',
    'Alloy Steel',
    'Stainless Steel',
    'Aluminum Alloy',
    'Titanium Alloy',
    'Copper Alloy',
    'Nickel Superalloy',
  ];

  // Evaluations under active CAD workspace parameters
  const suitabilityRankings = useMemo(() => {
    return rankMaterialsForDesign(allMaterials, designParams, selectedMaterial);
  }, [allMaterials, designParams, selectedMaterial]);

  const activeMaterialEvaluation = useMemo(() => {
    return evaluateMaterialSuitability({
      material: selectedMaterial,
      params: designParams,
      baselineMaterial: selectedMaterial,
    });
  }, [selectedMaterial, designParams]);

  const filteredMaterials = allMaterials.filter((mat) => {
    const matchesSearch =
      mat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mat.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mat.designation && mat.designation.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (mat.specification && mat.specification.toLowerCase().includes(searchQuery.toLowerCase())) ||
      mat.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' ||
      mat.category.toLowerCase().includes(selectedCategory.toLowerCase().split(' ')[0]);

    const matchesYield = mat.yieldStrength >= minYield;

    return matchesSearch && matchesCategory && matchesYield;
  });

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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in text-[#172033] dark:text-[#FFFFFF] max-w-7xl mx-auto flex flex-col bg-[#F2F4FA] dark:bg-[#111827] font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D9DFED] dark:border-[#28344E]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-[#315EDE] font-bold">
              Materials Intelligence & Decision Support
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-mono bg-[#39866B]/15 text-[#39866B] border border-[#39866B]/30 font-bold">
              <ShieldCheck size={12} /> Verified ASM / MMPDS
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#172033] dark:text-[#FFFFFF] font-display">
            Engineering Alloys & Design Constraints Engine
          </h1>
          <p className="text-xs text-[#64708A] font-medium mt-1">
            Verified isotropic constants, temperature envelopes, shear modulus (G), and load-driven multi-material CAD ranking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {compareIds.length > 0 && (
            <button
              onClick={() => setIsCompareDrawerOpen(true)}
              className="btn-secondary text-xs font-semibold flex items-center gap-1.5 py-2 px-3 rounded-[8px]"
            >
              <GitCompare size={14} className="text-[#315EDE]" />
              <span>Compare ({compareIds.length}/3)</span>
            </button>
          )}

          <div className="flex rounded-[8px] bg-[#E9EDF7] dark:bg-[#1E2436] p-1 border border-[#D9DFED] dark:border-[#28344E]">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-colors ${
                activeTab === 'catalog'
                  ? 'bg-[#315EDE] text-[#FFFFFF] shadow-blueGlow'
                  : 'text-[#64708A] hover:text-[#172033] dark:hover:text-[#FFFFFF]'
              }`}
            >
              Alloy Catalog
            </button>
            <button
              onClick={() => setActiveTab('suitability')}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'suitability'
                  ? 'bg-[#315EDE] text-[#FFFFFF] shadow-blueGlow'
                  : 'text-[#64708A] hover:text-[#172033] dark:hover:text-[#FFFFFF]'
              }`}
            >
              <Scale size={13} />
              Active CAD Suitability Matrix
            </button>
          </div>
        </div>
      </div>

      {/* Engineering Decision Support Callout: Stiffness vs Strength Law */}
      <div className="p-4 rounded-[10px] bg-[#FFFFFF] dark:bg-[#172033] border border-[#D9DFED] dark:border-[#28344E] flex items-start gap-3.5 shadow-panel">
        <div className="p-2 rounded-[8px] bg-[#315EDE]/10 text-[#315EDE] border border-[#315EDE]/20 shrink-0 mt-0.5">
          <Info size={18} />
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#172033] dark:text-[#FFFFFF] uppercase tracking-wider text-xs">
              Mechanical Engineering Insight & Stiffness Constancy Rule
            </span>
            <span className="text-[10px] font-mono text-[#315EDE] bg-[#315EDE]/10 px-2 py-0.5 rounded-[4px] font-bold">
              Active: {selectedMaterial.name} ({selectedMaterial.designation || 'UNS'})
            </span>
          </div>
          <p className="text-[#64708A] leading-relaxed">
            {activeMaterialEvaluation.tradeoffInsight}
          </p>
          <div className="text-[11px] font-mono text-[#64708A] pt-1">
            Active Workspace Parameters: ⌀{designParams.diameter} mm × {designParams.length} mm span | Torque: {designParams.torque} N·m | Transverse Force: {designParams.force} N | Target FoS: {designParams.safetyFactor}
          </div>
        </div>
      </div>

      {/* Main Content: Tab 1 (Catalog) vs Tab 2 (Suitability Matrix) */}
      {activeTab === 'catalog' ? (
        <>
          {/* Category Pills & Filters */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-[6px] text-xs font-mono transition-colors shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-[#2563EB] text-white font-bold border border-[#2563EB] shadow-xs'
                      : 'bg-white dark:bg-[#101A2B] hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#172033] dark:hover:text-white border border-[#E2E8F0] dark:border-[#1E2D45]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search & Min Yield Slider */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-[#101A2B] p-2.5 rounded-[8px] border border-[#E2E8F0] dark:border-[#1E2D45] shadow-xs">
              <div className="relative flex-1 w-full md:max-w-md">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="text"
                  placeholder="Search by alloy, UNS designation, ASTM spec, or application..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[#F8FAFC] dark:bg-[#162236] border border-[#E2E8F0] dark:border-[#24344F] rounded-[6px] text-xs text-[#172033] dark:text-white placeholder-[#94A3B8] font-mono focus:outline-none focus:border-[#2563EB] transition-colors"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto text-xs font-mono text-[#64748B]">
                <span>Min Yield Strength:</span>
                <input
                  type="range"
                  min={0}
                  max={1000}
                  step={50}
                  value={minYield}
                  onChange={(e) => setMinYield(Number(e.target.value))}
                  className="w-28 accent-[#2563EB] cursor-pointer"
                />
                <span className="w-16 text-right text-[#2563EB] font-bold">
                  {minYield > 0 ? `${minYield} MPa` : 'Any'}
                </span>
              </div>
            </div>
          </div>

          {/* Materials Catalog Table */}
          <div className="bg-white rounded-[4px] border border-[#DDE4E0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead className="bg-[#EEF2EF] border-b border-[#DDE4E0] text-[10px] font-mono text-[#64716C] uppercase tracking-wider">
                  <tr>
                    <th className="py-2 px-3 w-10 text-center">Cmp</th>
                    <th className="py-2 px-3">Alloy / UNS</th>
                    <th className="py-2 px-3">Category & Condition</th>
                    <th className="py-2 px-3">Yield (S_y)</th>
                    <th className="py-2 px-3">Modulus (E / G)</th>
                    <th className="py-2 px-3">Density (ρ)</th>
                    <th className="py-2 px-3">Hardness</th>
                    <th className="py-2 px-3">Max Temp</th>
                    <th className="py-2 px-3">Cost</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDE4E0]">
                  {filteredMaterials.map((mat) => {
                    const isSelected = selectedMaterial.id === mat.id;
                    const isCompared = compareIds.includes(mat.id);
                    const G = getShearModulusGPa(mat);

                    return (
                      <tr
                        key={mat.id}
                        onClick={() => selectMaterial(mat.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#147D70]/10 hover:bg-[#147D70]/15'
                            : 'hover:bg-[#F5F7F5]'
                        }`}
                      >
                        <td className="py-2 px-3 text-center" onClick={(e) => toggleCompare(mat.id, e)}>
                          <input
                            type="checkbox"
                            checked={isCompared}
                            onChange={() => {}}
                            className="rounded-[2px] accent-[#147D70] cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span className={`font-mono font-semibold ${isSelected ? 'text-[#147D70]' : 'text-[#18211F]'}`}>
                              {mat.name}
                            </span>
                            {mat.designation && (
                              <span className="text-[10px] font-mono text-[#64716C] bg-[#F5F7F5] px-1 rounded-[2px] border border-[#DDE4E0]">
                                {mat.designation}
                              </span>
                            )}
                            {isSelected && (
                              <span className="px-1 py-0.2 rounded-[2px] text-[9px] font-mono bg-[#147D70]/20 text-[#147D70] border border-[#147D70]/40 font-bold uppercase">
                                Active
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="text-[#64716C] font-mono text-[11px]">{mat.category}</div>
                          <div className="text-[10px] text-[#64716C] truncate max-w-xs">{mat.condition || 'Standard'}</div>
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-[#18211F]">
                          {mat.yieldStrength} <span className="text-[10px] text-[#64716C] font-normal">MPa</span>
                        </td>
                        <td className="py-2 px-3 font-mono text-[#18211F]">
                          <div>{mat.elasticModulus} <span className="text-[10px] text-[#64716C]">GPa</span></div>
                          <div className="text-[10px] text-[#64716C]">G: {G.toFixed(1)} GPa</div>
                        </td>
                        <td className="py-2 px-3 font-mono text-[#64716C]">
                          {mat.density} <span className="text-[10px] text-[#64716C]">kg/m³</span>
                        </td>
                        <td className="py-2 px-3 font-mono text-[#18211F] text-[11px]">
                          {mat.hardnessHRC ? `${mat.hardnessHRC} HRC` : mat.hardnessHB ? `${mat.hardnessHB} HB` : '—'}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-[#64716C]">
                          {mat.maxOperatingTempC ? `${mat.maxOperatingTempC}°C` : '—'}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px]">
                          <span className={`px-1.5 py-0.5 rounded-[2px] border ${
                            mat.costCategory === 'Low'
                              ? 'bg-[#39866B]/10 text-[#39866B] border-[#39866B]/30'
                              : mat.costCategory === 'Medium'
                              ? 'bg-[#2868D7]/10 text-[#2868D7] border-[#2868D7]/30'
                              : mat.costCategory === 'High'
                              ? 'bg-[#D58A36]/10 text-[#D58A36] border-[#D58A36]/30'
                              : 'bg-[#CB5750]/10 text-[#CB5750] border-[#CB5750]/30'
                          }`}>
                            {mat.costCategory}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              selectMaterial(mat.id);
                              setActivePage('workspace');
                            }}
                            className="text-[11px] font-mono py-0.5 px-2 rounded-[2px] text-[#147D70] font-semibold hover:underline"
                          >
                            Apply →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Tab 2: Active CAD Design Suitability Matrix */
        <div className="space-y-3">
          <div className="p-3 bg-white rounded-[4px] border border-[#DDE4E0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono text-[#18211F]">
            <div>
              <span className="text-[#147D70] font-bold">Dynamic CAD Constraint Evaluation:</span> Evaluated against active shaft parameters (⌀{designParams.diameter} mm × {designParams.length} mm, {designParams.torque} N·m, {designParams.force} N).
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#64716C]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#39866B]"></span> Pass</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#D58A36]"></span> Marginal Warning</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#CB5750]"></span> Deficient (Fail)</span>
            </div>
          </div>

          <div className="bg-white rounded-[4px] border border-[#DDE4E0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead className="bg-[#EEF2EF] border-b border-[#DDE4E0] text-[10px] font-mono text-[#64716C] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Alloy / UNS</th>
                    <th className="py-2.5 px-3">Status & Score</th>
                    <th className="py-2.5 px-3">Von Mises & FoS</th>
                    <th className="py-2.5 px-3">Deflection (δ)</th>
                    <th className="py-2.5 px-3">Twist (θ/m)</th>
                    <th className="py-2.5 px-3">Mass (kg)</th>
                    <th className="py-2.5 px-3">Specific Strength</th>
                    <th className="py-2.5 px-3">Governing Bottleneck</th>
                    <th className="py-2.5 px-3 text-right">CAD Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDE4E0]">
                  {suitabilityRankings.map((evalItem) => {
                    const mat = evalItem.material;
                    const isSelected = selectedMaterial.id === mat.id;
                    const statusColor =
                      evalItem.overallStatus === 'pass'
                        ? 'text-[#39866B] bg-[#39866B]/10 border-[#39866B]/30'
                        : evalItem.overallStatus === 'warning'
                        ? 'text-[#D58A36] bg-[#D58A36]/10 border-[#D58A36]/30'
                        : 'text-[#CB5750] bg-[#CB5750]/10 border-[#CB5750]/30';

                    return (
                      <tr
                        key={mat.id}
                        onClick={() => selectMaterial(mat.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#147D70]/10 hover:bg-[#147D70]/15'
                            : 'hover:bg-[#F5F7F5]'
                        }`}
                      >
                        <td className="py-2 px-3">
                          <div className="font-mono font-semibold text-[#18211F]">
                            {mat.name}
                          </div>
                          <div className="text-[10px] font-mono text-[#64716C]">
                            {mat.designation || mat.category}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono uppercase font-bold border ${statusColor}`}>
                              {evalItem.overallStatus}
                            </span>
                            <span className="text-[11px] font-mono text-[#64716C]">
                              {evalItem.suitabilityScore}/100
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px]">
                          <div className="text-[#18211F] font-bold">
                            {evalItem.vonMisesStressMPa.toFixed(1)} MPa
                          </div>
                          <div className={`text-[10px] ${evalItem.factorOfSafety >= designParams.safetyFactor ? 'text-[#39866B]' : 'text-[#D58A36]'}`}>
                            FoS: {evalItem.factorOfSafety.toFixed(2)} (Req: {designParams.safetyFactor})
                          </div>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px]">
                          <div className={`${evalItem.centerDeflectionMm > 0.2 ? 'text-[#D58A36]' : 'text-[#18211F]'}`}>
                            {evalItem.centerDeflectionMm.toFixed(4)} mm
                          </div>
                          <div className="text-[10px] text-[#64716C]">
                            Slope: {(evalItem.bearingSlopeRad * 1000).toFixed(2)} mrad
                          </div>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-[#18211F]">
                          <div className={`${evalItem.torsionalTwistDegPerMeter > 1.0 ? 'text-[#D58A36]' : 'text-[#18211F]'}`}>
                            {evalItem.torsionalTwistDegPerMeter.toFixed(3)}°/m
                          </div>
                          <div className="text-[10px] text-[#64716C]">
                            Limit: {DESIGN_LIMITS.MAX_TORSIONAL_TWIST_DEG_PER_M.toFixed(1)}°/m
                          </div>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px]">
                          <div className="text-[#18211F] font-semibold">{evalItem.massKg.toFixed(2)} kg</div>
                          {evalItem.relativeWeightVsBaselinePercent !== 0 && (
                            <div className={`text-[10px] ${evalItem.relativeWeightVsBaselinePercent < 0 ? 'text-[#39866B]' : 'text-[#64716C]'}`}>
                              {evalItem.relativeWeightVsBaselinePercent > 0 ? '+' : ''}
                              {evalItem.relativeWeightVsBaselinePercent.toFixed(0)}% vs active
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-[#147D70] font-bold">
                          {evalItem.specificStrength.toFixed(0)} <span className="text-[10px] text-[#64716C]">kN·m/kg</span>
                        </td>
                        <td className="py-2 px-3 text-[11px] max-w-xs">
                          <span className={`font-mono text-[10px] block truncate ${
                            evalItem.governingConstraint.status === 'fail'
                              ? 'text-[#CB5750]'
                              : evalItem.governingConstraint.status === 'warning'
                              ? 'text-[#D58A36]'
                              : 'text-[#64716C]'
                          }`}>
                            {evalItem.governingConstraint.name}
                          </span>
                          <span className="text-[10px] text-[#64716C] truncate block">
                            {evalItem.governingConstraint.remedy || evalItem.governingConstraint.message}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              selectMaterial(mat.id);
                              setActivePage('workspace');
                            }}
                            className={`text-[11px] font-mono py-1 px-2.5 rounded-[2px] transition-colors shadow-xs ${
                              isSelected
                                ? 'bg-[#147D70]/20 text-[#147D70] border border-[#147D70]/30 font-bold'
                                : 'bg-[#147D70] hover:bg-[#0E6257] text-white'
                            }`}
                          >
                            {isSelected ? 'Active Alloy' : 'Select →'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Selected Material Detail Card with Comprehensive Traceability */}
      {selectedMaterial && (
        <div className="p-4 rounded-[4px] bg-white border border-[#DDE4E0] space-y-4 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[2px] bg-[#EEF2EF] text-[#147D70] border border-[#DDE4E0]">
                  Active CAD Model Alloy
                </span>
                {selectedMaterial.designation && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#F5F7F5] text-[#18211F] border border-[#DDE4E0]">
                    {selectedMaterial.designation}
                  </span>
                )}
                <span className="text-xs text-[#64716C] font-mono">{selectedMaterial.category}</span>
                <span className="text-[10px] font-mono text-[#39866B] bg-[#39866B]/10 px-1.5 py-0.2 rounded-[2px] border border-[#39866B]/30 font-semibold">
                  {selectedMaterial.verificationStatus === 'verified' ? '✓ Verified Source' : 'Draft'}
                </span>
              </div>
              <h2 className="text-lg font-bold text-[#18211F] font-mono mt-1">{selectedMaterial.name}</h2>
              <p className="text-xs text-[#64716C] max-w-4xl leading-relaxed mt-0.5">
                {selectedMaterial.description}
              </p>
              {selectedMaterial.specification && (
                <div className="text-[10px] font-mono text-[#147D70] mt-1">
                  Standard Specification: <span className="text-[#18211F]">{selectedMaterial.specification}</span>
                  {selectedMaterial.condition && <span> | Condition: <span className="text-[#18211F]">{selectedMaterial.condition}</span></span>}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() =>
                  sendCopilotMessage(
                    `Analyze mechanical suitability of ${selectedMaterial.name} (${selectedMaterial.designation || ''}) under torque ${designParams.torque} N·m, force ${designParams.force} N, diameter ${designParams.diameter} mm.`
                  )
                }
                className="bg-white hover:bg-[#EEF2EF] text-[#18211F] border border-[#DDE4E0] font-mono text-xs py-1.5 px-3 rounded-[3px] flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Sparkles size={13} className="text-[#147D70]" />
                <span>Ask Copilot</span>
              </button>
              <button
                onClick={() => setActivePage('workspace')}
                className="bg-[#147D70] hover:bg-[#0E6257] text-white font-mono text-xs font-semibold py-1.5 px-3.5 rounded-[3px] transition-colors shadow-xs"
              >
                Open in Workspace
              </button>
            </div>
          </div>

          {/* Metallurgical Property Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1 font-mono text-xs">
            <div className="bg-[#F5F7F5] p-2 rounded-[3px] border border-[#DDE4E0]">
              <span className="text-[#64716C] block text-[9px] uppercase">Yield Strength (S_y)</span>
              <span className="text-[#39866B] font-bold text-xs">{selectedMaterial.yieldStrength} MPa</span>
            </div>
            <div className="bg-[#F5F7F5] p-2 rounded-[3px] border border-[#DDE4E0]">
              <span className="text-[#64716C] block text-[9px] uppercase">Tensile (S_u)</span>
              <span className="text-[#18211F] font-bold text-xs">{selectedMaterial.tensileStrength} MPa</span>
            </div>
            <div className="bg-[#F5F7F5] p-2 rounded-[3px] border border-[#DDE4E0]">
              <span className="text-[#64716C] block text-[9px] uppercase">Modulus (E)</span>
              <span className="text-[#18211F] font-bold text-xs">{selectedMaterial.elasticModulus} GPa</span>
            </div>
            <div className="bg-[#F5F7F5] p-2 rounded-[3px] border border-[#DDE4E0]">
              <span className="text-[#64716C] block text-[9px] uppercase">Shear Modulus (G)</span>
              <span className="text-[#147D70] font-bold text-xs">
                {getShearModulusGPa(selectedMaterial).toFixed(1)} GPa
              </span>
            </div>
            <div className="bg-[#F5F7F5] p-2 rounded-[3px] border border-[#DDE4E0]">
              <span className="text-[#64716C] block text-[9px] uppercase">Hardness</span>
              <span className="text-[#18211F] font-bold text-xs">
                {selectedMaterial.hardnessHRC ? `${selectedMaterial.hardnessHRC} HRC` : selectedMaterial.hardnessHB ? `${selectedMaterial.hardnessHB} HB` : '—'}
              </span>
            </div>
            <div className="bg-[#F5F7F5] p-2 rounded-[3px] border border-[#DDE4E0]">
              <span className="text-[#64716C] block text-[9px] uppercase">Max Service Temp</span>
              <span className="text-[#18211F] font-bold text-xs">
                {selectedMaterial.maxOperatingTempC ? `${selectedMaterial.maxOperatingTempC}°C` : '—'}
              </span>
            </div>
          </div>

          {/* Assumptions & Limitations Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="bg-[#F5F7F5] p-2.5 rounded-[3px] border border-[#DDE4E0] text-[11px]">
              <div className="text-[10px] font-mono uppercase text-[#147D70] font-bold mb-1 flex items-center gap-1">
                <CheckCircle2 size={11} /> Baseline Engineering Assumptions
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[#64716C] font-mono text-[10px]">
                {selectedMaterial.assumptions && selectedMaterial.assumptions.length > 0 ? (
                  selectedMaterial.assumptions.map((a, i) => <li key={i}>{a}</li>)
                ) : (
                  <li>Standard isotropic linear elastic behavior at 20°C ambient room temperature</li>
                )}
              </ul>
            </div>

            <div className="bg-[#F5F7F5] p-2.5 rounded-[3px] border border-[#DDE4E0] text-[11px]">
              <div className="text-[10px] font-mono uppercase text-[#D58A36] font-bold mb-1 flex items-center gap-1">
                <AlertTriangle size={11} /> Metallurgical Limitations & De-rating
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[#64716C] font-mono text-[10px]">
                {selectedMaterial.limitations && selectedMaterial.limitations.length > 0 ? (
                  selectedMaterial.limitations.map((l, i) => <li key={i}>{l}</li>)
                ) : (
                  <li>Requires appropriate stress concentration factors and environmental de-rating</li>
                )}
              </ul>
            </div>
          </div>

          {selectedMaterial.sourceCitation && (
            <div className="text-[10px] font-mono text-[#64716C] border-t border-[#DDE4E0] pt-2">
              <span className="text-[#64716C] font-semibold">Citation:</span> {selectedMaterial.sourceCitation}
            </div>
          )}
        </div>
      )}

      {/* Compare Modal with Engineering Decision Support */}
      {isCompareDrawerOpen && comparedMaterials.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in font-sans">
          <div className="bg-white border border-[#DDE4E0] rounded-[4px] shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-4 py-3 border-b border-[#DDE4E0] flex items-center justify-between bg-[#EEF2EF]">
              <div className="flex items-center gap-2">
                <GitCompare size={15} className="text-[#147D70]" />
                <h3 className="text-xs font-mono font-bold text-[#18211F] uppercase tracking-wider">
                  Alloy Metallurgical & CAD Performance Comparison ({comparedMaterials.length}/3)
                </h3>
              </div>
              <button
                onClick={() => setIsCompareDrawerOpen(false)}
                className="text-[#64716C] hover:text-[#18211F] p-1 rounded-[3px] hover:bg-[#E8EFED]"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {comparedMaterials.map((m) => {
                  const evalRes = evaluateMaterialSuitability({
                    material: m,
                    params: designParams,
                    baselineMaterial: selectedMaterial,
                  });
                  const isCurrent = m.id === selectedMaterial.id;

                  return (
                    <div
                      key={m.id}
                      className={`p-3 rounded-[3px] bg-[#F5F7F5] border space-y-2.5 ${
                        isCurrent ? 'border-[#147D70] shadow-xs' : 'border-[#DDE4E0]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-mono font-bold text-[#18211F] text-xs truncate">{m.name}</h4>
                        {isCurrent && (
                          <span className="text-[9px] font-mono text-[#147D70] bg-[#147D70]/10 px-1 rounded-[2px] uppercase font-bold">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-[#64716C]">
                        {m.designation || m.category} | {m.specification || 'Standard Spec'}
                      </div>

                      {/* Active CAD performance under current loads */}
                      <div className="bg-white p-2 rounded-[2px] border border-[#DDE4E0] space-y-1 font-mono text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-[#64716C]">Status:</span>
                          <span className={`font-bold uppercase ${
                            evalRes.overallStatus === 'pass'
                              ? 'text-[#39866B]'
                              : evalRes.overallStatus === 'warning'
                              ? 'text-[#D58A36]'
                              : 'text-[#CB5750]'
                          }`}>
                            {evalRes.overallStatus} ({evalRes.suitabilityScore}/100)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64716C]">Factor of Safety:</span>
                          <span className="text-[#18211F] font-bold">{evalRes.factorOfSafety.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64716C]">Center Deflection:</span>
                          <span className="text-[#18211F]">{evalRes.centerDeflectionMm.toFixed(4)} mm</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64716C]">Torsional Twist:</span>
                          <span className="text-[#18211F]">{evalRes.torsionalTwistDegPerMeter.toFixed(3)}°/m</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64716C]">Shaft Mass:</span>
                          <span className="text-[#147D70] font-bold">{evalRes.massKg.toFixed(2)} kg</span>
                        </div>
                      </div>

                      {/* Material Properties */}
                      <div className="space-y-1 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-[#64716C]">Yield (S_y):</span>
                          <span className="text-[#39866B] font-bold">{m.yieldStrength} MPa</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64716C]">Modulus (E):</span>
                          <span className="text-[#18211F]">{m.elasticModulus} GPa</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64716C]">Shear Modulus (G):</span>
                          <span className="text-[#18211F]">{getShearModulusGPa(m).toFixed(1)} GPa</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64716C]">Density (ρ):</span>
                          <span className="text-[#18211F]">{m.density} kg/m³</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64716C]">Max Service Temp:</span>
                          <span className="text-[#18211F]">{m.maxOperatingTempC || '—'}°C</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#64716C]">Machinability:</span>
                          <span className="text-[#18211F]">{m.machinabilityPercent || '—'}%</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          selectMaterial(m.id);
                          setIsCompareDrawerOpen(false);
                        }}
                        className={`w-full font-mono text-xs font-semibold py-1 rounded-[3px] transition-colors shadow-xs ${
                          isCurrent
                            ? 'bg-[#EEF2EF] text-[#147D70] border border-[#DDE4E0]'
                            : 'bg-[#147D70] hover:bg-[#0E6257] text-white'
                        }`}
                      >
                        {isCurrent ? 'Currently Active' : 'Apply Alloy to CAD'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Tradeoff Analysis between compared alloys */}
              {comparedMaterials.length >= 2 && (
                <div className="p-3 bg-[#F5F7F5] rounded-[3px] border border-[#DDE4E0] font-mono text-xs space-y-1.5">
                  <div className="text-[10px] uppercase text-[#147D70] font-bold">
                    Direct Engineering Trade-off Analysis
                  </div>
                  <p className="text-[#64716C] leading-relaxed text-[11px]">
                    {generateStiffnessStrengthInsight(comparedMaterials[0], comparedMaterials[1])}
                  </p>
                </div>
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-[#DDE4E0] bg-[#EEF2EF] flex justify-end">
              <button
                onClick={() => setIsCompareDrawerOpen(false)}
                className="bg-white hover:bg-[#EEF2EF] text-[#18211F] border border-[#DDE4E0] font-mono text-xs py-1 px-3 rounded-[3px] shadow-xs"
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
