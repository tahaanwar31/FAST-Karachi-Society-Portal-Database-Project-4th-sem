import React, { useEffect, useState } from 'react';
import { EventCard } from '../components/EventCard';
import { Search, Calendar as CalendarIcon, ShieldCheck, Zap, Users, Linkedin, Github } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

const smoothTransition = { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const };
const staggerDelay = 0.06;

export const Landing: React.FC = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('/api/events')
      .then(res => res.json())
      .then(data => {
        setEvents(data);
        setLoading(false);
      });
  }, []);

  const filteredEvents = events.filter((e: any) =>
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.society_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden py-32">
        <div className="max-w-7xl w-full text-center relative z-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-10"
          >
            FAST NUCES Karachi
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ ...smoothTransition, delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
            className="text-7xl md:text-[12rem] font-extrabold tracking-tighter font-display leading-[0.75] text-white select-none mb-8 cursor-default group"
          >
            <span className="inline-block transition-colors duration-500 group-hover:text-blue-400">FAST</span> <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white/30 to-transparent transition-all duration-500 group-hover:from-blue-400/80 group-hover:to-blue-400/20">CLUSTERS</span>
            <span className="text-blue-400 text-2xl md:text-5xl opacity-50 ml-1 transition-opacity duration-500 group-hover:opacity-100">.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-base text-zinc-400 max-w-lg mx-auto mb-10 leading-relaxed"
          >
            The official platform for managing society events at FAST NUCES Karachi.
            Browse events, register, and stay connected with campus life.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link to="/login" className="btn-primary text-base px-8 py-3">
              Get Started
            </Link>
          </motion.div>
        </div>

        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[80%] h-[400px] bg-blue-600/5 rounded-full blur-[160px] -z-10" />
      </section>

      {/* Search + Events */}
      <div id="search-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-30">
        <div className="mb-10">
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Search events..."
              className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none text-white text-sm focus:border-blue-500/30 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-72 bg-white/[0.02] rounded-xl animate-pulse border border-white/[0.06]" />
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: staggerDelay } }
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredEvents.map((event: any) => (
              <motion.div
                key={event.id}
                variants={{
                  hidden: { opacity: 0, y: 16 },
                  visible: { opacity: 1, y: 0, transition: smoothTransition }
                }}
              >
                <EventCard
                  event={event}
                  onAction={() => { window.location.href = `/login`; }}
                  actionLabel="Register"
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-24 glass rounded-xl">
            <CalendarIcon className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No events found</h3>
            <p className="text-sm text-zinc-400">No events match your search. Try a different keyword.</p>
          </div>
        )}
      </div>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: ShieldCheck, title: 'Admin Approved', desc: 'Every event is reviewed and approved by university administration before going live.' },
            { icon: Zap, title: 'Instant Registration', desc: 'Register for events with a single click. Get real-time updates on availability.' },
            { icon: Users, title: 'All Societies', desc: 'One platform for every society at FAST Karachi. Browse, discover, and participate.' },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...smoothTransition, delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="glass-card p-6 rounded-xl"
            >
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4 border border-blue-500/20">
                <feature.icon className="w-5 h-5 text-blue-400" />
              </div>
              <h4 className="text-base font-semibold text-white mb-2">{feature.title}</h4>
              <p className="text-sm text-zinc-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-12 border-t border-white/[0.06]">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-8">
            <div>
              <div className="text-sm font-medium text-zinc-500 mb-1">Developed by</div>
              <div className="text-base font-semibold text-white mb-1">Taha Anwar</div>
              <div className="text-sm text-zinc-500 mb-2">Full-Stack Developer</div>
              <div className="flex items-center gap-3">
                <a href="https://www.linkedin.com/in/taha-anwar-1977231ba/" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-blue-400 transition-colors">
                  <Linkedin className="w-4 h-4" />
                </a>
                <a href="https://github.com/tahaanwar31" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">
                  <Github className="w-4 h-4" />
                </a>
                <a href="https://wa.me/923132896244" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-emerald-400 transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </a>
              </div>
            </div>
            <div className="w-px h-8 bg-white/[0.06]" />
            <div>
              <div className="text-base font-semibold text-white">Hamza Atif</div>
              <div className="text-sm text-zinc-500">Co-Developer</div>
            </div>
          </div>
          <div className="text-sm text-zinc-600">
            2026 FAST Karachi Society Portal
          </div>
        </div>
      </footer>
    </div>
  );
};
