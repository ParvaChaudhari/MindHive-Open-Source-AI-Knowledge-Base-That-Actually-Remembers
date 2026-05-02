import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import ProfileDropdown from '../components/ProfileDropdown';
import {
  listCollections,
  createCollection,
  deleteCollection,
  getCollection,
  listDocuments,
  addDocumentToCollection,
  removeDocumentFromCollection,
  queryCollection,
} from '../api';

// ── Sub-components ─────────────────────────────────────────────────────────────

function CreateCollectionModal({ onClose, onCreated }) {
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


function ManageDocumentsModal({ collection, onClose, onUpdated }) {
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
            <span className="material-symbols-outlined text-outline animate-spin">sync</span>
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


function CollectionChatPanel({ collection, documents, onClose }) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: `Ready to explore **${collection.name}** — a collection of ${documents.length} document(s).\n\nAsk me anything across all of them.`,
    sources: null,
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = { current: null };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', content: question, sources: null }]);
    setLoading(true);

    try {
      const data = await queryCollection(collection.id, question);
      setMessages(m => [...m, {
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        documentsSearched: data.documents_searched,
      }]);
    } catch (e) {
      setMessages(m => [...m, {
        role: 'assistant',
        content: '❌ Query failed. Make sure the collection has ready documents and the backend is running.',
        sources: null,
      }]);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary text-base">library_books</span>
            </div>
            <div>
              <h3 className="font-bold font-headline">{collection.name}</h3>
              <p className="text-[11px] text-outline">{documents.length} document{documents.length !== 1 ? 's' : ''} • Cross-document AI</p>
            </div>
          </div>
          <button onClick={onClose} className="text-outline hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary shrink-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-surface text-sm">hive</span>
                </div>
              )}
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-primary text-surface p-4 rounded-xl' : 'p-1'}`}>
                <div className="prose prose-stone max-w-none font-medium text-on-surface">
                  <ReactMarkdown
                    rehypePlugins={[rehypeSanitize]}
                    components={{
                      p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                      code: ({ children }) => <code className="bg-stone-200 px-1 rounded font-mono text-sm">{children}</code>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>

                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-stone-200 space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-outline font-bold">
                      Sources — {msg.documentsSearched} document(s) searched
                    </p>
                    {msg.sources.map((s, j) => (
                      <div key={j} className="flex items-start gap-2 text-xs">
                        <span className="material-symbols-outlined text-secondary text-sm shrink-0 mt-0.5">article</span>
                        <div>
                          <span className="font-bold text-secondary">{s.document_name}</span>
                          <span className="text-outline"> · Page {s.page_number}</span>
                          <p className="text-on-surface-variant mt-0.5 line-clamp-2">{s.excerpt}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-secondary shrink-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-surface text-sm">person</span>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-surface text-sm">hive</span>
              </div>
              <div className="bg-surface-container-low border border-outline-variant p-4 rounded-xl">
                <div className="flex gap-1">
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <div key={i} className="w-2 h-2 bg-outline rounded-full animate-bounce" style={{ animationDelay: `${delay}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={el => { bottomRef.current = el; }} />
        </div>

        {/* Input */}
        <div className="p-5 border-t border-outline-variant">
          <div className="relative">
            <textarea
              rows={1}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-4 pr-14 py-4 text-on-background focus:ring-1 focus:ring-primary focus:outline-none transition-all resize-none"
              placeholder={`Ask across all ${documents.length} documents...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              disabled={loading}
              style={{ minHeight: '52px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-primary text-surface rounded-lg flex items-center justify-center hover:opacity-90 disabled:opacity-30 transition-all"
            >
              <span className="material-symbols-outlined text-sm">send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── Main Page ──────────────────────────────────────────────────────────────────

export default function CollectionsPage({ onMenuClick }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [manageTarget, setManageTarget] = useState(null);
  const [chatTarget, setChatTarget] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['collections'],
    queryFn: listCollections
  });
  const collections = data?.collections || [];
  const error = queryError ? 'Failed to load collections.' : '';

  const load = () => {
    return queryClient.invalidateQueries({ queryKey: ['collections'] });
  };

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
          <h2 className="text-lg lg:text-xl font-semibold text-stone-900 font-headline">Collections</h2>
        </div>
        <ProfileDropdown />
      </header>

      <div className="max-w-[800px] mx-auto px-4 lg:px-gutter py-8 lg:py-stack-lg">
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
          <div className="flex flex-col items-center justify-center py-20">
            <span className="material-symbols-outlined text-4xl text-outline animate-spin">sync</span>
            <p className="mt-4 text-outline font-body-md">Loading collections...</p>
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
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary text-surface px-8 py-3 rounded-lg font-label-md text-label-md hover:bg-stone-800 transition-colors"
            >
              Create First Collection
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* List header row — always visible when collections exist */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-widest font-bold text-outline">
                {collections.length} Collection{collections.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 border border-outline-variant text-on-surface rounded-lg text-xs font-bold hover:bg-surface-container-low hover:border-primary transition-all"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                New Collection
              </button>
            </div>
            {collections.map((col) => (
              <div
                key={col.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden hover:border-stone-300 transition-all group"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-secondary">library_books</span>
                      </div>
                      <div>
                        <h3 className="font-headline-md text-headline-md mb-1">{col.name}</h3>
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
                        className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-outline-variant text-on-surface rounded-lg text-xs font-bold hover:bg-surface-container-low transition-colors"
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
                  <div className="border-t border-error/20 bg-error/5 px-6 py-4 flex items-center justify-between">
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
