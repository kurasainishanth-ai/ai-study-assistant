import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function MainLayout({ 
  children, 
  activeTab, 
  setActiveTab, 
  materials, 
  activeDocId, 
  setActiveDocId, 
  globalError, 
  onClearError 
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const activeDoc = materials.find((m) => m.id === activeDocId) || null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050814] text-slate-100 font-sans selection:bg-violet-500/30">
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <div className={`fixed lg:static inset-y-0 left-0 z-40 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]`}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setIsSidebarOpen(false);
          }}
          materials={materials}
          activeDocId={activeDocId}
          setActiveDocId={setActiveDocId}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Header
          activeTab={activeTab}
          activeDoc={activeDoc}
          onUploadClick={() => setActiveTab('library')}
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        {/* Global Error Toast */}
        <AnimatePresence>
          {globalError && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 backdrop-blur-md"
            >
              <span className="font-medium">{globalError}</span>
              <button onClick={onClearError} className="text-rose-400 hover:text-white font-bold text-lg leading-none">×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto bg-[#050814] relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
