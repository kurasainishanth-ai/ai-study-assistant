import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import LibraryView from './components/LibraryView';
import SmartNotesView from './components/SmartNotesView';
import FlashcardsView from './components/FlashcardsView';
import AITutorView from './components/AITutorView';
import VisualLearningView from './components/VisualLearningView';
import QuizArenaView from './components/QuizArenaView';
import KnowledgeMapView from './components/KnowledgeMapView';
import ProgressView from './components/ProgressView';
import SettingsView from './components/SettingsView';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [materials, setMaterials] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);
  const [healthInfo, setHealthInfo] = useState(null);
  const [globalError, setGlobalError] = useState(null);
  const [streakDays, setStreakDays] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const health = await api.getHealth();
      setHealthInfo(health);
      await refreshMaterials();
      const prog = await api.getProgressAnalytics();
      if (prog && prog.streak_days) {
        setStreakDays(prog.streak_days);
      }
    } catch (err) {
      console.warn('Initial data load warning:', err.message);
      setGlobalError(err.message);
    }
  };

  const refreshMaterials = async () => {
    try {
      const list = await api.getMaterials();
      setMaterials(list || []);
      if (list && list.length > 0) {
        if (!activeDocId || !list.some((m) => m.id === activeDocId)) {
          setActiveDocId(list[0].id);
        }
      } else {
        setActiveDocId(null);
      }
    } catch (err) {
      console.error('Failed to load materials:', err);
      setGlobalError(err.message);
    }
  };

  const activeDoc = materials.find((m) => m.id === activeDocId) || null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0f] text-slate-100 font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <div className={`fixed lg:static inset-y-0 left-0 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setIsSidebarOpen(false); // Close on mobile after nav
          }}
          materials={materials}
          activeDocId={activeDocId}
          setActiveDocId={setActiveDocId}
          isHealthy={healthInfo?.status === 'healthy'}
          defaultModel={healthInfo?.configured_model || healthInfo?.default_model || 'gemini-2.5-flash-lite'}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Header
          activeTab={activeTab}
          activeDoc={activeDoc}
          streakDays={streakDays}
          onUploadClick={() => setActiveTab('library')}
          errorMessage={globalError}
          onClearError={() => setGlobalError(null)}
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto bg-[#0a0a0f]">
          {activeTab === 'dashboard' && (
            <DashboardView
              materials={materials}
              activeDocId={activeDocId}
              setActiveDocId={setActiveDocId}
              onNavigateTab={setActiveTab}
              onUploadClick={() => setActiveTab('library')}
            />
          )}

          {activeTab === 'library' && (
            <LibraryView
              materials={materials}
              activeDocId={activeDocId}
              setActiveDocId={setActiveDocId}
              onRefreshMaterials={refreshMaterials}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'tutor' && (
            <AITutorView
              activeDoc={activeDoc}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'notes' && (
            <SmartNotesView
              activeDoc={activeDoc}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'flashcards' && (
            <FlashcardsView
              activeDoc={activeDoc}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'visuals' && (
            <VisualLearningView
              activeDoc={activeDoc}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'quiz' && (
            <QuizArenaView
              activeDoc={activeDoc}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'map' && (
            <KnowledgeMapView
              activeDoc={activeDoc}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'progress' && (
            <ProgressView
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>
    </div>
  );
}
