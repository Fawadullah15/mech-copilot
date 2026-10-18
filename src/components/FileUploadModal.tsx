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
  const { updateDesignParam, sendCopilotMessage } = useApp();
  const [stage, setStage] = useState<Stage>('idle');
  const [selectedFile, setSelectedFile] = useState<UploadedEngineeringFile | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (file: UploadedEngineeringFile) => {
    setSelectedFile(file);
    setStage('uploading');

    setTimeout(() => {
      setStage('analyzing');
    }, 600);

    setTimeout(() => {
      setStage('extracted');
    }, 1400);
  };

  const handleApplySpecs = () => {
    if (!selectedFile || !selectedFile.extractedSpecs) return;

    const specs = selectedFile.extractedSpecs;
    if (specs.torque) updateDesignParam('torque', specs.torque);
    if (specs.rpm) updateDesignParam('rpm', specs.rpm);
    if (specs.safetyFactor) updateDesignParam('safetyFactor', specs.safetyFactor);
    if (specs.diameterMin) updateDesignParam('diameter', specs.diameterMin);
    if (specs.operatingTemp) updateDesignParam('temperature', specs.operatingTemp);

    sendCopilotMessage(
      `Document context loaded from "${selectedFile.name}". Extracted specs: Torque=${specs.torque} Nm, RPM=${specs.rpm}, Min Diameter=${specs.diameterMin} mm, Target FoS=${specs.safetyFactor}. AI design context updated.`
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs animate-fade-in p-4 font-sans">
      <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="p-4 border-b border-[#34393F] flex items-center justify-between bg-[#22262A]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#14171A] text-[#64D6C5] rounded-[3px] border border-[#34393F]">
              <UploadCloud size={16} />
            </div>
            <div>
              <h2 className="text-xs font-mono font-bold text-[#F0F1F2] uppercase tracking-wider flex items-center gap-2">
                Engineering Specification Ingestion
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-[2px] bg-[#64D6C5]/10 text-[#64D6C5] border border-[#64D6C5]/30">Preset Parser</span>
              </h2>
              <p className="text-[11px] text-[#969DA5] font-mono">
                Select a reference spec sheet to extract geometric constraints and boundary loads.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#969DA5] hover:text-white p-1 rounded-[3px] hover:bg-[#2E3339] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Workflow Stage Indicator */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
            <div
              className={`p-1.5 rounded-[2px] border ${
                stage === 'idle' || stage === 'uploading'
                  ? 'bg-[#64D6C5]/15 border-[#64D6C5] text-[#64D6C5] font-bold'
                  : 'bg-[#14171A] border-[#2A2E35] text-[#969DA5]'
              }`}
            >
              1. Document
            </div>
            <div
              className={`p-1.5 rounded-[2px] border ${
                stage === 'analyzing'
                  ? 'bg-sky-500/15 border-sky-500 text-sky-300 font-bold animate-pulse'
                  : stage === 'extracted'
                  ? 'bg-[#14171A] border-[#2A2E35] text-[#34D399]'
                  : 'bg-[#14171A] border-[#2A2E35] text-[#969DA5]'
              }`}
            >
              2. OCR / Parse
            </div>
            <div
              className={`p-1.5 rounded-[2px] border ${
                stage === 'extracted'
                  ? 'bg-[#34D399]/15 border-[#34D399] text-[#34D399] font-bold'
                  : 'bg-[#14171A] border-[#2A2E35] text-[#969DA5]'
              }`}
            >
              3. Telemetry
            </div>
            <div
              className={`p-1.5 rounded-[2px] border ${
                stage === 'extracted'
                  ? 'bg-[#64D6C5]/15 border-[#64D6C5] text-[#64D6C5] font-bold'
                  : 'bg-[#14171A] border-[#2A2E35] text-[#969DA5]'
              }`}
            >
              4. Ready
            </div>
          </div>

          {/* Upload Dropzone */}
          {stage === 'idle' && (
            <div className="space-y-3">
              <div className="border border-dashed border-[#34393F] hover:border-[#64D6C5] rounded-[4px] p-6 flex flex-col items-center justify-center text-center transition-colors bg-[#14171A] cursor-pointer">
                <div className="p-2.5 bg-[#191C1F] rounded-[3px] text-[#969DA5] mb-2 border border-[#2A2E35]">
                  <UploadCloud size={24} />
                </div>
                <h4 className="text-xs font-mono font-bold text-[#F0F1F2] mb-0.5">
                  Drag & Drop engineering drawing or datasheet
                </h4>
                <p className="text-[11px] text-[#969DA5] font-mono max-w-sm mb-3">
                  Parses STEP, PDF datasheets, CAD dimension drawings, and JSON specs
                </p>
                <div className="flex gap-1.5 text-[10px] text-[#969DA5] font-mono">
                  <span className="px-1.5 py-0.2 rounded-[2px] bg-[#191C1F] border border-[#2A2E35]">.STEP</span>
                  <span className="px-1.5 py-0.2 rounded-[2px] bg-[#191C1F] border border-[#2A2E35]">.PDF</span>
                  <span className="px-1.5 py-0.2 rounded-[2px] bg-[#191C1F] border border-[#2A2E35]">.DWG</span>
                </div>
              </div>

              {/* Sample Files */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#969DA5] block">
                  Preset Reference Specifications:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {mockUploadedFiles.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => handleSelectPreset(file)}
                      className="p-2.5 bg-[#14171A] hover:bg-[#22262A] border border-[#2A2E35] hover:border-[#34393F] rounded-[3px] text-left transition-colors flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        {file.fileType === 'pdf' ? (
                          <FileText size={15} className="text-[#E16D72]" />
                        ) : file.fileType === 'cad' ? (
                          <Box size={15} className="text-[#64D6C5]" />
                        ) : (
                          <FileCode size={15} className="text-sky-400" />
                        )}
                        <span className="text-xs font-mono font-bold text-[#F0F1F2] truncate">
                          {file.name}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-[#969DA5]">
                        <span>{file.fileSize}</span>
                        <span className="text-[#64D6C5]">Parse →</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Analyzing State */}
          {(stage === 'uploading' || stage === 'analyzing') && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 font-mono">
              <Loader2 size={32} className="text-[#64D6C5] animate-spin" />
              <div>
                <h3 className="text-xs font-bold text-[#F0F1F2] uppercase tracking-wider">
                  {stage === 'uploading' ? 'Ingesting document...' : 'Extracting mechanical parameters...'}
                </h3>
                <p className="text-[11px] text-[#969DA5] mt-1">
                  Parsing OCR geometry tokens from{' '}
                  <span className="text-[#64D6C5]">{selectedFile?.name}</span>
                </p>
              </div>
            </div>
          )}

          {/* Extracted Requirements State */}
          {stage === 'extracted' && selectedFile?.extractedSpecs && (
            <div className="space-y-3 animate-fade-in font-mono">
              <div className="p-3 bg-[#34D399]/10 border border-[#34D399]/30 rounded-[3px] flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-[#34D399] shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-[#34D399] uppercase tracking-wider">Parameters Extracted</h4>
                  <p className="text-[11px] text-[#C2C8D0]">
                    From {selectedFile.name} ({selectedFile.fileSize})
                  </p>
                </div>
              </div>

              <div className="bg-[#14171A] p-3 rounded-[3px] border border-[#2A2E35] space-y-2">
                <h5 className="text-[10px] text-[#969DA5] uppercase tracking-wider">
                  Extracted Design Constraints:
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 bg-[#191C1F] rounded-[2px] border border-[#2A2E35]">
                    <span className="text-[#969DA5] block text-[10px]">Torque</span>
                    <span className="font-bold text-[#64D6C5]">
                      {selectedFile.extractedSpecs.torque} N·m
                    </span>
                  </div>
                  <div className="p-2 bg-[#191C1F] rounded-[2px] border border-[#2A2E35]">
                    <span className="text-[#969DA5] block text-[10px]">Speed</span>
                    <span className="font-bold text-[#F0F1F2]">{selectedFile.extractedSpecs.rpm} RPM</span>
                  </div>
                  <div className="p-2 bg-[#191C1F] rounded-[2px] border border-[#2A2E35]">
                    <span className="text-[#969DA5] block text-[10px]">Target FoS</span>
                    <span className="font-bold text-[#34D399]">
                      {selectedFile.extractedSpecs.safetyFactor}x
                    </span>
                  </div>
                  <div className="p-2 bg-[#191C1F] rounded-[2px] border border-[#2A2E35]">
                    <span className="text-[#969DA5] block text-[10px]">Min. Diameter</span>
                    <span className="font-bold text-[#F0F1F2]">
                      {selectedFile.extractedSpecs.diameterMin} mm
                    </span>
                  </div>
                </div>

                <div className="p-2 bg-[#191C1F] rounded-[2px] text-[11px] text-[#C2C8D0] border border-[#2A2E35]">
                  <span className="text-[#969DA5] block mb-0.5">Specification Notes:</span>
                  {selectedFile.extractedSpecs.notes}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-[#34393F] bg-[#22262A] flex items-center justify-between font-mono text-xs">
          <button
            onClick={() => {
              setStage('idle');
              setSelectedFile(null);
            }}
            className="text-[#969DA5] hover:text-white"
          >
            {stage === 'extracted' ? 'Select Another' : 'Cancel'}
          </button>

          {stage === 'extracted' && (
            <button
              onClick={handleApplySpecs}
              className="bg-[#64D6C5] hover:bg-[#52c4b3] text-[#111315] font-semibold flex items-center gap-1.5 py-1 px-3 rounded-[3px] transition-colors"
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
