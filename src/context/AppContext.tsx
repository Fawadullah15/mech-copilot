import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type {
  PageId, Project, DesignParameters, Material, AnalysisResult, CopilotMessage,
  ConversationThread, ComponentSelection, EngineeringWarning, DesignVersion
} from '../types';
import { materials, getMaterialById } from '../data/materials';
import { explanationResponse, nextId, now } from '../data/aiResponses';
import { computeAnalysis } from '../data/analysisResults';
import { generateCalculationExplanation } from '../engineering';
import { evaluateEngineeringWarnings } from '../data/engineeringRules';
import { sendChatMessage } from '../services/chatApi';
import {
  fetchProjects,
  fetchConversations,
  updateProjectParameters,
  initSampleProject,
  fetchProjectVersions,
  createProjectVersion,
  restoreProjectVersion,
  deleteProjectVersion,
} from '../services/projectApi';

export const DEFAULT_FALLBACK_PROJECT: Project = {
  id: 'proj-gearbox',
  name: 'Gearbox Assembly',
  description: 'Two-stage spur gearbox for industrial conveyor drive system. Includes input shaft, intermediate shaft, output shaft, and housing design.',
  type: 'Power Transmission',
  status: 'In Progress',
  progress: 72,
  lastModified: '2026-09-17T06:30:00Z',
  created: '2026-08-15T09:00:00Z',
  parameters: {
    materialId: 'aisi-4140',
    diameter: 45,
    length: 320,
    torque: 500,
    force: 12000,
    rpm: 1450,
    safetyFactor: 2.0,
    temperature: 60,
  },
  tags: ['gearbox', 'power-transmission', 'industrial'],
};

interface ProjectMemory {
  parameters: DesignParameters;
  materialId: string;
  analysisResults: AnalysisResult | null;
  threads: ConversationThread[];
  activeThreadId: string;
}

interface AppContextType {
  activePage: PageId; setActivePage: (page: PageId) => void;
  activeProject: Project; setActiveProject: (project: Project) => void;
  allProjects: Project[];
  designParams: DesignParameters;
  updateDesignParam: <K extends keyof DesignParameters>(key: K, value: DesignParameters[K]) => void;
  setDesignParams: (params: DesignParameters) => void;
  selectedMaterial: Material; selectMaterial: (materialId: string) => void;
  allMaterials: Material[];
  analysisResults: AnalysisResult | null;
  isAnalysisRunning: boolean; runAnalysis: () => Promise<void>;
  selectedComponent: ComponentSelection | null; setSelectedComponent: (comp: ComponentSelection | null) => void;
  copilotMessages: CopilotMessage[]; sendCopilotMessage: (content: string) => void;
  applyRecommendation: (payload?: any) => void; explainCalculation: () => void;
  isStreaming: boolean;
  conversationThreads: ConversationThread[]; activeThreadId: string;
  createNewConversation: () => void; switchConversation: (threadId: string) => void;
  savedMessageIds: Set<string>; toggleSaveMessage: (msgId: string) => void;
  engineeringWarnings: EngineeringWarning[]; applyWarningFix: (warningId: string) => void;
  isProblemModalOpen: boolean; setIsProblemModalOpen: (open: boolean) => void;
  isOptimizationModalOpen: boolean; setIsOptimizationModalOpen: (open: boolean) => void;
  isFileUploadModalOpen: boolean; setIsFileUploadModalOpen: (open: boolean) => void;
  isWarningsDrawerOpen: boolean; setIsWarningsDrawerOpen: (open: boolean) => void;
  isCommandPaletteOpen: boolean; setIsCommandPaletteOpen: (open: boolean) => void;
  isVersionHistoryOpen: boolean; setIsVersionHistoryOpen: (open: boolean) => void;
  isCompareModalOpen: boolean; setIsCompareModalOpen: (open: boolean) => void;
  isOnboardingModalOpen: boolean; setIsOnboardingModalOpen: (open: boolean) => void;
  designVersions: DesignVersion[];
  isLoadingVersions: boolean;
  versionError: string | null;
  saveDesignVersion: (label: string, notes?: string) => Promise<any>;
  restoreDesignVersion: (versionId: string) => Promise<any>;
  deleteDesignVersion: (versionId: string) => Promise<void>;
  copilotOpen: boolean; setCopilotOpen: (open: boolean) => void;
  isMobileMenuOpen: boolean; setIsMobileMenuOpen: (open: boolean) => void;
  calculationsTab: 'equations' | 'standards';
  setCalculationsTab: (tab: 'equations' | 'standards') => void;
  navigateToStandards: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [projectMemory, setProjectMemory] = useState<Record<string, ProjectMemory>>({});
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        let projects: Project[] = [];
        try {
          projects = await fetchProjects();
          if (projects.length === 0) {
            projects = await initSampleProject();
          }
        } catch (fetchErr) {
          console.warn("Backend unavailable or failed to fetch projects, using fallback", fetchErr);
        }

