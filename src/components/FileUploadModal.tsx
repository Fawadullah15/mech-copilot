import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  Box,
  FileCode,
  CheckCircle2,
  Loader2,
  ArrowRight,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { mockUploadedFiles } from '../data/engineeringRules';
import type { UploadedEngineeringFile } from '../types';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Stage = 'idle' | 'uploading' | 'analyzing' | 'extracted';

export default function FileUploadModal({ isOpen, onClose }: FileUploadModalProps) {
  const { applyRecommendation, sendCopilotMessage } = useApp();
  const [stage, setStage] = useState<Stage>('idle');
  const [selectedFile, setSelectedFile] = useState<UploadedEngineeringFile | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (file: UploadedEngineeringFile) => {
    setSelectedFile(file);
    setStage('uploading');

    setTimeout(() => {
      setStage('analyzing');
    }, 500);

    setTimeout(() => {
      setStage('extracted');
    }, 1100);
  };

  const handleApplySpecs = () => {
    if (!selectedFile || !selectedFile.extractedSpecs) return;

    const specs = selectedFile.extractedSpecs;
    applyRecommendation({
      torque: specs.torque,
      rpm: specs.rpm,
      safetyFactor: specs.safetyFactor,
      diameter: specs.diameterMin,
      temperature: specs.operatingTemp,
    });

    sendCopilotMessage(
      `Document context loaded from "${selectedFile.name}". Extracted specs: Torque=${specs.torque} Nm, RPM=${specs.rpm}, Min Diameter=${specs.diameterMin} mm, Target FoS=${specs.safetyFactor}.`
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50 backdrop-blur-xs animate-fade-in p-4 font-sans">
      <div className="bg-white dark:bg-[#101A2B] border border-[#E2E8F0] dark:border-[#1E2D45] rounded-[8px] w-full max-w-2xl max-h-[90vh] shadow-modal overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#1E2D45] flex items-center justify-between bg-[#F8FAFC] dark:bg-[#162236]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white dark:bg-[#101A2B] text-[#2563EB] rounded-[6px] border border-[#E2E8F0] dark:border-[#334155]">
              <UploadCloud size={16} />
            </div>
            <div>
              <h2 className="text-xs font-mono font-bold text-[#172033] dark:text-white uppercase tracking-wider flex items-center gap-2">
                Engineering Specification Ingestion
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-[4px] bg-[#EFF6FF] dark:bg-[#1B2942] text-[#2563EB] border border-[#BFDBFE] dark:border-[#2563EB]/40">
                  Preset Parser
                </span>
              </h2>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                Select a reference spec sheet to extract geometric constraints and boundary loads.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#64748B] hover:text-[#172033] dark:hover:text-white p-1 rounded-[5px] hover:bg-[#E2E8F0] dark:hover:bg-[#1B2942] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Workflow Stage Indicator */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
            <div
              className={`p-1.5 rounded-[6px] border ${
                stage === 'idle' || stage === 'uploading'
                  ? 'bg-[#EFF6FF] dark:bg-[#1B2942] border-[#2563EB] text-[#2563EB] font-bold'
                  : 'bg-[#F8FAFC] dark:bg-[#162236] border-[#E2E8F0] dark:border-[#24344F] text-[#64748B]'
              }`}
            >
              1. Document
            </div>
            <div
              className={`p-1.5 rounded-[6px] border ${
                stage === 'analyzing'
                  ? 'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB] font-bold animate-pulse'
                  : stage === 'extracted'
                  ? 'bg-[#F0FDF4] dark:bg-[#052E16]/30 border-[#BBF7D0] text-[#16A34A]'
                  : 'bg-[#F8FAFC] dark:bg-[#162236] border-[#E2E8F0] dark:border-[#24344F] text-[#64748B]'
              }`}
            >
              2. Parse
            </div>
            <div
              className={`p-1.5 rounded-[6px] border ${
                stage === 'extracted'
                  ? 'bg-[#F0FDF4] dark:bg-[#052E16]/30 border-[#16A34A] text-[#16A34A] font-bold'
                  : 'bg-[#F8FAFC] dark:bg-[#162236] border-[#E2E8F0] dark:border-[#24344F] text-[#64748B]'
              }`}
            >
              3. Telemetry
            </div>
            <div
              className={`p-1.5 rounded-[6px] border ${
                stage === 'extracted'
                  ? 'bg-[#EFF6FF] dark:bg-[#1B2942] border-[#2563EB] text-[#2563EB] font-bold'
                  : 'bg-[#F8FAFC] dark:bg-[#162236] border-[#E2E8F0] dark:border-[#24344F] text-[#64748B]'
              }`}
            >
              4. Ready
            </div>
          </div>

          {/* Idle State */}
          {stage === 'idle' && (
            <div className="space-y-3">
              <div className="border border-dashed border-[#CBD5E1] dark:border-[#334155] hover:border-[#2563EB] rounded-[8px] p-6 flex flex-col items-center justify-center text-center transition-colors bg-[#F8FAFC] dark:bg-[#162236]">
                <div className="p-2.5 bg-white dark:bg-[#101A2B] rounded-[6px] text-[#64748B] mb-2 border border-[#E2E8F0] dark:border-[#334155]">
                  <UploadCloud size={22} />
                </div>
                <h4 className="text-xs font-mono font-bold text-[#172033] dark:text-white mb-0.5">
                  Reference Specification Sheets
                </h4>
                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] max-w-sm mb-3">
                  Supports STEP, PDF datasheets, CAD dimension drawings, and JSON specs
                </p>
                <div className="flex gap-1.5 text-[10px] text-[#64748B] font-mono">
                  <span className="px-2 py-0.5 rounded-[4px] bg-white dark:bg-[#101A2B] border border-[#E2E8F0] dark:border-[#334155]">.STEP</span>
                  <span className="px-2 py-0.5 rounded-[4px] bg-white dark:bg-[#101A2B] border border-[#E2E8F0] dark:border-[#334155]">.PDF</span>
                  <span className="px-2 py-0.5 rounded-[4px] bg-white dark:bg-[#101A2B] border border-[#E2E8F0] dark:border-[#334155]">.DWG</span>
                </div>
              </div>

              {mockUploadedFiles.length > 0 ? (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] font-bold block">
                    Preset Reference Specifications:
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {mockUploadedFiles.map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => handleSelectPreset(file)}
                        className="p-2.5 bg-[#F8FAFC] dark:bg-[#162236] hover:bg-[#EFF6FF] dark:hover:bg-[#1B2942] border border-[#E2E8F0] dark:border-[#24344F] hover:border-[#2563EB] rounded-[6px] text-left transition-colors flex flex-col justify-between"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          {file.fileType === 'pdf' ? (
                            <FileText size={15} className="text-[#DC2626]" />
                          ) : file.fileType === 'cad' ? (
                            <Box size={15} className="text-[#2563EB]" />
                          ) : (
                            <FileCode size={15} className="text-[#7C3AED]" />
                          )}
                          <span className="text-xs font-mono font-bold text-[#172033] dark:text-white truncate">
                            {file.name}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-[#64748B]">
                          <span>{file.fileSize}</span>
                          <span className="text-[#2563EB] font-semibold">Parse →</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-[#F8FAFC] dark:bg-[#162236] border border-[#E2E8F0] dark:border-[#24344F] rounded-[6px] text-center text-xs text-[#64748B] font-mono">
                  No preset files configured.
                </div>
              )}
            </div>
          )}

          {/* Analyzing State */}
          {(stage === 'uploading' || stage === 'analyzing') && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 font-mono">
              <Loader2 size={32} className="text-[#2563EB] animate-spin" />
              <div>
                <h3 className="text-xs font-bold text-[#172033] dark:text-white uppercase tracking-wider">
                  {stage === 'uploading' ? 'Ingesting document...' : 'Extracting mechanical parameters...'}
                </h3>
                <p className="text-[11px] text-[#64748B] mt-1">
                  Parsing specification tokens from{' '}
                  <span className="text-[#2563EB] font-semibold">{selectedFile?.name}</span>
                </p>
              </div>
            </div>
          )}

          {/* Extracted Requirements State */}
          {stage === 'extracted' && selectedFile?.extractedSpecs && (
            <div className="space-y-3 animate-fade-in font-mono">
              <div className="p-3 bg-[#F0FDF4] dark:bg-[#052E16]/30 border border-[#BBF7D0] dark:border-[#16A34A]/40 rounded-[6px] flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-[#16A34A] shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-[#16A34A] uppercase tracking-wider">Parameters Extracted</h4>
                  <p className="text-[11px] text-[#475569] dark:text-[#CBD5E1]">
                    From {selectedFile.name} ({selectedFile.fileSize})
                  </p>
                </div>
              </div>

              <div className="bg-[#F8FAFC] dark:bg-[#162236] p-3 rounded-[8px] border border-[#E2E8F0] dark:border-[#24344F] space-y-2">
                <h5 className="text-[10px] text-[#64748B] uppercase tracking-wider font-bold">
                  Extracted Design Constraints:
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs tabular-nums">
                  <div className="p-2 bg-white dark:bg-[#101A2B] rounded-[6px] border border-[#E2E8F0] dark:border-[#24344F]">
                    <span className="text-[#64748B] block text-[10px]">Torque</span>
                    <span className="font-bold text-[#2563EB]">
                      {selectedFile.extractedSpecs.torque} N·m
                    </span>
                  </div>
                  <div className="p-2 bg-white dark:bg-[#101A2B] rounded-[6px] border border-[#E2E8F0] dark:border-[#24344F]">
                    <span className="text-[#64748B] block text-[10px]">Speed</span>
                    <span className="font-bold text-[#172033] dark:text-white">{selectedFile.extractedSpecs.rpm} RPM</span>
                  </div>
                  <div className="p-2 bg-white dark:bg-[#101A2B] rounded-[6px] border border-[#E2E8F0] dark:border-[#24344F]">
                    <span className="text-[#64748B] block text-[10px]">Target FoS</span>
                    <span className="font-bold text-[#16A34A]">
                      {selectedFile.extractedSpecs.safetyFactor}x
                    </span>
                  </div>
                  <div className="p-2 bg-white dark:bg-[#101A2B] rounded-[6px] border border-[#E2E8F0] dark:border-[#24344F]">
                    <span className="text-[#64748B] block text-[10px]">Min. Diameter</span>
                    <span className="font-bold text-[#172033] dark:text-white">
                      {selectedFile.extractedSpecs.diameterMin} mm
                    </span>
                  </div>
                </div>

                <div className="p-2 bg-white dark:bg-[#101A2B] rounded-[6px] text-[11px] text-[#475569] dark:text-[#CBD5E1] border border-[#E2E8F0] dark:border-[#24344F]">
                  <span className="text-[#64748B] block mb-0.5 font-semibold">Specification Notes:</span>
                  {selectedFile.extractedSpecs.notes}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#E2E8F0] dark:border-[#1E2D45] bg-[#F8FAFC] dark:bg-[#162236] flex items-center justify-between font-mono text-xs">
          <button
            type="button"
            onClick={() => {
              setStage('idle');
              setSelectedFile(null);
              if (stage !== 'extracted') onClose();
            }}
            className="text-[#64748B] hover:text-[#172033] dark:hover:text-white"
          >
            {stage === 'extracted' ? 'Select Another' : 'Cancel'}
          </button>

          {stage === 'extracted' && (
            <button
              type="button"
              onClick={handleApplySpecs}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold flex items-center gap-1.5 py-1.5 px-3.5 rounded-[6px] transition-colors"
            >
              <span>Apply to Model</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
