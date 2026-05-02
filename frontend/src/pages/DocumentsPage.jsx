import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listDocuments, deleteDocument, renameDocument, removeDocumentFromCollection } from '../api';
import { useNavigate } from 'react-router-dom';
import UploadWidget from '../components/UploadWidget';
import FlashcardsModal from '../components/FlashcardsModal';
import ProfileDropdown from '../components/ProfileDropdown';
import RenameModal from '../components/modals/RenameModal';
import DeleteConfirmationModal from '../components/modals/DeleteConfirmationModal';

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const getRelativeTime = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
};

export default function DocumentsPage({ onMenuClick }) {
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [renamingTarget, setRenamingTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [flashcardTarget, setFlashcardTarget] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const navigate = useNavigate();
  const menuRef = useRef();

  const { data, isLoading: loading } = useQuery({
    queryKey: ['documents'],
    queryFn: listDocuments
  });
  const docs = data?.documents || [];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUploadSuccess = () => {
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    }, 1200);
  };

  const handleDelete = async (id) => {
    try {
      await deleteDocument(id);
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      setActiveMenu(null);
      setDeletingId(null);
    } catch (e) {
      alert('Failed to delete document.');
    }
  };

  const openRename = (doc) => {
    setRenamingTarget({ id: doc.id, name: doc.name });
    setRenameValue(doc.name || '');
    setActiveMenu(null);
  };

  const handleRename = async () => {
    const next = (renameValue || '').trim();
    if (!next) return alert('Name cannot be empty.');
    if (next.length > 255) return alert('Name is too long (max 255).');
    try {
      setRenaming(true);
      await renameDocument(renamingTarget.id, next);
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      setRenamingTarget(null);
      setRenameValue('');
    } catch (e) {
      alert('Failed to rename document.');
    } finally {
      setRenaming(false);
    }
  };
  
  const handleUncollect = async (doc) => {
    try {
      await removeDocumentFromCollection(doc.collection_id, doc.id);
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      setActiveMenu(null);
    } catch (e) {
      alert('Failed to remove document from collection.');
    }
  };

  // Filter documents based on search query (global search)
  const filteredDocs = docs.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredDocs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDocs = filteredDocs.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <main className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="grid grid-cols-2 lg:grid-cols-3 items-center h-16 px-4 lg:px-8 w-full sticky top-0 z-40 bg-stone-50/80 dark:bg-stone-950/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick} className="lg:hidden text-stone-500 hover:text-stone-900 transition-colors">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h2 className="text-lg lg:text-xl font-semibold text-stone-900 dark:text-stone-50 font-headline truncate">Archive</h2>
        </div>
        <div className="hidden lg:flex justify-center">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
            <input 
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-1.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all" 
              placeholder="Search documents..." 
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
        <div className="flex items-center justify-end gap-2 lg:gap-4">
          <ProfileDropdown />
        </div>
      </header>

      <div className="max-w-[800px] mx-auto px-4 lg:px-8 pt-4 lg:pt-6 pb-8 lg:pb-stack-lg">
        {/* Mobile Search - Visible only on small screens */}
        <div className="lg:hidden mb-6">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
            <input 
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none transition-all" 
              placeholder="Search documents..." 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Section header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="font-headline-lg text-headline-lg mb-1">Knowledge Archive</h3>
            <p className="text-on-surface-variant font-body-md">
              {docs.length} document{docs.length !== 1 ? 's' : ''} categorized and indexed.
            </p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="bg-primary text-surface px-6 py-2 rounded-lg font-label-md text-label-md hover:bg-stone-800 transition-colors shadow-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">cloud_upload</span>
            Upload New
          </button>
        </div>

        {/* Document list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="material-symbols-outlined text-4xl text-outline animate-spin">sync</span>
            <p className="mt-4 text-outline font-body-md">Loading archive...</p>
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-outline-variant rounded-xl bg-surface-container-low">
            <span className="material-symbols-outlined text-5xl text-outline mb-4">folder_open</span>
            <h4 className="font-headline-md text-headline-md mb-2">No documents found</h4>
            <p className="text-on-surface-variant font-body-md mb-8">Your knowledge base is empty. Start by uploading a document.</p>
            <button
              onClick={() => setShowUpload(true)}
              className="bg-primary text-surface px-8 py-3 rounded-lg font-label-md text-label-md hover:bg-stone-800 transition-colors"
            >
              Upload Your First Document
            </button>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-5xl text-outline mb-4">search_off</span>
            <h4 className="font-headline-md text-headline-md mb-2">No matches found</h4>
            <p className="text-on-surface-variant font-body-md">No documents match "{searchQuery}". Try a different search term.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => doc.status === 'ready' && navigate(`/chat?doc=${doc.id}`)}
                className={`flex items-center justify-between p-4 bg-surface-container-low rounded-lg border border-transparent transition-all cursor-pointer relative group ${
                  activeMenu === doc.id ? 'z-50' : 'z-0'
                } ${
                  doc.status === 'ready' ? 'hover:border-outline-variant hover:shadow-sm' : 'opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-surface flex items-center justify-center rounded border border-outline-variant">
                    <span className="material-symbols-outlined text-error">picture_as_pdf</span>
                  </div>
                  <div>
                    <p className="font-label-md text-label-md text-on-surface">{doc.name}</p>
                    <p className="text-[12px] text-outline">
                      Indexed on {formatDate(doc.created_at)} • {getRelativeTime(doc.created_at)}
                      {doc.collections?.name && (
                        <span className="ml-2 px-1.5 py-0.5 bg-secondary/10 text-secondary rounded font-bold uppercase tracking-tighter text-[9px]">
                          {doc.collections.name}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-[10px] font-bold rounded-sm uppercase tracking-tighter ${
                    doc.status === 'ready'
                      ? 'bg-secondary/10 text-secondary'
                      : doc.status === 'processing'
                        ? 'bg-primary-fixed text-primary animate-pulse'
                        : 'bg-error/10 text-error'
                  }`}>
                    {doc.status}
                  </span>
                  
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(activeMenu === doc.id ? null : doc.id);
                      }}
                      className="p-2 hover:bg-surface rounded-full transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">more_vert</span>
                    </button>

                    {activeMenu === doc.id && (
                      <div 
                        ref={menuRef}
                        className="absolute right-0 top-full mt-2 w-48 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-2xl z-[100] overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (doc.status === 'ready') navigate(`/chat?doc=${doc.id}`);
                          }}
                          disabled={doc.status !== 'ready'}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container transition-colors disabled:opacity-40"
                        >
                          <span className="material-symbols-outlined text-lg">forum</span>
                          Consult MindHive
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (doc.status === 'ready') setFlashcardTarget({ id: doc.id, name: doc.name });
                            setActiveMenu(null);
                          }}
                          disabled={doc.status !== 'ready'}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container transition-colors disabled:opacity-40"
                        >
                          <span className="material-symbols-outlined text-lg">style</span>
                          Study Flashcards
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openRename(doc);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                          Rename
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(doc.id);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-error/5 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg text-error">delete</span>
                          Remove from Hive
                        </button>
                        {doc.collection_id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUncollect(doc);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-secondary hover:bg-secondary/5 border-t border-outline-variant transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">layers_clear</span>
                            Remove from Collection
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-6">
                <p className="text-sm text-outline font-body-md">
                  Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredDocs.length)} of {filteredDocs.length}
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
                          : 'border border-outline-variant hover:bg-surface-container'
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

        <footer className="mt-20 pt-8 border-t border-outline-variant w-full text-center">
          <p className="text-outline text-sm font-body-md">
            All documents are encrypted at rest and processed securely.
          </p>
        </footer>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-8 pt-7 pb-0">
              <div>
                <h3 className="font-headline-md text-headline-md">Upload Document</h3>
                <p className="text-outline text-sm mt-0.5">Ingest a new file into your knowledge base</p>
              </div>
              <button
                onClick={() => setShowUpload(false)}
                className="text-outline hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Widget */}
            <div className="px-8 py-6">
              <UploadWidget
                compact
                onClose={() => setShowUpload(false)}
                onSuccess={() => {
                  handleUploadSuccess();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        deletingId={deletingId}
        onCancel={() => setDeletingId(null)}
        onDelete={handleDelete}
      />

      {/* Flashcards Modal */}
      {flashcardTarget && (
        <FlashcardsModal 
          docId={flashcardTarget.id}
          docName={flashcardTarget.name}
          onClose={() => setFlashcardTarget(null)}
        />
      )}

      {/* Rename Modal */}
      <RenameModal
        renamingTarget={renamingTarget}
        renameValue={renameValue}
        setRenameValue={setRenameValue}
        renaming={renaming}
        onClose={() => {
          setRenamingTarget(null);
          setRenameValue('');
        }}
        onRename={handleRename}
      />
    </main>
  );
}
