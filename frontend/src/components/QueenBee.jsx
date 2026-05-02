import { useState, useRef, useEffect } from 'react';
import { agentChat } from '../api';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

export default function QueenBee() {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Thinking...');
  const [showWaitWarning, setShowWaitWarning] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 360, height: 500 });
  const isResizing = useRef(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, isLoading]);

  useEffect(() => {
    const checkHeight = () => {
      const maxAllowedHeight = window.innerHeight - 40 - 64 - 20;
      if (dimensions.height > maxAllowedHeight) {
        setDimensions(prev => ({ ...prev, height: Math.max(400, maxAllowedHeight) }));
      }
    };
    window.addEventListener('resize', checkHeight);
    checkHeight(); // Initial check
    return () => window.removeEventListener('resize', checkHeight);
  }, [dimensions.height]);

  useEffect(() => {
    let warningTimeout;

    if (isLoading) {
      setShowWaitWarning(false);
      // Show warning after 10s
      warningTimeout = setTimeout(() => {
        setShowWaitWarning(true);
      }, 10000);
    } else {
      clearTimeout(warningTimeout);
    }

    return () => {
      clearTimeout(warningTimeout);
    };
  }, [isLoading]);

  const startResizing = (e) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
  };

  const handleMouseMove = (e) => {
    if (!isResizing.current) return;
    
    // The window is pinned bottom-right at (window.innerWidth - 24, window.innerHeight - 24)
    // We are dragging the TOP-LEFT corner.
    const newWidth = window.innerWidth - 24 - e.clientX;
    const newHeight = window.innerHeight - 40 - e.clientY; // 40 is bottom spacing (bottom-6 + mb-4)
    
    // Top bar is approx 64px. We want 20px (0.5cm) gap.
    const maxAllowedHeight = window.innerHeight - 40 - 64 - 20;

    setDimensions({
      width: Math.min(Math.max(newWidth, 300), 800),
      height: Math.min(Math.max(newHeight, 400), maxAllowedHeight)
    });
  };

  const stopResizing = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
  };

  const sendMessage = async (overrideMessage = null) => {
    const text = overrideMessage || input;
    if (!text.trim() || isLoading) return;

    const userMessage = { role: 'user', content: text };
    const newHistory = [...history, userMessage];
    setHistory(newHistory);
    setInput('');

    // Intent detection for status message
    const lowerText = text.toLowerCase();
    const isImplementationTask = 
      lowerText.includes('create') || 
      lowerText.includes('add') || 
      lowerText.includes('collection') || 
      lowerText.includes('ingest') || 
      lowerText.includes('url') || 
      lowerText.includes('http') ||
      lowerText.includes('youtube') ||
      lowerText.includes('web');

    setStatusMessage(isImplementationTask ? 'Implementing...' : 'Thinking...');
    setIsLoading(true);

    try {
      // API expects history to be the PREVIOUS messages, not including the current one, but sending it all is okay, 
      // however, the backend currently accepts `message` and `history`.
      // Let's pass the previous history.
      const res = await agentChat(text, history);
      setHistory([...newHistory, { role: 'agent', content: res.response || "Something went wrong. Please try again!" }]);
    } catch (err) {
      setHistory([...newHistory, { role: 'agent', content: `Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const starters = [
    "Show my timeline",
    "What have I uploaded?",
    "Create a new collection"
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Window */}
      {isOpen && (
        <div 
          style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
          className="bg-surface border border-outline-variant rounded-2xl shadow-2xl mb-4 flex flex-col overflow-hidden transition-[transform,opacity] duration-300 transform origin-bottom-right relative"
        >
          {/* Resize Handle (Top-Left) */}
          <div 
            onMouseDown={startResizing}
            className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-50 hover:bg-primary/10 flex items-center justify-center group"
          >
            <div className="w-2 h-2 border-t-2 border-l-2 border-outline-variant group-hover:border-primary"></div>
          </div>

          {/* Header */}
          <div className="bg-primary/10 px-4 py-3 border-b border-outline-variant flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-primary/20">
                <img src="/queen-bee.png" alt="Queen Bee" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-title-md text-primary font-semibold">Queen Bee</h3>
                <p className="text-xs text-outline">MindHive Agent</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-outline hover:text-on-surface rounded-full p-1"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/30">
            {history.length === 0 && (
              <div className="text-center text-outline mt-8 space-y-4">
                <div className="text-4xl">🍯</div>
                <p className="font-body-md">Hi! I'm Queen Bee. How can I help you manage your hive today?</p>
                <div className="flex flex-col gap-2 mt-4 px-4">
                  {starters.map((starter, i) => (
                    <button 
                      key={i}
                      onClick={() => sendMessage(starter)}
                      className="text-sm bg-white border border-outline-variant rounded-full px-3 py-1.5 hover:border-primary hover:text-primary transition-colors text-left"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {history.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'agent' && (
                  <div className="w-8 h-8 rounded-full border border-primary/10 overflow-hidden mr-2 flex-shrink-0 mt-1">
                    <img src="/queen-bee.png" alt="Bee" className="w-full h-full object-cover" />
                  </div>
                )}
                <div 
                  className={`max-w-[80%] rounded-2xl px-4 py-2 font-medium break-words overflow-hidden ${
                    msg.role === 'user' 
                      ? 'bg-primary text-on-primary rounded-tr-sm' 
                      : 'bg-white border border-outline-variant text-on-surface rounded-tl-sm prose prose-sm prose-p:my-1'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="text-sm">{msg.content}</p>
                  ) : (
                  <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{msg.content}</ReactMarkdown>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start items-start gap-2">
                <div className="w-8 h-8 rounded-full border border-primary/10 overflow-hidden flex-shrink-0 mt-1">
                  <img src="/queen-bee.png" alt="Bee" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col gap-1 max-w-[80%]">
                  <div className="bg-white border border-outline-variant rounded-2xl rounded-tl-sm px-4 py-2 flex items-center gap-3 shadow-sm w-fit">
                    <div className="flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-[15px] animate-spin">progress_activity</span>
                    </div>
                    <p className="text-[11px] font-bold text-primary whitespace-nowrap">{statusMessage}</p>
                  </div>
                  {showWaitWarning && (
                    <p className="text-[10px] text-outline italic px-2 animate-in fade-in slide-in-from-top-1 duration-500">
                      Taking a bit longer, please be patient...
                    </p>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-outline-variant bg-surface">
            <form 
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Queen Bee..."
                disabled={isLoading}
                className="flex-1 rounded-full border border-outline-variant px-4 py-2 text-sm focus:outline-none focus:border-primary disabled:opacity-50"
              />
              <button 
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center disabled:opacity-50 hover:bg-primary/90 transition-colors flex-shrink-0"
              >
                <span className="material-symbols-outlined text-lg">send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Button */}
      {!isOpen && (
        <div className="relative group">
          {/* Greeting Bubble */}
          <div className="absolute bottom-full right-0 mb-4 w-48 bg-white border border-outline-variant rounded-2xl p-3 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <p className="text-xs text-on-surface leading-tight font-medium">
              Hi! I'm Queen Bee, the agent handling MindHive. 🐝
            </p>
            {/* Little arrow */}
            <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white border-b border-r border-outline-variant rotate-45"></div>
          </div>
          
          <button
            onClick={() => setIsOpen(true)}
            className="w-16 h-16 bg-primary text-on-primary rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center relative overflow-visible"
          >
            <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/20 z-10 relative">
              <img src="/queen-bee.png" alt="Queen Bee" className="w-full h-full object-cover" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
