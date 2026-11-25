import React, { useState } from 'react';
import type { DesignParameters, Material, AnalysisResult } from '../../types';
import type { VerificationCheck } from '../../engineering/drawing/types';
import { runDesignVerification } from '../../engineering/drawing/drawingVerification';

interface DesignVerificationPanelProps {
  designParams: DesignParameters;
  material: Material | null;
  analysis: AnalysisResult | null;
  drawingConfig?: { sheetSize?: string; orientation?: string; isDraft?: boolean };
  onRevalidate?: () => void;
}

export const DesignVerificationPanel: React.FC<DesignVerificationPanelProps> = ({
  designParams,
  material,
  analysis,
  drawingConfig,
  onRevalidate,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'Passed' | 'Warning' | 'Failed' | 'Not checked'>('ALL');

  const report = runDesignVerification(designParams, material, analysis, drawingConfig);

  const filteredChecks = report.checks.filter((c) => {
    if (filter === 'ALL') return true;
    return c.status === filter;
  });

  const getStatusBadge = (status: VerificationCheck['status']) => {
    switch (status) {
      case 'Passed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span>Passed</span>
          </span>
        );
      case 'Warning':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Warning</span>
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Failed</span>
          </span>
        );
      case 'Not checked':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            <span>Not checked</span>
          </span>
        );
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6 text-[#111827] dark:text-[#E2E8F0]">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-white dark:bg-[#151D2E] border border-[#D9DFED] dark:border-white/10 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#315EDE]">
              Design Validation Matrix
            </span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              9-Point Engineering Verification
            </span>
          </div>
          <div className="flex items-center space-x-3 mt-1.5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              System Verification Status:
            </h2>
            {getStatusBadge(report.overallStatus)}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onRevalidate && (
            <button
              onClick={onRevalidate}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#315EDE] text-white hover:bg-[#254ab8] shadow-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Re-run Validation</span>
            </button>
          )}
        </div>
      </div>

      {/* Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setFilter('Passed')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            filter === 'Passed'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20'
              : 'bg-white dark:bg-[#151D2E] border-[#D9DFED] dark:border-white/10 hover:border-emerald-200'
          }`}
        >
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 block">Passed</span>
          <span className="text-xl font-bold font-mono text-gray-900 dark:text-white mt-1 block">
            {report.passedCount}
          </span>
        </button>

        <button
          onClick={() => setFilter('Warning')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            filter === 'Warning'
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-[#151D2E] border-[#D9DFED] dark:border-white/10 hover:border-amber-200'
          }`}
        >
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400 block">Warnings</span>
          <span className="text-xl font-bold font-mono text-gray-900 dark:text-white mt-1 block">
            {report.warningCount}
          </span>
        </button>

        <button
          onClick={() => setFilter('Failed')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            filter === 'Failed'
              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700 ring-2 ring-rose-500/20'
              : 'bg-white dark:bg-[#151D2E] border-[#D9DFED] dark:border-white/10 hover:border-rose-200'
          }`}
        >
          <span className="text-xs font-medium text-rose-600 dark:text-rose-400 block">Failed</span>
          <span className="text-xl font-bold font-mono text-gray-900 dark:text-white mt-1 block">
            {report.failedCount}
          </span>
        </button>

        <button
          onClick={() => setFilter('Not checked')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            filter === 'Not checked'
              ? 'bg-gray-100 dark:bg-white/10 border-gray-300 dark:border-white/20 ring-2 ring-gray-400/20'
              : 'bg-white dark:bg-[#151D2E] border-[#D9DFED] dark:border-white/10 hover:border-gray-300'
          }`}
        >
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block">Not Checked</span>
          <span className="text-xl font-bold font-mono text-gray-900 dark:text-white mt-1 block">
            {report.notCheckedCount}
          </span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 pt-1 border-b border-[#D9DFED] dark:border-white/10 pb-2 text-xs">
        <span className="text-gray-400 font-medium">Filter Checks:</span>
        {(['ALL', 'Passed', 'Warning', 'Failed', 'Not checked'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1 rounded-lg font-medium transition-colors ${
              filter === tab
                ? 'bg-[#315EDE] text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            {tab === 'ALL' ? `All (${report.totalChecks})` : tab}
          </button>
        ))}
      </div>

      {/* 9-Point Verification Checklist Items */}
      <div className="space-y-3">
        {filteredChecks.map((check) => (
          <div
            key={check.id}
            className="p-4 rounded-xl bg-white dark:bg-[#151D2E] border border-[#D9DFED] dark:border-white/10 shadow-sm space-y-2.5 transition-all"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                  {check.category}
                </span>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {check.title}
                </h4>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono text-gray-400">
                  {check.standardReference}
                </span>
                {getStatusBadge(check.status)}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#0B0F17] grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-gray-400 text-[10px] block font-sans">Evaluated Value</span>
                <span className="text-gray-900 dark:text-gray-100 font-medium">{check.evaluatedValue}</span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] block font-sans">Governing Acceptance Standard</span>
                <span className="text-gray-700 dark:text-gray-300">{check.requiredValue}</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-sans">
              {check.message}
            </p>
          </div>
        ))}
      </div>

      {/* Standard Disclaimer */}
      <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#151D2E] border border-[#D9DFED] dark:border-white/10 text-[11px] text-gray-500 dark:text-gray-400 flex items-start space-x-2">
        <svg className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{report.disclaimer}</span>
      </div>
    </div>
  );
};
