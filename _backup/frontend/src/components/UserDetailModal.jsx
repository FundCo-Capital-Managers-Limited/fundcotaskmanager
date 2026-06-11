// src/components/UserDetailModal.jsx
import React, { useState, useRef, useEffect } from 'react';
import { X, Download, BarChart3, PieChart, Award, Loader2, Target, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Title, Tooltip, Legend,
} from 'chart.js';
import jsPDF       from 'jspdf';
import html2canvas from 'html2canvas';
import axios       from 'axios';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getFullName = (u) => {
  if (!u) return 'Unknown User';
  if (u.fullName) return u.fullName.trim();
  if (u.firstName || u.lastName) return `${u.firstName||''} ${u.lastName||''} ${u.otherName||''}`.trim();
  return u.name?.trim() || 'Unknown User';
};

const StatPill = ({ label, value, color, bg }) => (
  <div className="rounded-xl p-4" style={{ backgroundColor: bg || 'var(--bg-subtle)' }}>
    <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color:'var(--text-muted)' }}>{label}</p>
    <p className="text-2xl font-black" style={{ color: color || 'var(--brand-primary)' }}>{value}</p>
  </div>
);

const UserDetailModal = ({ isOpen, onClose, data, userId }) => {
  const contentRef  = useRef(null);
  const [aiNote,    setAiNote]    = useState('');
  const [aiLoading, setAiLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !userId) { setAiNote(''); setAiLoading(true); return; }
    setAiNote(''); setAiLoading(true);
    axios.get(`${API_BASE}/api/performance/user/${userId}/ai-note`, {
      headers: { Authorization:`Bearer ${localStorage.getItem('token')}` },
    }).then(r => setAiNote(r.data.aiNote || 'Super (AI) Admin reviewed this performance.'))
      .catch(() => setAiNote('Super (AI) Admin is reviewing this performance. Insights will appear shortly.'))
      .finally(() => setAiLoading(false));
  }, [isOpen, userId]);

  if (!isOpen || !data) return null;

  const fullName  = getFullName(data.user);
  const breakdown = data.breakdown || {};
  const nextLevel = data.nextLevel;

  // Derived totals
  const taskPoints  = data.taskPoints || 0;
  const goalPoints  = data.goalPoints || 0;
  const penalties   = breakdown.penaltyTotal || 0;

  const exportToPDF = async () => {
    if (!contentRef.current) return;
    const canvas = await html2canvas(contentRef.current, { scale:2 });
    const pdf    = new jsPDF('p','mm','a4');
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, 190, 277);
    pdf.save(`${fullName.replace(/\s+/g,'_')}_Performance.pdf`);
  };

  // Chart data
  const priorityChartData = {
    labels: ['Low','Medium','High'],
    datasets: [{
      label: 'Completed',
      data: [
        data.taskStatsByPriority?.Low?.completed    || 0,
        data.taskStatsByPriority?.Medium?.completed || 0,
        data.taskStatsByPriority?.High?.completed   || 0,
      ],
      backgroundColor: ['#16a34a','#f59e0b','#dc2626'],
      borderRadius: 6, borderWidth: 0,
    }],
  };

  const contributionChartData = {
    labels: ['Task Points','Goal Points', ...(penalties < 0 ? ['Penalties'] : [])],
    datasets: [{
      data: [taskPoints, goalPoints, ...(penalties < 0 ? [Math.abs(penalties)] : [])],
      backgroundColor: ['#312783','#36a9e1', ...(penalties < 0 ? ['#ef4444'] : [])],
      borderWidth: 0,
    }],
  };

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color:'var(--text-muted)', font:{ size:12 } } }, tooltip: { backgroundColor:'var(--bg-surface)', titleColor:'var(--text-primary)', bodyColor:'var(--text-secondary)', borderColor:'var(--border-color)', borderWidth:1 } },
  };

  const barOpts = {
    ...chartOpts,
    scales: {
      x: { ticks:{ color:'var(--text-muted)' }, grid:{ display:false } },
      y: { ticks:{ color:'var(--text-muted)' }, grid:{ color:'rgba(128,128,128,.08)' } },
    },
  };

  const PCOL = { Low:'#16a34a', Medium:'#d97706', High:'#dc2626' };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-[9998]" style={{ backgroundColor:'rgba(0,0,0,0.55)' }}
            onClick={onClose} />

          <motion.div
            initial={{ opacity:0, scale:.96, y:16 }} animate={{ opacity:1, scale:1, y:0 }}
            exit={{ opacity:0, scale:.96, y:16 }} transition={{ duration:.2 }}
            className="fixed z-[9999] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
              w-[95vw] max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border overflow-hidden flex flex-col"
            style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
              style={{ borderColor:'var(--border-color)' }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-black flex-shrink-0"
                  style={{ backgroundColor:'var(--brand-primary)' }}>
                  {fullName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="font-black text-base truncate" style={{ color:'var(--text-primary)' }}>{fullName}</h2>
                  <p className="text-xs" style={{ color:'var(--text-secondary)' }}>
                    {data.user?.level} · {data.user?.position || 'Employee'}
                    {data.user?.unitSector ? ` · ${data.user.unitSector}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={exportToPDF}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold"
                  style={{ borderColor:'var(--border-color)', color:'var(--text-secondary)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor='var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
                  <Download className="w-3.5 h-3.5" /> Export PDF
                </button>
                <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color:'var(--text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor='var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

              {/* Hero score */}
              <div className="rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6"
                style={{ backgroundColor:'var(--brand-primary)' }}>
                <div className="text-center sm:text-left">
                  <p className="text-sm font-bold uppercase tracking-wider mb-1" style={{ color:'rgba(255,255,255,.6)' }}>
                    Total Performance Score
                  </p>
                  <p className="text-6xl font-black text-white leading-none">{data.totalScore}</p>
                  <p className="text-xs mt-2" style={{ color:'rgba(255,255,255,.6)' }}>
                    This score directly determines monthly bonus eligibility
                  </p>
                </div>
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 w-full sm:w-auto">
                  {[
                    { label:'Task Points',  value:taskPoints },
                    { label:'Goal Points',  value:goalPoints },
                    { label:'Completion',   value:`${data.completionRate||0}%` },
                    { label:'Overdue Rate', value:`${data.overdueRate||0}%` },
                    { label:'Penalties',    value:penalties  },
                    { label:'Level',        value:data.level },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-3 text-center"
                      style={{ backgroundColor:'rgba(255,255,255,.12)' }}>
                      <p className="text-lg font-black text-white">{s.value}</p>
                      <p className="text-[10px] mt-0.5" style={{ color:'rgba(255,255,255,.6)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Score breakdown — the key new section */}
              <div className="rounded-xl border overflow-hidden"
                style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}>
                <div className="px-5 py-3 border-b" style={{ borderColor:'var(--border-color)', backgroundColor:'var(--bg-subtle)' }}>
                  <h3 className="text-sm font-bold" style={{ color:'var(--text-primary)' }}>Score Breakdown</h3>
                  <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>
                    Exactly how every point was earned or lost
                  </p>
                </div>
                <div className="divide-y" style={{ divideColor:'var(--border-color)' }}>
                  {[
                    { label:'Base Task Points',     value:breakdown.basePoints    || 0, desc:'Priority weight per completed task (Low:15 / Med:35 / High:60)', color:'var(--brand-primary)' },
                    { label:'Approval Bonus',        value:breakdown.approvalBonus || 0, desc:'Approved tasks ×1.5 · Submitted tasks ×1.2', color:'#36a9e1' },
                    { label:'On-Time Bonus',         value:breakdown.onTimeBonus   || 0, desc:'+10 pts per task completed before its due date', color:'#a855f7' },
                    { label:'Checklist Bonus',       value:breakdown.checklistBonus|| 0, desc:'Up to +20 pts per task — pro-rated by checklist completion %', color:'#f59e0b' },
                    { label:'Overdue Penalties',     value:penalties,                    desc:'-5 pts/day for each incomplete overdue task (max -30 per task)', color:'#ef4444' },
                    { label:'Goal Points',           value:goalPoints,                   desc:'Up to 100 pts per goal at 100% sub-goal completion (+20 bonus)', color:'#16a34a' },
                  ].map(row => (
                    <div key={row.label} className="flex items-start justify-between gap-4 px-5 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold" style={{ color:'var(--text-primary)' }}>{row.label}</p>
                        <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>{row.desc}</p>
                      </div>
                      <span className="text-base font-black flex-shrink-0"
                        style={{ color: row.value < 0 ? '#ef4444' : row.value > 0 ? row.color : 'var(--text-muted)' }}>
                        {row.value >= 0 ? `+${row.value}` : row.value}
                      </span>
                    </div>
                  ))}
                  {/* Total row */}
                  <div className="flex items-center justify-between px-5 py-3.5"
                    style={{ backgroundColor:'var(--bg-subtle)' }}>
                    <p className="text-sm font-black" style={{ color:'var(--text-primary)' }}>Total Score</p>
                    <p className="text-xl font-black" style={{ color:'var(--brand-primary)' }}>{data.totalScore}</p>
                  </div>
                </div>
              </div>

              {/* Next level progress */}
              {nextLevel && (
                <div className="rounded-xl border p-4" style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold" style={{ color:'var(--text-primary)' }}>Progress to {nextLevel.name}</p>
                    {nextLevel.pointsNeeded > 0 && (
                      <span className="text-xs" style={{ color:'var(--text-muted)' }}>{nextLevel.pointsNeeded} pts needed</span>
                    )}
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor:'var(--bg-hover)' }}>
                    <motion.div className="h-full rounded-full" style={{ backgroundColor:'var(--brand-primary)' }}
                      initial={{ width:0 }} animate={{ width:`${nextLevel.progress}%` }}
                      transition={{ duration:.8, ease:'easeOut' }} />
                  </div>
                  <p className="text-xs mt-1.5 text-right font-bold" style={{ color:'var(--brand-primary)' }}>
                    {nextLevel.progress}%
                  </p>
                </div>
              )}

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatPill label="Total Score"  value={data.totalScore||0}           color="var(--brand-primary)" bg="var(--brand-light)" />
                <StatPill label="Task Points"  value={taskPoints}                   color="#36a9e1"              bg="rgba(54,169,225,.08)" />
                <StatPill label="Goal Points"  value={goalPoints}                   color="#16a34a"              bg="rgba(22,163,74,.08)" />
                <StatPill label="Completion"   value={`${data.completionRate||0}%`} color="#d97706"              bg="rgba(217,119,6,.08)" />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border p-5"
                  style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}>
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ color:'var(--text-primary)' }}>
                    <PieChart className="w-4 h-4" style={{ color:'var(--brand-primary)' }} />
                    Score Contribution
                  </h3>
                  <div style={{ height:200 }}>
                    <Pie data={contributionChartData} options={chartOpts} />
                  </div>
                </div>
                <div className="rounded-xl border p-5"
                  style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}>
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ color:'var(--text-primary)' }}>
                    <BarChart3 className="w-4 h-4" style={{ color:'#36a9e1' }} />
                    Completed by Priority
                  </h3>
                  <div style={{ height:200 }}>
                    <Bar data={priorityChartData} options={barOpts} />
                  </div>
                </div>
              </div>

              {/* Priority table */}
              <div className="rounded-xl border overflow-hidden"
                style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}>
                <div className="px-5 py-3 border-b" style={{ borderColor:'var(--border-color)', backgroundColor:'var(--bg-subtle)' }}>
                  <h3 className="text-sm font-bold" style={{ color:'var(--text-primary)' }}>Task Breakdown by Priority</h3>
                </div>
                <div className="divide-y" style={{ divideColor:'var(--border-color)' }}>
                  <div className="grid grid-cols-6 px-5 py-2 text-xs font-bold uppercase tracking-wide"
                    style={{ color:'var(--text-muted)' }}>
                    <span>Priority</span>
                    <span className="text-center">Total</span>
                    <span className="text-center">Done</span>
                    <span className="text-center">Base Pts</span>
                    <span className="text-center">Approval</span>
                    <span className="text-center">Checklist</span>
                  </div>
                  {['Low','Medium','High'].map(p => {
                    const s = data.taskStatsByPriority?.[p] || { count:0, completed:0, basePoints:0, approvalBonus:0, checklistBonus:0 };
                    const pct = s.count ? Math.round((s.completed/s.count)*100) : 0;
                    return (
                      <div key={p} className="grid grid-cols-6 px-5 py-3 items-center">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor:PCOL[p] }} />
                          <span className="text-sm font-medium" style={{ color:'var(--text-primary)' }}>{p}</span>
                        </div>
                        <span className="text-center text-sm font-semibold" style={{ color:'var(--text-primary)' }}>{s.count}</span>
                        <div className="text-center">
                          <span className="text-sm font-semibold" style={{ color:'var(--text-primary)' }}>{s.completed}</span>
                          <span className="text-xs ml-1" style={{ color:'var(--text-muted)' }}>({pct}%)</span>
                        </div>
                        <span className="text-center text-sm font-bold" style={{ color:'var(--brand-primary)' }}>+{s.basePoints||0}</span>
                        <span className="text-center text-sm font-bold" style={{ color:'#36a9e1' }}>+{s.approvalBonus||0}</span>
                        <span className="text-center text-sm font-bold" style={{ color:'#f59e0b' }}>+{s.checklistBonus||0}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Goals */}
              {data.goalDetails?.length > 0 && (
                <div className="rounded-xl border overflow-hidden"
                  style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}>
                  <div className="px-5 py-3 border-b" style={{ borderColor:'var(--border-color)', backgroundColor:'var(--bg-subtle)' }}>
                    <h3 className="text-sm font-bold" style={{ color:'var(--text-primary)' }}>
                      Goals ({data.completedGoals || 0}/{data.totalGoals || 0} complete)
                    </h3>
                  </div>
                  <div className="divide-y" style={{ divideColor:'var(--border-color)' }}>
                    {data.goalDetails.map((g, i) => (
                      <div key={i} className="px-5 py-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-semibold truncate" style={{ color:'var(--text-primary)' }}>{g.title}</p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs capitalize" style={{ color:'var(--text-muted)' }}>{g.timeframe}</span>
                            <span className="text-sm font-bold" style={{ color:'#16a34a' }}>+{g.points}pts</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor:'var(--bg-hover)' }}>
                            <div className="h-full rounded-full" style={{ width:`${g.progress}%`, backgroundColor:'#16a34a' }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color:'#16a34a' }}>{g.done}/{g.total}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI note */}
              <div className="rounded-xl border p-5"
                style={{ backgroundColor:'rgba(245,158,11,.04)', borderColor:'rgba(245,158,11,.3)' }}>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor:'rgba(245,158,11,.12)' }}>
                    <Award className="w-4 h-4" style={{ color:'#f59e0b' }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold" style={{ color:'#b45309' }}>Super (AI) Admin Note</h3>
                    <p className="text-xs" style={{ color:'var(--text-muted)' }}>AI-generated performance insight</p>
                  </div>
                </div>
                {aiLoading
                  ? <div className="flex items-center gap-3 text-sm" style={{ color:'#b45309' }}><Loader2 className="w-4 h-4 animate-spin" /> Analyzing performance…</div>
                  : <p className="text-sm leading-relaxed" style={{ color:'var(--text-secondary)' }}>{aiNote}</p>}
              </div>

              <div className="text-center pt-4 border-t" style={{ borderColor:'var(--border-color)' }}>
                <p className="text-xs" style={{ color:'var(--text-muted)' }}>
                  Scores calculated by transparent formula · Updated: {new Date().toLocaleString()}
                </p>
              </div>
            </div>

            {/* Mobile export */}
            <div className="sm:hidden border-t px-6 py-4 flex-shrink-0"
              style={{ borderColor:'var(--border-color)', backgroundColor:'var(--bg-surface)' }}>
              <button onClick={exportToPDF}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor:'var(--brand-primary)' }}>
                <Download className="w-4 h-4" /> Export PDF
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default UserDetailModal;