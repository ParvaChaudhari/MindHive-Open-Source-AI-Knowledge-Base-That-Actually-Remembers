import React from 'react';

export default function RenameModal({ renamingTarget, renameValue, setRenameValue, onRename, onClose, renaming }) {
  if (!renamingTarget) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[70] p-6">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-md shadow-2xl p-8">
        <h3 className="font-headline-md text-headline-md mb-2">Rename document</h3>
        <p className="text-on-surface-variant font-body-md mb-6">
          Choose a new name for <span className="font-semibold text-on-surface">{renamingTarget.name}</span>.
        </p>
        <input
          className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          placeholder="New document name"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') onRename();
            if (e.key === 'Escape') {
              onClose();
            }
          }}
        />
        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg font-label-md text-on-surface hover:bg-surface-container transition-colors"
            disabled={renaming}
          >
            Cancel
          </button>
          <button
            onClick={onRename}
            className="px-6 py-2 bg-primary text-surface rounded-lg font-label-md hover:bg-stone-800 transition-colors disabled:opacity-60"
            disabled={renaming}
          >
            {renaming ? 'Renaming…' : 'Rename'}
          </button>
        </div>
      </div>
    </div>
  );
}
