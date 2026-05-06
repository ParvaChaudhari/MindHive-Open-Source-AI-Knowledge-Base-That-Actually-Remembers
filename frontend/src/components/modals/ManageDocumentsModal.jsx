import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listDocuments, getCollection, addDocumentToCollection, removeDocumentFromCollection } from '../../api';

export default function ManageDocumentsModal({ collection, onClose, onUpdated }) {
  const queryClient = useQueryClient();
  const { data: allRes, isLoading: loadingDocs } = useQuery({ queryKey: ['documents'], queryFn: listDocuments });
  const { data: colRes, isLoading: loadingCol } = useQuery({ queryKey: ['collection', collection.id], queryFn: () => getCollection(collection.id) });
  
  const allDocs = (allRes?.documents || []).filter(d => d.status === 'ready');
  const collectionDocs = (colRes?.documents || []).map(d => d.id);
  const loading = loadingDocs || loadingCol;
  const [actionLoading, setActionLoading] = useState('');

  const load = () => {
    return queryClient.invalidateQueries({ queryKey: ['collection', collection.id] });
  };

  const toggle = async (docId, inCollection) => {
    setActionLoading(docId);
    try {
      if (inCollection) {
        await removeDocumentFromCollection(collection.id, docId);
      } else {
        await addDocumentToCollection(collection.id, docId);
      }
      await load();
      await onUpdated();
    } catch (e) {
      console.error(e);
    }
    setActionLoading('');
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-headline-md text-headline-md">Manage Documents</h3>
            <p className="text-outline text-sm mt-1">{collection.name}</p>
          </div>
          <button onClick={onClose} className="text-outline hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <span className="material-symbols-outlined text-outline animate-spin-reverse">sync</span>
          </div>
        ) : allDocs.length === 0 ? (
          <div className="text-center py-10 text-on-surface-variant font-body-md">
            No ready documents found. Upload and process documents first.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {allDocs.map((doc) => {
              const isInCollection = collectionDocs.includes(doc.id);
              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg border border-transparent hover:border-outline-variant transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-error text-base">picture_as_pdf</span>
                    <span className="text-sm font-label-md truncate max-w-[280px]">{doc.name}</span>
                  </div>
                  <button
                    onClick={() => toggle(doc.id, isInCollection)}
                    disabled={actionLoading === doc.id}
                    className={`text-sm font-bold px-3 py-1 rounded-lg transition-colors ${
                      isInCollection
                        ? 'bg-secondary/10 text-secondary hover:bg-error/10 hover:text-error'
                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}
                  >
                    {actionLoading === doc.id ? '...' : isInCollection ? 'Remove' : 'Add'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 bg-surface border border-outline-variant text-on-surface rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
