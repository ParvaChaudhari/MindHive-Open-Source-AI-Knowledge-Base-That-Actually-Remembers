import { useEffect, useMemo, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { listDocuments, queryDocument, summarizeDocument, getDocument, getChatHistory } from '../api';
import ProfileDropdown from '../components/ProfileDropdown';
import ErrorBoundary from '../components/common/ErrorBoundary';
import Typewriter from '../components/common/Typewriter';

function LoadingBubble() {
  return (
    <div className="flex gap-4 self-start max-w-[80%] animate-pulse">
      <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-primary text-sm">hive</span>
      </div>
      <div className="bg-surface-container-low border border-outline-variant p-4 rounded-xl">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-outline rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 bg-outline rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-outline rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage({ onMenuClick }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [showDocSidebar, setShowDocSidebar] = useState(false);
  const [isDocSidebarCollapsed, setIsDocSidebarCollapsed] = useState(false);
  const [docBootstrapping, setDocBootstrapping] = useState(false);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const bottomRef = useRef();
  const scrollContainerRef = useRef(null);
  const pendingNavigationRef = useRef(null);
  
  const docIdFromUrl = useMemo(() => searchParams.get('doc'), [searchParams]);
  const autoSummary = useMemo(() => searchParams.get('autosummary') === '1', [searchParams]);

  const { data } = useQuery({
    queryKey: ['documents'],
    queryFn: listDocuments
  });
  const allReadyDocs = (data?.documents || []).filter(d => d.status === 'ready');
  const docs = allReadyDocs.filter(d => 
    d.name.toLowerCase().includes(docSearchQuery.toLowerCase())
  );

  const { data: directDoc } = useQuery({
    queryKey: ['document', docIdFromUrl],
    queryFn: () => getDocument(docIdFromUrl),
    enabled: !!docIdFromUrl,
    // While the doc is processing, keep polling so chat can show a loading state.
    refetchInterval: (q) => (q?.state?.data?.status === 'ready' || q?.state?.data?.status === 'error' ? false : 1500),
  });

  useEffect(() => {
    if (!docIdFromUrl) return;
    if (!directDoc) return;

    // Prevent glitch: React Query might provide stale data while fetching the new URL.
    // Ensure the fetched document actually matches the current URL before acting.
    if (directDoc.id !== docIdFromUrl) return;

    // Prevent React Router lag glitch: If we clicked the sidebar, ignore URL until it catches up
    if (pendingNavigationRef.current && pendingNavigationRef.current !== docIdFromUrl) {
      return;
    }
    if (pendingNavigationRef.current === docIdFromUrl) {
      pendingNavigationRef.current = null;
    }

    // If doc is still processing, show a blank chat loading state.
    if (directDoc.status !== 'ready') {
      setDocBootstrapping(true);
      setSelectedDoc(directDoc);
      setMessages([]);
      setInput('');
      return;
    }

    // Doc is ready: select it even if it wasn't in the ready-doc list yet.
    setDocBootstrapping(false);
    if (!selectedDoc || selectedDoc.id !== directDoc.id || selectedDoc.status !== 'ready') {
      selectDoc(directDoc, docs);
    }
  }, [docIdFromUrl, directDoc, docs, selectedDoc]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Check if user is near bottom (within 150px)
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;

    // Scroll if:
    // 1. User just sent a message (loading state changed to true)
    // 2. We are already at the bottom (typical for new assistant messages)
    if (loading || isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const selectDoc = async (doc, docList = docs) => {
    // Update URL to reflect the selected document.
    // If it's a different doc, this will also drop the autosummary parameter.
    if (docIdFromUrl !== doc.id) {
      pendingNavigationRef.current = doc.id;
      navigate(`/chat?doc=${doc.id}`);
    }
    
    setSelectedDoc(doc);
    setShowDocSidebar(false);
    setInput('');
    setMessages([]); // Clear old messages instantly while fetching new ones

    try {
      const history = await getChatHistory(doc.id);
      const baseMessage = {
        role: 'assistant',
        content: `Hello! I'm ready to answer questions about **${doc.name}**.\n\nAsk me anything, or click **Get Summary** for a quick overview.`,
        sources: null,
      };

      if (history.chats && history.chats.length > 0) {
        const loadedMessages = [baseMessage];
        for (const chat of history.chats) {
           loadedMessages.push({ role: 'user', content: chat.question, sources: null });
           loadedMessages.push({ role: 'assistant', content: chat.answer, sources: null });
        }
        setMessages(loadedMessages);
      } else {
        setMessages([baseMessage]);
      }
    } catch (e) {
      setMessages([{
        role: 'assistant',
        content: `Hello! I'm ready to answer questions about **${doc.name}**.\n\nAsk me anything, or click **Get Summary** for a quick overview.`,
        sources: null,
      }]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedDoc || loading) return;
    const question = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: question, sources: null }]);
    setLoading(true);
    try {
      const data = await queryDocument(selectedDoc.id, question);
      setMessages((m) => [...m, {
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        isTyping: true,
      }]);
    } catch (e) {
      setMessages((m) => [...m, {
        role: 'assistant',
        content: '❌ Something went wrong. Please try again.',
        sources: null,
      }]);
    }
    setLoading(false);
  };

  const handleSummarize = async () => {
    if (!selectedDoc || summarizing) return;
    setSummarizing(true);
    setMessages((m) => [...m, { role: 'user', content: '📝 Generate a summary of this document', sources: null }]);
    try {
      const data = await summarizeDocument(selectedDoc.id);
      setMessages((m) => [...m, { role: 'assistant', content: data.summary, sources: null, isTyping: true }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: '❌ Could not generate summary.', sources: null }]);
    }
    setSummarizing(false);
  };

  const autoSummarizedRef = useRef(false);

  // Auto-summarize after redirect from ingestion.
  useEffect(() => {
    if (!autoSummary || autoSummarizedRef.current) return;
    if (!selectedDoc || selectedDoc.status !== 'ready') return;
    if (summarizing) return;
    
    // Check if we've already manually requested a summary in this session
    const alreadyRequested = messages.some((m) => m.role === 'user' && m.content.includes('Generate a summary'));
    if (alreadyRequested) {
      autoSummarizedRef.current = true;
      return;
    }

    autoSummarizedRef.current = true; // Lock it instantly
    handleSummarize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSummary, selectedDoc, summarizing, messages.length]);

  const exportChat = () => {
    if (messages.length === 0) return;
    const content = messages.map(m => (
      `### ${m.role === 'user' ? 'User' : 'MindHive'}\n${m.content}\n\n`
    )).join('---\n\n');
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MindHive_Chat_${selectedDoc?.name || 'Export'}.md`;
    a.click();
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <main className="h-screen flex bg-background relative overflow-hidden">
      {/* Document Sidebar overlay on mobile */}
      {showDocSidebar && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setShowDocSidebar(false)}
        />
      )}

      {/* Document Sidebar */}
      <aside className={`absolute lg:relative h-full border-r border-stone-200 dark:border-stone-800 flex flex-col bg-surface-container-low z-40 transition-all duration-300 ${showDocSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${isDocSidebarCollapsed ? 'w-0' : 'w-80'}`}>
        {/* Toggle Button */}
        <button 
          onClick={() => setIsDocSidebarCollapsed(!isDocSidebarCollapsed)}
          className={`hidden lg:flex absolute top-1/2 -translate-y-1/2 w-6 h-12 bg-surface-container-low border border-stone-200 dark:border-stone-800 rounded-r-lg items-center justify-center text-stone-500 hover:text-stone-900 shadow-sm z-50 transition-all ${isDocSidebarCollapsed ? 'left-0' : 'left-full'}`}
          title={isDocSidebarCollapsed ? 'Show Knowledge Base' : 'Hide Knowledge Base'}
        >
          <span className="text-[12px] font-bold select-none">
            {isDocSidebarCollapsed ? '>' : '<'}
          </span>
        </button>

        <div className={`flex flex-col h-full overflow-hidden ${isDocSidebarCollapsed ? 'opacity-0 invisible' : 'opacity-100 visible'}`}>
          <div className="p-6 border-b border-stone-200 dark:border-stone-800 flex flex-col gap-4 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-headline text-headline-md mb-1">Knowledge Base</h3>
                <p className="text-xs text-outline uppercase tracking-widest font-bold">Your Documents</p>
              </div>
              <button onClick={() => setShowDocSidebar(false)} className="lg:hidden text-outline">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
              <input 
                type="text"
                placeholder="Search files..."
                value={docSearchQuery}
                onChange={(e) => setDocSearchQuery(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none transition-all"
              />
              {docSearchQuery && (
                <button 
                  onClick={() => setDocSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {docs.length === 0 ? (
              <div className="text-center py-10 px-4">
                <p className="text-sm text-on-surface-variant mb-4">
                  {docSearchQuery ? `No matches for "${docSearchQuery}"` : 'No indexed documents found.'}
                </p>
                {!docSearchQuery && (
                  <button 
                    onClick={() => navigate('/documents')}
                    className="w-full py-2 bg-primary text-surface rounded-lg font-label-md text-xs hover:opacity-90"
                  >
                    Upload Document
                  </button>
                )}
              </div>
            ) : (
              docs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => selectDoc(doc)}
                  className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all ${
                    selectedDoc?.id === doc.id 
                      ? 'bg-surface-container-highest border border-outline-variant shadow-sm' 
                      : 'hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-outline">description</span>
                  <span className="text-sm font-label-md truncate">{doc.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative min-w-0">
        <header className="h-16 flex justify-between items-center px-4 lg:px-8 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3 truncate">
            <button onClick={onMenuClick} className="lg:hidden text-stone-500 hover:text-stone-900 transition-colors">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <button onClick={() => setShowDocSidebar(true)} className="lg:hidden text-stone-500 hover:text-stone-900 transition-colors">
              <span className="material-symbols-outlined">folder_open</span>
            </button>
            <h2 className="text-md lg:text-lg font-bold font-headline truncate">
              {selectedDoc ? selectedDoc.name : 'Select a document'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button 
                onClick={exportChat}
                className="p-2 text-outline hover:text-primary transition-colors"
                title="Export Chat as Markdown"
              >
                <span className="material-symbols-outlined">download</span>
              </button>
            )}
            <button 
              onClick={handleSummarize}
              disabled={!selectedDoc || selectedDoc.status !== 'ready' || docBootstrapping || summarizing}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-label-md text-xs transition-all ${
                summarizing 
                  ? 'bg-surface-container text-outline' 
                  : 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 hover:opacity-90'
              }`}
            >
              <span className={`material-symbols-outlined text-sm ${summarizing ? 'animate-spin' : ''}`}>
                {summarizing ? 'sync' : 'auto_awesome'}
              </span>
              {summarizing ? 'Summarizing...' : 'Get Summary'}
            </button>
            <div className="ml-2">
              <ProfileDropdown />
            </div>
          </div>
        </header>

        {!selectedDoc ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-primary text-3xl">forum</span>
            </div>
            <h3 className="font-headline-lg text-headline-lg mb-2">How can I help?</h3>
            <p className="text-on-surface-variant font-body-md max-w-[400px]">
              Select a document from the sidebar to start exploring its contents and extracting insights.
            </p>
          </div>
        ) : (
          <>
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
              <div className="max-w-[800px] mx-auto space-y-10">
                {docBootstrapping && (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center mb-6">
                      <span className="material-symbols-outlined text-primary text-3xl animate-spin">sync</span>
                    </div>
                    <h3 className="font-headline-lg text-headline-lg mb-2">Preparing your document…</h3>
                    <p className="text-on-surface-variant font-body-md max-w-[420px]">
                      We’re still indexing and embedding your content. This chat will unlock automatically once it’s ready.
                    </p>
                  </div>
                )}

                {!docBootstrapping && messages.map((msg, i) => (
                  <ErrorBoundary key={i} fallback={<div className="p-4 border border-error/20 bg-error/5 rounded-lg text-error text-xs">Failed to render message.</div>}>
                    <div className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-surface text-sm">hive</span>
                        </div>
                      )}
                      <div className={`max-w-[80%] ${
                        msg.role === 'user' 
                          ? 'bg-primary text-surface p-4 rounded-xl shadow-sm' 
                          : 'p-1 leading-relaxed'
                      }`}>
                        <div className={`prose prose-stone dark:prose-invert max-w-none font-medium ${msg.role === 'user' ? 'text-surface' : 'text-on-surface'}`}>
                          {msg.role === 'assistant' && msg.isTyping ? (
                            <Typewriter content={msg.content} />
                          ) : (
                            <ReactMarkdown 
                              rehypePlugins={[rehypeSanitize]}
                              components={{
                                p: ({children}) => <p className="mb-4 last:mb-0">{children}</p>,
                                code: ({children}) => <code className="bg-stone-200 dark:bg-stone-800 px-1 rounded font-mono text-sm">{children}</code>
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          )}
                        </div>
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-6 pt-4 border-t border-stone-200 dark:border-stone-800 flex flex-wrap gap-2">
                            <p className="w-full text-[10px] uppercase tracking-widest text-outline font-bold mb-1">Citations</p>
                            {msg.sources.map((s, j) => (
                              <span key={j} className="px-2 py-1 bg-secondary/10 text-secondary text-[10px] font-bold rounded hover:bg-secondary/20 cursor-help" title={s.excerpt}>
                                Page {s.page_number}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-surface text-sm">person</span>
                        </div>
                      )}
                    </div>
                  </ErrorBoundary>
                ))}
                {!docBootstrapping && (loading || summarizing) && <LoadingBubble />}
                <div ref={bottomRef} />
              </div>
            </div>

            <div className="p-8 border-t border-stone-200 dark:border-stone-800 bg-background/80 backdrop-blur-md">
              <div className="max-w-[800px] mx-auto relative">
                <textarea
                  rows={1}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-4 pr-16 py-4 text-on-background focus:ring-1 focus:ring-primary focus:outline-none transition-all shadow-sm resize-none overflow-hidden"
                  placeholder="Ask MindHive anything..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  disabled={loading || summarizing || docBootstrapping || selectedDoc?.status !== 'ready'}
                  style={{ minHeight: '56px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading || summarizing || docBootstrapping || selectedDoc?.status !== 'ready'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary text-surface rounded-lg flex items-center justify-center hover:opacity-90 disabled:opacity-30 transition-all"
                >
                  <span className="material-symbols-outlined">send</span>
                </button>
              </div>
              <p className="max-w-[800px] mx-auto mt-3 text-[10px] text-center text-outline">
                MindHive uses Gemini 2.5 Flash. Responses may be summarized for clarity.
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
