import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function McpConfigModal({ isOpen, onClose }) {
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedCommands, setCopiedCommands] = useState(false);
  const [osType, setOsType] = useState('windows');

  useEffect(() => {
    if (isOpen) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setToken(data.session.access_token);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const cloneCommands = `git clone https://github.com/ParvaChaudhari/MindHive-Open-Source-AI-Knowledge-Base-That-Actually-Remembers
cd MindHive-Open-Source-AI-Knowledge-Base-That-Actually-Remembers/mcp-server
python -m venv .venv
${osType === 'windows' ? '.venv\\Scripts\\activate' : 'source .venv/bin/activate'}
pip install -r requirements.txt`;

  const configJson = {
    mcpServers: {
      mindhive: {
        command: osType === 'windows' 
          ? "<PATH_TO_MINDHIVE>/mcp-server/.venv/Scripts/python.exe" 
          : "<PATH_TO_MINDHIVE>/mcp-server/.venv/bin/python",
        args: [
          "<PATH_TO_MINDHIVE>/mcp-server/main.py"
        ],
        env: {
          MINDHIVE_BACKEND_URL: import.meta.env.VITE_API_BASE || "http://localhost:8000",
          MINDHIVE_BEARER_TOKEN: token
        }
      }
    }
  };

  const configString = JSON.stringify(configJson, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(configString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCommands = () => {
    navigator.clipboard.writeText(cloneCommands);
    setCopiedCommands(true);
    setTimeout(() => setCopiedCommands(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-lowest">
          <div className="flex items-center gap-3">
            <img src="/mcp.png" alt="MCP Logo" className="w-6 h-6 object-contain mix-blend-multiply grayscale contrast-200 brightness-110 dark:invert dark:mix-blend-screen" />
            <h2 className="text-xl font-headline font-bold text-on-surface">Claude MCP Integration</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high text-outline transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">

          {/* Video moved to the top — see the result before doing any setup */}
          <div className="mb-8">
            <h3 className="text-lg font-headline font-bold text-on-surface mb-2">See it in Action</h3>
            <p className="text-sm text-outline font-body-md mb-4">
              Here's a quick demo of Claude using the MindHive MCP server to query the knowledge base. Want to try it yourself? Setup takes about 2 minutes — instructions below.
            </p>

            <div className="w-full aspect-[3/2] bg-stone-900 rounded-xl overflow-hidden border border-outline-variant relative flex items-center justify-center">
              <style>{`
                video::-webkit-media-controls-panel {
                  background-image: none !important;
                  background-color: transparent !important;
                  box-shadow: none !important;
                  filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.8));
                }
                pre::-webkit-scrollbar {
                  height: 6px;
                }
                pre::-webkit-scrollbar-track {
                  background: transparent;
                }
                pre::-webkit-scrollbar-thumb {
                  background-color: rgba(120, 113, 108, 0.5);
                  border-radius: 10px;
                }
                pre::-webkit-scrollbar-thumb:hover {
                  background-color: rgba(120, 113, 108, 0.8);
                }
              `}</style>
              <video
                src="/Mindhive.mp4"
                controls
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="border-t border-outline-variant pt-6">
            <h3 className="text-lg font-headline font-bold text-on-surface mb-4">Try It Yourself</h3>

            <div className="bg-stone-100 dark:bg-stone-800/50 text-stone-900 dark:text-stone-100 p-4 rounded-xl border border-stone-200 dark:border-stone-700 mb-6 flex gap-4 items-start">
              <span className="material-symbols-outlined text-primary shrink-0 mt-0.5">info</span>
              <div className="text-sm font-body-md space-y-3 flex-1 min-w-0">
                <p>
                  <strong>Developer Note:</strong> The MindHive backend is already live on GCP, so you don't need to run anything server-side. The only local piece is the MCP server, which acts as a bridge between Claude Desktop and the hosted backend.
                </p>

                <p className="font-bold text-on-surface">1. Clone and install the MCP server</p>
                <div className="relative group">
                  <pre className="bg-stone-200 dark:bg-stone-900 p-3 pt-10 rounded-lg text-xs font-mono border border-stone-300 dark:border-stone-700 overflow-x-auto">
                    <code>{cloneCommands}</code>
                  </pre>
                  
                  <div className="absolute top-2 right-2 flex items-center gap-2">
                    {/* Tiny OS Toggle */}
                    <div className="flex items-center bg-stone-300/80 dark:bg-stone-800/80 p-0.5 rounded-md border border-stone-300/50 dark:border-stone-700/50 backdrop-blur-sm shadow-sm">
                      <button
                        onClick={() => setOsType('windows')}
                        className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                          osType === 'windows' 
                            ? 'bg-surface text-on-surface shadow-sm' 
                            : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
                        }`}
                        title="Windows"
                      >
                        <svg viewBox="0 0 88 88" fill="currentColor" className="w-[12px] h-[12px]">
                          <path d="M0 12.402l35.687-4.86.016 34.423-35.67.203v-29.766zm35.67 33.529l.028 34.453-35.67-4.904v-29.754l35.642.205zm4.326-39.034l48.004-6.897v41.322l-48.004.246v-34.671zm0 39.141l48.004.283v41.362l-48.004-6.85v-34.795z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setOsType('mac')}
                        className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                          osType === 'mac' 
                            ? 'bg-surface text-on-surface shadow-sm' 
                            : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
                        }`}
                        title="Mac/Linux"
                      >
                        <svg viewBox="0 0 384 512" fill="currentColor" className="w-[13px] h-[13px]">
                          <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                        </svg>
                      </button>
                    </div>

                    {/* Copy Button */}
                    <button
                      onClick={handleCopyCommands}
                      className={`w-7 h-7 rounded-md flex items-center justify-center transition-all shadow-sm ${copiedCommands
                          ? 'bg-primary text-on-primary'
                          : 'bg-stone-300/80 dark:bg-stone-800/80 border border-stone-300/50 dark:border-stone-700/50 text-stone-700 dark:text-stone-300 hover:bg-stone-400 dark:hover:bg-stone-700 hover:text-stone-900 dark:hover:text-white backdrop-blur-sm'
                        }`}
                      title="Copy commands"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {copiedCommands ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  </div>
                </div>

                <p className="font-bold text-on-surface">2. Copy the config below into Claude Desktop</p>
                <p>
                  Paste the below JSON into your <code>claude_desktop_config.json</code> file. To find this file in Claude Desktop, click:
                  <br />
                  <span className="inline-flex items-center gap-1 mt-2 mb-3 bg-stone-200 dark:bg-stone-800/80 px-2 py-1 rounded-md text-[11px] font-mono border border-stone-300 dark:border-stone-700">
                    <span className="material-symbols-outlined text-[14px]">menu</span> 
                    <span className="material-symbols-outlined text-[12px] opacity-50">chevron_right</span> File
                    <span className="material-symbols-outlined text-[12px] opacity-50">chevron_right</span> Settings
                    <span className="material-symbols-outlined text-[12px] opacity-50">chevron_right</span> Developer
                    <span className="material-symbols-outlined text-[12px] opacity-50">chevron_right</span> Edit Config
                  </span>
                </p>

                <div className="relative group mb-3">
                  <pre className="bg-stone-950 text-stone-300 p-4 rounded-xl text-xs font-mono overflow-x-auto border border-stone-800 shadow-inner">
                    <code>{configString}</code>
                  </pre>
                  <button
                    onClick={handleCopy}
                    className={`absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${copied
                        ? 'bg-primary text-on-primary'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white'
                      }`}
                    title="Copy config"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {copied ? 'check' : 'content_copy'}
                    </span>
                  </button>
                </div>

                <p className="mt-1">
                  Then, replace <code className="bg-primary-container/50 px-1 py-0.5 rounded">&lt;PATH_TO_MINDHIVE&gt;</code> with the absolute path to your cloned repo.
                </p>
                <p className="text-xs text-outline italic">
                  The bearer token above is pulled automatically from your logged-in session, sign in again if you don't see one filled in.
                </p>

                <p className="font-bold text-on-surface mt-4">3. Restart Claude Desktop</p>
                <p>
                  Fully quit and reopen the app so it picks up the new config. "mindhive" should then appear under available MCP tools, and you can try asking it to list your documents.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}