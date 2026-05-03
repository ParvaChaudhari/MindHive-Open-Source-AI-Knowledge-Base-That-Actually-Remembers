import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { queryCollection } from '../../api';
import ErrorBoundary from '../common/ErrorBoundary';
import Typewriter from '../common/Typewriter';

export default function CollectionChatPanel({ collection, documents, onClose }) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: `Ready to explore **${collection.name}** — a collection of ${documents.length} document(s).\n\nAsk me anything across all of them.`,
    sources: null,
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;

    if (loading || isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

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
        isTyping: true,
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
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-8">
          {messages.map((msg, i) => (
            <ErrorBoundary key={i} fallback={<div className="p-4 border border-error/20 bg-error/5 rounded-lg text-error text-xs">Failed to render message.</div>}>
              <div className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary shrink-0 flex items-center justify-center">
                    <span className="material-symbols-outlined text-surface text-sm">hive</span>
                  </div>
                )}
                <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-primary text-surface p-4 rounded-xl' : 'p-1'}`}>
                  <div className={`prose prose-stone max-w-none font-medium ${msg.role === 'user' ? 'text-surface' : 'text-on-surface'} dark:prose-invert`}>
                    {msg.role === 'assistant' && msg.isTyping ? (
                      <Typewriter content={msg.content} />
                    ) : (
                      <ReactMarkdown
                        rehypePlugins={[rehypeSanitize]}
                        components={{
                          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                          code: ({ children }) => <code className="bg-stone-200 dark:bg-stone-800 px-1 rounded font-mono text-sm">{children}</code>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-stone-200 dark:border-stone-800 space-y-2">
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
            </ErrorBoundary>
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
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-5 border-t border-outline-variant bg-background/50 backdrop-blur-sm">
          <div className="relative">
            <textarea
              rows={1}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-4 pr-14 py-4 text-on-background focus:ring-1 focus:ring-primary focus:outline-none transition-all resize-none shadow-sm"
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
