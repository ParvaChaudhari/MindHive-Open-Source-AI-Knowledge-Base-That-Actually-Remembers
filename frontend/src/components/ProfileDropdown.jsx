import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProfileDropdown() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitial = () => {
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-full bg-primary-fixed overflow-hidden border border-outline-variant hover:ring-2 hover:ring-primary transition-all focus:outline-none"
      >
        <div className="w-full h-full bg-secondary flex items-center justify-center text-white text-xs font-bold">
          {getInitial()}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="px-4 py-3 border-b border-outline-variant bg-surface-container-low">
            <p className="text-[10px] uppercase tracking-widest text-outline font-bold mb-1">Authenticated As</p>
            <p className="text-sm font-label-md text-on-surface truncate" title={user?.email}>{user?.email}</p>
          </div>
          <div className="py-1">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-error hover:bg-error/5 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              <span className="font-label-md text-sm">Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
