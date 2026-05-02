import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Building2, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const quickLogin = async (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
    setIsLoggingIn(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-8 text-center border-b border-white/[0.06]">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Welcome back</h2>
            <p className="text-sm text-zinc-400 mt-2">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5 text-white">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-500/10 text-rose-400 p-3 rounded-xl text-sm border border-rose-500/20"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="email"
                    required
                    placeholder="name@nu.edu.pk"
                    className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl focus:ring-2 focus:ring-blue-500/40 transition-all outline-none text-white text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="password"
                    required
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl focus:ring-2 focus:ring-blue-500/40 transition-all outline-none text-white text-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : 'Sign in'}
            </button>
          </form>

          <div className="px-8 pb-8">
            <div className="p-5 bg-white/[0.02] rounded-xl border border-white/[0.06]">
              <div className="text-sm font-medium text-blue-400 mb-3">Demo Accounts</div>
              <div className="space-y-1">
                {[
                  { label: 'Admin', email: 'admin@nu.edu.pk', password: 'admin123' },
                  { label: 'Society Head (Procom)', email: 'headprocom@nu.edu.pk', password: 'pass123' },
                  { label: 'Society Head (ACES)', email: 'headaces@nu.edu.pk', password: 'pass123' },
                  { label: 'Student (Taha)', email: 'taha@nu.edu.pk', password: 'student123' },
                  { label: 'Student (Ali)', email: 'ali.raza@nu.edu.pk', password: 'student123' },
                ].map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => quickLogin(account.email, account.password)}
                    disabled={isLoggingIn}
                    className="w-full text-left text-sm text-zinc-500 hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-white/[0.03] flex items-center justify-between group disabled:opacity-50"
                  >
                    <span>{account.label}</span>
                    <span className="text-xs text-zinc-600 group-hover:text-blue-400 transition-colors">{account.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
