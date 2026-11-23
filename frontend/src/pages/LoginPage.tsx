import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Key, ShieldCheck } from 'lucide-react';
import { SafeText } from '../components/common/SafeText';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [totpCode, setTotpCode] = useState<string>('');
  const [requiresMfa, setRequiresMfa] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await login(email, password, totpCode || undefined);
      if (result.requiresMfa) {
        setRequiresMfa(true);
        setIsLoading(false);
        return;
      }
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 mb-3">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">Sign In to Campus Connect</h1>
          <p className="text-xs text-slate-400 mt-1">Institutional single session authentication</p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm mb-6">
            <SafeText content={error} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-5 h-5" />
              </div>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@campus.edu"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Key className="w-5 h-5" />
              </div>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {requiresMfa && (
            <div className="p-4 bg-sky-500/10 border border-sky-500/30 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-sky-400 text-xs font-bold uppercase">
                <ShieldCheck className="w-4 h-4" />
                <span>Multi-Factor Authentication Required</span>
              </div>
              <label htmlFor="login-totp" className="block text-xs text-slate-300">Enter 6-digit TOTP authenticator code:</label>
              <input
                id="login-totp"
                type="text"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="123456"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-center font-mono text-lg tracking-widest text-white focus:outline-none focus:border-sky-400"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-lg mt-6"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <span>{requiresMfa ? 'Verify & Authenticate' : 'Sign In'}</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Need an account?{' '}
          <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-medium">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};
