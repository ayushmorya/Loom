import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Trash2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Database,
} from 'lucide-react';
import { JournalEntry } from '../types';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  journals: JournalEntry[];
  activeJournalId: string | null;
  onSelectJournal: (id: string) => void;
  onCreateJournal: () => void;
  onDeleteJournal: (journal: JournalEntry) => void;
  onExportAll: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const NATURAL_SENTIMENT_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  Reflective: { bg: 'bg-[#e8e4d9]', text: 'text-[#5a5a40]', dot: 'bg-[#8ba888]' },
  Optimistic: { bg: 'bg-[#e3eae2]', text: 'text-[#4a6347]', dot: 'bg-[#729c6f]' },
  Grounded: { bg: 'bg-[#e8e4d9]', text: 'text-[#5a5a40]', dot: 'bg-[#8ba888]' },
  Stressed: { bg: 'bg-[#f4e6e4]', text: 'text-[#8c524e]', dot: 'bg-[#bf6b63]' },
  Curious: { bg: 'bg-[#ebe6ef]', text: 'text-[#5c4a6e]', dot: 'bg-[#8c74a3]' },
  Melancholy: { bg: 'bg-[#edeae4]', text: 'text-[#6b675e]', dot: 'bg-[#9c978b]' },
  Vulnerable: { bg: 'bg-[#f3ede1]', text: 'text-[#85653b]', dot: 'bg-[#b88c52]' },
  Determined: { bg: 'bg-[#e5ecf0]', text: 'text-[#425a6b]', dot: 'bg-[#6b8c9e]' },
  Uncertain: { bg: 'bg-[#f5ecdf]', text: 'text-[#825c34]', dot: 'bg-[#b88147]' },
};

const FILTER_SENTIMENTS: string[] = [
  'All',
  'Reflective',
  'Optimistic',
  'Stressed',
  'Grounded',
  'Curious',
  'Vulnerable',
];

