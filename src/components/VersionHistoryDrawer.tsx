import React, { useState } from 'react';
import { History, Check, ArrowUpRight, RotateCcw, Plus, Tag, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Drawer } from './ui/Drawer';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

export default function VersionHistoryDrawer() {
  const {
    isVersionHistoryOpen,
    setIsVersionHistoryOpen,
    designVersions,
    isLoadingVersions,
    versionError,
    saveDesignVersion,
    restoreDesignVersion,
    deleteDesignVersion,
    designParams,
    selectedMaterial,
    setIsCompareModalOpen,
  } = useApp();

  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [snapshotNotes, setSnapshotNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoredId, setRestoredId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snapshotLabel.trim() || isSaving) return;
    setLocalError(null);
    setIsSaving(true);
    try {
      await saveDesignVersion(snapshotLabel.trim(), snapshotNotes.trim());
      setSnapshotLabel('');
      setSnapshotNotes('');
      setIsCreatingSnapshot(false);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to save design checkpoint');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = async (id: string) => {
    setLocalError(null);
    setRestoringId(id);
    try {
      await restoreDesignVersion(id);
      setRestoredId(id);
      setTimeout(() => setRestoredId(null), 2500);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to restore checkpoint');
    } finally {
      setRestoringId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setLocalError(null);
    setDeletingId(id);
    try {
      await deleteDesignVersion(id);
      setConfirmDeleteId(null);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to delete checkpoint');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Drawer
      isOpen={isVersionHistoryOpen}
      onClose={() => {
        setIsVersionHistoryOpen(false);
        setConfirmDeleteId(null);
        setLocalError(null);
      }}
      title="Design Version History"
      subtitle="Track engineering iterations and safety margins in persistent SQLite storage"
      icon={<History size={16} />}
      width="lg"
    >
      <div className="space-y-4 font-sans text-xs">
        {/* Error Notification */}
        {(versionError || localError) && (
          <div className="p-3 rounded-[4px] bg-[#E16D72]/10 border border-[#E16D72]/40 text-[#E16D72] flex items-start gap-2 animate-fade-in font-mono">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <div className="flex-1 text-[11px]">
              {versionError || localError}
            </div>
            <button
              onClick={() => setLocalError(null)}
              className="text-[#E16D72] hover:text-white text-xs font-bold px-1"
            >
              ×
            </button>
          </div>
        )}

        {/* Snapshot trigger */}
        {!isCreatingSnapshot ? (
          <div className="p-3 rounded-[4px] bg-[#14171A] border border-[#2A2E35] flex items-center justify-between">
            <div>
              <div className="text-xs font-mono font-semibold text-[#F0F1F2]">Current Working Baseline</div>
              <div className="text-[11px] font-mono text-[#969DA5] mt-0.5">
                ⌀{designParams.diameter} mm • {selectedMaterial.name} • {designParams.torque} N·m
              </div>
            </div>
            <Button
              variant="primary"
              size="xs"
              leftIcon={<Plus size={12} />}
              onClick={() => setIsCreatingSnapshot(true)}
            >
              Save Checkpoint
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-3.5 rounded-[4px] bg-[#14171A] border border-[#64D6C5]/40 space-y-2.5 animate-fade-in font-mono">
            <div className="text-xs font-bold text-[#F0F1F2] flex items-center gap-1.5">
              <Tag size={12} className="text-[#64D6C5]" />
              Record Design Checkpoint
            </div>
            <div>
              <label className="text-[10px] text-[#969DA5] uppercase block mb-0.5">Iteration Label *</label>
              <input
                type="text"
                className="w-full bg-[#191C1F] border border-[#34393F] rounded-[3px] px-2 py-1 text-xs text-[#F0F1F2] font-mono focus:outline-none focus:border-[#64D6C5]"
                placeholder="e.g. Upsized Bearing Shoulder to ⌀48 mm"
                value={snapshotLabel}
                onChange={(e) => setSnapshotLabel(e.target.value)}
                disabled={isSaving}
                autoFocus
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-[#969DA5] uppercase block mb-0.5">Engineering Notes</label>
              <input
                type="text"
                className="w-full bg-[#191C1F] border border-[#34393F] rounded-[3px] px-2 py-1 text-xs text-[#F0F1F2] font-mono focus:outline-none focus:border-[#64D6C5]"
                placeholder="Rationale, calculation checks, or customer specs"
                value={snapshotNotes}
                onChange={(e) => setSnapshotNotes(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                size="xs"
                variant="ghost"
                type="button"
                onClick={() => setIsCreatingSnapshot(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                size="xs"
                variant="primary"
                type="submit"
                disabled={isSaving || !snapshotLabel.trim()}
                leftIcon={isSaving ? <Loader2 size={11} className="animate-spin" /> : undefined}
              >
                {isSaving ? 'Persisting...' : 'Confirm & Save'}
              </Button>
            </div>
          </form>
        )}

        {/* Timeline of Revisions */}
        <div className="space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#969DA5] font-semibold flex items-center justify-between">
            <span>Recorded Checkpoints ({designVersions.length})</span>
            {isLoadingVersions && (
              <span className="flex items-center gap-1 text-[10px] text-[#64D6C5] font-mono lowercase">
                <Loader2 size={10} className="animate-spin" />
                syncing sqlite...
              </span>
            )}
          </div>

          {isLoadingVersions && designVersions.length === 0 ? (
            <div className="p-6 text-center text-[#969DA5] font-mono text-xs border border-dashed border-[#2A2E35] rounded-[4px]">
              <Loader2 size={18} className="animate-spin mx-auto mb-2 text-[#64D6C5]" />
              Retrieving snapshots from SQLite...
            </div>
          ) : designVersions.length === 0 ? (
            <div className="p-6 text-center text-[#969DA5] font-mono text-xs border border-dashed border-[#2A2E35] rounded-[4px]">
              No checkpoints recorded yet for this project. Save a checkpoint to record engineering iterations.
            </div>
          ) : (
            <div className="relative border-l border-[#2A2E35] ml-2 space-y-4 pl-4">
              {designVersions.map((v, idx) => {
                const isRestored = restoredId === v.id;
                const isRestoring = restoringId === v.id;
                const isDeleting = deletingId === v.id;
                const isConfirmingDelete = confirmDeleteId === v.id;

                return (
                  <div key={v.id} className="relative group">
                    {/* Timeline bullet */}
                    <div className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-[#191C1F] ${
                      idx === 0 ? 'bg-[#64D6C5]' : 'bg-[#4B535D]'
                    }`} />

                    <div className="p-3 rounded-[4px] bg-[#14171A] border border-[#2A2E35] hover:border-[#34393F] transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-[2px] bg-[#22262A] text-[#64D6C5] border border-[#34393F]">
                              {v.version}
                            </span>
                            <span className="text-xs font-mono font-bold text-[#F0F1F2]">{v.label}</span>
                          </div>
                          <div className="text-[10px] font-mono text-[#969DA5] mt-0.5 flex items-center gap-1.5">
                            <span>{v.timestamp || v.createdAt}</span>
                            <span>•</span>
                            <span>{v.author || 'Current User'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Badge variant={v.status === 'fail' ? 'critical' : v.status} size="sm">
                            FoS {v.factorOfSafety.toFixed(2)}x
                          </Badge>

                          {/* Delete Action */}
                          {!isConfirmingDelete ? (
                            <button
                              onClick={() => setConfirmDeleteId(v.id)}
                              className="text-[#969DA5] hover:text-[#E16D72] p-1 rounded-[2px] hover:bg-[#22262A] transition-colors"
                              title="Delete Checkpoint"
                            >
                              <Trash2 size={12} />
                            </button>
                          ) : (
                            <div className="flex items-center gap-1 bg-[#22262A] border border-[#E16D72]/40 p-0.5 rounded-[3px] animate-fade-in">
                              <button
                                onClick={() => handleDelete(v.id)}
                                disabled={isDeleting}
                                className="text-[9px] font-mono px-1 py-0.5 bg-[#E16D72] text-white rounded-[2px] hover:bg-[#E16D72]/80"
                              >
                                {isDeleting ? '...' : 'Del'}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-[9px] font-mono px-1 py-0.5 text-[#969DA5] hover:text-white"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Parameters summary */}
                      <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px] bg-[#191C1F] p-2 rounded-[2px] border border-[#2A2E35] mb-2 text-[#C2C8D0]">
                        <div>⌀ {v.parameters.diameter} mm</div>
                        <div>L: {v.parameters.length} mm</div>
                        <div>T: {v.parameters.torque} N·m</div>
                        <div className="col-span-3 text-[#969DA5] truncate mt-0.5">
                          Alloy: <span className="text-[#F0F1F2]">{v.materialName}</span>
                        </div>
                      </div>

                      {v.notes && (
                        <p className="text-[11px] text-[#969DA5] mb-2 leading-relaxed">{v.notes}</p>
                      )}

                      <div className="flex items-center justify-between pt-1.5 border-t border-[#2A2E35] text-xs">
                        <button
                          onClick={() => {
                            setIsVersionHistoryOpen(false);
                            setIsCompareModalOpen(true);
                          }}
                          className="text-[#969DA5] hover:text-[#64D6C5] flex items-center gap-1 text-[11px] font-mono"
                        >
                          <ArrowUpRight size={12} />
                          Compare diff
                        </button>

                        <Button
                          size="xs"
                          variant={isRestored ? 'primary' : 'secondary'}
                          leftIcon={
                            isRestoring ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : isRestored ? (
                              <Check size={11} />
                            ) : (
                              <RotateCcw size={11} />
                            )
                          }
                          onClick={() => handleRestore(v.id)}
                          disabled={isRestoring || isRestored}
                        >
                          {isRestoring ? 'Restoring...' : isRestored ? 'Restored' : 'Restore'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
