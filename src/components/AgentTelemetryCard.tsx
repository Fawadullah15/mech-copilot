import React, { useState } from 'react';
import { Terminal, Shield, CheckCircle, AlertTriangle, Clock, HelpCircle, ChevronDown, ChevronRight, Cpu } from 'lucide-react';
import type { AgentOperationState, ToolExecutionLogEntry, EngineeringRequirementsSummary } from '../types';

interface AgentTelemetryCardProps {
  operationState?: AgentOperationState;
  toolLogs?: ToolExecutionLogEntry[];
  requirements?: EngineeringRequirementsSummary;
}

export default function AgentTelemetryCard({ operationState, toolLogs, requirements }: AgentTelemetryCardProps) {
  const [showToolLogs, setShowToolLogs] = useState(false);

  const getStatusBadge = (state?: AgentOperationState) => {
    switch (state) {
      case 'Thinking':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-ping" />
            Thinking...
          </span>
        );
      case 'Waiting for Information':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono font-semibold bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
            <HelpCircle size={10} />
            Waiting for Information
          </span>
        );
      case 'Waiting for Approval':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
            <Shield size={10} />
            Waiting for Approval
          </span>
        );
      case 'Executing':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
            <Cpu size={10} className="animate-spin" />
            Executing Tools...
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono font-semibold bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]">
            <CheckCircle size={10} />
            Completed
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono font-semibold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
            <AlertTriangle size={10} />
            Refused / Failed
          </span>
        );
      default:
        return null;
    }
  };

  const hasRequirements =
    requirements &&
    (Object.keys(requirements.identified || {}).length > 0 || (requirements.missing || []).length > 0);
  const hasToolLogs = toolLogs && toolLogs.length > 0;

  if (!operationState && !hasRequirements && !hasToolLogs) {
    return null;
  }

  return (
    <div className="mt-2.5 space-y-2 font-sans text-xs">
      {operationState && (
        <div className="flex items-center justify-between bg-white dark:bg-[#101A2B] px-2.5 py-1.5 rounded-[6px] border border-[#E2E8F0] dark:border-[#24344F]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] font-semibold">
            Agent Status
          </span>
          {getStatusBadge(operationState)}
        </div>
      )}

      {hasRequirements && (
        <div className="bg-white dark:bg-[#101A2B] rounded-[6px] border border-[#E2E8F0] dark:border-[#24344F] p-2.5 space-y-2">
          {Object.keys(requirements.identified || {}).length > 0 && (
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#2563EB] mb-1">
                ✓ Identified Inputs
              </div>
              <div className="grid grid-cols-2 gap-1 font-mono text-[11px]">
                {Object.entries(requirements.identified).map(([k, v]) => (
                  <div
                    key={k}
                    className="bg-[#F8FAFC] dark:bg-[#162236] px-2 py-1 rounded-[4px] border border-[#E2E8F0] dark:border-[#24344F] tabular-nums"
                  >
                    <span className="text-[#64748B] mr-1">{k}:</span>
                    <span className="font-semibold text-[#172033] dark:text-white">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {requirements.missing && requirements.missing.length > 0 && (
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#D97706] mb-1 flex items-center gap-1">
                <AlertTriangle size={11} />
                Missing Information
              </div>
              <div className="space-y-1">
                {requirements.missing.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-[#FFFBEB] border border-[#FDE68A] text-[#D97706] px-2 py-1 rounded-[4px] text-[11px] font-mono"
                  >
                    • {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {hasToolLogs && (
        <div className="bg-white dark:bg-[#101A2B] rounded-[6px] border border-[#E2E8F0] dark:border-[#24344F] overflow-hidden">
          <button
            onClick={() => setShowToolLogs(!showToolLogs)}
            className="w-full px-2.5 py-1.5 flex items-center justify-between text-left text-[11px] font-mono text-[#64748B] hover:bg-[#F8FAFC] dark:hover:bg-[#1B2942] transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Terminal size={12} className="text-[#2563EB]" />
              <span className="font-semibold text-[#172033] dark:text-white">
                Tools Executed ({toolLogs.length})
              </span>
            </div>
            {showToolLogs ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>

          {showToolLogs && (
            <div className="p-2 border-t border-[#E2E8F0] dark:border-[#24344F] space-y-1 bg-[#F8FAFC] dark:bg-[#0D1526]">
              {toolLogs.map((log, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-[10px] font-mono bg-white dark:bg-[#101A2B] px-2 py-1 rounded-[4px] border border-[#E2E8F0] dark:border-[#24344F]"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-[#64748B]">{i + 1}.</span>
                    <span className={log.status === 'failed' ? 'text-[#DC2626] font-bold' : 'text-[#16A34A] font-bold'}>
                      {log.status === 'failed' ? '✕' : '✓'}
                    </span>
                    <span className="font-semibold text-[#172033] dark:text-white truncate">{log.tool}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`px-1 py-0.5 rounded-[3px] text-[9px] font-bold ${
                        log.permission === 'HIGH_IMPACT'
                          ? 'bg-[#FEF2F2] text-[#DC2626]'
                          : log.permission === 'REVERSIBLE'
                          ? 'bg-[#EFF6FF] text-[#2563EB]'
                          : 'bg-[#F0FDF4] text-[#16A34A]'
                      }`}
                    >
                      {log.permission}
                    </span>
                    {log.durationMs !== undefined && (
                      <span className="text-[#64748B] text-[9px] flex items-center gap-0.5 tabular-nums">
                        <Clock size={9} />
                        {log.durationMs}ms
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
