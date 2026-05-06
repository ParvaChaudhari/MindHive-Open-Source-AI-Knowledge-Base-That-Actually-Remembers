import { useState, useRef, useEffect } from 'react';
import { uploadDocument, getDocument, summarizeDocument, ingestYoutube, ingestWeb } from '../api';
import { useNavigate } from 'react-router-dom';

/**
 * UploadWidget — supports multiple ingestion sources (File, YouTube, Web).
 */
export default function UploadWidget({ collectionId = null, onSuccess, onClose, compact = false }) {
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  const [source, setSource] = useState('file'); // file, youtube, web
  const [status, setStatus] = useState('idle'); // idle, uploading, processing, done, error
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('');
  const [summaryFromIngest, setSummaryFromIngest] = useState(false);
  const [polling, setPolling] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [newDocId, setNewDocId] = useState(null);
  const inputRef = useRef();
  const navigate = useNavigate();

  const handleFile = (f) => {
    if (f && (f.type === 'application/pdf' || f.type === 'text/plain' || f.name.endsWith('.docx'))) {
      if (f.size > 3 * 1024 * 1024) {
        setError('File size exceeds the 3MB limit.');
        setFile(null);
        return;
      }
      setFile(f);
      setError('');
    } else {
      setError('Please select a valid PDF, TXT or DOCX file.');
    }
  };

  const handleUpload = async () => {
    if (source === 'file' && !file) return;
    if (source !== 'file' && !url) return;

    setStatus('uploading');
    setError('');
    
    try {
      let data;
      if (source === 'file') {
        data = await uploadDocument(file, collectionId);
      } else if (source === 'youtube') {
        data = await ingestYoutube(url, collectionId);
      } else {
        data = await ingestWeb(url, collectionId);
      }
      
      setNewDocId(data.document_id);
      // Upload modal should NOT summarize inline anymore.
      // Summary generation/display happens inside ChatPage once the doc is ready.
      setSummary('');
      setSummaryFromIngest(false);
      setStatus('processing');
      pollStatus(data.document_id);
    } catch (err) {
      setError(err.message || 'Action failed. Please try again.');
      setStatus('error');
    }
  };

  const pollStatus = async (id) => {
    setPolling(true);
    let attempts = 0;
    const maxAttempts = 60; // 1 minute
    
    const interval = setInterval(async () => {
      try {
        const doc = await getDocument(id);
        if (doc.status === 'ready') {
          clearInterval(interval);
          setPolling(false);
          // As soon as ingestion is ready, take user to Chat.
          // ChatPage will handle loading state + summary generation.
          if (onSuccess) onSuccess(doc);
          navigate(`/chat?doc=${id}&autosummary=1`);
          if (onClose) onClose();
        } else if (doc.status === 'error') {
          clearInterval(interval);
          setError('Background processing failed.');
          setStatus('error');
          setPolling(false);
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
      
      attempts++;
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setError('Processing is taking longer than expected. Check back in the archive later.');
        setStatus('error');
        setPolling(false);
      }
    }, 2000);
  };

  const fetchSummary = async (id) => {
    try {
      const data = await summarizeDocument(id);
      setSummary(data.summary);
    } catch (e) {
      console.error("Summary error:", e);
    }
  };

  if (status === 'done' || (status === 'processing' && newDocId)) {
    return (
      <div className="bg-surface p-8 rounded-2xl border border-outline-variant shadow-sm text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mx-auto mb-6">
          <span className={`material-symbols-outlined text-3xl ${status === 'processing' ? 'animate-spin-reverse' : ''}`}>
            {status === 'processing' ? 'sync' : 'verified'}
          </span>
        </div>
        <h3 className="font-headline-lg text-headline-lg mb-2">
          {status === 'processing' ? 'Digesting content...' : 'Ingestion Complete!'}
        </h3>
        <p className="text-on-surface-variant mb-8 max-w-sm mx-auto">
          {status === 'processing' 
            ? 'We are analyzing the content and building your knowledge base. This will only take a moment.' 
            : 'Your content is now indexed and ready for questioning.'}
        </p>

        {polling && (
          <div className="bg-surface-container-low rounded-xl p-5 mb-8 text-left border border-outline-variant/50">
            <div className="flex items-center gap-3 py-4">
              <span className="material-symbols-outlined text-outline animate-spin-reverse text-sm">sync</span>
              <p className="text-sm text-outline italic">Building your knowledge base…</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate(`/chat?doc=${newDocId}&autosummary=1`)}
            className="w-full py-3 bg-primary text-surface rounded-xl font-label-lg text-label-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">chat_bubble</span>
            Start Chatting
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setStatus('idle'); setFile(null); setUrl(''); setSummary(''); setSummaryFromIngest(false); setSource('file'); }}
              className="py-3 border border-outline-variant rounded-xl font-label-md text-label-md hover:bg-surface-container transition-colors"
            >
              Add Another
            </button>
            <button
              onClick={onClose}
              className="py-3 text-outline font-label-md text-label-md hover:text-on-surface transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const py = compact ? 'py-8' : 'py-16';

  return (
    <div className={`w-full ${compact ? '' : 'max-w-2xl mx-auto'}`}>
      <div className="flex gap-1 bg-surface-container-low p-1 rounded-xl mb-6">
        {['file', 'youtube', 'web'].map((s) => (
          <button
            key={s}
            onClick={() => { setSource(s); setError(''); }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              source === s 
                ? 'bg-surface text-primary shadow-sm' 
                : 'text-outline hover:text-on-surface'
            }`}
          >
            {s === 'file' ? 'PDF/Text' : s === 'youtube' ? 'YouTube' : 'Web URL'}
          </button>
        ))}
      </div>

      {source === 'file' ? (
        <div 
          onClick={() => inputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          className={`border-2 border-dashed rounded-3xl p-10 lg:p-16 flex flex-col items-center justify-center transition-all cursor-pointer ${
            dragOver ? 'border-primary bg-primary/5' : 'border-outline-variant hover:border-outline bg-surface-container-low/30'
          }`}
        >
          <input ref={inputRef} type="file" className="hidden" onChange={(e) => handleFile(e.target.files[0])} accept=".pdf" />
          
          <div className={`w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center mb-5 transition-transform duration-300 ${dragOver ? 'scale-125' : ''}`}>
            <span className="material-symbols-outlined text-primary text-2xl">
              {status === 'uploading' ? 'sync' : 'cloud_upload'}
            </span>
          </div>

          {file ? (
            <div className="flex flex-col items-center">
              <p className="font-label-lg text-label-lg text-on-surface mb-1">{file.name}</p>
              <p className="text-outline text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          ) : (
            <>
              <h4 className="font-headline-md text-headline-md mb-1 text-center">
                {dragOver ? 'Drop to upload' : 'Drop files here or click to browse'}
              </h4>
              <p className="text-on-surface-variant font-body-md mb-6">Supports .pdf documents up to 3 MB</p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-surface-container-low/30 border border-outline-variant rounded-3xl p-8 lg:p-12 text-center">
          <div className="w-16 h-16 bg-primary/5 text-outline rounded-3xl flex items-center justify-center mb-6 mx-auto">
            <span className="material-symbols-outlined text-3xl">
              {source === 'youtube' ? 'play_circle' : 'language'}
            </span>
          </div>
          <h4 className="font-headline-md text-headline-md mb-2">
            {source === 'youtube' ? 'YouTube Video Ingestion' : 'Web Page Scraper'}
          </h4>
          <p className="text-on-surface-variant font-body-md mb-8">
            {source === 'youtube' 
              ? 'Paste a YouTube URL to fetch its transcript and index it.' 
              : 'Paste a web URL to scrape its text content and index it.'}
          </p>
          
          <div className="relative mb-4 text-left">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
              link
            </span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={source === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://example.com/article'}
              className="w-full bg-surface-container border border-outline-variant rounded-xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-primary focus:outline-none transition-all"
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-error/5 border border-error/20 rounded-xl flex items-center gap-3 text-error">
          <span className="material-symbols-outlined text-lg">error</span>
          <p className="text-sm font-label-md">{error}</p>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={status === 'uploading' || (source === 'file' ? !file : !url)}
        className="w-full mt-8 py-4 bg-primary text-surface rounded-2xl font-label-lg text-label-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {status === 'uploading' ? (
          <>
            <span className="material-symbols-outlined animate-spin-reverse">sync</span>
            Ingesting...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-lg">
              {source === 'file' ? 'cloud_upload' : 'bolt'}
            </span>
            {source === 'file' ? 'Start Upload' : 'Ingest to Hive'}
          </>
        )}
      </button>
    </div>
  );
}
