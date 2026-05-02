import React, { useEffect, useState } from 'react';
import { Check, X, ShieldAlert, Users, Calendar, Activity, BarChart3, Loader2, Database as DbIcon, Layout, Terminal, Plus, Trash2, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AdminDashboard: React.FC = () => {
  const [pendingEvents, setPendingEvents] = useState([]);
  const [publishedEvents, setPublishedEvents] = useState([]);
  const [societies, setSocieties] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'GUI' | 'SQL'>('GUI');
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM users LIMIT 10;');
  const [queryResult, setQueryResult] = useState<any[] | null>(null);
  const [queryError, setQueryError] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [dbInspector, setDbInspector] = useState<any | null>(null);

  // GUI State
  const [showAddSociety, setShowAddSociety] = useState(false);
  const [newSoc, setNewSoc] = useState({
    name: '',
    description: '',
    category: 'TECHNICAL',
    established_year: new Date().getFullYear(),
    contact_email: '',
    vision: ''
  });
  const [viewingParticipants, setViewingParticipants] = useState<any[] | null>(null);
  const [assigningRole, setAssigningRole] = useState<{ socId: string, roleType: 'HEAD' | 'CO_HEAD' } | null>(null);

  // Dedicated tables state
  const [activeTab, setActiveTab] = useState<'events' | 'admins' | 'heads' | 'coheads' | 'members'>('events');
  const [admins, setAdmins] = useState([]);
  const [heads, setHeads] = useState([]);
  const [coHeads, setCoHeads] = useState([]);
  const [studentMembers, setStudentMembers] = useState([]);
  const [stats, setStats] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pendingRes, publishedRes, socRes, userRes, statsRes, adminsRes, headsRes, coHeadsRes, membersRes] = await Promise.all([
        fetch('/api/admin/pending-events'),
        fetch('/api/events'),
        fetch('/api/societies'),
        fetch('/api/admin/users'),
        fetch('/api/admin/stats'),
        fetch('/api/admin/admins'),
        fetch('/api/admin/heads'),
        fetch('/api/admin/co-heads'),
        fetch('/api/admin/student-members')
      ]);
      setPendingEvents(await pendingRes.json());
      setPublishedEvents(await publishedRes.json());
      setSocieties(await socRes.json());
      setUsers(await userRes.json());
      setStats(await statsRes.json());
      setAdmins(await adminsRes.json());
      setHeads(await headsRes.json());
      setCoHeads(await coHeadsRes.json());
      setStudentMembers(await membersRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (id: string) => {
    await fetch(`/api/admin/approve-event/${id}`, { method: 'POST' });
    fetchData();
  };

  const handleReject = async (id: string) => {
    await fetch(`/api/admin/reject-event/${id}`, { method: 'POST' });
    fetchData();
  };

  const handleViewParticipants = async (id: string) => {
    const res = await fetch(`/api/events/${id}/participants`);
    setViewingParticipants(await res.json());
  };

  const handleExecuteSQL = async () => {
    setIsExecuting(true);
    setQueryError('');
    setQueryResult(null);
    try {
      const res = await fetch('/api/admin/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sqlQuery })
      });
      const data = await res.json();
      if (res.ok) {
        setQueryResult(Array.isArray(data) ? data : [data]);
      } else {
        setQueryError(data.error);
      }
    } catch {
      setQueryError('Failed to execute query');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleAddSociety = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/societies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSoc)
    });
    setNewSoc({ name: '', description: '', category: 'TECHNICAL', established_year: new Date().getFullYear(), contact_email: '', vision: '' });
    setShowAddSociety(false);
    fetchData();
  };

  const inspectDatabase = async () => {
    try {
      const res = await fetch('/api/admin/system/inspect');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Inspection failed');
      setDbInspector(data);
    } catch (err: any) {
      setQueryError(err.message);
      setDbInspector(null);
    }
  };

  const handleAssignRole = async (userId: string) => {
    if (!assigningRole) return;
    await fetch(`/api/admin/societies/${assigningRole.socId}/roles`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [assigningRole.roleType === 'HEAD' ? 'head_id' : 'co_head_id']: userId })
    });
    setAssigningRole(null);
    fetchData();
  };

  const handleDeleteSociety = async (id: string) => {
    if (!confirm('Are you sure? This will delete the society.')) return;
    await fetch(`/api/admin/societies/${id}`, { method: 'DELETE' });
    fetchData();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-10"
      >
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Admin Dashboard</h2>
          <p className="text-sm text-zinc-400 mt-1">Manage events, societies, and users</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white/[0.03] p-1 rounded-lg border border-white/[0.06]">
            <button onClick={() => setMode('GUI')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'GUI' ? 'bg-blue-500 text-white' : 'text-zinc-500 hover:text-white'}`}>
              <Layout className="w-4 h-4" /> Interface
            </button>
            <button onClick={() => setMode('SQL')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'SQL' ? 'bg-blue-500 text-white' : 'text-zinc-500 hover:text-white'}`}>
              <Terminal className="w-4 h-4" /> SQL
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {mode === 'GUI' ? (
          <motion.div key="gui" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-10">

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Pending Events', value: pendingEvents.length, icon: Activity, color: 'amber' },
                { label: 'Societies', value: societies.length, icon: Users, color: 'blue' },
                { label: 'Users', value: users.length, icon: Users, color: 'blue' },
                { label: 'Registrations', value: stats?.registrations?.count || 0, icon: BarChart3, color: 'blue' },
              ].map(stat => (
                <div key={stat.label} className="p-5 glass rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <stat.icon className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-zinc-500">{stat.label}</span>
                  </div>
                  <div className="text-3xl font-bold text-white">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Pending Events */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center border border-amber-500/20">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Pending Approval</h3>
              </div>

              {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
              ) : pendingEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pendingEvents.map((event: any) => (
                    <motion.div key={event.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 rounded-xl flex flex-col">
                      <span className="text-xs text-zinc-500 mb-2">{event.society_name}</span>
                      <h4 className="text-base font-semibold text-white mb-2">{event.title}</h4>
                      <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{event.description}</p>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4">
                        <Calendar className="w-3.5 h-3.5" />{event.date} at {event.time}
                      </div>
                      <div className="mt-auto flex gap-3">
                        <button onClick={() => handleApprove(event.id)} className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-2">
                          <Check className="w-4 h-4" /> Approve
                        </button>
                        <button onClick={() => handleReject(event.id)} className="btn-danger py-2 px-3">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 glass rounded-xl">
                  <Check className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-white mb-1">All caught up</h3>
                  <p className="text-sm text-zinc-500">No pending events to review</p>
                </div>
              )}
            </section>

            {/* Published Events */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
                  <Activity className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Published Events</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {publishedEvents.map((event: any) => (
                  <div key={event.id} className="p-5 glass rounded-xl hover:border-white/[0.12] transition-colors flex flex-col">
                    <span className="text-xs text-zinc-500 mb-2">{event.society_name}</span>
                    <h4 className="text-sm font-semibold text-white mb-3">{event.title}</h4>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-xs text-zinc-500">{event.participant_count} registered</span>
                      <button onClick={() => handleViewParticipants(event.id)} className="p-2 bg-white/[0.03] hover:bg-white/[0.06] rounded-lg text-zinc-400 hover:text-blue-400 transition-colors">
                        <DbIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Societies */}
            <section>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
                    <Users className="w-4 h-4 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Societies</h3>
                </div>
                <button onClick={() => setShowAddSociety(true)} className="btn-primary flex items-center gap-2 !py-2">
                  <Plus className="w-4 h-4" /> Add Society
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {societies.map((soc: any) => (
                  <div key={soc.id} className="glass p-5 rounded-xl">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-base font-semibold text-white mb-1">{soc.name}</h4>
                        <p className="text-xs text-zinc-400 line-clamp-2">{soc.description}</p>
                        <div className="mt-2 flex gap-2">
                          <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium rounded">{soc.category}</span>
                          <span className="px-2 py-0.5 bg-white/[0.03] border border-white/[0.06] text-zinc-500 text-xs font-medium rounded">Est. {soc.established_year}</span>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteSociety(soc.id)} className="p-2 text-zinc-600 hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-500/10">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.06]">
                      <div>
                        <div className="text-xs font-medium text-zinc-500 mb-2">Head</div>
                        {soc.head_id ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-[10px] font-semibold text-blue-400">
                              {soc.head_name?.charAt(0)}
                            </div>
                            <span className="text-sm text-white">{soc.head_name}</span>
                            <button onClick={() => setAssigningRole({ socId: soc.id, roleType: 'HEAD' })} className="text-xs text-zinc-600 hover:text-blue-400 transition-colors ml-auto">Change</button>
                          </div>
                        ) : (
                          <button onClick={() => setAssigningRole({ socId: soc.id, roleType: 'HEAD' })} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-blue-400 transition-colors">
                            <UserPlus className="w-3 h-3" /> Assign
                          </button>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-zinc-500 mb-2">Co-Head</div>
                        {soc.co_head_id ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-[10px] font-semibold text-blue-400">
                              {soc.co_head_name?.charAt(0) || '?'}
                            </div>
                            <span className="text-sm text-white">{soc.co_head_name || 'Assigned'}</span>
                            <button onClick={() => setAssigningRole({ socId: soc.id, roleType: 'CO_HEAD' })} className="text-xs text-zinc-600 hover:text-blue-400 transition-colors ml-auto">Change</button>
                          </div>
                        ) : (
                          <button onClick={() => setAssigningRole({ socId: soc.id, roleType: 'CO_HEAD' })} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-blue-400 transition-colors">
                            <UserPlus className="w-3 h-3" /> Assign
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Role Registry */}
            <section>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
                    <Users className="w-4 h-4 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">User Management</h3>
                </div>
                <div className="flex bg-white/[0.03] p-1 rounded-lg border border-white/[0.06]">
                  {(['events', 'admins', 'heads', 'coheads', 'members'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === tab ? 'bg-blue-500 text-white' : 'text-zinc-500 hover:text-white'}`}>
                      {tab === 'coheads' ? 'Co-Heads' : tab === 'members' ? 'Members' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === 'admins' && (
                <div className="glass rounded-xl overflow-hidden">
                  <div className="px-6 py-3 bg-white/[0.02] border-b border-white/[0.06]">
                    <span className="text-xs text-zinc-500">{admins.length} admin records</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead><tr className="border-b border-white/[0.06] bg-white/[0.01]">
                        <th className="px-6 py-3 text-xs font-medium text-zinc-500">Name</th>
                        <th className="px-6 py-3 text-xs font-medium text-zinc-500">Email</th>
                        <th className="px-6 py-3 text-xs font-medium text-zinc-500">Department</th>
                        <th className="px-6 py-3 text-xs font-medium text-zinc-500">Access</th>
                        <th className="px-6 py-3 text-xs font-medium text-zinc-500">Phone</th>
                      </tr></thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {admins.map((a: any) => (
                          <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-3 text-sm text-white font-medium">{a.name}</td>
                            <td className="px-6 py-3 text-sm text-zinc-400 font-mono">{a.email}</td>
                            <td className="px-6 py-3 text-sm text-zinc-400">{a.department || '-'}</td>
                            <td className="px-6 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${a.access_level === 'FULL' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>{a.access_level}</span></td>
                            <td className="px-6 py-3 text-sm text-zinc-500 font-mono">{a.phone || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'heads' && (
                <div className="glass rounded-xl overflow-hidden">
                  <div className="px-6 py-3 bg-white/[0.02] border-b border-white/[0.06]">
                    <span className="text-xs text-zinc-500">{heads.length} head records</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead><tr className="border-b border-white/[0.06] bg-white/[0.01]">
                        <th className="px-6 py-3 text-xs font-medium text-zinc-500">Name</th>
                        <th className="px-6 py-3 text-xs font-medium text-zinc-500">Email</th>
                        <th className="px-6 py-3 text-xs font-medium text-zinc-500">Society</th>
                        <th className="px-6 py-3 text-xs font-medium text-zinc-500">Department</th>
                        <th className="px-6 py-3 text-xs font-medium text-zinc-500">Tenure</th>
                      </tr></thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {heads.map((h: any) => (
                          <tr key={h.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-3 text-sm text-white font-medium">{h.name}</td>
                            <td className="px-6 py-3 text-sm text-zinc-400 font-mono">{h.email}</td>
                            <td className="px-6 py-3 text-sm text-blue-400 font-medium">{h.society_name || '-'}</td>
                            <td className="px-6 py-3 text-sm text-zinc-400">{h.department || '-'}</td>
                            <td className="px-6 py-3 text-sm text-zinc-500 font-mono">{h.tenure_start || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'coheads' && (
                <div className="glass rounded-xl overflow-hidden">
                  <div className="px-6 py-3 bg-white/[0.02] border-b border-white/[0.06]">
                    <span className="text-xs text-zinc-500">{coHeads.length} co-head records</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead><tr className="border-b border-white/[0.06] bg-white/[0.01]">
                        <th className="px-6 py-3 text-xs font-medium text-zinc-500">Name</th>
                        <th className="px-6 py-3 text-xs font-medium text-zinc-500">Email</th>
                        <th className="px-6 py-3 text-xs font-medium text-zinc-500">Society</th>
                        <th className="px-6 py-3 text-xs font-medium text-zinc-500">Department</th>
                        <th className="px-6 py-3 text-xs font-medium text-zinc-500">Tenure</th>
                      </tr></thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {coHeads.map((ch: any) => (
                          <tr key={ch.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-3 text-sm text-white font-medium">{ch.name}</td>
                            <td className="px-6 py-3 text-sm text-zinc-400 font-mono">{ch.email}</td>
                            <td className="px-6 py-3 text-sm text-blue-400 font-medium">{ch.society_name || '-'}</td>
                            <td className="px-6 py-3 text-sm text-zinc-400">{ch.department || '-'}</td>
                            <td className="px-6 py-3 text-sm text-zinc-500 font-mono">{ch.tenure_start || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'members' && (
                <div className="glass rounded-xl overflow-hidden">
                  <div className="px-6 py-3 bg-white/[0.02] border-b border-white/[0.06]">
                    <span className="text-xs text-zinc-500">{studentMembers.length} student member records</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead><tr className="border-b border-white/[0.06] bg-white/[0.01]">
                        <th className="px-6 py-3 text-xs font-medium text-zinc-500">Name</th>
                        <th className="px-6 py-3 text-xs font-medium text-zinc-500">Roll No</th>
                        <th className="px-6 py-3 text-xs font-medium text-zinc-500">Society</th>
                        <th className="px-6 py-3 text-xs font-medium text-zinc-500">Department</th>
                        <th className="px-6 py-3 text-xs font-medium text-zinc-500">Semester</th>
                        <th className="px-6 py-3 text-xs font-medium text-zinc-500">Joined</th>
                      </tr></thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {studentMembers.map((sm: any) => (
                          <tr key={sm.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-3 text-sm text-white font-medium">{sm.name}</td>
                            <td className="px-6 py-3 text-sm text-blue-400 font-mono">{sm.roll_no || '-'}</td>
                            <td className="px-6 py-3 text-sm text-zinc-400 font-medium">{sm.society_name || '-'}</td>
                            <td className="px-6 py-3 text-sm text-zinc-400">{sm.department || '-'}</td>
                            <td className="px-6 py-3 text-sm text-zinc-400">{sm.semester || '-'}</td>
                            <td className="px-6 py-3 text-sm text-zinc-500 font-mono">{sm.joined_date || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'events' && (
                <div className="glass rounded-xl overflow-hidden">
                  <div className="px-6 py-3 bg-white/[0.02] border-b border-white/[0.06]">
                    <span className="text-xs text-zinc-500">{publishedEvents.length} published events</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead><tr className="border-b border-white/[0.06] bg-white/[0.01]">
                        <th className="px-6 py-3 text-xs font-medium text-zinc-500">Title</th>
                        <th className="px-6 py-3 text-xs font-medium text-zinc-500">Society</th>
                        <th className="px-6 py-3 text-xs font-medium text-zinc-500">Date</th>
                        <th className="px-6 py-3 text-xs font-medium text-zinc-500">Registered</th>
                        <th className="px-6 py-3 text-xs font-medium text-zinc-500"></th>
                      </tr></thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {publishedEvents.map((ev: any) => (
                          <tr key={ev.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-3 text-sm text-white font-medium">{ev.title}</td>
                            <td className="px-6 py-3 text-sm text-blue-400 font-medium">{ev.society_name}</td>
                            <td className="px-6 py-3 text-sm text-zinc-400 font-mono">{ev.date}</td>
                            <td className="px-6 py-3 text-sm text-zinc-400">{ev.participant_count} / {ev.capacity}</td>
                            <td className="px-6 py-3">
                              <button onClick={() => handleViewParticipants(ev.id)} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">View</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </motion.div>
        ) : (
          <motion.div key="sql" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="glass rounded-xl overflow-hidden">
              <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Terminal className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base font-semibold text-white">SQL Console</h3>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleExecuteSQL} disabled={isExecuting} className="btn-primary flex items-center gap-2 !py-2">
                    {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <DbIcon className="w-4 h-4" />}
                    Run Query
                  </button>
                  <button onClick={inspectDatabase} className="btn-secondary flex items-center gap-2 !py-2">
                    <DbIcon className="w-4 h-4" /> Browse DB
                  </button>
                </div>
              </div>
              <div className="p-5 bg-black/30">
                <textarea
                  className="w-full h-40 bg-transparent text-blue-400 font-mono text-sm resize-none outline-none placeholder:text-zinc-700"
                  spellCheck={false}
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  placeholder="SELECT * FROM ..."
                />
              </div>
            </div>

            {queryError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-400 text-sm">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                {queryError}
              </div>
            )}

            {queryResult && (
              <div className="glass rounded-xl overflow-hidden">
                <div className="px-6 py-3 border-b border-white/[0.06] flex items-center justify-between">
                  <span className="text-xs text-zinc-500">{queryResult.length} rows</span>
                  <button onClick={() => setQueryResult(null)} className="text-zinc-500 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-zinc-950/90 backdrop-blur-sm">
                      <tr className="border-b border-white/[0.06]">
                        {Object.keys(queryResult[0] || {}).map(key => (
                          <th key={key} className="px-6 py-3 text-xs font-medium text-blue-400/60">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {queryResult.map((row, i) => (
                        <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} className="px-6 py-2.5 text-sm text-white font-mono">{String(val)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {dbInspector && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-white">Database Explorer</h3>
                  <button onClick={() => setDbInspector(null)} className="text-sm text-zinc-500 hover:text-white transition-colors">Close</button>
                </div>
                {Object.entries(dbInspector).map(([tableName, rows]: [string, any]) => {
                  if (!Array.isArray(rows)) return null;
                  return (
                    <div key={tableName} className="glass rounded-xl overflow-hidden">
                      <div className="px-6 py-3 bg-white/[0.02] border-b border-white/[0.06] flex justify-between">
                        <span className="text-sm font-medium text-blue-400">{tableName}</span>
                        <span className="text-xs text-zinc-500">{rows.length} rows</span>
                      </div>
                      <div className="overflow-x-auto max-h-[250px]">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                              {rows[0] && Object.keys(rows[0]).map(k => (
                                <th key={k} className="px-6 py-2 text-xs font-medium text-zinc-500">{k}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
                            {rows.map((r: any, idx: number) => (
                              <tr key={idx}>
                                {Object.values(r).map((v: any, vidx: number) => (
                                  <td key={vidx} className="px-6 py-2 text-xs text-zinc-400 font-mono">{String(v)}</td>
                                ))}
                              </tr>
                            ))}
                            {rows.length === 0 && (
                              <tr><td className="px-6 py-6 text-center text-zinc-600 text-sm">Empty table</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Role Assignment Modal */}
      <AnimatePresence>
        {assigningRole && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAssigningRole(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass w-full max-w-md relative z-10 rounded-2xl overflow-hidden border border-white/10">
              <div className="p-6 border-b border-white/[0.06] flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Assign {assigningRole.roleType === 'HEAD' ? 'Head' : 'Co-Head'}</h3>
                <button onClick={() => setAssigningRole(null)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 max-h-[50vh] overflow-y-auto space-y-2">
                {users.filter((u: any) => u.role !== 'ADMIN').map((user: any) => (
                  <button key={user.id} onClick={() => handleAssignRole(user.id)} className="w-full p-4 glass rounded-xl hover:border-blue-500/20 transition-colors flex items-center justify-between">
                    <div className="text-left">
                      <div className="text-sm font-medium text-white">{user.name}</div>
                      <div className="text-xs text-zinc-500 font-mono">{user.email}</div>
                    </div>
                    <span className="text-xs text-zinc-500 bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.06]">{user.role}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Society Modal */}
      <AnimatePresence>
        {showAddSociety && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddSociety(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="glass w-full max-w-lg relative z-10 rounded-2xl overflow-hidden border border-white/10">
              <div className="p-6 border-b border-white/[0.06]">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-white">Add Society</h3>
                  <button onClick={() => setShowAddSociety(false)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                </div>
              </div>
              <form onSubmit={handleAddSociety} className="p-6 space-y-5">
                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Name</label>
                  <input required placeholder="e.g. Cybersecurity Club" className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-white text-sm" value={newSoc.name} onChange={e => setNewSoc({...newSoc, name: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Category</label>
                  <select required className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-white text-sm" value={newSoc.category} onChange={e => setNewSoc({...newSoc, category: e.target.value})}>
                    <option value="TECHNICAL" className="bg-zinc-900 text-white">Technical</option>
                    <option value="CULTURAL" className="bg-zinc-900 text-white">Cultural</option>
                    <option value="LITERARY" className="bg-zinc-900 text-white">Literary</option>
                    <option value="SPORTS" className="bg-zinc-900 text-white">Sports</option>
                    <option value="SOCIAL" className="bg-zinc-900 text-white">Social</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Established</label>
                    <input type="number" required className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-white text-sm" value={newSoc.established_year} onChange={e => setNewSoc({...newSoc, established_year: parseInt(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Contact Email</label>
                    <input type="email" required placeholder="soc@nu.edu.pk" className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-white text-sm" value={newSoc.contact_email} onChange={e => setNewSoc({...newSoc, contact_email: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Vision</label>
                  <textarea placeholder="Society vision and mission..." className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-white text-sm h-20" value={newSoc.vision} onChange={e => setNewSoc({...newSoc, vision: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Description</label>
                  <textarea required placeholder="What does this society do..." className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 transition-all text-white text-sm h-20" value={newSoc.description} onChange={e => setNewSoc({...newSoc, description: e.target.value})} />
                </div>
                <button type="submit" className="btn-primary w-full py-3">Create Society</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Participants Modal */}
      <AnimatePresence>
        {viewingParticipants && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingParticipants(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} className="glass w-full max-w-3xl relative z-10 rounded-2xl overflow-hidden border border-white/10">
              <div className="p-6 border-b border-white/[0.06] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">Registered Participants</h3>
                </div>
                <button onClick={() => setViewingParticipants(null)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="overflow-x-auto max-h-[60vh]">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-zinc-950/90 backdrop-blur-sm border-b border-white/[0.06]">
                    <tr>
                      <th className="px-6 py-3 text-xs font-medium text-zinc-500">Name</th>
                      <th className="px-6 py-3 text-xs font-medium text-zinc-500">Roll No</th>
                      <th className="px-6 py-3 text-xs font-medium text-zinc-500">Email</th>
                      <th className="px-6 py-3 text-xs font-medium text-zinc-500">Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {viewingParticipants.length > 0 ? viewingParticipants.map((p: any, i: number) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-3 text-sm text-white font-medium">{p.name}</td>
                        <td className="px-6 py-3 text-sm text-blue-400 font-mono">{p.roll_no}</td>
                        <td className="px-6 py-3 text-sm text-zinc-400">{p.email}</td>
                        <td className="px-6 py-3 text-sm text-zinc-500 font-mono">{p.phone}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-zinc-500">No participants registered yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
