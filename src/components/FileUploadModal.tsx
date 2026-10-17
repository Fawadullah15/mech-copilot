import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  Box,
  FileCode,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  ArrowRight,
  X,
  FileCheck,
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
    }, 900);

    setTimeout(() => {
      setStage('extracted');
    }, 2200);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in p-4 font-sans">
      <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-navy-700/60 flex items-center justify-between bg-navy-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/15 text-accent rounded-lg border border-accent/30">
              <UploadCloud size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                Engineering Document & CAD Ingestion
              </h2>
              <p className="text-xs text-gray-400">
                Upload 2D drawings, 3D CAD files, or technical specs to extract engineering constraints
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-navy-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Workflow Stage Indicator */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div
              className={`p-2 rounded-lg border ${
                stage === 'idle' || stage === 'uploading'
                  ? 'bg-accent/15 border-accent text-accent-light font-bold'
                  : 'bg-navy-950 border-navy-800 text-gray-400'
              }`}
            >
              1. Upload File
            </div>
            <div
              className={`p-2 rounded-lg border ${
                stage === 'analyzing'
                  ? 'bg-cyan/15 border-cyan text-cyan font-bold animate-pulse'
                  : stage === 'extracted'
                  ? 'bg-navy-950 border-navy-800 text-status-pass'
                  : 'bg-navy-950 border-navy-800 text-gray-400'
              }`}
            >
              2. Analyzing
            </div>
            <div
              className={`p-2 rounded-lg border ${
                stage === 'extracted'
                  ? 'bg-status-pass/15 border-status-pass text-status-pass font-bold'
                  : 'bg-navy-950 border-navy-800 text-gray-400'
              }`}
            >
              3. Extracted
            </div>
            <div
              className={`p-2 rounded-lg border ${
                stage === 'extracted'
                  ? 'bg-accent/15 border-accent text-accent-light font-bold'
                  : 'bg-navy-950 border-navy-800 text-gray-400'
              }`}
            >
              4. In Copilot
            </div>
          </div>

          {/* Upload Dropzone */}
          {stage === 'idle' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-navy-700 hover:border-accent/60 rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors bg-navy-950/40 cursor-pointer">
                <div className="p-3 bg-navy-800 rounded-full text-gray-400 mb-3">
                  <UploadCloud size={32} />
                </div>
                <h4 className="text-sm font-semibold text-gray-200 mb-1">
                  Drag & Drop engineering files here, or browse
                </h4>
                <p className="text-xs text-gray-500 max-w-sm mb-4">
                  Supports CAD models (.step, .iges, .sldprt), 2D drawings (.pdf), images, and specification sheets (.docx)
                </p>
                <div className="flex gap-2 text-xs text-gray-400 font-mono">
                  <span className="px-2 py-0.5 rounded bg-navy-800 border border-navy-700">.STEP</span>
                  <span className="px-2 py-0.5 rounded bg-navy-800 border border-navy-700">.PDF</span>
                  <span className="px-2 py-0.5 rounded bg-navy-800 border border-navy-700">.DWG</span>
                  <span className="px-2 py-0.5 rounded bg-navy-800 border border-navy-700">.DOCX</span>
                </div>
              </div>

              {/* Sample Test Files */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                  Select sample engineering file to test:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {mockUploadedFiles.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => handleSelectPreset(file)}
                      className="p-3 bg-navy-950/90 hover:bg-navy-800 border border-navy-700 rounded-xl text-left transition-all flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {file.fileType === 'pdf' ? (
                          <FileText size={18} className="text-red-400" />
                        ) : file.fileType === 'cad' ? (
                          <Box size={18} className="text-cyan" />
                        ) : (
                          <FileCode size={18} className="text-blue-400" />
                        )}
                        <span className="text-xs font-mono font-bold text-gray-200 truncate">
                          {file.name}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-gray-400">
                        <span>{file.fileSize}</span>
                        <span className="text-accent-light">Click to test →</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Analyzing State */}
          {(stage === 'uploading' || stage === 'analyzing') && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 size={40} className="text-accent animate-spin" />
              <div>
                <h3 className="text-base font-bold text-gray-100">
                  {stage === 'uploading' ? 'Uploading document...' : 'Analyzing engineering document...'}
                </h3>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                  Running automated OCR, geometry extraction, and operating requirement detection on{' '}
                  <span className="font-mono text-cyan">{selectedFile?.name}</span>
                </p>
              </div>
            </div>
          )}

          {/* Extracted Requirements State */}
          {stage === 'extracted' && selectedFile?.extractedSpecs && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-status-pass/10 border border-status-pass/30 rounded-xl flex items-center gap-3">
                <CheckCircle2 size={22} className="text-status-pass shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-status-pass">Requirements Extracted Successfully</h4>
                  <p className="text-xs text-gray-300">
                    Extracted from <span className="font-mono">{selectedFile.name}</span> ({selectedFile.fileSize})
                  </p>
                </div>
              </div>

              <div className="bg-navy-950 p-4 rounded-xl border border-navy-700/80 space-y-3">
                <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Extracted Design Specifications:
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-2.5 bg-navy-900 rounded-lg border border-navy-800">
                    <span className="text-gray-400 block text-[11px]">Design Torque</span>
                    <span className="font-bold text-accent-light text-sm">
                      {selectedFile.extractedSpecs.torque} Nm
                    </span>
                  </div>
                  <div className="p-2.5 bg-navy-900 rounded-lg border border-navy-800">
                    <span className="text-gray-400 block text-[11px]">Operating Speed</span>
                    <span className="font-bold text-cyan text-sm">{selectedFile.extractedSpecs.rpm} RPM</span>
                  </div>
                  <div className="p-2.5 bg-navy-900 rounded-lg border border-navy-800">
                    <span className="text-gray-400 block text-[11px]">Safety Factor Target</span>
                    <span className="font-bold text-status-pass text-sm">
                      {selectedFile.extractedSpecs.safetyFactor}
                    </span>
                  </div>
                  <div className="p-2.5 bg-navy-900 rounded-lg border border-navy-800">
                    <span className="text-gray-400 block text-[11px]">Min. Shaft Diameter</span>
                    <span className="font-bold text-gray-200 text-sm">
                      {selectedFile.extractedSpecs.diameterMin} mm
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-navy-900/60 rounded-lg text-xs text-gray-300 border border-navy-800">
                  <span className="text-gray-400 font-semibold block mb-1">Engineering Notes:</span>
                  {selectedFile.extractedSpecs.notes}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-navy-700/60 bg-navy-950/80 flex items-center justify-between">
          <button
            onClick={() => {
              setStage('idle');
              setSelectedFile(null);
            }}
            className="btn-ghost text-xs py-2 px-3"
          >
            {stage === 'extracted' ? 'Upload Another' : 'Cancel'}
          </button>

          {stage === 'extracted' && (
            <button
              onClick={handleApplySpecs}
              className="btn-primary text-xs flex items-center gap-2 py-2 px-4 shadow-lg shadow-accent/20"
            >
              Apply Extracted Specs to Workspace
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
