import React from 'react';
import { User, Sliders, Globe, Cpu, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="p-6 h-full overflow-y-auto animate-fade-in max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 mb-2">Settings</h1>
        <p className="text-gray-400">Manage application preferences and AI configuration.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Unit System */}
        <div className="card bg-navy-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-gray-100">Unit System</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="units" className="accent-accent" defaultChecked />
                <span className="text-gray-300">Metric (SI)</span>
              </label>
              <label className="flex items-center gap-2 cursor-not-allowed opacity-50" title="Imperial unit system is in development. SI Metric is the active standard.">
                <input type="radio" name="units" className="accent-accent" disabled />
                <span className="text-gray-400">Imperial (US) <span className="text-[10px] text-amber-400 font-mono">(Coming Soon)</span></span>
              </label>
            </div>
            <div className="bg-navy-900 border border-navy-700 p-3 rounded text-xs text-gray-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-accent" />
              <span>SI Metric (N·m, mm, MPa, kW) is the primary engineering standard enforced by the calculation kernel.</span>
            </div>
          </div>
        </div>

        {/* Display Preferences */}
        <div className="card bg-navy-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Sliders className="w-5 h-5 text-cyan" />
            <h2 className="text-lg font-semibold text-gray-100">Display Preferences</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="label-text block mb-2 text-sm text-gray-400">Decimal Places</label>
              <input type="number" defaultValue={2} className="input-field w-full max-w-[120px]" min={0} max={6} />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Show grid in workspace</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-navy-950 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">Show dimension labels</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-navy-950 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
              </label>
            </div>

            <div className="pt-2">
              <span className="block text-sm text-gray-400 mb-2">Theme</span>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-navy-950 border border-accent text-accent rounded text-sm">Dark</button>
                <button className="px-3 py-1.5 bg-navy-900 border border-navy-700 text-gray-500 rounded text-sm cursor-not-allowed" disabled>Light</button>
              </div>
            </div>
          </div>
        </div>

        {/* AI Model Configuration */}
        <div className="card bg-navy-800 p-6 md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <Cpu className="w-5 h-5 text-status-pass" />
            <h2 className="text-lg font-semibold text-gray-100">AI Model Configuration</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-gray-300 font-medium">Current Model:</span>
                <span className="text-white bg-navy-950 px-2 py-1 rounded text-sm border border-navy-700">Engineering LLM v2.4</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">Status:</span>
                <div className="flex items-center gap-1 text-status-pass font-medium">
                  <span className="w-2 h-2 rounded-full bg-status-pass"></span>
                  Online
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                Connected to cloud engineering computation engine. Local inference is not available in the current version.
              </p>
            </div>
            
            <div>
              <label className="label-text block mb-2 text-sm text-gray-400">API Endpoint URL</label>
              <input 
                type="text" 
                disabled 
                placeholder="https://api.engineering-copilot.internal/v1" 
                className="input-field w-full opacity-50 cursor-not-allowed" 
              />
            </div>
          </div>
        </div>

        {/* Profile */}
        <div className="card bg-navy-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-100">Profile</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="label-text block mb-1 text-sm text-gray-400">Name</label>
              <input type="text" defaultValue="Mechanical Engineer" className="input-field w-full" />
            </div>
            <div>
              <label className="label-text block mb-1 text-sm text-gray-400">Email</label>
              <input type="email" defaultValue="engineer@company.com" className="input-field w-full" />
            </div>
            <div>
              <label className="label-text block mb-1 text-sm text-gray-400">Role</label>
              <input type="text" defaultValue="Senior Design Engineer" className="input-field w-full" />
            </div>
          </div>
        </div>

        {/* About */}
        <div className="card bg-navy-800 p-6 flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 bg-navy-950 rounded-xl border border-navy-700 flex items-center justify-center mb-4 shadow-lg shadow-navy-950/50">
            <Cpu className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-xl font-bold text-gray-100">Mechanical Engineering<br/>Design Copilot</h2>
          <p className="text-gray-400 mt-2">Version 0.1.0</p>
          <div className="mt-4 px-3 py-1 bg-status-warning/20 text-status-warning text-xs font-medium rounded-full border border-status-warning/30">
            Prototype — Not for production use
          </div>
        </div>
        
      </div>
    </div>
  );
}
