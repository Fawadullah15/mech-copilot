import React, { useState } from 'react';
import { ShieldAlert, CheckCircle, XCircle, ArrowRight, Check, X, Sliders } from 'lucide-react';
import type { ProposedEngineeringChange } from '../types';

interface ProposedChangeCardProps {
  proposedChange: ProposedEngineeringChange;
  onApprove: (payload: any) => void;
  onReject?: () => void;
}

export default function ProposedChangeCard({ proposedChange, onApprove, onReject }: ProposedChangeCardProps) {
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);

  const isHighImpact = proposedChange.permission === 'HIGH_IMPACT';

  const handleApprove = () => {
    setDecision('approved');
    onApprove(proposedChange.payload || { [proposedChange.parameter || 'diameter']: proposedChange.proposedValue });
  };

  const handleReject = () => {
    setDecision('rejected');
    if (onReject) onReject();
  };

  return (
    <div className="mt-2.5 bg-white dark:bg-[#101A2B] border border-[#BFDBFE] dark:border-[#2563EB]/40 rounded-[8px] overflow-hidden text-xs font-sans">
      <div className="bg-[#EFF6FF] dark:bg-[#1B2942] border-b border-[#BFDBFE] dark:border-[#2563EB]/30 px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Sliders size={13} className="text-[#2563EB] shrink-0" />
          <span className="text-[11px] font-mono font-semibold text-[#172033] dark:text-white uppercase tracking-wider truncate">
            {proposedChange.title || 'Proposed Design Change'}
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[9px] font-mono font-bold uppercase border shrink-0 ${
            isHighImpact
              ? 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
              : 'bg-white dark:bg-[#101A2B] border-[#BFDBFE] text-[#2563EB]'
          }`}
        >
          <ShieldAlert size={10} />
          {isHighImpact ? 'High Impact' : 'Reversible'}
        </span>
      </div>

      <div className="p-2.5 space-y-2">
        <div className="text-[11px] text-[#64748B] leading-relaxed">
          {proposedChange.description}
        </div>

        {proposedChange.changes && proposedChange.changes.length > 0 ? (
          <div className="bg-[#F8FAFC] dark:bg-[#162236] rounded-[6px] border border-[#E2E8F0] dark:border-[#24344F] overflow-hidden">
            <table className="w-full text-left text-[11px] font-mono tabular-nums">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-[#24344F] text-[10px] text-[#64748B] uppercase">
                  <th className="py-1 px-2 font-medium">Parameter</th>
                  <th className="py-1 px-2 font-medium">Current</th>
                  <th className="py-1 px-2 font-medium">Proposed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#24344F]">
                {proposedChange.changes.map((c, i) => (
                  <tr key={i}>
                    <td className="py-1 px-2 font-semibold text-[#172033] dark:text-white">{c.field}</td>
                    <td className="py-1 px-2 text-[#64748B]">{String(c.current)}</td>
                    <td className="py-1 px-2 font-bold text-[#2563EB]">{String(c.proposed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : proposedChange.proposedValue !== undefined ? (
          <div className="flex items-center gap-2 bg-[#F8FAFC] dark:bg-[#162236] p-2 rounded-[6px] border border-[#E2E8F0] dark:border-[#24344F] font-mono text-xs tabular-nums">
            <span className="text-[#64748B]">{proposedChange.parameter || 'Dimension'}:</span>
            <span className="line-through text-[#94A3B8]">
              {String(proposedChange.currentValue ?? '—')} {proposedChange.unit || ''}
            </span>
            <ArrowRight size={12} className="text-[#2563EB]" />
            <span className="font-bold text-[#2563EB]">
              {String(proposedChange.proposedValue)} {proposedChange.unit || ''}
            </span>
          </div>
        ) : null}
      </div>

      <div className="bg-[#F8FAFC] dark:bg-[#162236] px-3 py-2 border-t border-[#E2E8F0] dark:border-[#24344F] flex items-center justify-between gap-2">
        {decision === 'approved' ? (
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-[#16A34A]">
            <CheckCircle size={13} />
            <span>Approved & Synced to CAD</span>
          </div>
        ) : decision === 'rejected' ? (
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-[#DC2626]">
            <XCircle size={13} />
            <span>Rejected</span>
          </div>
        ) : (
          <>
            <span className="text-[10px] text-[#64748B] font-mono">Approval Required</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleReject}
                className="bg-white dark:bg-[#101A2B] border border-[#E2E8F0] dark:border-[#334155] text-[#DC2626] hover:border-[#DC2626] text-[10px] font-mono font-semibold py-1 px-2.5 rounded-[5px] flex items-center gap-1 transition-colors"
              >
                <X size={11} />
                Reject
              </button>
              <button
                onClick={handleApprove}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[10px] font-mono font-semibold py-1 px-2.5 rounded-[5px] flex items-center gap-1 transition-colors"
              >
                <Check size={11} />
                Approve & Apply
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
