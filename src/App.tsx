import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './components/LandingPage';
import { Sidebar } from './components/Sidebar';
import { JournalChat } from './components/JournalChat';
import { ExportModal } from './components/ExportModal';
import { DeleteModal } from './components/DeleteModal';
import { FutureSelfModal } from './components/FutureSelfModal';
import { FutureSelfCard } from './components/FutureSelfCard';
import { JournalEntry, JournalMessage, FutureCapsule } from './types';
import {
  subscribeToUserJournals,
  subscribeToJournalMessages,
  createJournalEntry,
  deleteJournalEntry,
  exportAllUserData,
  subscribeToUserFutureCapsules,
  createFutureCapsule,
  updateFutureCapsule,
  deleteFutureCapsule,
} from './lib/firestoreUtils';
import { Loader2 } from 'lucide-react';
import { ZenBackground } from './components/ZenBackground';
import { sounds } from './lib/soundEffects';

const MainAppContent: React.FC = () => {
  const { user, loading, refreshIdToken } = useAuth();
  const [demoUserMode, setDemoUserMode] = useState(false);

  // Effective user ID: actual logged-in user or demo vault
  const effectiveUserId = user ? user.uid : (demoUserMode ? 'demo-user-vault' : null);

  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [activeJournalId, setActiveJournalId] = useState<string | null>(null);
  const [messages, setMessages] = useState<JournalMessage[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Future Self Capsules state
  const [futureCapsules, setFutureCapsules] = useState<FutureCapsule[]>([]);
  const [futureSelfModalOpen, setFutureSelfModalOpen] = useState(false);

  // Modals state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [isExportAll, setIsExportAll] = useState(false);
  const [allExportData, setAllExportData] = useState<Record<string, unknown> | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [journalToDelete, setJournalToDelete] = useState<JournalEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Subscribe to user's journals
  useEffect(() => {
    if (!effectiveUserId) {
      setJournals([]);
      setActiveJournalId(null);
      return;
    }

    const unsubscribe = subscribeToUserJournals(
      effectiveUserId,
      userJournals => {
        setJournals(userJournals);
        // If no journal is selected, or selected one was deleted, pick the first
        setActiveJournalId(prev => {
          if (prev && userJournals.some(j => j.id === prev)) {
            return prev;
          }
          return userJournals.length > 0 ? userJournals[0].id : null;
        });
      },
      err => {
        console.error('Error fetching journals:', err);
      }
    );

    return () => unsubscribe();
  }, [effectiveUserId]);

  // Subscribe to messages of active journal
  useEffect(() => {
    if (!effectiveUserId || !activeJournalId) {
      setMessages([]);
      return;
    }

    const unsubscribe = subscribeToJournalMessages(
      effectiveUserId,
      activeJournalId,
      activeMessages => {
        setMessages(activeMessages);
      },
      err => {
        console.error('Error fetching messages:', err);
      }
    );

    return () => unsubscribe();
  }, [effectiveUserId, activeJournalId]);

  // Subscribe to user's future capsules
  useEffect(() => {
    if (!effectiveUserId) {
      setFutureCapsules([]);
      return;
    }

    const unsubscribe = subscribeToUserFutureCapsules(
      effectiveUserId,
      caps => setFutureCapsules(caps),
      err => console.error('Error fetching future capsules:', err)
    );

    return () => unsubscribe();
  }, [effectiveUserId]);

  // Future Self Handlers
  const handleCreateFutureCapsule = async (capsule: Omit<FutureCapsule, 'id'>) => {
    if (!effectiveUserId) throw new Error('No user session');
    return await createFutureCapsule(effectiveUserId, capsule);
  };

  const handleUpdateFutureCapsule = async (id: string, updates: Partial<FutureCapsule>) => {
    if (!effectiveUserId) return;
    await updateFutureCapsule(effectiveUserId, id, updates);
  };

  const handleDeleteFutureCapsule = async (id: string) => {
    if (!effectiveUserId) return;
    // Optimistically update local capsule list immediately
    setFutureCapsules(prev => prev.filter(c => c.id !== id));
    try {
      await deleteFutureCapsule(effectiveUserId, id);
    } catch (err) {
      console.error('Error deleting future capsule in Firestore:', err);
    }
  };

  const nowTs = Date.now();
  const readyToOpenCount = futureCapsules.filter(
    c => c.status !== 'opened' && nowTs >= new Date(c.unlockDate).getTime()
  ).length;
  const sealedCount = futureCapsules.filter(
    c => c.status === 'sealed' && nowTs < new Date(c.unlockDate).getTime()
  ).length;

  // Handle creating a new journal
  const handleCreateJournal = async () => {
    if (!effectiveUserId) return;
    try {
      const newId = await createJournalEntry(effectiveUserId, {
        title: 'New Reflection',
        sentiment: 'Reflective',
        tags: ['Reflection'],
      });
      setActiveJournalId(newId);
    } catch (err) {
      console.error('Failed to create journal:', err);
    }
  };

  // Handle deleting a journal
  const handleConfirmDelete = async () => {
    if (!effectiveUserId || !journalToDelete) return;
    setIsDeleting(true);
    try {
      await deleteJournalEntry(effectiveUserId, journalToDelete.id);
      setDeleteModalOpen(false);
      setJournalToDelete(null);
    } catch (err) {
      console.error('Failed to delete journal:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Export All Data
  const handleExportAll = async () => {
    if (!effectiveUserId) return;
    try {
      const data = await exportAllUserData(effectiveUserId);
      setAllExportData(data);
      setIsExportAll(true);
      setExportModalOpen(true);
    } catch (err) {
      console.error('Failed to export all data:', err);
    }
  };

  // Handle Export Single Journal
  const handleExportSingle = () => {
    setIsExportAll(false);
    setExportModalOpen(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdfcf8] flex flex-col items-center justify-center text-[#7a7a65]">
        <div className="w-12 h-12 rounded-full bg-[#5a5a40] flex items-center justify-center text-white mb-4 shadow-md font-serif italic text-xl">
          R
        </div>
        <div className="flex items-center gap-2 text-sm font-serif italic text-[#4a4a35]">
          <Loader2 className="w-4 h-4 animate-spin text-[#5a5a40]" />
          <span>Opening your reflective sanctuary...</span>
        </div>
      </div>
    );
  }

  // Not authenticated & not in demo mode -> Landing Page
  if (!user && !demoUserMode) {
    return <LandingPage onExploreDemo={() => setDemoUserMode(true)} />;
  }

  const activeJournal = journals.find(j => j.id === activeJournalId) || null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#fdfcf8] text-[#333322] font-sans antialiased relative">
      {/* Background Floating Elements & Ambient Zen Atmosphere */}
      <ZenBackground variant="full" />

      {/* Sidebar Panel */}
      <Sidebar
        journals={journals}
        activeJournalId={activeJournalId}
        onSelectJournal={id => setActiveJournalId(id)}
        onCreateJournal={handleCreateJournal}
        onDeleteJournal={j => {
          setJournalToDelete(j);
          setDeleteModalOpen(true);
        }}
        onExportAll={handleExportAll}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        onOpenFutureSelf={() => setFutureSelfModalOpen(true)}
        futureCapsulesCount={futureCapsules.length}
        readyToOpenCount={readyToOpenCount}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-transparent z-10">
        {activeJournal ? (
          <JournalChat
            key={activeJournal.id}
            journal={activeJournal}
            messages={messages}
            onOpenSidebar={() => setIsSidebarCollapsed(false)}
            onOpenExport={handleExportSingle}
            onDeleteCurrent={() => {
              setJournalToDelete(activeJournal);
              setDeleteModalOpen(true);
            }}
            onOpenFutureSelf={() => setFutureSelfModalOpen(true)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 text-center bg-[#fdfcf8]/85 backdrop-blur-[2px] overflow-y-auto">
            <div className="max-w-xl w-full space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#687250] to-[#b3c79e] text-white flex items-center justify-center mx-auto text-3xl shadow-sm">
                🧶
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-serif text-[#3a3a2a] tracking-tight">
                  Welcome to Loom
                </h2>
                <p className="text-sm text-[#7a7a65] max-w-md mx-auto leading-relaxed font-serif italic">
                  A sanctuary for your thoughts today and letters to who you will become tomorrow.
                </p>
              </div>

              {/* Prominent Future Self Entry Point Card */}
              <div className="text-left pt-2">
                <FutureSelfCard
                  onOpen={() => setFutureSelfModalOpen(true)}
                  sealedCount={sealedCount}
                  readyToOpenCount={readyToOpenCount}
                  variant="banner"
                />
              </div>

              <div className="pt-2 flex items-center justify-center gap-4">
                <button
                  id="empty-state-new-journal-btn"
                  type="button"
                  onClick={() => {
                    sounds.bubblePop();
                    handleCreateJournal();
                  }}
                  className="px-6 py-3.5 rounded-2xl bg-[#5a5a40] hover:bg-[#4a4a35] text-white text-sm font-medium shadow-md shadow-[#5a5a40]/15 transition-transform active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <span>Begin Reflection</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Future Self Time Capsule Modal */}
      <FutureSelfModal
        isOpen={futureSelfModalOpen}
        onClose={() => setFutureSelfModalOpen(false)}
        userId={effectiveUserId || 'demo-user-vault'}
        capsules={futureCapsules}
        onCreateCapsule={handleCreateFutureCapsule}
        onUpdateCapsule={handleUpdateFutureCapsule}
        onDeleteCapsule={handleDeleteFutureCapsule}
        getAuthToken={refreshIdToken}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => {
          setExportModalOpen(false);
          setAllExportData(null);
        }}
        journal={activeJournal}
        messages={messages}
        allUserData={allExportData}
        isExportAll={isExportAll}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setJournalToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title={journalToDelete?.title || 'this reflection'}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
