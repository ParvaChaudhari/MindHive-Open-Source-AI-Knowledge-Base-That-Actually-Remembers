import UploadWidget from '../components/UploadWidget';
import { useNavigate } from 'react-router-dom';

export default function UploadPage({ onMenuClick }) {
  const navigate = useNavigate();

  return (
    <main className="lg:pl-64 pt-16 min-h-screen bg-background">
      <header className="flex justify-between items-center h-16 px-4 lg:px-8 w-full fixed top-0 lg:left-64 z-40 bg-stone-50/80 dark:bg-stone-950/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick} className="lg:hidden text-stone-500 hover:text-stone-900 transition-colors">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h2 className="text-lg lg:text-xl font-semibold text-stone-900 dark:text-stone-50 font-headline">Upload</h2>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-stone-500 hover:text-stone-900 transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="w-8 h-8 rounded-full bg-primary-fixed overflow-hidden border border-outline-variant">
            <div className="w-full h-full bg-secondary flex items-center justify-center text-white text-xs font-bold">P</div>
          </div>
        </div>
      </header>

      <div className="max-w-[800px] mx-auto px-gutter py-stack-lg flex flex-col items-center">
        <div className="w-full mb-10 text-center">
          <h1 className="font-headline-xl text-headline-xl text-on-background mb-3">Expand your hive</h1>
          <p className="text-on-surface-variant font-body-lg max-w-[560px] mx-auto">
            Upload your research papers, legal transcripts, or technical manuals. MindHive synthesizes your documents into a searchable, interactive knowledge base.
          </p>
        </div>

        <div className="w-full bg-surface-container-lowest border border-outline-variant p-10 rounded-xl">
          <UploadWidget
            onSuccess={(result) => {
              // Stay on the page — widget shows its own success state with navigation options
            }}
          />
        </div>

        <footer className="mt-16 pt-8 border-t border-outline-variant w-full text-center">
          <p className="text-outline text-sm font-body-md">
            © 2026 MindHive Systems. Documents are stored in accordance with your data retention policy.
          </p>
        </footer>
      </div>
    </main>
  );
}
