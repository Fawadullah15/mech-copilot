import React from 'react';
import { User, Sliders, Globe, Cpu, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="p-5 lg:p-6 h-full overflow-y-auto animate-fade-in max-w-4xl mx-auto space-y-5 bg-[#111315] font-sans">
      <div className="pb-3 border-b border-[#34393F]">
        <div className="text-[10px] font-mono uppercase tracking-widest text-[#64D6C5] mb-0.5">
          System Configuration
        </div>
        <h1 className="text-xl font-bold tracking-tight text-[#F0F1F2]">Workstation Preferences</h1>
        <p className="text-xs text-[#969DA5] font-mono mt-0.5">Manage unit conversions, CAD grid resolution, and engineering AI endpoints.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Unit System */}
        <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-[#64D6C5]" />
            <h2 className="text-xs font-mono font-bold text-[#F0F1F2] uppercase tracking-wider">Unit System</h2>
          </div>

          <div className="space-y-3">
            <div className="flex gap-4 text-xs font-mono">
              <label className="flex items-center gap-2 cursor-pointer text-[#F0F1F2]">
                <input type="radio" name="units" className="accent-[#64D6C5]" defaultChecked />
                <span>Metric (SI Standards)</span>
              </label>
              <label className="flex items-center gap-2 cursor-not-allowed opacity-40 text-[#969DA5]">
                <input type="radio" name="units" className="accent-[#64D6C5]" disabled />
                <span>Imperial (USCS)</span>
              </label>
            </div>
            <div className="bg-[#14171A] border border-[#2A2E35] p-2.5 rounded-[3px] text-[11px] font-mono text-[#969DA5] flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#64D6C5]" />
              <span>SI Metric (N·m, mm, MPa, kW) is the standard engineering unit system enforced by the physics kernel.</span>
            </div>
          </div>
        </div>

        {/* Display Preferences */}
        <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sliders className="w-4 h-4 text-[#64D6C5]" />
            <h2 className="text-xs font-mono font-bold text-[#F0F1F2] uppercase tracking-wider">Display Preferences</h2>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[#969DA5]">Numerical Precision (Decimals)</span>
              <input
                type="number"
                defaultValue={2}
                className="w-16 bg-[#14171A] border border-[#34393F] rounded-[3px] px-2 py-1 text-xs text-[#F0F1F2] font-mono text-center focus:outline-none focus:border-[#64D6C5]"
                min={0}
                max={6}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#969DA5]">Show CAD drafting grid</span>
              <input type="checkbox" defaultChecked className="accent-[#64D6C5] rounded-[2px]" />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#969DA5]">Show dimension witness lines</span>
              <input type="checkbox" defaultChecked className="accent-[#64D6C5] rounded-[2px]" />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[#2A2E35]">
              <span className="text-[#969DA5]">Workstation Theme</span>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-[#14171A] border border-[#34393F] text-[#64D6C5] rounded-[2px]">
                Deep Obsidian CAD (Active)
              </span>
            </div>
          </div>
        </div>

        {/* AI Configuration */}
        <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] p-4 md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-[#64D6C5]" />
            <h2 className="text-xs font-mono font-bold text-[#F0F1F2] uppercase tracking-wider">AI Inference Engine</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[#969DA5]">Active Kernel:</span>
                <span className="text-[#F0F1F2] bg-[#14171A] px-2 py-0.5 rounded-[2px] border border-[#34393F]">
                  Deterministic Physics Engine v2.4 + Hybrid LLM
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#969DA5]">Inference Mode:</span>
                <div className="flex items-center gap-1.5 text-[#34D399] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]"></span>
                  Offline Deterministic + Cloud Fallback
                </div>
              </div>
              <p className="text-[11px] text-[#6C737D] leading-relaxed">
                Analytical equations are executed locally with 0ms network latency. Verified closed-form evaluations do not depend on external cloud connections.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-[#969DA5] uppercase block">API Gateway Endpoint</label>
              <input
                type="text"
                disabled
                value="http://localhost:3001/api/chat"
                className="w-full bg-[#14171A] border border-[#34393F] rounded-[3px] px-2.5 py-1.5 text-xs text-[#969DA5] font-mono opacity-80 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] p-4">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-[#64D6C5]" />
            <h2 className="text-xs font-mono font-bold text-[#F0F1F2] uppercase tracking-wider">Operator Profile</h2>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div>
              <label className="text-[10px] text-[#969DA5] uppercase block mb-1">Name</label>
              <input
                type="text"
                defaultValue="Senior Mechanical Engineer"
                className="w-full bg-[#14171A] border border-[#34393F] rounded-[3px] px-2.5 py-1.5 text-xs text-[#F0F1F2] font-mono focus:outline-none focus:border-[#64D6C5]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#969DA5] uppercase block mb-1">Designation</label>
              <input
                type="text"
                defaultValue="Powertrain & Rotating Machinery Specialist"
                className="w-full bg-[#14171A] border border-[#34393F] rounded-[3px] px-2.5 py-1.5 text-xs text-[#F0F1F2] font-mono focus:outline-none focus:border-[#64D6C5]"
              />
            </div>
          </div>
        </div>

        {/* Build Verification & Compliance */}
        <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-[#64D6C5]" />
              <h2 className="text-xs font-mono font-bold text-[#F0F1F2] uppercase tracking-wider">Release Certification</h2>
            </div>
            <div className="text-xs font-mono text-[#F0F1F2] font-bold">
              QUANTUM AI // Mechanical Design Copilot
            </div>
            <div className="text-[11px] font-mono text-[#969DA5] mt-0.5">
              Version 2.4.0-RC5 • Stage 5 Workstation Edition
            </div>
          </div>

          <div className="mt-3 p-2 bg-[#14171A] border border-[#2A2E35] rounded-[3px] text-[10px] font-mono text-[#34D399] flex items-center justify-between">
            <span>51 Automated Checks Verified</span>
            <span>ASME B106.1M Baseline</span>
          </div>
        </div>
      </div>
    </div>
  );
}
