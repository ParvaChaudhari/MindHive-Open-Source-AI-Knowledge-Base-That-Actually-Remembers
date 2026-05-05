import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import HexagonBackground from '../components/common/HexagonBackground';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return setError("Passwords don't match");
    
    setError('');
    setLoading(true);
    
    try {
      const { error } = await signup(email, password);
      if (error) throw error;
      alert('Check your email for the confirmation link!');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Failed to signup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen text-on-surface relative bg-transparent">
      <HexagonBackground />
      
      <main className="flex-grow flex items-center justify-center px-gutter py-stack-lg relative z-10">
        <div className="max-w-[440px] w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3 mb-stack-lg">
            <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center shadow-lg shadow-black/5">
              <span className="material-symbols-outlined text-surface text-2xl">hive</span>
            </div>
            <h1 className="font-headline-md text-headline-md font-bold tracking-tight text-on-surface">MindHive</h1>
          </div>

          {/* Signup Content Area */}
          <div className="w-full">
            <div className="text-center mb-stack-md">
              <h2 className="font-headline-lg text-headline-lg mb-2">Join the Collective</h2>
              <p className="font-body-md text-on-surface-variant">Start building your private knowledge base.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-stack-md">
              <div className="space-y-unit">
                <label className="font-label-md text-label-md text-on-surface-variant uppercase ml-1" htmlFor="email">Email Address</label>
                <input 
                  className="w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md transition-all duration-200 bg-white/70 backdrop-blur-sm focus:outline-none focus:border-on-surface focus:shadow-lg focus:shadow-black/5" 
                  id="email" 
                  placeholder="name@example.com" 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-unit">
                <label className="font-label-md text-label-md text-on-surface-variant uppercase ml-1" htmlFor="password">Password</label>
                <input 
                  className="w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md transition-all duration-200 bg-white/70 backdrop-blur-sm focus:outline-none focus:border-on-surface focus:shadow-lg focus:shadow-black/5" 
                  id="password" 
                  placeholder="Min 6 characters" 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="space-y-unit">
                <label className="font-label-md text-label-md text-on-surface-variant uppercase ml-1" htmlFor="confirmPassword">Confirm Password</label>
                <input 
                  className="w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md transition-all duration-200 bg-white/70 backdrop-blur-sm focus:outline-none focus:border-on-surface focus:shadow-lg focus:shadow-black/5" 
                  id="confirmPassword" 
                  placeholder="••••••••" 
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {error && (
                <div className="bg-error/5 border border-error/20 text-error text-xs p-3 rounded-lg flex items-center gap-2 animate-in fade-in zoom-in-95 duration-300">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {error}
                </div>
              )}

              <button 
                className="w-full py-4 bg-primary text-surface rounded-lg font-label-md uppercase tracking-[0.1em] hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50" 
                type="submit"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Join MindHive'}
                {!loading && <span className="material-symbols-outlined text-lg">person_add</span>}
              </button>
            </form>

            <div className="mt-stack-lg pt-stack-md border-t border-outline-variant/30 text-center">
              <p className="font-body-md text-on-surface-variant">
                Already have an account? 
                <Link className="text-on-surface font-semibold hover:underline decoration-1 underline-offset-4 ml-1" to="/login">Login</Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-stack-lg px-margin-page flex flex-col items-center gap-stack-sm mt-auto">
        <div className="font-label-md text-[10px] tracking-[0.25em] text-on-surface-variant opacity-60 uppercase text-center">
          MINDHIVE AI · PRIVATE & SECURE KNOWLEDGE BASE
        </div>
      </footer>
    </div>
  );
}
