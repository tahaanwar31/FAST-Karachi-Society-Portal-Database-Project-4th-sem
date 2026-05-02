import React, { useEffect, useState } from 'react';
import { Plus, Calendar, Users, MapPin, Loader2, ListChecks, X, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const SocietyHeadDashboard: React.FC = () => {
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    capacity: 100,
    venue_id: ''
  });

  const fetchData = async () => {
    const [eRes, vRes] = await Promise.all([
      fetch('/api/head/my-events'),
      fetch('/api/venues')
    ]);
    const [eData, vData] = await Promise.all([eRes.json(), vRes.json()]);
    setEvents(eData);
    setVenues(vData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/head/create-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setShowModal(false);
      fetchData();
      setFormData({ title: '', description: '', date: '', time: '', capacity: 100, venue_id: '' });
    }
  };

  const totalRegs = events.reduce((acc: number, e: any) => acc + (e.reg_count || 0), 0);
  const avgRegs = events.length > 0 ? (totalRegs / events.length).toFixed(1) : '0';

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
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10"
      >
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">My Events</h2>
          <p className="text-sm text-zinc-400 mt-1">Manage your society's events and registrations</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Event
        </button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="p-5 glass rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
              <Calendar className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-sm text-zinc-500">Total Events</span>
          </div>
          <div className="text-3xl font-bold text-white">{events.length}</div>
        </div>
        <div className="p-5 glass rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-sm text-zinc-500">Total Registrations</span>
          </div>
          <div className="text-3xl font-bold text-white">{totalRegs}</div>
        </div>
        <div className="p-5 glass rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
              <BarChart3 className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-sm text-zinc-500">Avg. Registrations</span>
          </div>
          <div className="text-3xl font-bold text-white">{avgRegs}</div>
        </div>
      </div>

      {/* Events Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
          <ListChecks className="w-5 h-5 text-blue-400" />
          <h3 className="text-base font-semibold text-white">Events</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="px-6 py-3 text-xs font-medium text-zinc-500">Event</th>
                <th className="px-6 py-3 text-xs font-medium text-zinc-500">Details</th>
                <th className="px-6 py-3 text-xs font-medium text-zinc-500">Capacity</th>
                <th className="px-6 py-3 text-xs font-medium text-zinc-500 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {events.map((event: any) => (
                <tr key={event.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors mb-0.5">{event.title}</div>
                    <div className="text-xs text-zinc-500 line-clamp-1">{event.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-zinc-300 mb-0.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-400" />
                      {event.venue_name}
                    </div>
                    <div className="text-xs text-zinc-500">{event.date} at {event.time}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-24 bg-white/[0.06] h-1.5 rounded-full overflow-hidden mb-1">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, (event.reg_count / event.capacity) * 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-zinc-500">{event.reg_count} / {event.capacity}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium border ${
                      event.status === 'PUBLISHED'
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        : event.status === 'PENDING'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {event.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Event Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass w-full max-w-xl relative z-10 rounded-2xl overflow-hidden border border-white/10"
            >
              <div className="p-6 border-b border-white/[0.06] flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-white">Create Event</h3>
                  <p className="text-xs text-zinc-500 mt-1">Events require admin approval before going live</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5 text-white">
                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Title</label>
                  <input
                    required
                    placeholder="e.g. Annual Tech Competition"
                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-sm"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Description</label>
                  <textarea
                    required
                    placeholder="Describe the event..."
                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-sm h-28"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Date</label>
                    <input
                      type="date"
                      required
                      className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-sm"
                      style={{ colorScheme: 'dark' }}
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Time</label>
                    <input
                      type="time"
                      required
                      className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-sm"
                      style={{ colorScheme: 'dark' }}
                      value={formData.time}
                      onChange={e => setFormData({...formData, time: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Capacity</label>
                    <input
                      type="number"
                      required
                      className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-sm"
                      value={formData.capacity}
                      onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Venue</label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-sm"
                      value={formData.venue_id}
                      onChange={e => setFormData({...formData, venue_id: e.target.value})}
                    >
                      <option value="">Select venue</option>
                      {venues.map((v: any) => (
                        <option key={v.id} value={v.id} className="bg-zinc-900 text-white">{v.name} ({v.capacity})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full py-3 mt-2">
                  Submit for Approval
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
