import React, { useState } from 'react';
import { History, Check, ArrowUpRight, RotateCcw, Plus, ShieldCheck, Tag } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Drawer } from './ui/Drawer';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

export default function VersionHistoryDrawer() {
  const {
    isVersionHistoryOpen,
    setIsVersionHistoryOpen,
    designVersions,
    saveDesignVersion,
    restoreDesignVersion,
    designParams,
    selectedMaterial,
    setIsCompareModalOpen,
  } = useApp();

  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [snapshotNotes, setSnapshotNotes] = useState('');
  const [restoredId, setRestoredId] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!snapshotLabel.trim()) return;
    saveDesignVersion(snapshotLabel, snapshotNotes);
    setSnapshotLabel('');
    setSnapshotNotes('');
    setIsCreatingSnapshot(false);
  };

  const handleRestore = (id: string) => {
    restoreDesignVersion(id);
    setRestoredId(id);
    setTimeout(() => setRestoredId(null), 2000);
  };

  return (
    <Drawer
      isOpen={isVersionHistoryOpen}
      onClose={() => setIsVersionHistoryOpen(false)}
      title="Design Version History"
      subtitle="Track engineering iterations and safety margins over time"
      icon={<History size={18} />}
      width="lg"
    >
      <div className="space-y-6">
        {/* Snapshot trigger */}
        {!isCreatingSnapshot ? (
          <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-200">Current Working State</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                ⌀{designParams.diameter} mm • {selectedMaterial.name} • {designParams.torque} N·m
              </div>
            </div>
            <Button
              variant="primary"
              size="xs"
              leftIcon={<Plus size={13} />}
              onClick={() => setIsCreatingSnapshot(true)}
            >
              Save Checkpoint
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-4 rounded-xl bg-navy-950 border border-accent/40 space-y-3 animate-fade-in">
            <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <Tag size={13} className="text-accent-bright" />
              Save Design Checkpoint
            </div>
            <div>
              <label className="label-text">Iteration Label</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Upsized Bearing Shoulder to ⌀48 mm"
                value={snapshotLabel}
                onChange={(e) => setSnapshotLabel(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="label-text">Engineering Notes</label>
              <input
                type="text"
                className="input-field"
                placeholder="Rationale, calculation checks, or customer specs"
                value={snapshotNotes}
                onChange={(e) => setSnapshotNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button size="xs" variant="ghost" type="button" onClick={() => setIsCreatingSnapshot(false)}>
                Cancel
              </Button>
              <Button size="xs" variant="primary" type="submit">
                Confirm & Save
              </Button>
            </div>
          </form>
        )}

        {/* Timeline of Revisions */}
        <div className="space-y-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Recorded Versions ({designVersions.length})
          </div>

          <div className="relative border-l border-navy-800 ml-3 space-y-6 pl-5">
            {designVersions.map((v, idx) => {
              const isRestored = restoredId === v.id;
              return (
                <div key={v.id} className="relative group">
                  {/* Timeline bullet */}
                  <div className={`absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-navy-900 ${
                    idx === 0 ? 'bg-accent-bright' : 'bg-navy-700'
                  }`} />

                  <div className="card p-4 hover:border-navy-700 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-navy-950 text-accent-light border border-navy-800">
                            {v.version}
                          </span>
                          <span className="text-xs font-bold text-slate-100">{v.label}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                          <span>{v.timestamp}</span>
                          <span>•</span>
                          <span>{v.author}</span>
                        </div>
                      </div>

                      <Badge variant={v.status === 'fail' ? 'critical' : v.status} size="sm">
                        FoS {v.factorOfSafety.toFixed(2)}
                      </Badge>

                    </div>

                    {/* Parameters summary */}
                    <div className="grid grid-cols-3 gap-2 font-mono text-[11px] bg-navy-950/70 p-2 rounded-lg border border-navy-800/80 mb-3 text-slate-300">
                      <div>⌀ {v.parameters.diameter} mm</div>
                      <div>L: {v.parameters.length} mm</div>
                      <div>T: {v.parameters.torque} N·m</div>
                      <div className="col-span-3 text-slate-400 truncate mt-0.5">
                        Material: <span className="text-slate-200">{v.materialName}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 mb-3 leading-relaxed">{v.notes}</p>

                    <div className="flex items-center justify-between pt-2 border-t border-navy-800/60 text-xs">
                      <button
                        onClick={() => {
                          setIsVersionHistoryOpen(false);
                          setIsCompareModalOpen(true);
                        }}
                        className="text-slate-400 hover:text-accent-light flex items-center gap-1 text-[11px]"
                      >
                        <ArrowUpRight size={13} />
                        Compare diff
                      </button>

                      <Button
                        size="xs"
                        variant={isRestored ? 'primary' : 'secondary'}
                        leftIcon={isRestored ? <Check size={12} /> : <RotateCcw size={12} />}
                        onClick={() => handleRestore(v.id)}
                      >
                        {isRestored ? 'Restored' : 'Restore Checkpoint'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
