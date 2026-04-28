import { listDocuments } from '../api';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ProfileDropdown from '../components/ProfileDropdown';

export default function DashboardPage({ onMenuClick }) {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ['documents'],
    queryFn: listDocuments
  });
  const docs = data?.documents || [];
  const ready = docs.filter((d) => d.status === 'ready').length;
  const processing = docs.filter((d) => d.status === 'processing').length;

  const stats = [
    { label: 'Total Index', value: docs.length, icon: 'database' },
    { label: 'Ready for Analysis', value: ready, icon: 'verified' },
    { label: 'Synchronizing', value: processing, icon: 'sync' },
  ];

  return (
    <main className="min-h-screen bg-background">
      <header className="flex justify-between items-center h-16 px-4 lg:px-8 w-full sticky top-0 z-40 bg-stone-50/80 dark:bg-stone-950/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick} className="lg:hidden text-stone-500 hover:text-stone-900 transition-colors">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h2 className="text-lg lg:text-xl font-semibold text-stone-900 dark:text-stone-50 font-headline">Overview</h2>
        </div>
        <div className="flex items-center gap-3 lg:gap-4">
          <ProfileDropdown />
        </div>
      </header>

      <div className="max-w-[800px] mx-auto px-4 lg:px-gutter py-8 lg:py-stack-lg space-y-12">
        <section>
          <h1 className="font-headline-xl text-headline-xl text-on-background mb-4">MindHive</h1>
          <p className="text-on-surface-variant font-body-lg max-w-[600px]">
            Your intellectual sanctuary. MindHive transforms fragmented documents into a coherent, queryable knowledge architecture.
          </p>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
          {stats.map((s) => (
            <div key={s.label} className="bg-surface-container-low border border-outline-variant p-6 rounded-xl hover:border-primary transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-secondary text-xl">{s.icon}</span>
                <span className="text-[10px] uppercase tracking-widest font-bold text-outline">{s.label}</span>
              </div>
              <div className="text-3xl font-headline font-bold text-on-background">{s.value}</div>
            </div>
          ))}
        </section>

        {/* Action Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          <button 
            onClick={() => navigate('/upload')}
            className="group text-left p-6 lg:p-8 bg-surface-container-lowest border border-outline-variant rounded-2xl hover:border-primary hover:shadow-lg transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-primary text-2xl">cloud_upload</span>
            </div>
            <h4 className="font-headline-md text-headline-md mb-2">Augment Knowledge</h4>
            <p className="text-on-surface-variant font-body-md">Ingest new documents into your hive and prepare them for semantic exploration.</p>
          </button>

          <button 
            onClick={() => navigate('/chat')}
            className="group text-left p-8 bg-surface-container-lowest border border-outline-variant rounded-2xl hover:border-primary hover:shadow-lg transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-primary text-2xl">forum</span>
            </div>
            <h4 className="font-headline-md text-headline-md mb-2">Consult Archive</h4>
            <p className="text-on-surface-variant font-body-md">Initiate a conversation with your curated knowledge base to derive specific insights.</p>
          </button>
        </section>

        {/* Recent Activity */}
        {docs.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-headline-md text-headline-md">Recent Documents</h4>
              <button onClick={() => navigate('/documents')} className="text-secondary font-label-md hover:underline">Full Archive</button>
            </div>
            <div className="space-y-3">
              {docs.slice(0, 3).map((doc) => (
                <div 
                  key={doc.id}
                  onClick={() => doc.status === 'ready' && navigate(`/chat?doc=${doc.id}`)}
                  className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg border border-transparent hover:border-outline-variant transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-surface flex items-center justify-center rounded border border-outline-variant">
                      <span className="material-symbols-outlined text-error">picture_as_pdf</span>
                    </div>
                    <div>
                      <p className="font-label-md text-label-md text-on-surface">{doc.name}</p>
                      <p className="text-[12px] text-outline">Status: {doc.status}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-outline">arrow_forward_ios</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-20 pt-8 border-t border-outline-variant w-full text-center">
          <p className="text-outline text-sm font-body-md">
            MindHive Knowledge Base
          </p>
        </footer>
      </div>
    </main>
  );
}
