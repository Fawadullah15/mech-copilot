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
import TolerancesPage from './pages/TolerancesPage';
import GdtPage from './pages/GdtPage';
import FatiguePage from './pages/FatiguePage';
import BearingsPage from './pages/BearingsPage';
import ConnectionsPage from './pages/ConnectionsPage';
import GearsPage from './pages/GearsPage';
import VibrationPage from './pages/VibrationPage';
import SettingsPage from './pages/SettingsPage';
import ProductsManagementPage from './pages/ProductsManagementPage';
import BOMWorkstationPage from './pages/BOMWorkstationPage';
import ProblemInputModal from './components/ProblemInputModal';
import OptimizationModal from './components/OptimizationModal';
import FileUploadModal from './components/FileUploadModal';
import WarningsDrawer from './components/WarningsDrawer';
import CommandPalette from './components/CommandPalette';
import VersionHistoryDrawer from './components/VersionHistoryDrawer';
import DesignCompareModal from './components/DesignCompareModal';
import OnboardingModal from './components/OnboardingModal';

function AppContent() {
  const appCtx = useApp();
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
  } = appCtx;

  React.useEffect(() => {
    (window as any).__MECH_COPILOT_APP__ = appCtx;
  }, [appCtx]);

  // The workspace page gets a special full-height treatment with Copilot panel integrated
  const isWorkspacePage = activePage === 'workspace';

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
      case 'tolerances':
        return <TolerancesPage />;
      case 'gdt':
        return <GdtPage />;
      case 'fatigue':
        return <FatiguePage />;
      case 'bearings':
        return <BearingsPage />;
      case 'connections':
        return <ConnectionsPage />;
      case 'gears':
        return <GearsPage />;
      case 'vibration':
        return <VibrationPage />;
      case 'reports':
        return <ReportsPage />;
      case 'products':
        return <ProductsManagementPage />;
      case 'boms':
        return <BOMWorkstationPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F5F7FB] dark:bg-[#0A1120] font-sans text-[#0F172A] dark:text-[#F0F4FA]">
      {/* Left Sidebar — fixed 216px */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Top Bar — fixed 62px */}
        <TopBar />

        {/* Page area + Copilot */}
        <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">
          {/* Page Content */}
          <main className={`flex-1 min-w-0 min-h-0 ${isWorkspacePage ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'} bg-[#F5F7FB] dark:bg-[#0A1120]`}>
            {renderPage()}
          </main>

          {/* Right Copilot Panel — 370px on workspace, hidden/collapsible elsewhere */}
          <CopilotPanel />
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