export const Sidebar: React.FC<SidebarProps> = ({
  journals,
  activeJournalId,
  onSelectJournal,
  onCreateJournal,
  onDeleteJournal,
  onExportAll,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { user, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSentiment, setSelectedSentiment] = useState('All');

  // Filter journals by search term & sentiment
  const filteredJournals = useMemo(() => {
    return journals.filter(j => {
      const matchesSearch =
        j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (j.summary && j.summary.toLowerCase().includes(searchTerm.toLowerCase())) ||
        j.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesSentiment =
        selectedSentiment === 'All' ||
        j.sentiment?.toLowerCase() === selectedSentiment.toLowerCase();

      return matchesSearch && matchesSentiment;
    });
  }, [journals, searchTerm, selectedSentiment]);

  // Format natural date label
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  if (isCollapsed) {
    return (
      <aside className="w-16 border-r border-[#e5e1d8] bg-[#f5f2ed] flex flex-col items-center py-5 justify-between h-full select-none transition-all duration-200">
        <div className="flex flex-col items-center gap-4">
          <button
            id="sidebar-expand-btn"
            onClick={onToggleCollapse}
            title="Expand Sidebar"
            className="p-2 text-[#7a7a65] hover:text-[#333322] rounded-xl hover:bg-white/60 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            id="sidebar-new-journal-collapsed-btn"
            onClick={onCreateJournal}
            title="New Journal Reflection"
            className="w-10 h-10 bg-[#5a5a40] hover:bg-[#4a4a35] text-white rounded-2xl flex items-center justify-center shadow-md shadow-[#5a5a40]/15 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            id="sidebar-export-collapsed-btn"
            onClick={onExportAll}
            title="Export All Data"
            className="p-2.5 text-[#5a5a40] hover:bg-white/60 rounded-xl transition-colors"
          >
            <Database className="w-5 h-5" />
          </button>

          <button
            id="sidebar-logout-collapsed-btn"
            onClick={logout}
            title="Sign Out"
            className="p-2.5 text-[#9a9a85] hover:text-[#8c524e] rounded-xl hover:bg-[#f4e6e4]/60 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      id="sidebar-panel"
      className="w-76 sm:w-80 border-r border-[#e5e1d8] bg-[#f5f2ed] flex flex-col h-full select-none transition-all duration-200 shrink-0 text-[#333322]"
    >
      {/* Top Header Brand */}
      <div className="p-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#5a5a40] flex items-center justify-center text-white font-serif italic text-lg shadow-xs">
            R
          </div>
          <div>
            <span className="font-serif text-2xl font-semibold tracking-tight text-[#4a4a35]">
              ReflectAI
            </span>
          </div>
        </div>

        <button
          id="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title="Collapse Sidebar"
          className="p-1.5 text-[#9a9a85] hover:text-[#4a4a35] rounded-xl hover:bg-white/60 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* New Journal Button */}
      <div className="px-6 pb-4">
        <button
          id="sidebar-new-journal-btn"
          onClick={onCreateJournal}
          type="button"
          className="w-full py-3.5 px-5 bg-[#5a5a40] hover:bg-[#4a4a35] active:scale-[0.99] text-white rounded-2xl font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#5a5a40]/10 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Reflection</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="px-6 pb-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#9a9a85]" />
          <input
            id="sidebar-search-input"
            type="text"
            placeholder="Search reflections, tags..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white/70 border border-[#e5e1d8] rounded-xl text-[#333322] placeholder:text-[#9a9a85] focus:outline-none focus:ring-2 focus:ring-[#5a5a40]/15 transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* Sentiment Filter Pills */}
      <div className="px-6 pb-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {FILTER_SENTIMENTS.map(sent => (
          <button
            key={sent}
            id={`filter-sentiment-${sent.toLowerCase()}`}
            onClick={() => setSelectedSentiment(sent)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
              selectedSentiment === sent
                ? 'bg-[#5a5a40] text-white shadow-xs'
                : 'bg-[#e8e4d9]/70 text-[#5a5a40] hover:bg-[#e8e4d9]'
            }`}
          >
            {sent}
          </button>
        ))}
      </div>

      {/* Section Title */}
      <div className="px-6 pt-2 pb-1">
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#9a9a85] font-bold">
          Past Reflections
        </h3>
      </div>

      {/* Journal List */}
      <div className="flex-1 overflow-y-auto px-4 space-y-1.5 pt-1">
        {filteredJournals.length === 0 ? (
          <div className="text-center py-10 px-4 text-[#9a9a85] text-xs font-serif italic">
            {journals.length === 0 ? (
              <p>No reflections yet. Click "+ New Reflection" above to begin your quiet thoughts.</p>
            ) : (
              <p>No reflections match your search or filter.</p>
            )}
          </div>
        ) : (
          filteredJournals.map(journal => {
            const isActive = journal.id === activeJournalId;
            const sentiment = journal.sentiment || 'Reflective';
            const sentStyle =
              NATURAL_SENTIMENT_STYLES[sentiment] || NATURAL_SENTIMENT_STYLES.Reflective;

            return (
              <div
                key={journal.id}
                id={`journal-item-${journal.id}`}
                onClick={() => onSelectJournal(journal.id)}
                className={`group relative flex flex-col p-3.5 rounded-2xl cursor-pointer transition-all border ${
                  isActive
                    ? 'bg-white/80 border-[#e5e1d8] shadow-xs'
                    : 'bg-transparent hover:bg-white/40 border-transparent hover:border-[#e5e1d8]/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs text-[#9a9a85] mb-1 italic font-serif">
                    {formatDate(journal.updatedAt || journal.createdAt)}
                  </div>
                  {/* Delete Button (visible on hover) */}
                  <button
                    id={`delete-journal-${journal.id}`}
                    type="button"
                    title="Delete entry"
                    onClick={e => {
                      e.stopPropagation();
                      onDeleteJournal(journal);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[#9a9a85] hover:text-[#8c524e] rounded-lg transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h4
                  className={`text-sm font-semibold truncate ${
                    isActive ? 'text-[#333322]' : 'text-[#5a5a45]'
                  }`}
                >
                  {journal.title || 'Untitled Reflection'}
                </h4>

                {journal.summary ? (
                  <p className="text-[11px] text-[#7a7a65] line-clamp-2 mt-1 leading-relaxed">
                    {journal.summary}
                  </p>
                ) : null}

                {/* Sentiment & Tags Row */}
                <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${sentStyle.bg} ${sentStyle.text}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${sentStyle.dot}`} />
                    {sentiment}
                  </span>

                  {journal.tags &&
                    journal.tags.slice(0, 2).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-[#e8e4d9] rounded-full text-[10px] text-[#5a5a40]"
                      >
                        {tag}
                      </span>
                    ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom User & Export Bar */}
      <div className="p-4 border-t border-[#e5e1d8] bg-[#f5f2ed] space-y-3">
        <button
          id="sidebar-export-all-btn"
          type="button"
          onClick={onExportAll}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium text-[#5a5a40] bg-white/50 hover:bg-white border border-[#e5e1d8] transition-all"
        >
          <Database className="w-3.5 h-3.5 text-[#5a5a40]" />
          <span>Export All Data (Archive)</span>
        </button>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 overflow-hidden">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="User"
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full border border-[#e5e1d8] object-cover shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#d8d3c5] text-[#5a5a40] flex items-center justify-center text-xs font-serif font-bold italic shrink-0">
                {user?.displayName ? user.displayName.slice(0, 1).toUpperCase() : 'J'}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-[#333322] truncate">
                {user?.displayName || 'Julian Rivera'}
              </p>
              <p className="text-xs text-[#9a9a85] truncate">
                {user?.email || 'Reflective Account'}
              </p>
            </div>
          </div>

          <button
            id="sidebar-signout-btn"
            type="button"
            onClick={logout}
            title="Sign out"
            className="p-2 text-[#9a9a85] hover:text-[#8c524e] rounded-xl hover:bg-[#f4e6e4]/60 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
