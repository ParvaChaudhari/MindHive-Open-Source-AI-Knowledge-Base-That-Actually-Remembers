import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const { error } = await login(email, password);
      if (error) throw error;
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-surface rounded-2xl mb-6 shadow-xl shadow-primary/20">
            <span className="material-symbols-outlined text-3xl">hive</span>
          </div>
          <h1 className="text-3xl font-headline font-bold mb-2">Welcome Back</h1>
          <p className="text-outline text-sm">Enter your credentials to access your Hive</p>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-8 rounded-3xl shadow-xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-2 ml-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-2 ml-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-error/5 border border-error/20 text-error text-xs p-3 rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-surface rounded-xl font-label-lg text-label-lg hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">sync</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">login</span>
                  Login to MindHive
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-stone-100 dark:border-stone-800 text-center">
            <p className="text-sm text-outline">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary font-bold hover:underline">Create one</Link>
            </p>
          </div>
        </div>

        <p className="mt-10 text-center text-[10px] text-outline uppercase tracking-[0.2em]">
          MindHive AI · Private & Secure Knowledge Base
        </p>
      </div>
    </div>
  );
}
