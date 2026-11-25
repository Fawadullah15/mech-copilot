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
      onClose={() => setIsVersionHistoryOpen(false)}
      title="Design Checkpoints & History"
      subtitle="SQLite immutable design iterations and parameters"
      icon={<History size={16} />}
      width="lg"
    >
      <div className="space-y-4 font-sans text-xs">
        {/* Error notification */}
        {(versionError || localError) && (
          <div className="p-3 rounded-[3px] bg-[#CB5750]/10 border border-[#CB5750]/30 text-[#CB5750] flex items-center justify-between font-mono text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{versionError || localError}</span>
            </div>
            <button
              onClick={() => setLocalError(null)}
              className="text-[#CB5750] hover:text-[#18211F] text-xs font-bold px-1"
            >
              ×
            </button>
          </div>
        )}

        {/* Snapshot trigger */}
        {!isCreatingSnapshot ? (
          <div className="p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#162236] border border-[#E2E8F0] dark:border-[#24344F] flex items-center justify-between">
            <div>
              <div className="text-xs font-mono font-bold text-[#172033] dark:text-white">Current Working Baseline</div>
              <div className="text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                ⌀{designParams.diameter} mm · {selectedMaterial.name} · {designParams.torque} N·m
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
          <form onSubmit={handleSave} className="p-3.5 rounded-[8px] bg-[#F8FAFC] dark:bg-[#162236] border border-[#BFDBFE] dark:border-[#2563EB]/40 space-y-2.5 animate-fade-in font-mono">
            <div className="text-xs font-bold text-[#172033] dark:text-white flex items-center gap-1.5">
              <Tag size={12} className="text-[#2563EB]" />
              Record Design Checkpoint
            </div>
            <div>
              <label className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase font-bold block mb-0.5">Iteration Label *</label>
              <input
                type="text"
                className="w-full bg-white dark:bg-[#101A2B] border border-[#E2E8F0] dark:border-[#334155] rounded-[6px] px-2.5 py-1.5 text-xs text-[#172033] dark:text-white font-mono focus:outline-none focus:border-[#2563EB]"
                placeholder="e.g. Upsized Bearing Shoulder to ⌀48 mm"
                value={snapshotLabel}
                onChange={(e) => setSnapshotLabel(e.target.value)}
                disabled={isSaving}
                autoFocus
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase font-bold block mb-0.5">Engineering Notes</label>
              <input
                type="text"
                className="w-full bg-white dark:bg-[#101A2B] border border-[#E2E8F0] dark:border-[#334155] rounded-[6px] px-2.5 py-1.5 text-xs text-[#172033] dark:text-white font-mono focus:outline-none focus:border-[#2563EB]"
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
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#64716C] dark:text-[#9DB0AA] font-bold flex items-center justify-between">
            <span>Recorded Checkpoints ({designVersions.length})</span>
            {isLoadingVersions && (
              <span className="flex items-center gap-1 text-[10px] text-[#147D70] font-mono lowercase">
                <Loader2 size={10} className="animate-spin" />
                syncing sqlite...
              </span>
            )}
          </div>

          {isLoadingVersions && designVersions.length === 0 ? (
            <div className="p-6 text-center text-[#64716C] dark:text-[#9DB0AA] font-mono text-xs border border-dashed border-[#DDE4E0] dark:border-[#2B3834] rounded-[4px]">
              <Loader2 size={18} className="animate-spin mx-auto mb-2 text-[#147D70]" />
              Retrieving snapshots from database...
            </div>
          ) : designVersions.length === 0 ? (
            <div className="p-6 text-center text-[#64716C] dark:text-[#9DB0AA] font-mono text-xs border border-dashed border-[#DDE4E0] dark:border-[#2B3834] rounded-[4px]">
              No checkpoints recorded yet for this project. Save a checkpoint to record engineering iterations.
            </div>
          ) : (
            <div className="relative border-l border-[#DDE4E0] dark:border-[#2B3834] ml-2 space-y-4 pl-4">
              {designVersions.map((v, idx) => {
                const isRestored = restoredId === v.id;
                const isRestoring = restoringId === v.id;
                const isDeleting = deletingId === v.id;
                const isConfirmingDelete = confirmDeleteId === v.id;

                return (
                  <div key={v.id} className="relative group">
                    {/* Timeline bullet */}
                    <div className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-[#FFFFFF] dark:border-[#19201E] ${
                      idx === 0 ? 'bg-[#147D70]' : 'bg-[#8D9B96]'
                    }`} />

                    <div className="p-3 rounded-[4px] bg-[#EEF2EF] dark:bg-[#121716] border border-[#DDE4E0] dark:border-[#2B3834] hover:border-[#147D70]/40 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-[2px] bg-[#FFFFFF] dark:bg-[#19201E] text-[#147D70] border border-[#DDE4E0] dark:border-[#2B3834]">
                              {v.version}
                            </span>
                            <span className="text-xs font-mono font-bold text-[#18211F] dark:text-[#F0F4F2]">{v.label}</span>
                          </div>
                          <div className="text-[10px] font-mono text-[#64716C] dark:text-[#9DB0AA] mt-0.5 flex items-center gap-1.5">
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
                              className="text-[#64716C] hover:text-[#CB5750] p-1 rounded-[2px] hover:bg-[#DDE4E0] dark:hover:bg-[#212B28] transition-colors"
                              title="Delete Checkpoint"
                            >
                              <Trash2 size={12} />
                            </button>
                          ) : (
                            <div className="flex items-center gap-1 bg-[#FFFFFF] dark:bg-[#212B28] border border-[#CB5750]/40 p-0.5 rounded-[3px] animate-fade-in">
                              <button
                                onClick={() => handleDelete(v.id)}
                                disabled={isDeleting}
                                className="text-[9px] font-mono px-1 py-0.5 bg-[#CB5750] text-white rounded-[2px] hover:bg-[#CB5750]/80"
                              >
                                {isDeleting ? '...' : 'Del'}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-[9px] font-mono px-1 py-0.5 text-[#64716C] hover:text-[#18211F]"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Parameters summary */}
                      <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px] bg-[#FFFFFF] dark:bg-[#19201E] p-2 rounded-[2px] border border-[#DDE4E0] dark:border-[#2B3834] mb-2 text-[#18211F] dark:text-[#F0F4F2]">
                        <div>⌀ {v.parameters.diameter} mm</div>
                        <div>L: {v.parameters.length} mm</div>
                        <div>T: {v.parameters.torque} N·m</div>
                        <div className="col-span-3 text-[#64716C] dark:text-[#9DB0AA] truncate mt-0.5">
                          Alloy: <span className="text-[#18211F] dark:text-[#F0F4F2] font-semibold">{v.materialName}</span>
                        </div>
                      </div>

                      {v.notes && (
                        <p className="text-[11px] text-[#64716C] dark:text-[#9DB0AA] mb-2 leading-relaxed">{v.notes}</p>
                      )}

                      <div className="flex items-center justify-between pt-1.5 border-t border-[#DDE4E0] dark:border-[#2B3834] text-xs">
                        <button
                          onClick={() => {
                            setIsVersionHistoryOpen(false);
                            setIsCompareModalOpen(true);
                          }}
                          className="text-[#64716C] hover:text-[#147D70] flex items-center gap-1 text-[11px] font-mono font-semibold"
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
