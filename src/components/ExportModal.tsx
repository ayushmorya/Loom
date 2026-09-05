import React, { useState } from 'react';
import { X, Copy, Download, Check, FileText, Code } from 'lucide-react';
import { JournalEntry, JournalMessage } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  journal: JournalEntry | null;
  messages: JournalMessage[];
  allUserData?: Record<string, unknown> | null;
  isExportAll?: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  journal,
  messages,
  allUserData,
  isExportAll = false,
}) => {
  const [format, setFormat] = useState<'markdown' | 'json'>('markdown');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Generate Markdown representation
  const generateMarkdown = (): string => {
    if (isExportAll && allUserData) {
      let md = `# Reflective Journal Archive\nExport Date: ${allUserData.exportDate}\nTotal Reflections: ${allUserData.totalJournals}\n\n---\n\n`;
      const journals = (allUserData.journals as Array<Record<string, unknown>>) || [];
      for (const j of journals) {
        md += `## ${j.title || 'Untitled'}\n`;
        md += `* **Date**: ${j.createdAt || ''}\n`;
        md += `* **Sentiment**: ${j.sentiment || 'Reflective'}\n`;
        md += `* **Tags**: ${Array.isArray(j.tags) ? j.tags.join(', ') : 'None'}\n`;
        if (j.summary) md += `* **Synthesis**: ${j.summary}\n`;
        md += `\n### Reflection Dialogue\n\n`;
        const msgs = (j.messages as Array<Record<string, string>>) || [];
        for (const m of msgs) {
          const speaker = m.role === 'model' ? 'Reflective Partner' : 'You';
          md += `**${speaker}** *(${m.timestamp || ''})*:\n\n${m.content}\n\n---\n\n`;
        }
        md += `\n\n`;
      }
      return md;
    }

    if (!journal) return '';

    let md = `# ${journal.title}\n\n`;
    md += `* **Created**: ${new Date(journal.createdAt).toLocaleString()}\n`;
    md += `* **Dominant Sentiment**: ${journal.sentiment || 'Reflective'}\n`;
    md += `* **Tags**: ${journal.tags.join(', ')}\n`;
    if (journal.summary) {
      md += `* **Synthesis**: ${journal.summary}\n`;
    }
    md += `\n---\n\n## Dialogue & Reflections\n\n`;

    for (const msg of messages) {
      const speaker = msg.role === 'model' ? 'Reflective Partner' : 'You';
      const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      md += `### ${speaker} (${time})\n\n${msg.content}\n\n---\n\n`;
    }

    return md;
  };

  // Generate JSON representation
  const generateJSON = (): string => {
    if (isExportAll && allUserData) {
      return JSON.stringify(allUserData, null, 2);
    }
    return JSON.stringify(
      {
        journal,
        messages,
        exportDate: new Date().toISOString(),
      },
      null,
      2
    );
  };

  const exportText = format === 'markdown' ? generateMarkdown() : generateJSON();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleDownload = () => {
    const filename = isExportAll
      ? `reflective-archive-${new Date().toISOString().slice(0, 10)}.${format === 'markdown' ? 'md' : 'json'}`
      : `${(journal?.title || 'reflection-entry').toLowerCase().replace(/[^a-z0-9]/g, '-')}.${format === 'markdown' ? 'md' : 'json'}`;

    const mimeType = format === 'markdown' ? 'text/markdown;charset=utf-8' : 'application/json;charset=utf-8';
    const blob = new Blob([exportText], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="export-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#333322]/40 backdrop-blur-sm p-4"
    >
      <div
        id="export-modal-container"
        className="bg-[#fdfcf8] rounded-2xl max-w-2xl w-full border border-[#e5e1d8] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-[#333322]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#e5e1d8]">
          <div>
            <h3 className="font-serif text-xl font-semibold text-[#3a3a2a]">
              {isExportAll ? 'Export Reflection Archive' : 'Export Reflection Entry'}
            </h3>
            <p className="text-xs text-[#7a7a65] mt-0.5 font-serif italic">
              Choose your preferred format for local preservation or backup
            </p>
          </div>
          <button
            id="export-modal-close-btn"
            onClick={onClose}
            className="text-[#9a9a85] hover:text-[#333322] p-2 rounded-xl hover:bg-[#f5f2ed] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4">
          <button
            id="export-format-md-btn"
            onClick={() => setFormat('markdown')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              format === 'markdown'
                ? 'bg-[#5a5a40] text-white shadow-xs'
                : 'bg-[#e8e4d9]/70 text-[#5a5a40] hover:bg-[#e8e4d9]'
            }`}
          >
            <FileText className="w-4 h-4" />
            Markdown (.md)
          </button>
          <button
            id="export-format-json-btn"
            onClick={() => setFormat('json')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              format === 'json'
                ? 'bg-[#5a5a40] text-white shadow-xs'
                : 'bg-[#e8e4d9]/70 text-[#5a5a40] hover:bg-[#e8e4d9]'
            }`}
          >
            <Code className="w-4 h-4" />
            JSON (.json)
          </button>
        </div>

        {/* Code Preview Area */}
        <div className="p-6 flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 bg-[#f5f2ed] rounded-2xl border border-[#e5e1d8] p-4 font-mono text-xs text-[#4a4a35] overflow-y-auto whitespace-pre-wrap select-all max-h-96 leading-relaxed shadow-inner">
            {exportText}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#f5f2ed] border-t border-[#e5e1d8]">
          <button
            id="export-copy-btn"
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#5a5a40] bg-white border border-[#e5e1d8] rounded-xl hover:bg-[#fdfcf8] transition-colors shadow-2xs"
          >
            {copied ? <Check className="w-4 h-4 text-[#729c6f]" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
          <button
            id="export-download-btn"
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#5a5a40] hover:bg-[#4a4a35] rounded-xl transition-all shadow-md shadow-[#5a5a40]/15"
          >
            <Download className="w-4 h-4" />
            Download File
          </button>
        </div>
      </div>
    </div>
  );
};
