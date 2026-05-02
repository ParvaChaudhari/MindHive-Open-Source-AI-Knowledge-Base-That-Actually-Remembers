import React, { useState } from 'react';
import { createCollection } from '../../api';

export default function CreateCollectionModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) { setError('Name is required.'); return; }
    setLoading(true);
    try {
      await createCollection(name.trim(), description.trim());
      onCreated();
    } catch (e) {
      setError('Failed to create collection. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-headline-md text-headline-md">New Collection</h3>
          <button onClick={onClose} className="text-outline hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-outline mb-2">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Research Papers, Q4 Reports"
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3 text-on-background focus:ring-1 focus:ring-primary focus:outline-none transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-outline mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of what this collection contains"
              rows={3}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-3 text-on-background focus:ring-1 focus:ring-primary focus:outline-none transition-all resize-none"
            />
          </div>
          {error && <p className="text-error text-sm">{error}</p>}
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={handleCreate}
            disabled={loading}
            className="flex-1 bg-primary text-surface py-3 rounded-lg font-label-md text-label-md hover:bg-stone-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Collection'}
          </button>
          <button
            onClick={onClose}
            className="px-6 bg-surface border border-outline-variant text-on-surface py-3 rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
