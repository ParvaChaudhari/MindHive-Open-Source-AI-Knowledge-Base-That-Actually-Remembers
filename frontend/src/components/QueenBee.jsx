import { useState, useRef, useEffect } from 'react';
import { agentChat } from '../api';
import ReactMarkdown from 'react-markdown';

export default function QueenBee() {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, isLoading]);

  const sendMessage = async (overrideMessage = null) => {
    const text = overrideMessage || input;
    if (!text.trim() || isLoading) return;

    const userMessage = { role: 'user', content: text };
    const newHistory = [...history, userMessage];
    setHistory(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      // API expects history to be the PREVIOUS messages, not including the current one, but sending it all is okay, 
      // however, the backend currently accepts `message` and `history`.
      // Let's pass the previous history.
      const res = await agentChat(text, history);
      setHistory([...newHistory, { role: 'agent', content: res.response }]);
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
        <div className="bg-surface border border-outline-variant rounded-2xl shadow-2xl mb-4 w-[360px] h-[500px] flex flex-col overflow-hidden transition-all duration-300 transform origin-bottom-right">
          {/* Header */}
          <div className="bg-primary/10 px-4 py-3 border-b border-outline-variant flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐝</span>
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
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">
                    🐝
                  </div>
                )}
                <div 
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.role === 'user' 
                      ? 'bg-primary text-on-primary rounded-tr-sm' 
                      : 'bg-white border border-outline-variant text-on-surface rounded-tl-sm prose prose-sm prose-p:my-1'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="text-sm">{msg.content}</p>
                  ) : (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm flex-shrink-0">
                  🐝
                </div>
                <div className="bg-white border border-outline-variant rounded-2xl rounded-tl-sm px-4 py-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
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
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center group relative"
        >
          <span className="text-2xl group-hover:scale-110 transition-transform">🐝</span>
          {/* Subtle pulse ring */}
          <span className="absolute inset-0 rounded-full border border-primary animate-ping opacity-30"></span>
        </button>
      )}
    </div>
  );
}
