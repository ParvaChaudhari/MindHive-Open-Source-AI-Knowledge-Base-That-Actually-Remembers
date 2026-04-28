import { NavLink } from 'react-router-dom';
// useAuth removed as it's no longer needed in Sidebar

const navItems = [
  { icon: 'dashboard', label: 'Dashboard', to: '/' },
  { icon: 'description', label: 'Documents', to: '/documents' },
  { icon: 'library_books', label: 'Collections', to: '/collections' },
  { icon: 'forum', label: 'Chat', to: '/chat' },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`fixed left-0 top-0 h-screen w-64 flex flex-col py-8 px-4 bg-stone-50 dark:bg-stone-950 border-r border-stone-200 dark:border-stone-800 z-50 transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-10 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
              <span className="material-symbols-outlined text-surface text-xl">hive</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50 tracking-tight font-headline">MindHive</h1>
              <p className="text-[10px] uppercase tracking-widest text-outline">AI Knowledge Base</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-outline hover:text-stone-900 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 transition-colors duration-200 rounded-lg group ${
                isActive 
                  ? 'text-stone-900 dark:text-stone-50 font-bold bg-stone-300/40 dark:bg-stone-800' 
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-900'
              }`
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-label-md text-label-md">{item.label}</span>
          </NavLink>
        ))}
      </nav>

    </aside>
    </>
  );
}
