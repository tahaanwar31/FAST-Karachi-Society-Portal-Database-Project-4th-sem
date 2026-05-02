import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { LogOut, User as UserIcon, Building2, LayoutDashboard, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navLinks = (
    <>
      <Link
        to="/"
        onClick={() => setMobileOpen(false)}
        className={`text-sm font-medium transition-colors ${isActive('/') ? 'text-blue-400' : 'text-zinc-400 hover:text-white'}`}
      >
        Events
      </Link>
      {user && (
        <Link
          to="/dashboard"
          onClick={() => setMobileOpen(false)}
          className={`text-sm font-medium transition-colors flex items-center gap-2 ${isActive('/dashboard') ? 'text-blue-400' : 'text-zinc-400 hover:text-white'}`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </Link>
      )}
    </>
  );

  return (
    <>
      <nav className="glass sticky top-0 z-50 px-6 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="bg-blue-500 p-2 rounded-lg group-hover:rotate-[360deg] transition-transform duration-700">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white font-display leading-none">
                FAST<span className="text-blue-400 font-medium">KHI</span>
              </span>
              <span className="text-xs text-zinc-500">Society Portal</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks}
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-white/10">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-white leading-none">{user.name}</div>
                    <div className="text-xs text-blue-400 mt-1">
                      {user.role === 'ADMIN' ? 'Admin' : user.role === 'SOCIETY_HEAD' ? 'Society Head' : 'Student'}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-blue-400" />
                  </div>
                </div>
                <button
                  onClick={() => logout()}
                  className="p-2 text-zinc-500 hover:text-rose-400 transition-colors rounded-lg"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn-primary">
                Sign In
              </Link>
            )}
            <button
              className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[100] md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-72 bg-zinc-950 border-l border-white/[0.06] p-6 flex flex-col"
            >
              <div className="flex justify-between items-center mb-8">
                <span className="text-lg font-bold text-white font-display">Menu</span>
                <button onClick={() => setMobileOpen(false)} className="p-2 text-zinc-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-col gap-4">
                {navLinks}
              </div>
              {user && (
                <div className="mt-auto pt-6 border-t border-white/[0.06] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{user.name}</div>
                    <div className="text-xs text-zinc-500">{user.email}</div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
