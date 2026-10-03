import React, { useState } from 'react';
import { MainLayout } from './layouts/MainLayout';
import { useMaterials } from './hooks/useApi';

// Pages
import DashboardView from './pages/DashboardView';
import LibraryView from './pages/LibraryView';
import AITutorView from './pages/AITutorView';
import SmartNotesView from './pages/SmartNotesView';
import FlashcardsView from './pages/FlashcardsView';
import QuizArenaView from './pages/QuizArenaView';
import VisualLearningView from './pages/VisualLearningView';
import KnowledgeMapView from './pages/KnowledgeMapView';
import ProgressView from './pages/ProgressView';
import SettingsView from './pages/SettingsView';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeDocId, setActiveDocId] = useState(null);
  
  const { materials, error: materialsError, refresh: refreshMaterials } = useMaterials();
  const [globalError, setGlobalError] = useState(null);

  // Set initial doc id if none selected
  React.useEffect(() => {
    if (materials.length > 0 && !activeDocId) {
      setActiveDocId(materials[0].id);
    }
  }, [materials, activeDocId]);

  // Combine errors
  const displayError = globalError || materialsError;

  const activeDoc = materials.find((m) => m.id === activeDocId) || null;

  return (
    <MainLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      materials={materials}
      activeDocId={activeDocId}
      setActiveDocId={setActiveDocId}
      globalError={displayError}
      onClearError={() => setGlobalError(null)}
    >
      {activeTab === 'dashboard' && <DashboardView materials={materials} activeDocId={activeDocId} setActiveDocId={setActiveDocId} onNavigateTab={setActiveTab} />}
      {activeTab === 'library' && <LibraryView materials={materials} activeDocId={activeDocId} setActiveDocId={setActiveDocId} onRefreshMaterials={refreshMaterials} onNavigateTab={setActiveTab} />}
      {activeTab === 'tutor' && <AITutorView activeDoc={activeDoc} onNavigateTab={setActiveTab} />}
      {activeTab === 'notes' && <SmartNotesView activeDoc={activeDoc} onNavigateTab={setActiveTab} />}
      {activeTab === 'flashcards' && <FlashcardsView activeDoc={activeDoc} onNavigateTab={setActiveTab} />}
      {activeTab === 'quiz' && <QuizArenaView activeDoc={activeDoc} onNavigateTab={setActiveTab} />}
      {activeTab === 'visuals' && <VisualLearningView activeDoc={activeDoc} onNavigateTab={setActiveTab} />}
      {activeTab === 'map' && <KnowledgeMapView activeDoc={activeDoc} onNavigateTab={setActiveTab} />}
      {activeTab === 'progress' && <ProgressView onNavigateTab={setActiveTab} />}
      {activeTab === 'settings' && <SettingsView />}
    </MainLayout>
  );
}
