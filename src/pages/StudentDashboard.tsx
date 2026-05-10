import React, { useEffect, useState } from 'react';
import { EventCard } from '../components/EventCard';
import { Calendar, CheckCircle, Layout, Loader2, Star, MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const smoothTransition = { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const };

export const StudentDashboard: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Feedback state
  const [feedbackModal, setFeedbackModal] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [eRes, rRes] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/registrations/my')
      ]);
      const eData = await eRes.json();
      const rData = await rRes.json();
      setEvents(eData);
      setRegistrations(rData);
      setLoading(false);
    };
    fetchData();
  }, []);

  const regIds = registrations.filter(r => r.status === 'REGISTERED').map((r: any) => r.event_id);
  const attendedIds = registrations.filter(r => r.status === 'ATTENDED').map((r: any) => r.event_id);

  const upcomingEvents = events.filter((e: any) => regIds.includes(e.id));
  const attendedEvents = events.filter((e: any) => attendedIds.includes(e.id));
  const availableEvents = events.filter((e: any) => !regIds.includes(e.id) && !attendedIds.includes(e.id));

  const handleRegister = async (eventId: string) => {
    setErrorMsg('');
    try {
      const res = await fetch(`/api/events/${eventId}/register`, { method: 'POST' });
      if (res.ok) {
        const newReg = { event_id: eventId, status: 'REGISTERED' };
        setRegistrations([...registrations, newReg]);
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

  const handleUnregister = async (eventId: string) => {
    setErrorMsg('');
    try {
      const res = await fetch(`/api/events/${eventId}/unregister`, { method: 'POST' });
      if (res.ok) {
        setRegistrations(registrations.filter(r => r.event_id !== eventId));
        const eRes = await fetch('/api/events');
        setEvents(await eRes.json());
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Unregister failed');
      }
    } catch {
      setErrorMsg('Something went wrong');
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackModal) return;
    setFeedbackSubmitting(true);
    try {
      const res = await fetch(`/api/events/${feedbackModal}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: feedbackRating, comments: feedbackComment })
      });
      if (res.ok) {
        setFeedbackGiven([...feedbackGiven, feedbackModal]);
        setFeedbackModal(null);
        setFeedbackComment('');
        setFeedbackRating(5);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Feedback failed');
      }
    } catch {
      setErrorMsg('Something went wrong');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="p-5 glass rounded-xl">
          <span className="text-sm text-zinc-500">Available Events</span>
          <div className="text-3xl font-bold text-white mt-2">{availableEvents.length}</div>
        </div>
        <div className="p-5 glass rounded-xl">
          <span className="text-sm text-zinc-500">Registered</span>
          <div className="text-3xl font-bold text-blue-400 mt-2">{upcomingEvents.length}</div>
        </div>
        <div className="p-5 glass rounded-xl">
          <span className="text-sm text-zinc-500">Attended</span>
          <div className="text-3xl font-bold text-emerald-400 mt-2">{attendedEvents.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-10">
          {/* Available Events */}
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

          {/* Attended Events */}
          {attendedEvents.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Attended Events</h3>
                </div>
                <span className="text-xs text-zinc-500 bg-white/[0.03] px-3 py-1 rounded-full border border-white/[0.06]">
                  {attendedEvents.length} attended
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {attendedEvents.map((event: any) => (
                  <div key={event.id} className="glass p-5 rounded-xl flex flex-col">
                    <span className="text-xs text-zinc-500 mb-1">{event.society_name}</span>
                    <h4 className="text-base font-semibold text-white mb-2">{event.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4">
                      <Calendar className="w-3.5 h-3.5" /> {event.date} at {event.time}
                    </div>
                    <div className="mt-auto">
                      {feedbackGiven.includes(event.id) ? (
                        <span className="text-xs text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" /> Feedback submitted
                        </span>
                      ) : (
                        <button
                          onClick={() => { setFeedbackModal(event.id); setFeedbackRating(5); setFeedbackComment(''); }}
                          className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
                        >
                          <Star className="w-4 h-4" /> Give Feedback
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar: My Registrations */}
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
                  <div className="flex items-center justify-between text-xs text-zinc-500 mb-3">
                    <span>{event.time}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {event.date}
                    </span>
                  </div>
                  <button
                    onClick={() => handleUnregister(event.id)}
                    className="w-full py-1.5 text-xs text-rose-400 border border-rose-500/20 rounded-lg hover:bg-rose-500/10 transition-colors"
                  >
                    Unregister
                  </button>
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

      {/* Feedback Modal */}
      <AnimatePresence>
        {feedbackModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFeedbackModal(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass w-full max-w-md relative z-10 rounded-2xl overflow-hidden border border-white/10"
            >
              <div className="p-6 border-b border-white/[0.06] flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-white">Submit Feedback</h3>
                  <p className="text-xs text-zinc-500 mt-1">Rate and review this event</p>
                </div>
                <button onClick={() => setFeedbackModal(null)} className="text-zinc-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                {/* Star Rating */}
                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-3 block">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFeedbackRating(star)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 ${star <= feedbackRating ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-600'}`}
                        />
                      </button>
                    ))}
                    <span className="ml-3 text-sm text-zinc-400 self-center">{feedbackRating}/5</span>
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Comments (optional)</label>
                  <textarea
                    placeholder="Share your experience..."
                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-sm text-white h-28"
                    value={feedbackComment}
                    onChange={e => setFeedbackComment(e.target.value)}
                  />
                </div>

                <button
                  onClick={handleSubmitFeedback}
                  disabled={feedbackSubmitting}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                >
                  {feedbackSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                  Submit Feedback
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
