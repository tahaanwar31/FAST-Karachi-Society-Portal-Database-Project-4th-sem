import React, { useEffect, useState } from 'react';
import { Plus, Calendar, Users, MapPin, Loader2, ListChecks, X, BarChart3, Star, Bell, Edit3, Trash2, Eye, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const SocietyHeadDashboard: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', date: '', time: '', capacity: 100, venue_id: '' });

  // Participants & Attendance
  const [showParticipants, setShowParticipants] = useState<string | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [attendanceSaving, setAttendanceSaving] = useState(false);

  // Feedback
  const [showFeedback, setShowFeedback] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [allFeedbacks, setAllFeedbacks] = useState<any[]>([]);

  // Event Requests
  const [showEditRequest, setShowEditRequest] = useState<string | null>(null);
  const [showDeleteRequest, setShowDeleteRequest] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', date: '', time: '', capacity: 100, venue_id: '' });
  const [deleteReason, setDeleteReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchData = async () => {
    const [eRes, vRes, fbRes, notifRes] = await Promise.all([
      fetch('/api/head/my-events'),
      fetch('/api/venues'),
      fetch('/api/head/feedback'),
      fetch('/api/head/notifications')
    ]);
    const [eData, vData, fbData, notifData] = await Promise.all([eRes.json(), vRes.json(), fbRes.json(), notifRes.json()]);
    setEvents(eData);
    setVenues(vData);
    setAllFeedbacks(fbData);
    setNotifications(notifData);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

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

  const openParticipants = async (eventId: string) => {
    const res = await fetch(`/api/events/${eventId}/attendance`);
    setParticipants(await res.json());
    setShowParticipants(eventId);
  };

  const handleMarkAttendance = async (eventId: string) => {
    setAttendanceSaving(true);
    const attendedIds = participants.filter(p => p.attendance_status === 'ATTENDED').map(p => p.id);
    await fetch('/api/head/mark-attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, user_ids: attendedIds })
    });
    setAttendanceSaving(false);
    // Refresh participants
    const res = await fetch(`/api/events/${eventId}/attendance`);
    setParticipants(await res.json());
  };

  const toggleAttendance = (userId: string) => {
    setParticipants(participants.map(p =>
      p.id === userId
        ? { ...p, attendance_status: p.attendance_status === 'ATTENDED' ? 'REGISTERED' : 'ATTENDED' }
        : p
    ));
  };

  const openFeedback = async (eventId: string) => {
    const res = await fetch(`/api/events/${eventId}/feedback`);
    setFeedbacks(await res.json());
    setShowFeedback(eventId);
  };

  const openEditRequest = (event: any) => {
    setEditForm({
      title: event.title,
      description: event.description || '',
      date: event.date,
      time: event.time,
      capacity: event.capacity,
      venue_id: event.venue_id
    });
    setShowEditRequest(event.id);
  };

  const handleSubmitEditRequest = async () => {
    if (!showEditRequest) return;
    setSubmitting(true);
    await fetch('/api/head/event-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: showEditRequest, request_type: 'UPDATE', ...editForm })
    });
    setSubmitting(false);
    setShowEditRequest(null);
    fetchData();
  };

  const handleSubmitDeleteRequest = async () => {
    if (!showDeleteRequest) return;
    setSubmitting(true);
    await fetch('/api/head/event-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: showDeleteRequest, request_type: 'DELETE', reason: deleteReason })
    });
    setSubmitting(false);
    setShowDeleteRequest(null);
    setDeleteReason('');
    fetchData();
  };

  const totalRegs = events.reduce((acc: number, e: any) => acc + Number(e.reg_count || 0), 0);
  const avgRegs = events.length > 0 ? (totalRegs / events.length).toFixed(1) : '0';
  const availableVenues = venues.filter((v: any) => v.availability !== 'NO');

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
        <div className="flex items-center gap-3">
          {notifications.length > 0 && (
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative btn-secondary flex items-center gap-2 !py-2">
              <Bell className="w-4 h-4" /> Notifications
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">{notifications.length}</span>
            </button>
          )}
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Event
          </button>
        </div>
      </motion.div>

      {/* Notifications */}
      <AnimatePresence>
        {showNotifications && notifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 overflow-hidden"
          >
            <div className="glass rounded-xl p-5 space-y-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
                <Bell className="w-4 h-4 text-amber-400" /> Request Notifications
              </h3>
              {notifications.map((n: any) => (
                <div key={n.id} className={`p-4 rounded-xl border ${n.status === 'APPROVED' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {n.status === 'APPROVED' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                    <span className="text-sm font-medium text-white">{n.event_title} - {n.request_type} Request</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${n.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{n.status}</span>
                  </div>
                  {n.admin_reason && <p className="text-xs text-zinc-400 mt-1">Reason: {n.admin_reason}</p>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="p-5 glass rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20"><Calendar className="w-4 h-4 text-blue-400" /></div>
            <span className="text-sm text-zinc-500">Total Events</span>
          </div>
          <div className="text-3xl font-bold text-white">{events.length}</div>
        </div>
        <div className="p-5 glass rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20"><Users className="w-4 h-4 text-blue-400" /></div>
            <span className="text-sm text-zinc-500">Total Registrations</span>
          </div>
          <div className="text-3xl font-bold text-white">{totalRegs}</div>
        </div>
        <div className="p-5 glass rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20"><BarChart3 className="w-4 h-4 text-blue-400" /></div>
            <span className="text-sm text-zinc-500">Avg. Registrations</span>
          </div>
          <div className="text-3xl font-bold text-white">{avgRegs}</div>
        </div>
        <div className="p-5 glass rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center border border-amber-500/20"><Star className="w-4 h-4 text-amber-400" /></div>
            <span className="text-sm text-zinc-500">Feedback Received</span>
          </div>
          <div className="text-3xl font-bold text-white">{allFeedbacks.length}</div>
        </div>
      </div>

      {/* Events Table */}
      <div className="glass rounded-xl overflow-hidden mb-10">
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
                <th className="px-6 py-3 text-xs font-medium text-zinc-500">Status</th>
                <th className="px-6 py-3 text-xs font-medium text-zinc-500 text-right">Actions</th>
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
                      <MapPin className="w-3.5 h-3.5 text-blue-400" />{event.venue_name}
                    </div>
                    <div className="text-xs text-zinc-500">{event.date} at {event.time}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-24 bg-white/[0.06] h-1.5 rounded-full overflow-hidden mb-1">
                      <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (Number(event.reg_count) / Number(event.capacity)) * 100)}%` }} />
                    </div>
                    <div className="text-xs text-zinc-500">{Number(event.reg_count)} / {event.capacity}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium border ${
                      event.status === 'PUBLISHED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        : event.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>{event.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openParticipants(event.id)} className="p-2 hover:bg-white/[0.06] rounded-lg text-zinc-500 hover:text-blue-400 transition-colors" title="View Participants">
                        <Users className="w-4 h-4" />
                      </button>
                      <button onClick={() => openFeedback(event.id)} className="p-2 hover:bg-white/[0.06] rounded-lg text-zinc-500 hover:text-amber-400 transition-colors" title="View Feedback">
                        <Star className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEditRequest(event)} className="p-2 hover:bg-white/[0.06] rounded-lg text-zinc-500 hover:text-blue-400 transition-colors" title="Request Edit">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setShowDeleteRequest(event.id)} className="p-2 hover:bg-white/[0.06] rounded-lg text-zinc-500 hover:text-rose-400 transition-colors" title="Request Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feedback Overview */}
      {allFeedbacks.length > 0 && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
            <Star className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-semibold text-white">Recent Feedback</h3>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {allFeedbacks.slice(0, 5).map((fb: any) => (
              <div key={fb.id} className="px-6 py-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-white">{fb.user_name}</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < fb.rating ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-600'}`} />
                    ))}
                  </div>
                </div>
                <div className="text-xs text-zinc-500 mb-1">{fb.event_title}</div>
                {fb.comments && <p className="text-sm text-zinc-400">{fb.comments}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="glass w-full max-w-xl relative z-10 rounded-2xl overflow-hidden border border-white/10">
              <div className="p-6 border-b border-white/[0.06] flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-white">Create Event</h3>
                  <p className="text-xs text-zinc-500 mt-1">Events require admin approval before going live</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5 text-white">
                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Title</label>
                  <input required placeholder="e.g. Annual Tech Competition" className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-sm" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Description</label>
                  <textarea required placeholder="Describe the event..." className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-sm h-28" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Date</label>
                    <input type="date" required className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-sm" style={{ colorScheme: 'dark' }} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Time</label>
                    <input type="time" required className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-sm" style={{ colorScheme: 'dark' }} value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Capacity</label>
                    <input type="number" required className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-sm" value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Venue</label>
                    <select required className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-sm" value={formData.venue_id} onChange={e => setFormData({...formData, venue_id: e.target.value})}>
                      <option value="">Select venue</option>
                      {availableVenues.map((v: any) => (
                        <option key={v.id} value={v.id} className="bg-zinc-900 text-white">{v.name} ({v.capacity})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full py-3 mt-2">Submit for Approval</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Participants Modal with Attendance */}
      <AnimatePresence>
        {showParticipants && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowParticipants(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} className="glass w-full max-w-3xl relative z-10 rounded-2xl overflow-hidden border border-white/10">
              <div className="p-6 border-b border-white/[0.06] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-blue-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Participants & Attendance</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Toggle attendance for each participant</p>
                  </div>
                </div>
                <button onClick={() => setShowParticipants(null)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="overflow-x-auto max-h-[60vh]">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-zinc-950/90 backdrop-blur-sm border-b border-white/[0.06]">
                    <tr>
                      <th className="px-6 py-3 text-xs font-medium text-zinc-500">Name</th>
                      <th className="px-6 py-3 text-xs font-medium text-zinc-500">Roll No</th>
                      <th className="px-6 py-3 text-xs font-medium text-zinc-500">Email</th>
                      <th className="px-6 py-3 text-xs font-medium text-zinc-500">Attended</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {participants.length > 0 ? participants.map((p: any) => (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-3 text-sm text-white font-medium">{p.name}</td>
                        <td className="px-6 py-3 text-sm text-blue-400 font-mono">{p.roll_no}</td>
                        <td className="px-6 py-3 text-sm text-zinc-400">{p.email}</td>
                        <td className="px-6 py-3">
                          <button
                            onClick={() => toggleAttendance(p.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                              p.attendance_status === 'ATTENDED'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-white/[0.03] text-zinc-500 border-white/[0.06] hover:border-blue-500/20 hover:text-blue-400'
                            }`}
                          >
                            {p.attendance_status === 'ATTENDED' ? 'Present' : 'Absent'}
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-zinc-500">No participants registered yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {participants.length > 0 && (
                <div className="p-4 border-t border-white/[0.06] flex justify-end">
                  <button onClick={() => handleMarkAttendance(showParticipants)} disabled={attendanceSaving} className="btn-primary flex items-center gap-2 !py-2">
                    {attendanceSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Save Attendance
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Feedback Modal */}
      <AnimatePresence>
        {showFeedback && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFeedback(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} className="glass w-full max-w-2xl relative z-10 rounded-2xl overflow-hidden border border-white/10">
              <div className="p-6 border-b border-white/[0.06] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-semibold text-white">Event Feedback</h3>
                </div>
                <button onClick={() => setShowFeedback(null)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {feedbacks.length > 0 ? feedbacks.map((fb: any) => (
                  <div key={fb.id} className="px-6 py-4 border-b border-white/[0.04] last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{fb.user_name}</span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < fb.rating ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-600'}`} />
                        ))}
                      </div>
                    </div>
                    {fb.comments && <p className="text-sm text-zinc-400">{fb.comments}</p>}
                    <span className="text-xs text-zinc-600 mt-1 block">{fb.created_at ? new Date(fb.created_at).toLocaleDateString() : ''}</span>
                  </div>
                )) : (
                  <div className="px-6 py-16 text-center">
                    <Star className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                    <p className="text-sm text-zinc-500">No feedback yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Request Modal */}
      <AnimatePresence>
        {showEditRequest && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditRequest(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="glass w-full max-w-xl relative z-10 rounded-2xl overflow-hidden border border-white/10">
              <div className="p-6 border-b border-white/[0.06] flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-white">Request Event Update</h3>
                  <p className="text-xs text-zinc-500 mt-1">Changes will be applied after admin approval</p>
                </div>
                <button onClick={() => setShowEditRequest(null)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-5 text-white">
                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Title</label>
                  <input className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-sm" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Description</label>
                  <textarea className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-sm h-28" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Date</label>
                    <input type="date" className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-sm" style={{ colorScheme: 'dark' }} value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Time</label>
                    <input type="time" className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-sm" style={{ colorScheme: 'dark' }} value={editForm.time} onChange={e => setEditForm({...editForm, time: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Capacity</label>
                    <input type="number" className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-sm" value={editForm.capacity} onChange={e => setEditForm({...editForm, capacity: parseInt(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Venue</label>
                    <select className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-sm" value={editForm.venue_id} onChange={e => setEditForm({...editForm, venue_id: e.target.value})}>
                      <option value="">Select venue</option>
                      {availableVenues.map((v: any) => (
                        <option key={v.id} value={v.id} className="bg-zinc-900 text-white">{v.name} ({v.capacity})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button onClick={handleSubmitEditRequest} disabled={submitting} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
                  Submit Update Request
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Request Modal */}
      <AnimatePresence>
        {showDeleteRequest && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteRequest(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="glass w-full max-w-md relative z-10 rounded-2xl overflow-hidden border border-white/10">
              <div className="p-6 border-b border-white/[0.06] flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-white">Request Event Deletion</h3>
                  <p className="text-xs text-zinc-500 mt-1">Admin will review your request</p>
                </div>
                <button onClick={() => setShowDeleteRequest(null)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-5 text-white">
                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Reason for deletion</label>
                  <textarea
                    required
                    placeholder="Explain why this event should be deleted..."
                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-rose-500/40 transition-all text-sm h-28"
                    value={deleteReason}
                    onChange={e => setDeleteReason(e.target.value)}
                  />
                </div>
                <button onClick={handleSubmitDeleteRequest} disabled={submitting || !deleteReason} className="w-full py-3 rounded-xl text-sm font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Submit Delete Request
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
