import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ProfileDropdown from '../components/ProfileDropdown';
import CreateCollectionModal from '../components/modals/CreateCollectionModal';
import ManageDocumentsModal from '../components/modals/ManageDocumentsModal';
import CollectionChatPanel from '../components/chat/CollectionChatPanel';
import { CollectionSkeleton } from '../components/common/Skeleton';
import {
  listCollections,
  deleteCollection,
  getCollection,
} from '../api';

export default function CollectionsPage({ onMenuClick }) {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [manageTarget, setManageTarget] = useState(null);
  const [chatTarget, setChatTarget] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['collections'],
    queryFn: listCollections
  });

  const collections = data?.collections || [];
  if (queryError && !error) setError('Failed to load collections.');

  const load = () => {
    return queryClient.invalidateQueries({ queryKey: ['collections'] });
  };

  // Filter & Pagination logic
  const filteredCollections = collections.filter(col =>
    col.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (col.description && col.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredCollections.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCollections = filteredCollections.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleDelete = async (id) => {
    try {
      await deleteCollection(id);
      setDeleteConfirm(null);
      load();
    } catch (e) {
      setError('Failed to delete collection.');
    }
  };

  const openChat = async (collection) => {
    try {
      const data = await getCollection(collection.id);
      setChatTarget({ collection, documents: data.documents });
    } catch (e) {
      setError('Failed to load collection documents.');
    }
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="flex justify-between items-center h-16 px-4 lg:px-8 w-full sticky top-0 z-40 bg-stone-50/80 dark:bg-stone-950/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick} className="lg:hidden text-stone-500 hover:text-stone-900 transition-colors">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h2 className="text-lg lg:text-xl font-semibold text-stone-900 dark:text-stone-50 font-headline">Collections</h2>
        </div>

        <div className="hidden lg:flex justify-center flex-1 mx-8">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
            <input 
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-1.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all" 
              placeholder="Search collections..." 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-stone-900 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
        </div>

        <ProfileDropdown />
      </header>

      <div className="max-w-[800px] mx-auto px-4 lg:px-8 pt-4 lg:pt-6 pb-8 lg:pb-stack-lg">
        {/* Mobile Search - Visible only on small screens */}
        <div className="lg:hidden mb-6">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
            <input 
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all" 
              placeholder="Search collections..." 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        {/* Intro */}
        <section className="mb-10 lg:mb-12">
          <h1 className="font-headline-xl text-headline-xl text-on-background mb-4">Document Collections</h1>
          <p className="text-on-surface-variant font-body-lg max-w-[600px]">
            Group related documents into collections and query across all of them simultaneously. Perfect for comparing research papers, analysing report suites, or exploring a topic from multiple sources.
          </p>
        </section>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-error/10 border border-error/30 rounded-lg text-error text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <CollectionSkeleton key={i} />
            ))}
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-outline-variant rounded-2xl bg-surface-container-low">
            <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-primary text-3xl">library_books</span>
            </div>
            <h4 className="font-headline-md text-headline-md mb-2">No collections yet</h4>
            <p className="text-on-surface-variant font-body-md mb-8 max-w-sm mx-auto">
              Create your first collection to start querying across multiple documents at once.
            </p>
            <div className="flex justify-center gap-2">
              <button
                onClick={load}
                className="flex items-center justify-center p-2 border border-outline-variant bg-surface text-on-surface rounded-lg hover:border-primary transition-all"
                title="Reload collections"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary text-surface px-8 py-3 rounded-lg font-label-md text-label-md hover:bg-stone-800 transition-colors"
              >
                Create First Collection
              </button>
            </div>
          </div>
        ) : filteredCollections.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-5xl text-outline mb-4">search_off</span>
            <h4 className="font-headline-md text-headline-md mb-2">No collections found</h4>
            <p className="text-on-surface-variant font-body-md">No collections match "{searchQuery}". Try a different search term.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* List header row — always visible when collections exist */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-widest font-bold text-outline">
                {filteredCollections.length} Collection{filteredCollections.length !== 1 ? 's' : ''}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={load}
                  className="flex items-center justify-center p-2 border border-outline-variant text-on-surface dark:text-stone-50 rounded-lg hover:bg-surface-container-low hover:border-primary transition-all"
                  title="Reload collections"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 border border-outline-variant text-on-surface dark:text-stone-50 rounded-lg text-xs font-bold hover:bg-surface-container-low hover:border-primary transition-all"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  New Collection
                </button>
              </div>
            </div>
            {paginatedCollections.map((col) => (
              <div
                key={col.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden hover:border-stone-300 dark:hover:border-stone-700 transition-all group"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-secondary">library_books</span>
                      </div>
                      <div>
                        <h3 className="font-headline-md text-headline-md mb-1 text-on-surface">{col.name}</h3>
                        {col.description && (
                          <p className="text-on-surface-variant text-sm mb-2">{col.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-[11px] text-outline">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">description</span>
                            {col.document_count} document{col.document_count !== 1 ? 's' : ''}
                          </span>
                          <span>·</span>
                          <span>Created {new Date(col.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openChat(col)}
                        disabled={col.document_count === 0}
                        title={col.document_count === 0 ? 'Add documents first' : 'Query this collection'}
                        className="flex items-center gap-1.5 px-3 py-2 bg-primary text-surface rounded-lg text-xs font-bold hover:bg-stone-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-sm">forum</span>
                        Query
                      </button>
                      <button
                        onClick={() => setManageTarget(col)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-outline-variant text-on-surface dark:text-stone-50 rounded-lg text-xs font-bold hover:bg-surface-container-low transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">manage_search</span>
                        Manage
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(col.id)}
                        className="p-2 text-outline hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                        title="Delete collection"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Delete confirmation inline */}
                {deleteConfirm === col.id && (
                  <div className="border-t border-error/20 bg-error/5 px-6 py-4 flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
                    <p className="text-sm text-error font-bold">Delete "{col.name}"? Documents will be unlinked but not deleted.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(col.id)}
                        className="px-4 py-1.5 bg-error text-white rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-4 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs font-bold hover:bg-surface-container-low transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-6">
                <p className="text-sm text-outline font-body-md">
                  Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredCollections.length)} of {filteredCollections.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        currentPage === i + 1
                          ? 'bg-primary text-surface'
                          : 'border border-outline-variant hover:bg-surface-container text-on-surface dark:text-stone-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <footer className="mt-20 pt-8 border-t border-outline-variant text-center">
          <p className="text-outline text-sm font-body-md">
            Cross-document querying powered by pgvector similarity search + Gemini AI.
          </p>
        </footer>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateCollectionModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); load(); }}
        />
      )}

      {manageTarget && (
        <ManageDocumentsModal
          collection={manageTarget}
          onClose={() => setManageTarget(null)}
          onUpdated={load}
        />
      )}

      {chatTarget && (
        <CollectionChatPanel
          collection={chatTarget.collection}
          documents={chatTarget.documents}
          onClose={() => setChatTarget(null)}
        />
      )}
    </main>
  );
}
