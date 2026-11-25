import React from 'react';
import type { DesignParameters, Material } from '../../types';
import { generateManufacturingSpec } from '../../engineering/drawing/manufacturingSpecs';

interface ManufacturingInfoPanelProps {
  designParams: DesignParameters;
  material: Material;
  onExportJson?: () => void;
}

export const ManufacturingInfoPanel: React.FC<ManufacturingInfoPanelProps> = ({
  designParams,
  material,
  onExportJson,
}) => {
  const spec = generateManufacturingSpec(designParams, material);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6 text-[#111827] dark:text-[#E2E8F0]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#D9DFED] dark:border-white/10">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#315EDE]" />
            <h2 className="text-base font-bold tracking-tight text-[#111827] dark:text-white">
              Manufacturing & Production Specification
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Precision tolerances, GD&T, surface finishes, and shop-floor process routing according to ISO/DIN standards.
          </p>
        </div>
        {onExportJson && (
          <button
            onClick={onExportJson}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#315EDE]/10 text-[#315EDE] hover:bg-[#315EDE]/20 border border-[#315EDE]/30 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export Spec Data</span>
          </button>
        )}
      </div>

      {/* Grid: Material & Mass Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Material Card */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#151D2E] border border-[#D9DFED] dark:border-white/10 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#315EDE]">
              Material Specification
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300">
              {spec.materialSpec.standard}
            </span>
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {spec.materialSpec.name}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-[#F8FAFC] dark:bg-[#0B0F17]">
              <span className="text-gray-500 dark:text-gray-400 block text-[10px]">Condition</span>
              <span className="font-medium text-gray-800 dark:text-gray-200">{spec.materialSpec.condition}</span>
            </div>
            <div className="p-2 rounded bg-[#F8FAFC] dark:bg-[#0B0F17]">
              <span className="text-gray-500 dark:text-gray-400 block text-[10px]">Hardness</span>
              <span className="font-mono font-medium text-gray-800 dark:text-gray-200">{spec.materialSpec.hardness}</span>
            </div>
            <div className="p-2 rounded bg-[#F8FAFC] dark:bg-[#0B0F17]">
              <span className="text-gray-500 dark:text-gray-400 block text-[10px]">Yield Strength (Sy)</span>
              <span className="font-mono font-semibold text-[#315EDE]">{spec.materialSpec.yieldStrengthMPa} MPa</span>
            </div>
            <div className="p-2 rounded bg-[#F8FAFC] dark:bg-[#0B0F17]">
              <span className="text-gray-500 dark:text-gray-400 block text-[10px]">Tensile Strength (Su)</span>
              <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">{spec.materialSpec.tensileStrengthMPa} MPa</span>
            </div>
          </div>
        </div>

        {/* Dimensions & Mass */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#151D2E] border border-[#D9DFED] dark:border-white/10 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7653C9]">
              Overall Dimensions & Mass
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-[#7653C9]">
              Billet vs Finish
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-[#F8FAFC] dark:bg-[#0B0F17]">
              <span className="text-gray-500 dark:text-gray-400 block text-[10px]">Nominal Body Ø</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-white">Ø {spec.overallDimensions.diameterMm.toFixed(2)} mm</span>
            </div>
            <div className="p-2 rounded bg-[#F8FAFC] dark:bg-[#0B0F17]">
              <span className="text-gray-500 dark:text-gray-400 block text-[10px]">Overall Length</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-white">{spec.overallDimensions.lengthMm.toFixed(2)} mm</span>
            </div>
            <div className="p-2 rounded bg-[#F8FAFC] dark:bg-[#0B0F17]">
              <span className="text-gray-500 dark:text-gray-400 block text-[10px]">Rough Stock Weight</span>
              <span className="font-mono font-medium text-amber-600 dark:text-amber-400">{spec.overallDimensions.roughWeightKg.toFixed(2)} kg</span>
            </div>
            <div className="p-2 rounded bg-[#F8FAFC] dark:bg-[#0B0F17]">
              <span className="text-gray-500 dark:text-gray-400 block text-[10px]">Finished Net Weight</span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{spec.overallDimensions.finishWeightKg.toFixed(2)} kg</span>
            </div>
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 flex justify-between pt-1">
            <span>Material utilization:</span>
            <span className="font-mono font-medium">
              {((spec.overallDimensions.finishWeightKg / Math.max(0.1, spec.overallDimensions.roughWeightKg)) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Critical Bearing Journals & Fits */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#151D2E] border border-[#D9DFED] dark:border-white/10 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
          Critical Bearing Journal Seats & Fits (ISO 286-2)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#D9DFED] dark:border-white/10 text-gray-500 dark:text-gray-400 font-medium">
                <th className="py-2 pr-3">Journal Location</th>
                <th className="py-2 px-3">Nominal Ø</th>
                <th className="py-2 px-3">Fit Class</th>
                <th className="py-2 px-3">Tolerance Limits</th>
                <th className="py-2 px-3">Surface Finish</th>
                <th className="py-2 pl-3">Length</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-mono">
              {spec.bearingSeats.map((b, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                  <td className="py-2.5 pr-3 font-sans font-medium text-gray-800 dark:text-gray-200">{b.journal}</td>
                  <td className="py-2.5 px-3">Ø {b.nominalDiaMm.toFixed(2)} mm</td>
                  <td className="py-2.5 px-3 font-semibold text-[#315EDE]">{b.fitClass}</td>
                  <td className="py-2.5 px-3">+{b.upperDevUm} / +{b.lowerDevUm} µm</td>
                  <td className="py-2.5 px-3 text-emerald-600 font-semibold">Ra {b.surfaceFinishRa} µm (Ground)</td>
                  <td className="py-2.5 pl-3">{b.widthMm.toFixed(1)} mm</td>
                </tr>
              ))}
              <tr className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                <td className="py-2.5 pr-3 font-sans font-medium text-gray-800 dark:text-gray-200">Midspan Gear Seat</td>
                <td className="py-2.5 px-3">Ø {spec.gearSeat.nominalDiaMm.toFixed(2)} mm</td>
                <td className="py-2.5 px-3 font-semibold text-[#7653C9]">{spec.gearSeat.fitClass}</td>
                <td className="py-2.5 px-3">+{spec.gearSeat.upperDevUm} / +{spec.gearSeat.lowerDevUm} µm</td>
                <td className="py-2.5 px-3 text-emerald-600 font-semibold">Ra {spec.gearSeat.surfaceFinishRa} µm (Turned)</td>
                <td className="py-2.5 pl-3">{spec.gearSeat.widthMm.toFixed(1)} mm</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Keyway Specification & GD&T Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Keyway Table */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#151D2E] border border-[#D9DFED] dark:border-white/10 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Keyway Specification
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-[#315EDE]">
              DIN 6885-1 Form A
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-[#F8FAFC] dark:bg-[#0B0F17]">
              <span className="text-gray-500 dark:text-gray-400 block text-[10px]">Slot Width (b)</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-white">
                {spec.keyway.widthMm.toFixed(1)} {spec.keyway.fitClass} mm
              </span>
            </div>
            <div className="p-2 rounded bg-[#F8FAFC] dark:bg-[#0B0F17]">
              <span className="text-gray-500 dark:text-gray-400 block text-[10px]">Slot Depth (t1)</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-white">
                {spec.keyway.depthMm.toFixed(1)} mm
              </span>
            </div>
            <div className="p-2 rounded bg-[#F8FAFC] dark:bg-[#0B0F17]">
              <span className="text-gray-500 dark:text-gray-400 block text-[10px]">Slot Length (L)</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-white">
                {spec.keyway.lengthMm.toFixed(1)} mm
              </span>
            </div>
            <div className="p-2 rounded bg-[#F8FAFC] dark:bg-[#0B0F17]">
              <span className="text-gray-500 dark:text-gray-400 block text-[10px]">Bottom Fillet</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-white">
                R {spec.keyway.filletRadiusMm} mm
              </span>
            </div>
          </div>
        </div>

        {/* GD&T Table */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#151D2E] border border-[#D9DFED] dark:border-white/10 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
            Geometric Dimensioning & Tolerancing (GD&T)
          </h3>
          <div className="space-y-2 text-xs">
            {spec.gdtRequirements.map((g, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-[#F8FAFC] dark:bg-[#0B0F17] flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-1.5 font-medium text-gray-900 dark:text-white">
                    <span className="text-sm font-mono text-[#315EDE]">{g.symbol}</span>
                    <span>{g.characteristic}</span>
                  </div>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">{g.feature}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-gray-900 dark:text-white block">
                    {g.toleranceMm} mm {g.datumRef !== '-' ? `[${g.datumRef}]` : ''}
                  </span>
                  <span className="text-[10px] text-gray-400">{g.note}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6-Step Manufacturing Process Routing */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#151D2E] border border-[#D9DFED] dark:border-white/10 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
          6-Stage Process Routing & Operation Schedule
        </h3>
        <div className="space-y-2">
          {spec.processRouting.map((route) => (
            <div
              key={route.step}
              className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#0B0F17] border border-[#D9DFED]/60 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center space-x-3">
                <span className="w-7 h-7 rounded-md bg-[#315EDE]/10 text-[#315EDE] font-mono font-bold flex items-center justify-center shrink-0">
                  {route.step}
                </span>
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white block">
                    {route.operation}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 text-[11px] leading-relaxed">
                    {route.description}
                  </span>
                </div>
              </div>
              <span className="shrink-0 self-start md:self-center font-mono text-[11px] px-2.5 py-1 rounded bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                {route.machine}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* General Notes */}
      <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#151D2E] border border-[#D9DFED] dark:border-white/10 text-xs space-y-1.5">
        <h4 className="font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 text-[11px]">
          Engineering Drawing & Manufacturing Notes
        </h4>
        <ul className="space-y-1 text-gray-600 dark:text-gray-400 leading-relaxed">
          {spec.generalNotes.map((note, idx) => (
            <li key={idx}>{note}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
