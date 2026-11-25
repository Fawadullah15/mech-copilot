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
          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-[2px] bg-[#39866B]/10 text-[#39866B] border border-[#39866B]/20">
            Active
          </span>
        );
      case 'withdrawn':
        return (
          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-[2px] bg-[#D58A36]/10 text-[#D58A36] border border-[#D58A36]/20">
            Withdrawn
          </span>
        );
      case 'historical':
        return (
          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-[2px] bg-[#2868D7]/10 text-[#2868D7] border border-[#2868D7]/20">
            Historical
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-[2px] bg-gray-500/10 text-gray-500 border border-gray-500/20">
            Unknown
          </span>
        );
    }
  };

  const renderVerificationBadge = (vStatus: VerificationStatus) => {
    switch (vStatus) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded-[4px] bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
            <CheckCircle2 size={11} /> Verified In Software
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded-[4px] bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
            <Info size={11} /> Draft Formulation
          </span>
        );
      case 'unverified':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded-[4px] bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]">
            <AlertTriangle size={11} /> Reference Only (Unverified)
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 font-sans text-[#18211F]">
      {/* Overview & Transparency Notice */}
      <div className="bg-white border border-[#DDE4E0] rounded-[4px] p-4 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-[#DDE4E0]">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#147D70] mb-0.5">
              Standards Governance & Transparency
            </div>
            <h2 className="text-base font-bold text-[#18211F]">
              Mechanical Engineering Standards Registry
            </h2>
            <p className="text-xs text-[#64716C] font-mono mt-0.5">
              Traceable provenance distinguishing verified analytical equations from reference-only standards.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="px-2.5 py-1 rounded-[3px] bg-[#F5F7F5] border border-[#DDE4E0] text-center">
              <span className="text-[10px] text-[#64716C] block">Total Standards</span>
              <span className="font-bold text-[#18211F]">{stats.total}</span>
            </div>
            <div className="px-2.5 py-1 rounded-[3px] bg-[#147D70]/10 border border-[#147D70]/30 text-center">
              <span className="text-[10px] text-[#147D70] block">Verified Core</span>
              <span className="font-bold text-[#147D70]">{stats.verified}</span>
            </div>
            <div className="px-2.5 py-1 rounded-[3px] bg-[#F5F7F5] border border-[#DDE4E0] text-center">
              <span className="text-[10px] text-[#64716C] block">Reference Only</span>
              <span className="font-bold text-[#64716C]">{stats.unverified}</span>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64716C]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by standard code, organization, title, scope..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#F5F7F5] border border-[#DDE4E0] focus:border-[#147D70] rounded-[3px] text-xs font-mono text-[#18211F] placeholder-[#64716C] outline-hidden transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64716C] hover:text-[#18211F]"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <span className="text-[10px] text-[#64716C] mr-1">Org:</span>
            {(['ALL', 'ASME', 'ISO', 'DIN', 'ASTM'] as const).map((org) => (
              <button
                key={org}
                onClick={() => setOrgFilter(org)}
                className={`px-2 py-0.5 rounded-[2px] text-[11px] transition-colors ${
                  orgFilter === org
                    ? 'bg-white text-[#147D70] font-bold border border-[#DDE4E0] shadow-xs'
                    : 'text-[#64716C] hover:text-[#18211F]'
                }`}
              >
                {org}
              </button>
            ))}

            <span className="text-[10px] text-[#64716C] ml-2 mr-1">Status:</span>
            {(['ALL', 'verified', 'unverified'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVerifFilter(v)}
                className={`px-2 py-0.5 rounded-[2px] text-[11px] transition-colors ${
                  verifFilter === v
                    ? 'bg-white text-[#147D70] font-bold border border-[#DDE4E0] shadow-xs'
                    : 'text-[#64716C] hover:text-[#18211F]'
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
          <div className="bg-white border border-[#DDE4E0] rounded-[4px] p-8 text-center shadow-xs">
            <p className="text-xs font-mono text-[#64716C]">
              No engineering standards match the selected filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setOrgFilter('ALL');
                setVerifFilter('ALL');
              }}
              className="mt-2 text-xs font-mono text-[#147D70] hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filtered.map((std) => (
            <div
              key={std.id}
              className={`bg-white border rounded-[4px] p-4 transition-all hover:border-[#147D70]/50 shadow-xs ${
                std.verificationStatus === 'verified'
                  ? 'border-l-4 border-l-[#147D70] border-[#DDE4E0]'
                  : 'border-l-4 border-l-[#64716C] border-[#DDE4E0]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 pb-2 border-b border-[#DDE4E0]">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold font-mono text-[#18211F]">
                      {std.code}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#F5F7F5] border border-[#DDE4E0] text-[#18211F]">
                      {std.organization}
                    </span>
                    {renderStatusBadge(std.status)}
                    {renderVerificationBadge(std.verificationStatus)}
                  </div>
                  <h3 className="text-xs font-medium text-[#64716C]">
                    {std.title}
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedStandard(std)}
                  className="self-start sm:self-auto shrink-0 px-2.5 py-1 text-xs font-mono rounded-[3px] bg-[#EEF2EF] hover:bg-[#E8EFED] text-[#147D70] border border-[#DDE4E0] flex items-center gap-1.5 transition-colors"
                >
                  <BookOpen size={12} />
                  <span>Inspect Details</span>
                </button>
              </div>

              {/* Scope & Calculations */}
              <div className="pt-2.5 space-y-2 text-xs font-mono">
                <p className="text-[#64716C] text-[11px] leading-relaxed">
                  {std.scope}
                </p>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-[#64716C] uppercase tracking-wider">
                    Calculations:
                  </span>
                  {std.supportedCalculations.length > 0 ? (
                    std.supportedCalculations.map((calc) => (
                      <span
                        key={calc}
                        className="text-[10px] px-1.5 py-0.5 rounded-[2px] bg-[#F5F7F5] border border-[#DDE4E0] text-[#147D70] font-semibold"
                      >
                        {calc}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-[#64716C] italic">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-[#DDE4E0] rounded-[4px] shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-[#DDE4E0] flex items-center justify-between bg-[#EEF2EF]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#147D70]">
                    {selectedStandard.code}
                  </span>
                  {renderStatusBadge(selectedStandard.status)}
                  {renderVerificationBadge(selectedStandard.verificationStatus)}
                </div>
                <h3 className="text-xs font-medium text-[#18211F] mt-0.5 line-clamp-1">
                  {selectedStandard.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedStandard(null)}
                className="p-1 text-[#64716C] hover:text-[#18211F] rounded-[3px] hover:bg-[#E8EFED] transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs font-mono">
              {/* Publication & Organization Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-[#F5F7F5] p-2.5 rounded-[3px] border border-[#DDE4E0]">
                <div>
                  <span className="text-[10px] text-[#64716C] block">Organization</span>
                  <span className="text-[#18211F] font-bold">{selectedStandard.organization}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#64716C] block">Edition / Revision</span>
                  <span className="text-[#18211F]">{selectedStandard.edition}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#64716C] block">Publication Status</span>
                  <span className="text-[#18211F] capitalize">{selectedStandard.status}</span>
                </div>
              </div>

              {/* Scope */}
              <div>
                <h4 className="text-[10px] uppercase font-bold text-[#64716C] tracking-wider mb-1">
                  Engineering Scope
                </h4>
                <div className="p-2.5 bg-[#F5F7F5] rounded-[3px] border border-[#DDE4E0] text-[#18211F] leading-relaxed">
                  {selectedStandard.scope}
                </div>
              </div>

              {/* Supported Calculations */}
              <div>
                <h4 className="text-[10px] uppercase font-bold text-[#64716C] tracking-wider mb-1">
                  Supported Software Calculations
                </h4>
                <div className="p-2.5 bg-[#F5F7F5] rounded-[3px] border border-[#DDE4E0]">
                  {selectedStandard.supportedCalculations.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedStandard.supportedCalculations.map((c) => (
                        <span
                          key={c}
                          className="px-2 py-0.5 bg-white text-[#147D70] rounded-[2px] border border-[#DDE4E0] text-[11px] font-semibold"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#64716C] italic text-[11px]">
                      This standard is maintained as a reference only. No calculation routines in the active calculation kernel directly implement its normative equations.
                    </p>
                  )}
                </div>
              </div>

              {/* Physical Assumptions */}
              <div>
                <h4 className="text-[10px] uppercase font-bold text-[#64716C] tracking-wider mb-1">
                  Governing Assumptions
                </h4>
                <ul className="list-disc pl-4 space-y-1 text-[#64716C] text-[11px]">
                  {selectedStandard.assumptions.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Known Limitations */}
              <div>
                <h4 className="text-[10px] uppercase font-bold text-[#D58A36] tracking-wider mb-1">
                  Explicit Limitations & Disclaimers
                </h4>
                <ul className="list-disc pl-4 space-y-1 text-[#D58A36] text-[11px]">
                  {selectedStandard.limitations.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Primary References */}
              <div>
                <h4 className="text-[10px] uppercase font-bold text-[#64716C] tracking-wider mb-1">
                  Primary References & Provenance
                </h4>
                <div className="p-2.5 bg-[#F5F7F5] rounded-[3px] border border-[#DDE4E0] space-y-1">
                  {selectedStandard.references.map((ref, idx) => (
                    <div key={idx} className="text-[#18211F] text-[11px] flex items-center gap-1.5">
                      <span className="text-[#147D70] font-bold">[{idx + 1}]</span>
                      <span>{ref}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2.5 bg-[#EEF2EF] border-t border-[#DDE4E0] flex justify-between items-center text-[10px] text-[#64716C]">
              <span>MECHANICAL COPILOT // Traceable Engineering Standards Kernel</span>
              <button
                onClick={() => setSelectedStandard(null)}
                className="px-3 py-1 bg-white hover:bg-[#E8EFED] text-[#18211F] border border-[#DDE4E0] rounded-[3px] transition-colors shadow-xs"
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
