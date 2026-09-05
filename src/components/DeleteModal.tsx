import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  isDeleting?: boolean;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="delete-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#333322]/40 backdrop-blur-sm p-4"
    >
      <div
        id="delete-modal-container"
        className="bg-[#fdfcf8] rounded-2xl max-w-md w-full border border-[#e5e1d8] shadow-2xl p-6 text-[#333322]"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#f4e6e4] text-[#8c524e] rounded-2xl shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-serif text-lg font-semibold text-[#3a3a2a]">
              Delete Reflection?
            </h3>
            <p className="text-sm text-[#6a6a55] mt-1 font-serif leading-relaxed">
              Are you sure you want to remove <span className="font-semibold text-[#3a3a2a]">"{title}"</span>? This will permanently delete this conversation and its reflections from your private vault.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-2 border-t border-[#e5e1d8]">
          <button
            id="delete-modal-cancel-btn"
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-[#7a7a65] hover:bg-[#e8e4d9]/60 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            id="delete-modal-confirm-btn"
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-[#8c524e] hover:bg-[#73403d] disabled:opacity-50 rounded-xl transition-colors shadow-sm"
          >
            {isDeleting ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
};