        if (projects.length === 0) {
          projects = [DEFAULT_FALLBACK_PROJECT];
        }

        setAllProjects(projects);
        const map: Record<string, ProjectMemory> = {};
        for (const p of projects) {
          let conversations: ConversationThread[] = [];
          try {
            conversations = await fetchConversations(p.id);
          } catch {
            conversations = [];
          }
          const defaultThreadId = `thread-${p.id}-default`;
          map[p.id] = {
            parameters: { ...p.parameters },
            materialId: p.parameters.materialId,
            analysisResults: null,
            threads: conversations.length > 0 ? conversations : [
              {
                id: defaultThreadId,
                title: 'Shaft Sizing & Verification',
                createdAt: p.lastModified,
                messages: [],
              }
            ],
            activeThreadId: conversations.length > 0 ? conversations[0].id : defaultThreadId,
          };
        }
        setProjectMemory(map);
        setActiveProjectState(projects[0]);
      } catch (err) {
        console.error("Failed to load projects", err);
      } finally {
        setIsLoadingProjects(false);
      }
    }
    loadData();
  }, []);

  const setActiveProject = useCallback((project: Project) => {
    setActiveProjectState(project);
  }, []);

  const updateDesignParam = useCallback(<K extends keyof DesignParameters>(key: K, value: DesignParameters[K]) => {
    if (!activeProject) return;
    setProjectMemory((prev) => {
      const mem = prev[activeProject.id];
      if (!mem) return prev;
      const newParams = { ...mem.parameters, [key]: value };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        updateProjectParameters(activeProject.id, newParams).catch(err => console.error(err));
      }, 1000);
      return {
        ...prev,
        [activeProject.id]: {
          ...mem, parameters: newParams, materialId: key === 'materialId' ? (value as string) : mem.materialId,
        },
      };
    });
  }, [activeProject]);

  const setDesignParams = useCallback((params: DesignParameters) => {
    if (!activeProject) return;
    setProjectMemory((prev) => {
      const mem = prev[activeProject.id];
      if (!mem) return prev;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        updateProjectParameters(activeProject.id, params).catch(err => console.error(err));
      }, 1000);
      return {
        ...prev,
        [activeProject.id]: {
          ...mem, parameters: { ...params }, materialId: params.materialId,
        },
      };
    });
  }, [activeProject]);

  const selectMaterial = useCallback((materialId: string) => {
    updateDesignParam('materialId', materialId);
  }, [updateDesignParam]);

  const createNewConversation = useCallback(() => {
    if (!activeProject) return;
    const threadId = `thread-${activeProject.id}-${Date.now()}`;
    setProjectMemory((prev) => {
      const mem = prev[activeProject.id];
      if (!mem) return prev;
      return {
        ...prev,
        [activeProject.id]: {
          ...mem,
          threads: [...mem.threads, { id: threadId, title: 'New Conversation', createdAt: now(), messages: [] }],
          activeThreadId: threadId,
        },
      };
    });
  }, [activeProject]);

  const switchConversation = useCallback((threadId: string) => {
    if (!activeProject) return;
    setProjectMemory((prev) => {
      const mem = prev[activeProject.id];
      if (!mem) return prev;
      return { ...prev, [activeProject.id]: { ...mem, activeThreadId: threadId } };
    });
  }, [activeProject]);

  const currentMem = activeProject && projectMemory[activeProject.id] ? projectMemory[activeProject.id] : null;
  const designParams = currentMem ? currentMem.parameters : { materialId: 'aisi-4140', diameter: 45, length: 320, torque: 500, force: 12000, rpm: 1450, safetyFactor: 2.0, temperature: 60 };
  const selectedMaterial = getMaterialById(currentMem ? currentMem.materialId : 'aisi-4140') || materials[0];
  const analysisResults = useMemo(() => computeAnalysis(designParams), [designParams]);
  const conversationThreads = currentMem ? currentMem.threads : [];
  const activeThreadId = currentMem ? currentMem.activeThreadId : '';
  const currentThread = conversationThreads.find((t) => t.id === activeThreadId) || conversationThreads[0];
  const copilotMessages = currentThread ? currentThread.messages : [];

  const [selectedComponent, setSelectedComponent] = useState<ComponentSelection | null>(null);
  const [isAnalysisRunning, setIsAnalysisRunning] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [savedMessageIds, setSavedMessageIds] = useState<Set<string>>(new Set());

  const [copilotOpen, setCopilotOpen] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);
  const [isOptimizationModalOpen, setIsOptimizationModalOpen] = useState(false);
  const [isFileUploadModalOpen, setIsFileUploadModalOpen] = useState(false);
  const [isWarningsDrawerOpen, setIsWarningsDrawerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [designVersions, setDesignVersions] = useState<DesignVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [calculationsTab, setCalculationsTab] = useState<'equations' | 'standards'>('equations');

  const navigateToStandards = useCallback(() => {
    setCalculationsTab('standards');
    setActivePage('calculations');
  }, [setActivePage]);

  // Load persistent design versions from SQLite when active project changes
  useEffect(() => {
    if (!activeProject) {
      setDesignVersions([]);
      return;
    }
    let isMounted = true;
    setIsLoadingVersions(true);
    setVersionError(null);
    fetchProjectVersions(activeProject.id)
      .then((versions) => {
        if (isMounted) {
          setDesignVersions(versions);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setVersionError(err.message || 'Failed to load design versions');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingVersions(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [activeProject?.id]);

  const runAnalysis = useCallback(async () => {
    setIsAnalysisRunning(true);
    // Deterministic, immediate physics calculation
    const results = computeAnalysis(designParams);
    if (activeProject) {
      setProjectMemory((prev) => {
        const mem = prev[activeProject.id];
        if (!mem) return prev;
        return {
          ...prev,
          [activeProject.id]: {
            ...mem,
            analysisResults: results,
          },
        };
      });
    }
    setIsAnalysisRunning(false);
    setActivePage('analysis');
  }, [activeProject, designParams, setActivePage]);

  const sendCopilotMessage = useCallback(async (content: string) => {
    if (isStreaming || !activeProject) return;
    const userMsg: CopilotMessage = { id: `user-${Date.now()}`, role: 'user', content, timestamp: now() };
    setProjectMemory((prev) => {
      const mem = prev[activeProject.id];
      if (!mem) return prev;
      return {
        ...prev,
        [activeProject.id]: {
          ...mem, threads: mem.threads.map(t => t.id === mem.activeThreadId ? { ...t, messages: [...t.messages, userMsg] } : t)
        }
      };
    });
    setIsStreaming(true);
    try {
      const threadToUse = conversationThreads.find((t) => t.id === activeThreadId) || conversationThreads[0];
      const contextMessages = threadToUse ? [...threadToUse.messages, userMsg] : [userMsg];
      const aiReply = await sendChatMessage(contextMessages, activeProject.id, activeThreadId);
      setProjectMemory((prev) => {
        const mem = prev[activeProject.id];
        if (!mem) return prev;
        return {
          ...prev,
          [activeProject.id]: {
            ...mem, threads: mem.threads.map(t => t.id === mem.activeThreadId ? { ...t, messages: [...t.messages, aiReply] } : t)
          }
        };
      });
    } catch (error: any) {
      const errorMsg: CopilotMessage = { id: `error-${Date.now()}`, role: 'assistant', type: 'warning', content: `**Error:** ${error.message}`, timestamp: now() };
      setProjectMemory((prev) => {
        const mem = prev[activeProject.id];
        if (!mem) return prev;
        return {
          ...prev,
          [activeProject.id]: {
            ...mem, threads: mem.threads.map(t => t.id === mem.activeThreadId ? { ...t, messages: [...t.messages, errorMsg] } : t)
          }
        };
      });
    } finally {
      setIsStreaming(false);
    }
  }, [activeProject, isStreaming, conversationThreads, activeThreadId]);

  const applyRecommendation = useCallback((payload?: any) => {
    if (!activeProject) return;
    const newDiameter = payload?.diameter || 45;
    updateDesignParam('diameter', newDiameter);
    const confirmMsg: CopilotMessage = { id: nextId(), role: 'assistant', type: 'recommendation', content: `Applied ${newDiameter} mm.`, timestamp: now(), actions: [{ label: 'Run Analysis', type: 'analyze' }] };
    setProjectMemory((prev) => {
      const mem = prev[activeProject.id];
      if (!mem) return prev;
      return {
        ...prev,
        [activeProject.id]: {
          ...mem, threads: mem.threads.map(t => t.id === mem.activeThreadId ? { ...t, messages: [...t.messages, confirmMsg] } : t)
        }
      };
    });
  }, [activeProject, updateDesignParam]);

  const explainCalculation = useCallback(() => {
    if (!activeProject) return;
    // Generate deterministic proof from active telemetry and material properties
    const msg = generateCalculationExplanation(designParams, selectedMaterial);
    setProjectMemory((prev) => {
      const mem = prev[activeProject.id];
      if (!mem) return prev;
      return {
        ...prev,
        [activeProject.id]: {
          ...mem,
          threads: mem.threads.map(t => t.id === mem.activeThreadId ? { ...t, messages: [...t.messages, msg] } : t)
        }
      };
    });
  }, [activeProject, designParams, selectedMaterial]);

  const engineeringWarnings = useMemo(() => evaluateEngineeringWarnings(designParams, selectedMaterial), [designParams, selectedMaterial]);

  const applyWarningFix = useCallback((warningId: string) => {
    const warning = engineeringWarnings.find((w) => w.id === warningId);
    if (!warning || !warning.autoFixValue) return;
    Object.entries(warning.autoFixValue).forEach(([k, val]) => updateDesignParam(k as keyof DesignParameters, val as any));
    sendCopilotMessage(`Applied recommended fix for warning: "${warning.title}".`);
  }, [engineeringWarnings, updateDesignParam, sendCopilotMessage]);

  const toggleSaveMessage = useCallback((msgId: string) => {
    setSavedMessageIds((prev) => { const next = new Set(prev); if (next.has(msgId)) next.delete(msgId); else next.add(msgId); return next; });
  }, []);

  const saveDesignVersion = useCallback(async (label: string, notes: string = '') => {
    if (!activeProject) return;
    setVersionError(null);
    try {
      const created = await createProjectVersion(activeProject.id, {
        label,
        notes: notes || `Snapshot taken at ⌀${designParams.diameter} mm`,
        parameters: { ...designParams },
        materialId: selectedMaterial.id,
        materialName: selectedMaterial.name,
        factorOfSafety: analysisResults ? analysisResults.factorOfSafety : 2.0,
        status: analysisResults ? analysisResults.status : 'pass',
        calculationSummary: analysisResults ? analysisResults.statusMessage : undefined,
      });
      setDesignVersions((prev) => [created, ...prev]);
      return created;
    } catch (err: any) {
      setVersionError(err.message || 'Failed to save design version');
      throw err;
    }
  }, [activeProject, designParams, selectedMaterial, analysisResults]);

  const restoreDesignVersion = useCallback(async (versionId: string) => {
    if (!activeProject) return;
    setVersionError(null);
    try {
      const { project: updatedProject, restoredVersion } = await restoreProjectVersion(activeProject.id, versionId);
      // Restore parameters into design memory
      setDesignParams({ ...restoredVersion.parameters });
      if (restoredVersion.materialId) {
        selectMaterial(restoredVersion.materialId);
      }
      setActiveProjectState(updatedProject);
      setProjectMemory((prev) => {
        const mem = prev[activeProject.id];
        if (!mem) return prev;
        return {
          ...prev,
          [activeProject.id]: {
            ...mem,
            parameters: updatedProject.parameters,
            materialId: updatedProject.parameters.materialId || mem.materialId,
          },
        };
      });
      return { project: updatedProject, restoredVersion };
    } catch (err: any) {
      setVersionError(err.message || 'Failed to restore design version');
      throw err;
    }
  }, [activeProject, setDesignParams, selectMaterial, setActiveProjectState]);

  const deleteDesignVersion = useCallback(async (versionId: string) => {
    if (!activeProject) return;
    setVersionError(null);
    try {
      await deleteProjectVersion(activeProject.id, versionId);
      setDesignVersions((prev) => prev.filter((v) => v.id !== versionId));
    } catch (err: any) {
      setVersionError(err.message || 'Failed to delete design version');
      throw err;
    }
  }, [activeProject]);

  if (isLoadingProjects) {
    return <div className="flex h-screen w-screen items-center justify-center bg-navy-950 text-white">Loading Engineering Environment...</div>;
  }

  if (!activeProject) {
    return (
      <div className="flex flex-col h-screen w-screen items-center justify-center bg-navy-950 text-white p-8">
        <div className="max-w-md w-full bg-navy-900 border border-navy-700 rounded-xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400 text-xl font-bold font-mono">
            Q
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Quantum Workspace Ready</h1>
          <p className="text-sm text-slate-400">
            No active project is currently loaded. Initialize the standard mechanical shaft engineering workspace now.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <button
              onClick={async () => {
                setIsLoadingProjects(true);
                try {
                  const seeded = await initSampleProject();
                  if (seeded && seeded.length > 0) {
                    setAllProjects(seeded);
                    setActiveProjectState(seeded[0]);
                  } else {
                    setAllProjects([DEFAULT_FALLBACK_PROJECT]);
                    setActiveProjectState(DEFAULT_FALLBACK_PROJECT);
                  }
                } catch {
                  setAllProjects([DEFAULT_FALLBACK_PROJECT]);
                  setActiveProjectState(DEFAULT_FALLBACK_PROJECT);
                } finally {
                  setIsLoadingProjects(false);
                }
              }}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-accent text-navy-950 hover:bg-accent/90 rounded-md transition-colors"
            >
              Initialize Sample Workspace
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-700 rounded-md transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ activePage, setActivePage, activeProject, setActiveProject, allProjects, designParams, updateDesignParam, setDesignParams, selectedMaterial, selectMaterial, allMaterials: materials, analysisResults, isAnalysisRunning, runAnalysis, selectedComponent, setSelectedComponent, copilotMessages, sendCopilotMessage, applyRecommendation, explainCalculation, isStreaming, conversationThreads, activeThreadId, createNewConversation, switchConversation, savedMessageIds, toggleSaveMessage, engineeringWarnings, applyWarningFix, isProblemModalOpen, setIsProblemModalOpen, isOptimizationModalOpen, setIsOptimizationModalOpen, isFileUploadModalOpen, setIsFileUploadModalOpen, isWarningsDrawerOpen, setIsWarningsDrawerOpen, isCommandPaletteOpen, setIsCommandPaletteOpen, isVersionHistoryOpen, setIsVersionHistoryOpen, isCompareModalOpen, setIsCompareModalOpen, isOnboardingModalOpen, setIsOnboardingModalOpen, designVersions, isLoadingVersions, versionError, saveDesignVersion, restoreDesignVersion, deleteDesignVersion, copilotOpen, setCopilotOpen, isMobileMenuOpen, setIsMobileMenuOpen, calculationsTab, setCalculationsTab, navigateToStandards }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
