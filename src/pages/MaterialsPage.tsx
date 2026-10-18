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
    <div className="p-4 lg:p-6 space-y-4 animate-fade-in text-[#F0F1F2] max-w-7xl mx-auto flex flex-col h-full overflow-y-auto bg-[#111315] font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#34393F]">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#64D6C5]">
              Materials Intelligence & Decision Support
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-[2px] text-[9px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck size={10} /> Verified ASM / MMPDS
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#F0F1F2]">
            Engineering Alloys & Design Constraints Engine
          </h1>
          <p className="text-xs text-[#969DA5] font-mono mt-0.5">
            Verified isotropic constants, temperature envelopes, shear modulus (G), and load-driven multi-material CAD ranking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {compareIds.length > 0 && (
            <button
              onClick={() => setIsCompareDrawerOpen(true)}
              className="bg-[#22262A] hover:bg-[#2E3339] text-[#64D6C5] border border-[#34393F] text-xs font-mono font-semibold flex items-center gap-1.5 py-1.5 px-3 rounded-[3px] transition-colors"
            >
              <GitCompare size={13} />
              <span>Compare ({compareIds.length}/3)</span>
            </button>
          )}

          <div className="flex rounded-[3px] bg-[#191C1F] p-0.5 border border-[#34393F]">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1 rounded-[2px] text-xs font-mono transition-colors ${
                activeTab === 'catalog'
                  ? 'bg-[#22262A] text-[#64D6C5] font-bold border border-[#34393F]'
                  : 'text-[#969DA5] hover:text-[#F0F1F2]'
              }`}
            >
              Alloy Catalog
            </button>
            <button
              onClick={() => setActiveTab('suitability')}
              className={`px-3 py-1 rounded-[2px] text-xs font-mono transition-colors flex items-center gap-1.5 ${
                activeTab === 'suitability'
                  ? 'bg-[#22262A] text-[#64D6C5] font-bold border border-[#34393F]'
                  : 'text-[#969DA5] hover:text-[#F0F1F2]'
              }`}
            >
              <Scale size={12} />
              Active CAD Suitability Matrix
            </button>
          </div>
        </div>
      </div>

      {/* Engineering Decision Support Callout: Stiffness vs Strength Law */}
      <div className="p-3 rounded-[4px] bg-[#191C1F] border border-[#34393F] flex items-start gap-3">
        <div className="p-1.5 rounded-[3px] bg-[#64D6C5]/10 text-[#64D6C5] border border-[#64D6C5]/30 shrink-0 mt-0.5">
          <Info size={16} />
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-[#F0F1F2] uppercase tracking-wide text-[11px]">
              Mechanical Engineering Insight & Stiffness Constancy Rule
            </span>
            <span className="text-[10px] font-mono text-[#64D6C5] bg-[#64D6C5]/10 px-1 rounded-[2px]">
              Active: {selectedMaterial.name} ({selectedMaterial.designation || 'UNS'})
            </span>
          </div>
          <p className="text-[#969DA5] font-mono leading-relaxed text-[11px]">
            {activeMaterialEvaluation.tradeoffInsight}
          </p>
          <div className="text-[10px] font-mono text-[#6C737D] pt-0.5">
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
                  className={`px-2.5 py-1 rounded-[3px] text-xs font-mono transition-colors shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-[#22262A] text-[#64D6C5] font-bold border border-[#34393F]'
                      : 'bg-[#191C1F] hover:bg-[#22262A] text-[#969DA5] hover:text-[#F0F1F2] border border-[#2A2E35]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search & Min Yield Slider */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-[#191C1F] p-2.5 rounded-[4px] border border-[#34393F]">
              <div className="relative flex-1 w-full md:max-w-md">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#969DA5]" />
                <input
                  type="text"
                  placeholder="Search by alloy, UNS designation, ASTM spec, or application..."
                  className="w-full pl-8 pr-3 py-1 bg-[#14171A] border border-[#34393F] rounded-[3px] text-xs text-[#F0F1F2] placeholder-[#6C737D] font-mono focus:outline-none focus:border-[#64D6C5] transition-colors"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto text-xs font-mono text-[#969DA5]">
                <span>Min Yield Strength:</span>
                <input
                  type="range"
                  min={0}
                  max={1000}
                  step={50}
                  value={minYield}
                  onChange={(e) => setMinYield(Number(e.target.value))}
                  className="w-28 accent-[#64D6C5] cursor-pointer"
                />
                <span className="w-16 text-right text-[#64D6C5] font-bold">
                  {minYield > 0 ? `${minYield} MPa` : 'Any'}
                </span>
              </div>
            </div>
          </div>

          {/* Materials Catalog Table */}
          <div className="bg-[#191C1F] rounded-[4px] border border-[#34393F] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead className="bg-[#22262A] border-b border-[#34393F] text-[10px] font-mono text-[#969DA5] uppercase tracking-wider">
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
                <tbody className="divide-y divide-[#2A2E35]">
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
                            ? 'bg-[#64D6C5]/10 hover:bg-[#64D6C5]/15'
                            : 'hover:bg-[#22262A]'
                        }`}
                      >
                        <td className="py-2 px-3 text-center" onClick={(e) => toggleCompare(mat.id, e)}>
                          <input
                            type="checkbox"
                            checked={isCompared}
                            onChange={() => {}}
                            className="rounded-[2px] accent-[#64D6C5] cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span className={`font-mono font-semibold ${isSelected ? 'text-[#64D6C5]' : 'text-[#F0F1F2]'}`}>
                              {mat.name}
                            </span>
                            {mat.designation && (
                              <span className="text-[10px] font-mono text-[#6C737D] bg-[#14171A] px-1 rounded-[2px] border border-[#2A2E35]">
                                {mat.designation}
                              </span>
                            )}
                            {isSelected && (
                              <span className="px-1 py-0.2 rounded-[2px] text-[9px] font-mono bg-[#64D6C5]/20 text-[#64D6C5] border border-[#64D6C5]/40 font-bold uppercase">
                                Active
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="text-[#969DA5] font-mono text-[11px]">{mat.category}</div>
                          <div className="text-[10px] text-[#6C737D] truncate max-w-xs">{mat.condition || 'Standard'}</div>
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-[#F0F1F2]">
                          {mat.yieldStrength} <span className="text-[10px] text-[#6C737D] font-normal">MPa</span>
                        </td>
                        <td className="py-2 px-3 font-mono text-[#C2C8D0]">
                          <div>{mat.elasticModulus} <span className="text-[10px] text-[#6C737D]">GPa</span></div>
                          <div className="text-[10px] text-[#6C737D]">G: {G.toFixed(1)} GPa</div>
                        </td>
                        <td className="py-2 px-3 font-mono text-[#969DA5]">
                          {mat.density} <span className="text-[10px] text-[#6C737D]">kg/m³</span>
                        </td>
                        <td className="py-2 px-3 font-mono text-[#C2C8D0] text-[11px]">
                          {mat.hardnessHRC ? `${mat.hardnessHRC} HRC` : mat.hardnessHB ? `${mat.hardnessHB} HB` : '—'}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-[#969DA5]">
                          {mat.maxOperatingTempC ? `${mat.maxOperatingTempC}°C` : '—'}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px]">
                          <span className={`px-1.5 py-0.5 rounded-[2px] border ${
                            mat.costCategory === 'Low'
                              ? 'bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30'
                              : mat.costCategory === 'Medium'
                              ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                              : mat.costCategory === 'High'
                              ? 'bg-[#E7B65C]/15 text-[#E7B65C] border-[#E7B65C]/30'
                              : 'bg-[#E16D72]/15 text-[#E16D72] border-[#E16D72]/30'
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
                            className="text-[11px] font-mono py-0.5 px-2 rounded-[2px] text-[#64D6C5] hover:underline"
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
          <div className="p-3 bg-[#191C1F] rounded-[4px] border border-[#34393F] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
            <div>
              <span className="text-[#64D6C5] font-bold">Dynamic CAD Constraint Evaluation:</span> Evaluated against active shaft parameters (⌀{designParams.diameter} mm × {designParams.length} mm, {designParams.torque} N·m, {designParams.force} N).
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#969DA5]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Pass</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Marginal Warning</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400"></span> Deficient (Fail)</span>
            </div>
          </div>

          <div className="bg-[#191C1F] rounded-[4px] border border-[#34393F] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead className="bg-[#22262A] border-b border-[#34393F] text-[10px] font-mono text-[#969DA5] uppercase tracking-wider">
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
                <tbody className="divide-y divide-[#2A2E35]">
                  {suitabilityRankings.map((evalItem) => {
                    const mat = evalItem.material;
                    const isSelected = selectedMaterial.id === mat.id;
                    const statusColor =
                      evalItem.overallStatus === 'pass'
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                        : evalItem.overallStatus === 'warning'
                        ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                        : 'text-rose-400 bg-rose-500/10 border-rose-500/30';

                    return (
                      <tr
                        key={mat.id}
                        onClick={() => selectMaterial(mat.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#64D6C5]/10 hover:bg-[#64D6C5]/15'
                            : 'hover:bg-[#22262A]'
                        }`}
                      >
                        <td className="py-2 px-3">
                          <div className="font-mono font-semibold text-[#F0F1F2]">
                            {mat.name}
                          </div>
                          <div className="text-[10px] font-mono text-[#6C737D]">
                            {mat.designation || mat.category}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono uppercase font-bold border ${statusColor}`}>
                              {evalItem.overallStatus}
                            </span>
                            <span className="text-[11px] font-mono text-[#969DA5]">
                              {evalItem.suitabilityScore}/100
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px]">
                          <div className="text-[#F0F1F2] font-bold">
                            {evalItem.vonMisesStressMPa.toFixed(1)} MPa
                          </div>
                          <div className={`text-[10px] ${evalItem.factorOfSafety >= designParams.safetyFactor ? 'text-emerald-400' : 'text-amber-400'}`}>
                            FoS: {evalItem.factorOfSafety.toFixed(2)} (Req: {designParams.safetyFactor})
                          </div>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px]">
                          <div className={`${evalItem.centerDeflectionMm > 0.2 ? 'text-amber-400' : 'text-[#F0F1F2]'}`}>
                            {evalItem.centerDeflectionMm.toFixed(4)} mm
                          </div>
                          <div className="text-[10px] text-[#6C737D]">
                            Slope: {(evalItem.bearingSlopeRad * 1000).toFixed(2)} mrad
                          </div>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-[#C2C8D0]">
                          <div className={`${evalItem.torsionalTwistDegPerMeter > 1.0 ? 'text-amber-400' : 'text-[#F0F1F2]'}`}>
                            {evalItem.torsionalTwistDegPerMeter.toFixed(3)}°/m
                          </div>
                          <div className="text-[10px] text-[#6C737D]">
                            Limit: {DESIGN_LIMITS.MAX_TORSIONAL_TWIST_DEG_PER_M.toFixed(1)}°/m
                          </div>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px]">
                          <div className="text-[#F0F1F2] font-semibold">{evalItem.massKg.toFixed(2)} kg</div>
                          {evalItem.relativeWeightVsBaselinePercent !== 0 && (
                            <div className={`text-[10px] ${evalItem.relativeWeightVsBaselinePercent < 0 ? 'text-emerald-400' : 'text-[#969DA5]'}`}>
                              {evalItem.relativeWeightVsBaselinePercent > 0 ? '+' : ''}
                              {evalItem.relativeWeightVsBaselinePercent.toFixed(0)}% vs active
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-[#64D6C5]">
                          {evalItem.specificStrength.toFixed(0)} <span className="text-[10px] text-[#6C737D]">kN·m/kg</span>
                        </td>
                        <td className="py-2 px-3 text-[11px] max-w-xs">
                          <span className={`font-mono text-[10px] block truncate ${
                            evalItem.governingConstraint.status === 'fail'
                              ? 'text-rose-400'
                              : evalItem.governingConstraint.status === 'warning'
                              ? 'text-amber-400'
                              : 'text-[#969DA5]'
                          }`}>
                            {evalItem.governingConstraint.name}
                          </span>
                          <span className="text-[10px] text-[#6C737D] truncate block">
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
                            className={`text-[11px] font-mono py-1 px-2.5 rounded-[2px] transition-colors ${
                              isSelected
                                ? 'bg-[#64D6C5]/20 text-[#64D6C5] border border-[#64D6C5]/30'
                                : 'bg-[#22262A] hover:bg-[#64D6C5] text-[#F0F1F2] hover:text-[#111315] border border-[#34393F]'
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
        <div className="p-4 rounded-[4px] bg-[#191C1F] border border-[#34393F] space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[2px] bg-[#14171A] text-[#64D6C5] border border-[#2A2E35]">
                  Active CAD Model Alloy
                </span>
                {selectedMaterial.designation && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#22262A] text-[#F0F1F2] border border-[#34393F]">
                    {selectedMaterial.designation}
                  </span>
                )}
                <span className="text-xs text-[#969DA5] font-mono">{selectedMaterial.category}</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-[2px] border border-emerald-500/20">
                  {selectedMaterial.verificationStatus === 'verified' ? '✓ Verified Source' : 'Draft'}
                </span>
              </div>
              <h2 className="text-lg font-bold text-[#F0F1F2] font-mono mt-1">{selectedMaterial.name}</h2>
              <p className="text-xs text-[#969DA5] max-w-4xl leading-relaxed mt-0.5">
                {selectedMaterial.description}
              </p>
              {selectedMaterial.specification && (
                <div className="text-[10px] font-mono text-[#64D6C5] mt-1">
                  Standard Specification: <span className="text-[#C2C8D0]">{selectedMaterial.specification}</span>
                  {selectedMaterial.condition && <span> | Condition: <span className="text-[#C2C8D0]">{selectedMaterial.condition}</span></span>}
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
                className="bg-[#22262A] hover:bg-[#2E3339] text-[#F0F1F2] border border-[#34393F] font-mono text-xs py-1.5 px-3 rounded-[3px] flex items-center gap-1.5 transition-colors"
              >
                <Sparkles size={13} className="text-[#64D6C5]" />
                <span>Ask Copilot</span>
              </button>
              <button
                onClick={() => setActivePage('workspace')}
                className="bg-[#64D6C5] hover:bg-[#52c4b3] text-[#111315] font-mono text-xs font-semibold py-1.5 px-3.5 rounded-[3px] transition-colors shadow-sm"
              >
                Open in Workspace
              </button>
            </div>
          </div>

          {/* Metallurgical Property Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1 font-mono text-xs">
            <div className="bg-[#14171A] p-2 rounded-[3px] border border-[#2A2E35]">
              <span className="text-[#6C737D] block text-[9px] uppercase">Yield Strength (S_y)</span>
              <span className="text-[#34D399] font-bold text-xs">{selectedMaterial.yieldStrength} MPa</span>
            </div>
            <div className="bg-[#14171A] p-2 rounded-[3px] border border-[#2A2E35]">
              <span className="text-[#6C737D] block text-[9px] uppercase">Tensile (S_u)</span>
              <span className="text-[#F0F1F2] font-bold text-xs">{selectedMaterial.tensileStrength} MPa</span>
            </div>
            <div className="bg-[#14171A] p-2 rounded-[3px] border border-[#2A2E35]">
              <span className="text-[#6C737D] block text-[9px] uppercase">Modulus (E)</span>
              <span className="text-[#F0F1F2] font-bold text-xs">{selectedMaterial.elasticModulus} GPa</span>
            </div>
            <div className="bg-[#14171A] p-2 rounded-[3px] border border-[#2A2E35]">
              <span className="text-[#6C737D] block text-[9px] uppercase">Shear Modulus (G)</span>
              <span className="text-[#64D6C5] font-bold text-xs">
                {getShearModulusGPa(selectedMaterial).toFixed(1)} GPa
              </span>
            </div>
            <div className="bg-[#14171A] p-2 rounded-[3px] border border-[#2A2E35]">
              <span className="text-[#6C737D] block text-[9px] uppercase">Hardness</span>
              <span className="text-[#F0F1F2] font-bold text-xs">
                {selectedMaterial.hardnessHRC ? `${selectedMaterial.hardnessHRC} HRC` : selectedMaterial.hardnessHB ? `${selectedMaterial.hardnessHB} HB` : '—'}
              </span>
            </div>
            <div className="bg-[#14171A] p-2 rounded-[3px] border border-[#2A2E35]">
              <span className="text-[#6C737D] block text-[9px] uppercase">Max Service Temp</span>
              <span className="text-[#F0F1F2] font-bold text-xs">
                {selectedMaterial.maxOperatingTempC ? `${selectedMaterial.maxOperatingTempC}°C` : '—'}
              </span>
            </div>
          </div>

          {/* Assumptions & Limitations Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="bg-[#14171A] p-2.5 rounded-[3px] border border-[#2A2E35] text-[11px]">
              <div className="text-[10px] font-mono uppercase text-[#64D6C5] font-bold mb-1 flex items-center gap-1">
                <CheckCircle2 size={11} /> Baseline Engineering Assumptions
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[#969DA5] font-mono text-[10px]">
                {selectedMaterial.assumptions && selectedMaterial.assumptions.length > 0 ? (
                  selectedMaterial.assumptions.map((a, i) => <li key={i}>{a}</li>)
                ) : (
                  <li>Standard isotropic linear elastic behavior at 20°C ambient room temperature</li>
                )}
              </ul>
            </div>

            <div className="bg-[#14171A] p-2.5 rounded-[3px] border border-[#2A2E35] text-[11px]">
              <div className="text-[10px] font-mono uppercase text-amber-400 font-bold mb-1 flex items-center gap-1">
                <AlertTriangle size={11} /> Metallurgical Limitations & De-rating
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[#969DA5] font-mono text-[10px]">
                {selectedMaterial.limitations && selectedMaterial.limitations.length > 0 ? (
                  selectedMaterial.limitations.map((l, i) => <li key={i}>{l}</li>)
                ) : (
                  <li>Requires appropriate stress concentration factors and environmental de-rating</li>
                )}
              </ul>
            </div>
          </div>

          {selectedMaterial.sourceCitation && (
            <div className="text-[10px] font-mono text-[#6C737D] border-t border-[#2A2E35] pt-2">
              <span className="text-[#969DA5]">Citation:</span> {selectedMaterial.sourceCitation}
            </div>
          )}
        </div>
      )}

      {/* Compare Modal with Engineering Decision Support */}
      {isCompareDrawerOpen && comparedMaterials.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in font-sans">
          <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-4 py-3 border-b border-[#34393F] flex items-center justify-between bg-[#22262A]">
              <div className="flex items-center gap-2">
                <GitCompare size={15} className="text-[#64D6C5]" />
                <h3 className="text-xs font-mono font-bold text-[#F0F1F2] uppercase tracking-wider">
                  Alloy Metallurgical & CAD Performance Comparison ({comparedMaterials.length}/3)
                </h3>
              </div>
              <button
                onClick={() => setIsCompareDrawerOpen(false)}
                className="text-[#969DA5] hover:text-white p-1 rounded-[3px] hover:bg-[#2E3339]"
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
                      className={`p-3 rounded-[3px] bg-[#14171A] border space-y-2.5 ${
                        isCurrent ? 'border-[#64D6C5]' : 'border-[#2A2E35]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-mono font-bold text-[#F0F1F2] text-xs truncate">{m.name}</h4>
                        {isCurrent && (
                          <span className="text-[9px] font-mono text-[#64D6C5] bg-[#64D6C5]/10 px-1 rounded-[2px] uppercase">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-[#969DA5]">
                        {m.designation || m.category} | {m.specification || 'Standard Spec'}
                      </div>

                      {/* Active CAD performance under current loads */}
                      <div className="bg-[#191C1F] p-2 rounded-[2px] border border-[#2A2E35] space-y-1 font-mono text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-[#969DA5]">Status:</span>
                          <span className={`font-bold uppercase ${
                            evalRes.overallStatus === 'pass'
                              ? 'text-emerald-400'
                              : evalRes.overallStatus === 'warning'
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}>
                            {evalRes.overallStatus} ({evalRes.suitabilityScore}/100)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#969DA5]">Factor of Safety:</span>
                          <span className="text-[#F0F1F2] font-bold">{evalRes.factorOfSafety.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#969DA5]">Center Deflection:</span>
                          <span className="text-[#F0F1F2]">{evalRes.centerDeflectionMm.toFixed(4)} mm</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#969DA5]">Torsional Twist:</span>
                          <span className="text-[#F0F1F2]">{evalRes.torsionalTwistDegPerMeter.toFixed(3)}°/m</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#969DA5]">Shaft Mass:</span>
                          <span className="text-[#64D6C5]">{evalRes.massKg.toFixed(2)} kg</span>
                        </div>
                      </div>

                      {/* Material Properties */}
                      <div className="space-y-1 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-[#969DA5]">Yield (S_y):</span>
                          <span className="text-[#34D399] font-bold">{m.yieldStrength} MPa</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#969DA5]">Modulus (E):</span>
                          <span className="text-[#F0F1F2]">{m.elasticModulus} GPa</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#969DA5]">Shear Modulus (G):</span>
                          <span className="text-[#F0F1F2]">{getShearModulusGPa(m).toFixed(1)} GPa</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#969DA5]">Density (ρ):</span>
                          <span className="text-[#F0F1F2]">{m.density} kg/m³</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#969DA5]">Max Service Temp:</span>
                          <span className="text-[#F0F1F2]">{m.maxOperatingTempC || '—'}°C</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#969DA5]">Machinability:</span>
                          <span className="text-[#C2C8D0]">{m.machinabilityPercent || '—'}%</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          selectMaterial(m.id);
                          setIsCompareDrawerOpen(false);
                        }}
                        className={`w-full font-mono text-xs font-semibold py-1 rounded-[3px] transition-colors ${
                          isCurrent
                            ? 'bg-[#22262A] text-[#64D6C5] border border-[#34393F]'
                            : 'bg-[#64D6C5] hover:bg-[#52c4b3] text-[#111315]'
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
                <div className="p-3 bg-[#14171A] rounded-[3px] border border-[#2A2E35] font-mono text-xs space-y-1.5">
                  <div className="text-[10px] uppercase text-[#64D6C5] font-bold">
                    Direct Engineering Trade-off Analysis
                  </div>
                  <p className="text-[#969DA5] leading-relaxed text-[11px]">
                    {generateStiffnessStrengthInsight(comparedMaterials[0], comparedMaterials[1])}
                  </p>
                </div>
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-[#34393F] bg-[#22262A] flex justify-end">
              <button
                onClick={() => setIsCompareDrawerOpen(false)}
                className="bg-[#14171A] hover:bg-[#2A2E35] text-[#F0F1F2] border border-[#34393F] font-mono text-xs py-1 px-3 rounded-[3px]"
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
