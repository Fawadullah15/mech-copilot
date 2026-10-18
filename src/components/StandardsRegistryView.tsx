import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  X,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import {
  STANDARDS_REGISTRY,
  EngineeringStandardRecord,
  StandardOrganization,
  VerificationStatus,
  filterStandards
} from '../standards';

interface StandardsRegistryViewProps {
  onSelectCalculationTab?: () => void;
}

export default function StandardsRegistryView({ onSelectCalculationTab }: StandardsRegistryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [orgFilter, setOrgFilter] = useState<StandardOrganization | 'ALL'>('ALL');
  const [verifFilter, setVerifFilter] = useState<VerificationStatus | 'ALL'>('ALL');
  const [selectedStandard, setSelectedStandard] = useState<EngineeringStandardRecord | null>(null);

  const filtered = useMemo(() => {
    return filterStandards({
      searchQuery,
      organization: orgFilter,
      verificationStatus: verifFilter
    });
  }, [searchQuery, orgFilter, verifFilter]);

  const stats = useMemo(() => {
    const total = STANDARDS_REGISTRY.length;
    const verified = STANDARDS_REGISTRY.filter((s) => s.verificationStatus === 'verified').length;
    const draft = STANDARDS_REGISTRY.filter((s) => s.verificationStatus === 'draft').length;
    const unverified = STANDARDS_REGISTRY.filter((s) => s.verificationStatus === 'unverified').length;
    return { total, verified, draft, unverified };
  }, []);

  const renderStatusBadge = (status: EngineeringStandardRecord['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-[2px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Active
          </span>
        );
      case 'withdrawn':
        return (
          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-[2px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Withdrawn
          </span>
        );
      case 'historical':
        return (
          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-[2px] bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Historical
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-[2px] bg-gray-500/10 text-gray-400 border border-gray-500/20">
            Unknown
          </span>
        );
    }
  };

  const renderVerificationBadge = (vStatus: VerificationStatus) => {
    switch (vStatus) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded-[2px] bg-[#64D6C5]/15 text-[#64D6C5] border border-[#64D6C5]/30">
            <CheckCircle2 size={11} /> Verified In Software
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded-[2px] bg-blue-400/15 text-blue-400 border border-blue-400/30">
            <Info size={11} /> Draft Formulation
          </span>
        );
      case 'unverified':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded-[2px] bg-neutral-500/15 text-neutral-400 border border-neutral-500/30">
            <AlertTriangle size={11} /> Reference Only (Unverified)
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Overview & Transparency Notice */}
      <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-[#2A2E35]">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#64D6C5] mb-0.5">
              Standards Governance & Transparency
            </div>
            <h2 className="text-base font-bold text-[#F0F1F2]">
              Mechanical Engineering Standards Registry
            </h2>
            <p className="text-xs text-[#969DA5] font-mono mt-0.5">
              Traceable provenance distinguishing verified analytical equations from reference-only standards.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="px-2.5 py-1 rounded-[3px] bg-[#14171A] border border-[#2A2E35] text-center">
              <span className="text-[10px] text-[#969DA5] block">Total Standards</span>
              <span className="font-bold text-[#F0F1F2]">{stats.total}</span>
            </div>
            <div className="px-2.5 py-1 rounded-[3px] bg-[#14171A] border border-[#2A2E35] text-center">
              <span className="text-[10px] text-[#64D6C5] block">Verified Core</span>
              <span className="font-bold text-[#64D6C5]">{stats.verified}</span>
            </div>
            <div className="px-2.5 py-1 rounded-[3px] bg-[#14171A] border border-[#2A2E35] text-center">
              <span className="text-[10px] text-[#969DA5] block">Reference Only</span>
              <span className="font-bold text-neutral-400">{stats.unverified}</span>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#969DA5]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by standard code, organization, title, scope..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#14171A] border border-[#2A2E35] focus:border-[#64D6C5] rounded-[3px] text-xs font-mono text-[#F0F1F2] placeholder-[#6B7280] outline-hidden transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#969DA5] hover:text-[#F0F1F2]"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <span className="text-[10px] text-[#969DA5] mr-1">Org:</span>
            {(['ALL', 'ASME', 'ISO', 'DIN', 'ASTM'] as const).map((org) => (
              <button
                key={org}
                onClick={() => setOrgFilter(org)}
                className={`px-2 py-0.5 rounded-[2px] text-[11px] transition-colors ${
                  orgFilter === org
                    ? 'bg-[#22262A] text-[#64D6C5] font-bold border border-[#34393F]'
                    : 'text-[#969DA5] hover:text-[#F0F1F2]'
                }`}
              >
                {org}
              </button>
            ))}

            <span className="text-[10px] text-[#969DA5] ml-2 mr-1">Status:</span>
            {(['ALL', 'verified', 'unverified'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVerifFilter(v)}
                className={`px-2 py-0.5 rounded-[2px] text-[11px] transition-colors ${
                  verifFilter === v
                    ? 'bg-[#22262A] text-[#64D6C5] font-bold border border-[#34393F]'
                    : 'text-[#969DA5] hover:text-[#F0F1F2]'
                }`}
              >
                {v === 'ALL' ? 'All' : v === 'verified' ? 'Verified' : 'Ref Only'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Standards List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] p-8 text-center">
            <p className="text-xs font-mono text-[#969DA5]">
              No engineering standards match the selected filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setOrgFilter('ALL');
                setVerifFilter('ALL');
              }}
              className="mt-2 text-xs font-mono text-[#64D6C5] hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filtered.map((std) => (
            <div
              key={std.id}
              className={`bg-[#191C1F] border rounded-[4px] p-4 transition-all hover:border-[#4B535D] ${
                std.verificationStatus === 'verified'
                  ? 'border-l-4 border-l-[#64D6C5] border-[#34393F]'
                  : 'border-l-4 border-l-neutral-600 border-[#2A2E35]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 pb-2 border-b border-[#2A2E35]">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold font-mono text-[#F0F1F2]">
                      {std.code}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#14171A] border border-[#2A2E35] text-[#C2C8D0]">
                      {std.organization}
                    </span>
                    {renderStatusBadge(std.status)}
                    {renderVerificationBadge(std.verificationStatus)}
                  </div>
                  <h3 className="text-xs font-medium text-[#C2C8D0]">
                    {std.title}
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedStandard(std)}
                  className="self-start sm:self-auto shrink-0 px-2.5 py-1 text-xs font-mono rounded-[3px] bg-[#22262A] hover:bg-[#2E3339] text-[#64D6C5] border border-[#34393F] flex items-center gap-1.5 transition-colors"
                >
                  <BookOpen size={12} />
                  <span>Inspect Details</span>
                </button>
              </div>

              {/* Scope & Calculations */}
              <div className="pt-2.5 space-y-2 text-xs font-mono">
                <p className="text-[#969DA5] text-[11px] leading-relaxed">
                  {std.scope}
                </p>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-[#6B7280] uppercase tracking-wider">
                    Calculations:
                  </span>
                  {std.supportedCalculations.length > 0 ? (
                    std.supportedCalculations.map((calc) => (
                      <span
                        key={calc}
                        className="text-[10px] px-1.5 py-0.5 rounded-[2px] bg-[#14171A] border border-[#2A2E35] text-[#64D6C5]"
                      >
                        {calc}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-neutral-500 italic">
                      None (Reference Only — Not implemented or purely informational)
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Inspector Modal */}
      {selectedStandard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-[#34393F] flex items-center justify-between bg-[#22262A]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#64D6C5]">
                    {selectedStandard.code}
                  </span>
                  {renderStatusBadge(selectedStandard.status)}
                  {renderVerificationBadge(selectedStandard.verificationStatus)}
                </div>
                <h3 className="text-xs font-medium text-[#C2C8D0] mt-0.5 line-clamp-1">
                  {selectedStandard.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedStandard(null)}
                className="p-1 text-[#969DA5] hover:text-white rounded-[3px] hover:bg-[#2E3339] transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs font-mono">
              {/* Publication & Organization Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-[#14171A] p-2.5 rounded-[3px] border border-[#2A2E35]">
                <div>
                  <span className="text-[10px] text-[#969DA5] block">Organization</span>
                  <span className="text-[#F0F1F2] font-bold">{selectedStandard.organization}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#969DA5] block">Edition / Revision</span>
                  <span className="text-[#F0F1F2]">{selectedStandard.edition}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#969DA5] block">Publication Status</span>
                  <span className="text-[#F0F1F2] capitalize">{selectedStandard.status}</span>
                </div>
              </div>

              {/* Scope */}
              <div>
                <h4 className="text-[10px] uppercase font-bold text-[#969DA5] tracking-wider mb-1">
                  Engineering Scope
                </h4>
                <div className="p-2.5 bg-[#14171A] rounded-[3px] border border-[#2A2E35] text-[#C2C8D0] leading-relaxed">
                  {selectedStandard.scope}
                </div>
              </div>

              {/* Supported Calculations */}
              <div>
                <h4 className="text-[10px] uppercase font-bold text-[#969DA5] tracking-wider mb-1">
                  Supported Software Calculations
                </h4>
                <div className="p-2.5 bg-[#14171A] rounded-[3px] border border-[#2A2E35]">
                  {selectedStandard.supportedCalculations.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedStandard.supportedCalculations.map((c) => (
                        <span
                          key={c}
                          className="px-2 py-0.5 bg-[#22262A] text-[#64D6C5] rounded-[2px] border border-[#34393F] text-[11px]"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-neutral-500 italic text-[11px]">
                      This standard is maintained as a reference only. No calculation routines in the active calculation kernel directly implement its normative equations.
                    </p>
                  )}
                </div>
              </div>

              {/* Physical Assumptions */}
              <div>
                <h4 className="text-[10px] uppercase font-bold text-[#969DA5] tracking-wider mb-1">
                  Governing Assumptions
                </h4>
                <ul className="list-disc pl-4 space-y-1 text-[#969DA5] text-[11px]">
                  {selectedStandard.assumptions.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Known Limitations */}
              <div>
                <h4 className="text-[10px] uppercase font-bold text-amber-400 tracking-wider mb-1">
                  Explicit Limitations & Disclaimers
                </h4>
                <ul className="list-disc pl-4 space-y-1 text-amber-200/90 text-[11px]">
                  {selectedStandard.limitations.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Primary References */}
              <div>
                <h4 className="text-[10px] uppercase font-bold text-[#969DA5] tracking-wider mb-1">
                  Primary References & Provenance
                </h4>
                <div className="p-2.5 bg-[#14171A] rounded-[3px] border border-[#2A2E35] space-y-1">
                  {selectedStandard.references.map((ref, idx) => (
                    <div key={idx} className="text-[#C2C8D0] text-[11px] flex items-center gap-1.5">
                      <span className="text-[#64D6C5] font-bold">[{idx + 1}]</span>
                      <span>{ref}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2.5 bg-[#22262A] border-t border-[#34393F] flex justify-between items-center text-[10px] text-[#969DA5]">
              <span>QUANTUM AI // Traceable Engineering Standards Kernel</span>
              <button
                onClick={() => setSelectedStandard(null)}
                className="px-3 py-1 bg-[#191C1F] hover:bg-[#14171A] text-[#F0F1F2] border border-[#34393F] rounded-[3px] transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
