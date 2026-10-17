import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './design-system/ThemeContext';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import CopilotPanel from './components/CopilotPanel';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import DesignWorkspacePage from './pages/DesignWorkspacePage';
import AnalysisPage from './pages/AnalysisPage';
import MaterialsPage from './pages/MaterialsPage';
import CalculationsPage from './pages/CalculationsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import ProblemInputModal from './components/ProblemInputModal';
import OptimizationModal from './components/OptimizationModal';
import FileUploadModal from './components/FileUploadModal';
import WarningsDrawer from './components/WarningsDrawer';
import CommandPalette from './components/CommandPalette';
import VersionHistoryDrawer from './components/VersionHistoryDrawer';
import DesignCompareModal from './components/DesignCompareModal';
import OnboardingModal from './components/OnboardingModal';

function AppContent() {
  const {
    activePage,
    copilotOpen,
    isProblemModalOpen,
    setIsProblemModalOpen,
    isOptimizationModalOpen,
    setIsOptimizationModalOpen,
    isFileUploadModalOpen,
    setIsFileUploadModalOpen,
    isWarningsDrawerOpen,
    setIsWarningsDrawerOpen,
  } = useApp();

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'projects':
        return <ProjectsPage />;
      case 'workspace':
        return <DesignWorkspacePage />;
      case 'analysis':
        return <AnalysisPage />;
      case 'materials':
        return <MaterialsPage />;
      case 'calculations':
        return <CalculationsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-navy-950 font-sans text-gray-100">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <TopBar />

        {/* Main + Copilot */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Page Content */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden bg-navy-950">
            {renderPage()}
          </main>

          {/* Right Copilot Panel */}
          {copilotOpen && <CopilotPanel />}
        </div>
      </div>

      {/* Global Modals, Drawers and Command Palette */}
      <CommandPalette />
      <VersionHistoryDrawer />
      <DesignCompareModal />
      <OnboardingModal />

      <ProblemInputModal
        isOpen={isProblemModalOpen}
        onClose={() => setIsProblemModalOpen(false)}
      />
      <OptimizationModal
        isOpen={isOptimizationModalOpen}
        onClose={() => setIsOptimizationModalOpen(false)}
      />
      <FileUploadModal
        isOpen={isFileUploadModalOpen}
        onClose={() => setIsFileUploadModalOpen(false)}
      />
      <WarningsDrawer
        isOpen={isWarningsDrawerOpen}
        onClose={() => setIsWarningsDrawerOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
}

