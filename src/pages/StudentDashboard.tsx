import React, { useEffect, useState } from 'react';
import { EventCard } from '../components/EventCard';
import { Calendar, CheckCircle, Layout, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

const smoothTransition = { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const };

export const StudentDashboard: React.FC = () => {
  const [events, setEvents] = useState([]);
  const [registeredEvents, setRegisteredEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const [eRes, rRes] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/registrations/my')
      ]);
      setEvents(await eRes.json());
      setRegisteredEvents(await rRes.json());
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleRegister = async (eventId: string) => {
    setErrorMsg('');
    try {
      const res = await fetch(`/api/events/${eventId}/register`, { method: 'POST' });
      if (res.ok) {
        setRegisteredEvents([...registeredEvents, eventId]);
        const eRes = await fetch('/api/events');
        setEvents(await eRes.json());
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Registration failed');
      }
    } catch {
      setErrorMsg('Something went wrong');
    }
  };

  const upcomingEvents = events.filter((e: any) => registeredEvents.includes(e.id));
  const availableEvents = events.filter((e: any) => !registeredEvents.includes(e.id));

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={smoothTransition}
        className="mb-10"
      >
        <h2 className="text-3xl font-bold tracking-tight text-white">My Dashboard</h2>
        <p className="text-sm text-zinc-400 mt-1">Browse and register for upcoming society events</p>
      </motion.div>

      {errorMsg && (
        <div className="mb-6 bg-rose-500/10 text-rose-400 p-3 rounded-xl text-sm border border-rose-500/20">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-10">
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
                  <Layout className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Upcoming Events</h3>
              </div>
              <span className="text-xs text-zinc-500 bg-white/[0.03] px-3 py-1 rounded-full border border-white/[0.06]">
                {availableEvents.length} available
              </span>
            </div>

            {availableEvents.length > 0 ? (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
                }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {availableEvents.map((event: any) => (
                  <motion.div
                    key={event.id}
                    variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: smoothTransition } }}
                  >
                    <EventCard
                      event={event}
                      onAction={() => handleRegister(event.id)}
                      actionLabel="Register"
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="py-20 glass rounded-xl text-center">
                <p className="text-sm text-zinc-500">No events available right now. Check back later!</p>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="glass p-5 rounded-xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
                <CheckCircle className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="text-base font-semibold text-white">My Registrations</h3>
            </div>

            <div className="space-y-3">
              {upcomingEvents.length > 0 ? upcomingEvents.map((event: any) => (
                <motion.div
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={event.id}
                  className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06] hover:border-blue-500/20 transition-colors"
                >
                  <h4 className="text-sm font-medium text-white mb-2">{event.title}</h4>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>{event.time}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {event.date}
                    </span>
                  </div>
                </motion.div>
              )) : (
                <div className="text-center py-12">
                  <Calendar className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">No registrations yet</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
