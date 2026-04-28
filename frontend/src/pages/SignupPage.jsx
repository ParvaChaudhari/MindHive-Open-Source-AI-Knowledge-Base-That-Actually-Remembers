import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

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
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-surface rounded-2xl mb-6">
            <span className="material-symbols-outlined text-3xl">hive</span>
          </div>
          <h1 className="text-3xl font-headline font-bold mb-2">Create Account</h1>
          <p className="text-outline text-sm">Start building your private knowledge base</p>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-8 rounded-3xl shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-2 ml-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
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
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="Min 6 characters"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-2 ml-1">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
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
                  <span className="material-symbols-outlined text-lg">person_add</span>
                  Join MindHive
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-stone-100 dark:border-stone-800 text-center">
            <p className="text-sm text-outline">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-bold hover:underline">Login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
