import React from 'react';

export default function DeleteConfirmationModal({ deletingId, onDelete, onCancel }) {
  if (!deletingId) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-6">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-md shadow-2xl p-8">
        <h3 className="font-headline-md text-headline-md mb-2">Confirm Removal</h3>
        <p className="text-on-surface-variant font-body-md mb-8">
          This will permanently remove the document and all its associated vector embeddings from your MindHive. This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button 
            onClick={onCancel}
            className="px-6 py-2 rounded-lg font-label-md text-on-surface hover:bg-surface-container transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => onDelete(deletingId)}
            className="px-6 py-2 bg-error text-white rounded-lg font-label-md hover:opacity-90 transition-opacity"
          >
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
}
