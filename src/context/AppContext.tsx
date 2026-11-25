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
  createProjectRecord,
  updateProjectParameters,
  initSampleProject,
  fetchProjectVersions,
  createProjectVersion,
  restoreProjectVersion,
  deleteProjectVersion,
} from '../services/projectApi';

interface ProjectMemory {
  parameters: DesignParameters;
  materialId: string;
  analysisResults: AnalysisResult | null;
  threads: ConversationThread[];
  activeThreadId: string;
}

export type ProjectSaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

interface AppContextType {
  activePage: PageId; setActivePage: (page: PageId) => void;
  activeProject: Project | null; setActiveProject: (project: Project | null) => void;
  allProjects: Project[];
  designParams: DesignParameters;
  updateDesignParam: <K extends keyof DesignParameters>(key: K, value: DesignParameters[K]) => void;
  setDesignParams: (params: DesignParameters) => void;
  resetParamsToStandard: () => void;
  saveStatus: ProjectSaveStatus;
  lastSavedAt: number | null;
  saveError: string | null;
  saveProjectNow: () => Promise<void>;
  selectedFit: string;
  setSelectedFit: (fit: string) => void;
  selectedMaterial: Material; selectMaterial: (materialId: string) => void;
  allMaterials: Material[];
  analysisResults: AnalysisResult | null;
  isAnalysisRunning: boolean; runAnalysis: (options?: { navigateToAnalysis?: boolean }) => Promise<void>;
  lastAnalysisRunAt: number | null;
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
  canvasMode: '3d' | '2d' | 'split';
  setCanvasMode: (mode: '3d' | '2d' | 'split') => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [canvasMode, setCanvasMode] = useState<'3d' | '2d' | 'split'>('3d');
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [projectMemory, setProjectMemory] = useState<Record<string, ProjectMemory>>({});
  const [saveStatus, setSaveStatus] = useState<ProjectSaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedFit, setSelectedFit] = useState<string>('H7/h6');
  const [lastAnalysisRunAt, setLastAnalysisRunAt] = useState<number | null>(null);
  const [draftParams, setDraftParams] = useState<DesignParameters>({
    materialId: 'aisi-4140',
    diameter: 45,
    length: 320,
    torque: 500,
    force: 12000,
    rpm: 1450,
    safetyFactor: 2.0,
    temperature: 60,
    criterion: 'Von Mises',
    deflectionLimitRatio: 1000,
  });
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        let projects: Project[] = [];
        try {
          projects = await fetchProjects();
        } catch (fetchErr) {
          console.warn("Backend unavailable or failed to fetch projects", fetchErr);
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
        if (projects.length > 0) {
          setActiveProjectState(projects[0]);
        } else {
          setActiveProjectState(null);
        }
      } catch (err) {
        console.error("Failed to load projects", err);
      } finally {
        setIsLoadingProjects(false);
      }
    }
    loadData();
  }, []);

  const setActiveProject = useCallback((project: Project | null) => {
    setActiveProjectState(project);
    setSaveStatus('saved');
    setSaveError(null);
  }, []);

  const buildFallbackMemory = useCallback((project: Project): ProjectMemory => {
    const defaultThreadId = `thread-${project.id}-default`;
    return {
      parameters: { ...project.parameters },
      materialId: project.parameters.materialId || 'aisi-4140',
      analysisResults: null,
      threads: [
        {
          id: defaultThreadId,
          title: 'Shaft Sizing & Verification',
          createdAt: project.lastModified || now(),
          messages: [],
        },
      ],
      activeThreadId: defaultThreadId,
    };
  }, []);

  const persistProjectParameters = useCallback(async (projectId: string, params: DesignParameters) => {
    setSaveStatus('saving');
    setSaveError(null);
    try {
      const updated = await updateProjectParameters(projectId, params);
      setAllProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, ...updated, parameters: updated.parameters } : p)));
      setActiveProjectState((prev) => (prev && prev.id === projectId ? { ...prev, ...updated, parameters: updated.parameters } : prev));
      setSaveStatus('saved');
      setLastSavedAt(Date.now());
    } catch (err: any) {
      console.error(err);
      setSaveStatus('error');
      setSaveError(err?.message || 'Failed to save changes');
    }
  }, []);

  const updateDesignParam = useCallback(<K extends keyof DesignParameters>(key: K, value: DesignParameters[K]) => {
    if (!activeProject) {
      setDraftParams((prev) => ({ ...prev, [key]: value }));
      return;
    }
    setSaveStatus('unsaved');
    setSaveError(null);
    setProjectMemory((prev) => {
      const mem = prev[activeProject.id] || buildFallbackMemory(activeProject);
      const newParams = { ...mem.parameters, [key]: value };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        persistProjectParameters(activeProject.id, newParams);
      }, 650);
      return {
        ...prev,
        [activeProject.id]: {
          ...mem, parameters: newParams, materialId: key === 'materialId' ? (value as string) : mem.materialId,
        },
      };
    });
  }, [activeProject, persistProjectParameters, buildFallbackMemory]);

  const setDesignParams = useCallback((params: DesignParameters) => {
    if (!activeProject) {
      setDraftParams({ ...params });
      return;
    }
    setSaveStatus('unsaved');
    setSaveError(null);
    setProjectMemory((prev) => {
      const mem = prev[activeProject.id] || buildFallbackMemory(activeProject);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        persistProjectParameters(activeProject.id, params);
      }, 650);
      return {
        ...prev,
        [activeProject.id]: {
          ...mem, parameters: { ...params }, materialId: params.materialId,
        },
      };
    });
  }, [activeProject, persistProjectParameters, buildFallbackMemory]);

  const resetParamsToStandard = useCallback(() => {
    const standardParams: DesignParameters = {
      materialId: 'aisi-4140',
      diameter: 45,
      length: 320,
      torque: 500,
      force: 12000,
      rpm: 1450,
      safetyFactor: 2.0,
      temperature: 60,
      criterion: 'Von Mises',
      deflectionLimitRatio: 1000,
    };
    setDesignParams(standardParams);
    setSelectedFit('H7/h6');
  }, [setDesignParams]);

  const selectMaterial = useCallback((materialId: string) => {
    updateDesignParam('materialId', materialId);
  }, [updateDesignParam]);

  const createNewConversation = useCallback(() => {
    if (!activeProject) {
      setWelcomeThread({
        id: `thread-welcome-${Date.now()}`,
        title: 'New Conversation',
        createdAt: now(),
        messages: [],
      });
      return;
    }
    const threadId = `thread-${activeProject.id}-${Date.now()}`;
    setProjectMemory((prev) => {
      const mem = prev[activeProject.id] || buildFallbackMemory(activeProject);
      return {
        ...prev,
        [activeProject.id]: {
          ...mem,
          threads: [...mem.threads, { id: threadId, title: 'New Conversation', createdAt: now(), messages: [] }],
          activeThreadId: threadId,
        },
      };
    });
  }, [activeProject, buildFallbackMemory]);

  const switchConversation = useCallback((threadId: string) => {
    if (!activeProject) return;
    setProjectMemory((prev) => {
      const mem = prev[activeProject.id] || buildFallbackMemory(activeProject);
      return { ...prev, [activeProject.id]: { ...mem, activeThreadId: threadId } };
    });
  }, [activeProject, buildFallbackMemory]);

  const [welcomeThread, setWelcomeThread] = useState<ConversationThread>({
    id: 'thread-welcome',
    title: 'Engineering Copilot Agent',
    createdAt: new Date().toISOString(),
    messages: [
      {
        id: 'msg-welcome',
        role: 'assistant',
        content: `**Mechanical Engineering Copilot Ready**\n\n` +
          `Connected to the deterministic solid mechanics engine.\n\n` +
          `To start a verified design, specify requirements such as:\n` +
          `*"Create a new project for a solid drive shaft: 500 N·m torque at 1450 RPM, 320 mm span, 12 kN radial force, AISI 4140, target FoS 2.0, Von Mises criterion."*`,
        timestamp: new Date().toISOString(),
        type: 'general',
      }
    ]
  });

  const currentMem = activeProject && projectMemory[activeProject.id] ? projectMemory[activeProject.id] : null;
  const designParams = currentMem ? currentMem.parameters : draftParams;
  const selectedMaterial = getMaterialById(currentMem ? currentMem.materialId : draftParams.materialId) || materials[0];
  const analysisResults = useMemo(() => computeAnalysis(designParams), [designParams]);
  const conversationThreads = currentMem ? currentMem.threads : [welcomeThread];
  const activeThreadId = currentMem ? currentMem.activeThreadId : welcomeThread.id;
  const currentThread = conversationThreads.find((t) => t.id === activeThreadId) || conversationThreads[0];
  const copilotMessages = currentThread ? currentThread.messages : [];

  const [selectedComponent, setSelectedComponent] = useState<ComponentSelection | null>(null);
  const [isAnalysisRunning, setIsAnalysisRunning] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [savedMessageIds, setSavedMessageIds] = useState<Set<string>>(new Set());

  const [copilotOpen, setCopilotOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1360 : true
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

  const saveProjectNow = useCallback(async () => {
    if (!activeProject) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    await persistProjectParameters(activeProject.id, designParams);
  }, [activeProject, designParams, persistProjectParameters]);

  const runAnalysis = useCallback(async (options?: { navigateToAnalysis?: boolean }) => {
    setIsAnalysisRunning(true);
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
    setLastAnalysisRunAt(Date.now());
    setIsAnalysisRunning(false);
    if (options?.navigateToAnalysis) {
      setActivePage('analysis');
    }
  }, [activeProject, designParams, setActivePage]);

  const sendCopilotMessage = useCallback(async (content: string) => {
    if (isStreaming) return;
    const userMsg: CopilotMessage = { id: `user-${Date.now()}`, role: 'user', content, timestamp: now() };
    
    if (activeProject) {
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
    } else {
      setWelcomeThread((prev) => ({
        ...prev,
        messages: [...prev.messages, userMsg]
      }));
    }

    setIsStreaming(true);
    try {
      const threadToUse = conversationThreads.find((t) => t.id === activeThreadId) || conversationThreads[0];
      const contextMessages = threadToUse ? [...threadToUse.messages, userMsg] : [userMsg];
      const aiReply = await sendChatMessage(contextMessages, activeProject?.id, activeProject ? activeThreadId : undefined);

      // Handle Autonomous Agent Actions (Single or Multi-Step)
      const actionList = aiReply.actions && aiReply.actions.length > 0
        ? aiReply.actions
        : (aiReply.action ? [aiReply.action] : (aiReply.engineeringResult?.action ? [aiReply.engineeringResult.action] : []));

      let effectiveProject = activeProject;

      for (const action of actionList) {
        if (!action) continue;

        if (action.type === 'project_created' && action.project) {
          const newProj: Project = action.project;
          effectiveProject = newProj;
          const defaultThreadId = `thread-${newProj.id}-default`;
          const allMsgs = [...(threadToUse ? threadToUse.messages : []), userMsg, aiReply];

          setProjectMemory((prev) => ({
            ...prev,
            [newProj.id]: {
              parameters: { ...newProj.parameters },
              materialId: newProj.parameters.materialId || 'aisi-4140',
              analysisResults: null,
              threads: [
                {
                  id: defaultThreadId,
                  title: 'Shaft Sizing & Verification',
                  createdAt: newProj.lastModified,
                  messages: allMsgs
                }
              ],
              activeThreadId: defaultThreadId
            }
          }));

          setAllProjects((prev) => {
            const exists = prev.some(p => p.id === newProj.id);
            return exists ? prev : [newProj, ...prev];
          });
          setActiveProjectState(newProj);
          setActivePage('workspace');
        }

        if ((action.type === 'parameters_updated' || action.type === 'geometry_updated') && action.parameters) {
          const updatedParams = action.parameters;
          const projId = effectiveProject?.id;
          if (projId) {
            setProjectMemory((prev) => {
              const mem = prev[projId];
              if (!mem) return prev;
              return {
                ...prev,
                [projId]: {
                  ...mem,
                  parameters: { ...mem.parameters, ...updatedParams },
                  materialId: updatedParams.materialId || mem.materialId
                }
              };
            });
            setSaveStatus('saved');
            setLastSavedAt(Date.now());
          }
        }

        if (action.type === 'component_selected' && action.componentName) {
          setSelectedComponent({
            name: action.componentName,
            type: 'component'
          } as any);
        }

        if (action.type === 'version_saved' && action.version) {
          setDesignVersions((prev) => [action.version, ...prev]);
        }

        if (action.type === 'print_dialog_requested') {
          if (typeof window !== 'undefined' && typeof window.print === 'function') {
            setTimeout(() => {
              window.print();
            }, 300);
          }
        }

        if (action.type === 'pdf_exported' && action.pdfDownloadUrl) {
          if (typeof window !== 'undefined' && typeof document !== 'undefined') {
            const a = document.createElement('a');
            a.href = action.pdfDownloadUrl;
            a.download = `Engineering-Report-${action.projectId || 'document'}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
        }
      }

      if (actionList.some(a => a?.type === 'project_created')) {
        return;
      }

      if (activeProject) {
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
      } else {
        setWelcomeThread((prev) => ({
          ...prev,
          messages: [...prev.messages, aiReply]
        }));
      }
    } catch (error: any) {
      const errorMsg: CopilotMessage = { id: `error-${Date.now()}`, role: 'assistant', type: 'warning', content: `**Error:** ${error.message}`, timestamp: now() };
      if (activeProject) {
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
      } else {
        setWelcomeThread((prev) => ({
          ...prev,
          messages: [...prev.messages, errorMsg]
        }));
      }
    } finally {
      setIsStreaming(false);
    }
  }, [activeProject, isStreaming, conversationThreads, activeThreadId, setActivePage]);

  const applyRecommendation = useCallback((payload?: any) => {
    const updates: Partial<DesignParameters> = {};

    const pickNum = (val: any): number | undefined => {
      if (val === undefined || val === null || val === '') return undefined;
      const n = Number(val);
      return Number.isFinite(n) ? n : undefined;
    };

    const rawDia =
      pickNum(payload?.diameter) ??
      pickNum(payload?.diameterMm) ??
      pickNum(payload?.recommendedDiameter) ??
      pickNum(payload?.requiredDiameterMm) ??
      pickNum(payload?.minimumRequiredDiameterMm) ??
      pickNum(payload?.proposedValue);
    if (rawDia !== undefined && rawDia > 0) {
      updates.diameter = Math.round(rawDia * 100) / 100;
    }

    const rawTorque =
      pickNum(payload?.torque) ??
      pickNum(payload?.appliedTorqueNm) ??
      pickNum(payload?.torqueNm);
    if (rawTorque !== undefined && rawTorque >= 0) {
      updates.torque = Math.round(rawTorque * 100) / 100;
    }

    const rawForce =
      pickNum(payload?.force) ??
      pickNum(payload?.radialForceN) ??
      pickNum(payload?.radialLoadN);
    if (rawForce !== undefined && rawForce >= 0) {
      updates.force = Math.round(rawForce * 100) / 100;
    }

    const rawLength =
      pickNum(payload?.length) ??
      pickNum(payload?.shaftSpanMm) ??
      pickNum(payload?.lengthMm);
    if (rawLength !== undefined && rawLength > 0) {
      updates.length = Math.round(rawLength * 100) / 100;
    }

    const rawRpm =
      pickNum(payload?.rpm) ??
      pickNum(payload?.rotationalSpeedRpm);
    if (rawRpm !== undefined && rawRpm >= 0) {
      updates.rpm = Math.round(rawRpm * 100) / 100;
    }

    const rawFos =
      pickNum(payload?.safetyFactor) ??
      pickNum(payload?.targetSafetyFactor) ??
      pickNum(payload?.requiredFactorOfSafety);
    if (rawFos !== undefined && rawFos > 0) {
      updates.safetyFactor = Math.round(rawFos * 100) / 100;
    }

    const rawTemp =
      pickNum(payload?.temperature) ??
      pickNum(payload?.operatingTempC);
    if (rawTemp !== undefined && rawTemp >= -273 && rawTemp <= 2000) {
      updates.temperature = Math.round(rawTemp * 100) / 100;
    }

    const rawCrit = payload?.criterion ?? payload?.failureCriterion;
    if (typeof rawCrit === 'string' && rawCrit.trim()) {
      updates.criterion = rawCrit.toLowerCase().includes('tresca') ? 'Tresca' : 'Von Mises';
    }

    const rawMatId = payload?.materialId ?? payload?.material;
    if (typeof rawMatId === 'string' && rawMatId.trim()) {
      const q = rawMatId.trim().toLowerCase();
      const matchedMat = materials.find(
        (m) => m.id.toLowerCase() === q || m.name.toLowerCase() === q || m.name.toLowerCase().includes(q)
      );
      if (matchedMat) updates.materialId = matchedMat.id;
    } else if (payload?.yieldStrengthMPa !== undefined) {
      const sy = Number(payload.yieldStrengthMPa);
      const matchedBySy = materials.find((m) => Math.abs(m.yieldStrength - sy) < 1e-3);
      if (matchedBySy) updates.materialId = matchedBySy.id;
    }

    if (Object.keys(updates).length === 0) {
      updates.diameter = 45;
    }

    const summaryText = Object.entries(updates)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');

    const confirmMsg: CopilotMessage = {
      id: nextId(),
      role: 'assistant',
      type: 'recommendation',
      content: `Applied parameter updates to workstation: **${summaryText}**. Workstation CAD and calculations synchronized.`,
      timestamp: now(),
      actions: [{ label: 'Run Analysis', type: 'analyze' }],
    };

    if (!activeProject) {
      const nextDraftParams: DesignParameters = { ...draftParams, ...updates };
      setDraftParams(nextDraftParams);
      setWelcomeThread((prev) => ({
        ...prev,
        messages: [...prev.messages, confirmMsg],
      }));
      setLastAnalysisRunAt(Date.now());

      // Auto-provision a persistent backend project so subsequent work & Apply survive reloads
      const nowIso = new Date().toISOString();
      const newProjId = `proj-${Date.now()}`;
      setSaveStatus('saving');
      createProjectRecord({
        id: newProjId,
        name: 'Precision Shaft Design Project',
        description: 'Parametric shaft workspace synchronized from Copilot recommendation.',
        type: 'Shaft Design',
        status: 'Active',
        progress: 35,
        lastModified: nowIso,
        created: nowIso,
        parameters: nextDraftParams,
        tags: ['shaft', 'copilot'],
      })
        .then((createdProj) => {
          const defaultThreadId = `thread-${createdProj.id}-default`;
          setProjectMemory((prev) => ({
            ...prev,
            [createdProj.id]: {
              parameters: { ...nextDraftParams },
              materialId: nextDraftParams.materialId,
              analysisResults: computeAnalysis(nextDraftParams),
              threads: [
                {
                  id: defaultThreadId,
                  title: 'Shaft Sizing & Verification',
                  createdAt: nowIso,
                  messages: [...welcomeThread.messages, confirmMsg],
                },
              ],
              activeThreadId: defaultThreadId,
            },
          }));
          setAllProjects((prev) => [createdProj, ...prev]);
          setActiveProjectState(createdProj);
          setSaveStatus('saved');
          setLastSavedAt(Date.now());
        })
        .catch(() => {
          // Offline fallback: draft state already applied synchronously
          setSaveStatus('unsaved');
        });
      return;
    }

    setSaveStatus('saving');
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const existingMem = projectMemory[activeProject.id] || buildFallbackMemory(activeProject);
    const newParams: DesignParameters = { ...existingMem.parameters, ...updates };

    setProjectMemory((prev) => {
      const mem = prev[activeProject.id] || buildFallbackMemory(activeProject);
      const syncedParams = { ...mem.parameters, ...updates };
      return {
        ...prev,
        [activeProject.id]: {
          ...mem,
          parameters: syncedParams,
          materialId: syncedParams.materialId || mem.materialId,
          analysisResults: computeAnalysis(syncedParams),
          threads: mem.threads.map((t) =>
            t.id === mem.activeThreadId ? { ...t, messages: [...t.messages, confirmMsg] } : t
          ),
        },
      };
    });
    setActiveProjectState((prev) =>
      prev && prev.id === activeProject.id ? { ...prev, parameters: newParams } : prev
    );
    setLastAnalysisRunAt(Date.now());
    persistProjectParameters(activeProject.id, newParams);
  }, [activeProject, draftParams, welcomeThread, projectMemory, buildFallbackMemory, persistProjectParameters]);

  const explainCalculation = useCallback(() => {
    const msg = generateCalculationExplanation(designParams, selectedMaterial);
    if (!activeProject) {
      setWelcomeThread((prev) => ({
        ...prev,
        messages: [...prev.messages, msg],
      }));
      return;
    }
    // Generate deterministic proof from active telemetry and material properties
    setProjectMemory((prev) => {
      const mem = prev[activeProject.id] || buildFallbackMemory(activeProject);
      return {
        ...prev,
        [activeProject.id]: {
          ...mem,
          threads: mem.threads.map(t => t.id === mem.activeThreadId ? { ...t, messages: [...t.messages, msg] } : t)
        }
      };
    });
  }, [activeProject, designParams, selectedMaterial, buildFallbackMemory]);

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

  return (
    <AppContext.Provider value={{ activePage, setActivePage, activeProject, setActiveProject, allProjects, designParams, updateDesignParam, setDesignParams, resetParamsToStandard, saveStatus, lastSavedAt, saveError, saveProjectNow, selectedFit, setSelectedFit, selectedMaterial, selectMaterial, allMaterials: materials, analysisResults, isAnalysisRunning, runAnalysis, lastAnalysisRunAt, selectedComponent, setSelectedComponent, copilotMessages, sendCopilotMessage, applyRecommendation, explainCalculation, isStreaming, conversationThreads, activeThreadId, createNewConversation, switchConversation, savedMessageIds, toggleSaveMessage, engineeringWarnings, applyWarningFix, isProblemModalOpen, setIsProblemModalOpen, isOptimizationModalOpen, setIsOptimizationModalOpen, isFileUploadModalOpen, setIsFileUploadModalOpen, isWarningsDrawerOpen, setIsWarningsDrawerOpen, isCommandPaletteOpen, setIsCommandPaletteOpen, isVersionHistoryOpen, setIsVersionHistoryOpen, isCompareModalOpen, setIsCompareModalOpen, isOnboardingModalOpen, setIsOnboardingModalOpen, designVersions, isLoadingVersions, versionError, saveDesignVersion, restoreDesignVersion, deleteDesignVersion, copilotOpen, setCopilotOpen, isMobileMenuOpen, setIsMobileMenuOpen, calculationsTab, setCalculationsTab, navigateToStandards, canvasMode, setCanvasMode }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
