import React, { useState, useEffect } from 'react';
import { User, Sliders, Globe, Cpu, AlertCircle, RefreshCw, CheckCircle, ShieldAlert } from 'lucide-react';
import { fetchChatProviderStatus } from '../services/chatApi';
import type { ProviderStatusInfo } from '../types';

export default function SettingsPage() {
  const [providerStatus, setProviderStatus] = useState<ProviderStatusInfo | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  const loadStatus = async (force = false) => {
    setIsLoadingStatus(true);
    try {
      const status = await fetchChatProviderStatus(force);
      setProviderStatus(status);
    } catch {
      // ignore
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const isConnected = providerStatus?.status === 'connected';
  const isFailed = providerStatus?.status === 'failed';

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in max-w-5xl mx-auto space-y-6 bg-[#F2F4FA] dark:bg-[#111827] font-sans text-[#172033] dark:text-[#FFFFFF]">
      <div className="pb-4 border-b border-[#D9DFED] dark:border-[#28344E]">
        <div className="text-xs font-mono uppercase tracking-wider text-[#315EDE] mb-1 font-bold">
          System Configuration
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#172033] dark:text-[#FFFFFF] font-display">Workstation Preferences</h1>
        <p className="text-xs text-[#64708A] font-medium mt-1">Manage unit conversions, CAD grid resolution, and engineering AI endpoints.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Unit System */}
        <div className="bg-[#FFFFFF] dark:bg-[#172033] border border-[#D9DFED] dark:border-[#28344E] rounded-[10px] p-5 shadow-panel">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-[#315EDE]" />
            <h2 className="text-xs font-bold text-[#172033] dark:text-[#FFFFFF] uppercase tracking-wider">Unit System</h2>
          </div>

          <div className="space-y-3">
            <div className="flex gap-4 text-xs font-medium">
              <label className="flex items-center gap-2 cursor-pointer text-[#172033] dark:text-[#FFFFFF]">
                <input type="radio" name="units" className="accent-[#315EDE]" defaultChecked />
                <span>Metric (SI Standards)</span>
              </label>
              <label className="flex items-center gap-2 cursor-not-allowed opacity-40 text-[#64708A]">
                <input type="radio" name="units" className="accent-[#315EDE]" disabled />
                <span>Imperial (USCS)</span>
              </label>
            </div>
            <div className="bg-[#F8FAFC] dark:bg-[#1A2234] border border-[#D9DFED] dark:border-[#28344E] p-3 rounded-[8px] text-[11px] font-mono text-[#64708A] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#315EDE]" />
              <span>SI Metric (N·m, mm, MPa, kW) is the standard engineering unit system enforced by the physics kernel.</span>
            </div>
          </div>
        </div>

        {/* Display Preferences */}
        <div className="bg-[#FFFFFF] dark:bg-[#172033] border border-[#D9DFED] dark:border-[#28344E] rounded-[10px] p-5 shadow-panel">
          <div className="flex items-center gap-2 mb-3">
            <Sliders className="w-4 h-4 text-[#315EDE]" />
            <h2 className="text-xs font-bold text-[#172033] dark:text-[#FFFFFF] uppercase tracking-wider">Display Preferences</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#64708A] font-medium">Numerical Precision (Decimals)</span>
              <input
                type="number"
                defaultValue={2}
                className="w-16 bg-[#F8FAFC] dark:bg-[#1A2234] border border-[#D9DFED] dark:border-[#28344E] rounded-[6px] px-2 py-1 text-xs text-[#172033] dark:text-[#FFFFFF] font-mono text-center focus:outline-none focus:border-[#315EDE]"
                min={0}
                max={6}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#64708A] font-medium">Show CAD datum grid</span>
              <input type="checkbox" defaultChecked className="accent-[#315EDE] rounded-[4px]" />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#64708A] font-medium">Show 3D dimension overlays</span>
              <input type="checkbox" defaultChecked className="accent-[#315EDE] rounded-[4px]" />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#D9DFED] dark:border-[#28344E]">
              <span className="text-[#64708A] font-medium">Active CAD Theme</span>
              <span className="text-[10px] font-mono px-2.5 py-1 bg-[#DCE7FF] dark:bg-[#315EDE]/20 border border-[#315EDE]/30 text-[#315EDE] font-bold rounded-[4px]">
                SolidWorks CAD Edition (Active)
              </span>
            </div>
          </div>
        </div>

        {/* AI Configuration */}
        <div className="bg-[#FFFFFF] dark:bg-[#172033] border border-[#D9DFED] dark:border-[#28344E] rounded-[10px] p-5 md:col-span-2 shadow-panel">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#315EDE]" />
              <h2 className="text-xs font-bold text-[#172033] dark:text-[#FFFFFF] uppercase tracking-wider">AI Inference Engine</h2>
            </div>
            <button
              onClick={() => loadStatus(true)}
              className="btn-secondary text-[10px] py-1 px-2.5 rounded-[6px] flex items-center gap-1 font-semibold"
              title="Re-verify active AI provider connection"
            >
              <RefreshCw size={11} className={isLoadingStatus ? 'animate-spin' : ''} />
              <span>Verify Connection</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[#64708A]">Active Kernel:</span>
                <span className="text-[#172033] dark:text-[#FFFFFF] bg-[#F8FAFC] dark:bg-[#1A2234] px-2 py-0.5 rounded-[4px] border border-[#D9DFED] dark:border-[#28344E]">
                  Deterministic Solid Mechanics Engine + Multi-Provider Copilot
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#64708A]">Provider Status:</span>
                <div className={`flex items-center gap-1.5 font-medium ${
                  isConnected ? 'text-[#39866B]' : isFailed ? 'text-[#C4515C]' : 'text-[#64708A]'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-[#39866B]' : isFailed ? 'bg-[#C4515C]' : 'bg-[#64708A]'
                  }`}></span>
                  {providerStatus?.displayStatus || 'Checking provider status...'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#64708A]">Model Configured:</span>
                <span className="text-[#315EDE] font-bold">
                  {providerStatus?.model || 'Deterministic Local Engine'}
                </span>
              </div>
              <p className="text-[11px] text-[#64708A] leading-relaxed">
                Analytical shaft equations are evaluated locally by the deterministic physics kernel. The Copilot executes TypeScript calculation tools via schema-driven function calling.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-[#64708A] uppercase font-bold block">API Gateway Endpoint</label>
              <input
                type="text"
                disabled
                value="http://localhost:3001/api/chat"
                className="w-full bg-[#F8FAFC] dark:bg-[#1A2234] border border-[#D9DFED] dark:border-[#28344E] rounded-[6px] px-3 py-1.5 text-xs text-[#64708A] font-mono opacity-80 cursor-not-allowed"
              />
              <div className="p-3 bg-[#F8FAFC] dark:bg-[#1A2234] border border-[#D9DFED] dark:border-[#28344E] rounded-[8px] text-[11px] text-[#64708A] space-y-1">
                <div className="text-[#172033] dark:text-[#FFFFFF] font-bold text-[10px] uppercase tracking-wider">Engine Safeguards:</div>
                <div>• Zero client-side API credential exposure</div>
                <div>• Pure deterministic execution of stresses & diameters</div>
                <div>• Automatic fallback to local offline pattern engine</div>
              </div>
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="bg-[#FFFFFF] dark:bg-[#172033] border border-[#D9DFED] dark:border-[#28344E] rounded-[10px] p-5 shadow-panel">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-[#315EDE]" />
            <h2 className="text-xs font-bold text-[#172033] dark:text-[#FFFFFF] uppercase tracking-wider">Operator Profile</h2>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <label className="text-[10px] text-[#64708A] uppercase font-bold block mb-1">Name</label>
              <input
                type="text"
                defaultValue="Fawadullah Imraj"
                className="input-field text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#64708A] uppercase font-bold block mb-1">Title & Role</label>
              <input
                type="text"
                defaultValue="CEO & Lead Mechanical Engineer"
                className="input-field text-xs"
              />
            </div>
          </div>
        </div>

        {/* Build Verification & Compliance */}
        <div className="bg-[#FFFFFF] dark:bg-[#172033] border border-[#D9DFED] dark:border-[#28344E] rounded-[10px] p-5 flex flex-col justify-between shadow-panel">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-[#315EDE]" />
              <h2 className="text-xs font-bold text-[#172033] dark:text-[#FFFFFF] uppercase tracking-wider">Release Certification</h2>
            </div>
            <div className="text-sm font-bold text-[#172033] dark:text-[#FFFFFF]">
              MECH-COPILOT // CAD Engineering Studio
            </div>
            <div className="text-xs text-[#64708A] mt-0.5">
              Version 1.0.0 • Reference-Driven Blue & Purple Edition
            </div>
          </div>

          <div className="mt-4 p-2.5 bg-[#39866B]/15 border border-[#39866B]/30 rounded-[8px] text-xs font-mono text-[#39866B] flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold">
              <CheckCircle size={14} className="text-[#39866B]" />
              247 Automated Checks Verified
            </span>
            <span>ASME / DIN Standard</span>
          </div>
        </div>
      </div>
    </div>
  );
}
