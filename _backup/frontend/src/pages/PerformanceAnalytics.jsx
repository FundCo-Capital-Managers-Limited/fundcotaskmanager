// src/pages/PerformanceDashboard.jsx
// FundCo Performance Analytics — Professional rebuild
// Design: Data-dense command-centre aesthetic. Dark metric cards, sharp contrast,
//         animated progress rings, sparklines, heatmap, velocity bars.
//         CSS variables throughout. No hardcoded dark: Tailwind classes.
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, CheckCircle2, Clock, AlertTriangle,
  Zap, Target, BarChart2, Activity, Download, RefreshCw, Filter,
  ChevronDown, Award, Calendar, Minus, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

// ── Helpers ───────────────────────────────────────────────────────────────────
const isCompleted = (t) =>
  t.completed === true || t.completed === 1 ||
  (typeof t.completed === 'string' && t.completed.toLowerCase() === 'yes');

const isOverdue = (t) =>
  t.dueDate && !isCompleted(t) && new Date(t.dueDate) < new Date();

const fmtPct  = (n) => `${Math.round(n)}%`;
const fmtNum  = (n) => n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n);
const DAYS_ABBR = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const PRIORITY_COLORS = {
  high:   { solid:'#ef4444', soft:'rgba(239,68,68,.15)'  },
  medium: { solid:'#f59e0b', soft:'rgba(245,158,11,.15)' },
  low:    { solid:'#22c55e', soft:'rgba(34,197,94,.15)'  },
};

// ── Chart default options ─────────────────────────────────────────────────────
const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'var(--bg-surface)',
      titleColor: 'var(--text-primary)',
      bodyColor: 'var(--text-secondary)',
      borderColor: 'var(--border-color)',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(128,128,128,.08)' },
      ticks: { color: 'var(--text-muted)', font: { size: 11 } },
    },
    y: {
      grid: { color: 'rgba(128,128,128,.08)' },
      ticks: { color: 'var(--text-muted)', font: { size: 11 } },
      beginAtZero: true,
    },
  },
};

// ── SVG progress ring ─────────────────────────────────────────────────────────
const Ring = ({ pct, size = 80, stroke = 7, color = 'var(--brand-primary)', label }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="rgba(128,128,128,.15)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
        <text x={size/2} y={size/2 + 5} textAnchor="middle"
          fontSize={size < 72 ? 13 : 16} fontWeight="800" fill={color}>
          {Math.round(pct)}%
        </text>
      </svg>
      {label && <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color:'var(--text-muted)' }}>{label}</span>}
    </div>
  );
};

// ── Sparkline (inline mini chart) ─────────────────────────────────────────────
const Sparkline = ({ data = [], color = '#36a9e1', height = 36, width = 100 }) => {
  if (data.length < 2) return <div style={{ width, height }} />;
  const max = Math.max(...data) || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
};

// ── KPI card ──────────────────────────────────────────────────────────────────
const KPICard = ({ label, value, sub, trend, trendLabel, icon: Icon, color, spark = [], delay = 0 }) => {
  const trendUp = trend > 0;
  const trendNeutral = trend === 0;
  return (
    <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
      transition={{ delay, duration:.4 }}
      className="rounded-2xl border p-4 flex flex-col gap-3"
      style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}18` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color:'var(--text-muted)' }}>{label}</p>
        </div>
        {spark.length > 1 && <Sparkline data={spark} color={color} />}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-black leading-none" style={{ color:'var(--text-primary)' }}>{value}</p>
          {sub && <p className="text-xs mt-1" style={{ color:'var(--text-muted)' }}>{sub}</p>}
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold"
            style={{
              backgroundColor: trendNeutral ? 'rgba(128,128,128,.1)' : trendUp ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)',
              color: trendNeutral ? 'var(--text-muted)' : trendUp ? '#22c55e' : '#ef4444',
            }}>
            {trendNeutral ? <Minus className="w-3 h-3" /> : trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}{trendLabel || '%'}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ── Section heading ───────────────────────────────────────────────────────────
const Section = ({ title, icon: Icon, children, delay = 0 }) => (
  <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay, duration:.35 }}
    className="space-y-4">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4" style={{ color:'var(--brand-primary)' }} />
      <h2 className="text-xs font-black uppercase tracking-widest" style={{ color:'var(--text-muted)' }}>{title}</h2>
      <div className="flex-1 h-px" style={{ backgroundColor:'var(--border-color)' }} />
    </div>
    {children}
  </motion.div>
);

// ── Filter pill ───────────────────────────────────────────────────────────────
const Pill = ({ label, active, onClick }) => (
  <button onClick={onClick}
    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
    style={active
      ? { backgroundColor:'var(--brand-primary)', color:'#fff' }
      : { backgroundColor:'var(--bg-subtle)', color:'var(--text-secondary)' }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor='var(--bg-hover)'; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor='var(--bg-subtle)'; }}>
    {label}
  </button>
);

// ── Activity heatmap ──────────────────────────────────────────────────────────
const Heatmap = ({ data }) => {
  // data: { days, hours, grid } where grid[day][hour] = count
  const { days, hours, grid } = data;
  const maxVal = Math.max(1, ...grid.flat());
  const getColor = (count) => {
    if (!count) return 'var(--bg-hover)';
    const alpha = 0.15 + (count / maxVal) * 0.85;
    return `rgba(49,39,131,${alpha})`;
  };
  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        {/* Hour labels */}
        <div className="flex gap-px pl-10 mb-1">
          {hours.filter((_, i) => i % 3 === 0).map(h => (
            <div key={h} className="w-8 text-center" style={{ width: 3 * 28 }}>
              <span className="text-[10px]" style={{ color:'var(--text-muted)' }}>{h}</span>
            </div>
          ))}
        </div>
        {days.map((day, di) => (
          <div key={day} className="flex items-center gap-px mb-px">
            <span className="text-[10px] font-bold w-9 flex-shrink-0" style={{ color:'var(--text-muted)' }}>{day}</span>
            {(grid[di] || []).map((count, hi) => (
              <div key={hi} title={`${count} task${count !== 1 ? 's' : ''} at ${hours[hi]}`}
                className="rounded-sm transition-transform hover:scale-125 cursor-default"
                style={{ width:26, height:20, backgroundColor:getColor(count), flexShrink:0 }} />
            ))}
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 pl-10">
          <span className="text-[10px]" style={{ color:'var(--text-muted)' }}>Less</span>
          {[0,.2,.4,.65,.9].map((a, i) => (
            <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: a === 0 ? 'var(--bg-hover)' : `rgba(49,39,131,${a})` }} />
          ))}
          <span className="text-[10px]" style={{ color:'var(--text-muted)' }}>More</span>
        </div>
      </div>
    </div>
  );
};

// ── Priority bar ──────────────────────────────────────────────────────────────
const PriorityBar = ({ label, count, total, color }) => {
  const pct = total ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold capitalize" style={{ color:'var(--text-primary)' }}>{label}</span>
        <div className="flex items-center gap-2">
          <span style={{ color:'var(--text-muted)' }}>{count} tasks</span>
          <span className="font-bold" style={{ color }}>{fmtPct(pct)}</span>
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor:'var(--bg-hover)' }}>
        <motion.div className="h-full rounded-full" style={{ backgroundColor: color }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration:.8, ease:'easeOut' }} />
      </div>
    </div>
  );
};

// ── Task row (timeline) ───────────────────────────────────────────────────────
const TaskRow = ({ task, index }) => {
  const done = isCompleted(task);
  const over = isOverdue(task);
  const p    = (task.priority || 'low').toLowerCase();
  const pc   = PRIORITY_COLORS[p] || PRIORITY_COLORS.low;
  return (
    <motion.div initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center gap-3 py-2.5 border-b"
      style={{ borderColor:'var(--border-color)' }}>
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: pc.solid }} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${done ? 'line-through' : ''}`}
          style={{ color: done ? 'var(--text-muted)' : 'var(--text-primary)' }}>
          {task.title || 'Untitled'}
        </p>
        <p className="text-xs" style={{ color:'var(--text-muted)' }}>
          {task.createdAt ? new Date(task.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short' }) : '—'}
        </p>
      </div>
      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0"
        style={{ backgroundColor: pc.soft, color: pc.solid }}>
        {task.priority || 'Low'}
      </span>
      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0"
        style={{
          backgroundColor: done ? 'rgba(34,197,94,.12)' : over ? 'rgba(239,68,68,.12)' : 'rgba(245,158,11,.12)',
          color: done ? '#22c55e' : over ? '#ef4444' : '#f59e0b',
        }}>
        {done ? 'Done' : over ? 'Overdue' : 'Pending'}
      </span>
    </motion.div>
  );
};

// ── Badge card ────────────────────────────────────────────────────────────────
const Badge = ({ name, desc, icon: Icon, color, earned }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl border transition-all"
    style={{
      backgroundColor: earned ? `${color}10` : 'var(--bg-subtle)',
      borderColor: earned ? color : 'var(--border-color)',
      opacity: earned ? 1 : 0.45,
    }}>
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: earned ? `${color}20` : 'var(--bg-hover)' }}>
      <Icon className="w-5 h-5" style={{ color: earned ? color : 'var(--text-muted)' }} />
    </div>
    <div className="min-w-0">
      <p className="text-sm font-bold truncate" style={{ color: earned ? 'var(--text-primary)' : 'var(--text-muted)' }}>{name}</p>
      <p className="text-[11px]" style={{ color:'var(--text-muted)' }}>{desc}</p>
    </div>
    {earned && <div className="w-2 h-2 rounded-full flex-shrink-0 ml-auto" style={{ backgroundColor: color }} />}
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
const PerformanceAnalytics = () => {
  const { user, tasks = [] } = useOutletContext();
  const [period,   setPeriod]   = useState('30');   // '7' | '30' | '90' | 'all'
  const [priority, setPriority] = useState('all');
  const [status,   setStatus]   = useState('all');
  const [exporting,setExporting]= useState(false);

  // ── Date range ───────────────────────────────────────────────────────────
  const periodDays = period === 'all' ? Infinity : parseInt(period);
  const startDate  = useMemo(() => {
    if (period === 'all') return new Date(0);
    const d = new Date();
    d.setDate(d.getDate() - periodDays);
    return d;
  }, [period, periodDays]);

  // ── Filtered tasks ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return tasks.filter(t => {
      const d = t.createdAt ? new Date(t.createdAt) : new Date();
      if (d < startDate) return false;
      if (priority !== 'all' && (t.priority || '').toLowerCase() !== priority) return false;
      if (status === 'completed' && !isCompleted(t)) return false;
      if (status === 'pending'   && isCompleted(t))  return false;
      return true;
    });
  }, [tasks, startDate, priority, status]);

  // ── Core KPIs ────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total     = filtered.length;
    const done      = filtered.filter(isCompleted).length;
    const overdue   = filtered.filter(isOverdue).length;
    const highDone  = filtered.filter(t => isCompleted(t) && (t.priority||'').toLowerCase() === 'high').length;
    const compRate  = total ? (done / total) * 100 : 0;
    const score     = Math.min(100, compRate * 0.7 + highDone * 3);
    // Previous period for trend comparison
    const prev = tasks.filter(t => {
      const d = t.createdAt ? new Date(t.createdAt) : new Date();
      const prevEnd = new Date(startDate);
      const prevStart = new Date(startDate);
      if (period !== 'all') prevStart.setDate(prevStart.getDate() - periodDays);
      return d >= prevStart && d < prevEnd;
    });
    const prevDone = prev.filter(isCompleted).length;
    const prevRate = prev.length ? (prevDone / prev.length) * 100 : 0;
    return { total, done, pending: total - done, overdue, compRate, score, prevRate };
  }, [filtered, tasks, startDate, period, periodDays]);

  // ── Sparkline data (last 14 days) ─────────────────────────────────────────
  const sparklines = useMemo(() => {
    const days = 14;
    const now  = new Date();
    const series = { created:[], done:[], overdue:[] };
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const ds = d.toDateString();
      const day = tasks.filter(t => t.createdAt && new Date(t.createdAt).toDateString() === ds);
      series.created.push(day.length);
      series.done.push(day.filter(isCompleted).length);
      series.overdue.push(day.filter(isOverdue).length);
    }
    return series;
  }, [tasks]);

  // ── Trend chart data (completion vs created by day) ───────────────────────
  const trendData = useMemo(() => {
    const days = Math.min(periodDays === Infinity ? 30 : periodDays, 60);
    const now  = new Date();
    const labels = [], created = [], done = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const ds = d.toDateString();
      const bucket = filtered.filter(t => t.createdAt && new Date(t.createdAt).toDateString() === ds);
      labels.push(days <= 14
        ? d.toLocaleDateString('en-GB', { day:'numeric', month:'short' })
        : d.toLocaleDateString('en-GB', { day:'numeric', month:'short' }));
      created.push(bucket.length);
      done.push(bucket.filter(isCompleted).length);
    }
    return {
      labels,
      datasets: [
        {
          label: 'Created',
          data: created,
          borderColor: '#36a9e1',
          backgroundColor: 'rgba(54,169,225,.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
        },
        {
          label: 'Completed',
          data: done,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34,197,94,.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
        },
      ],
    };
  }, [filtered, periodDays]);

  // ── Weekly bar ────────────────────────────────────────────────────────────
  const weeklyData = useMemo(() => ({
    labels: DAYS_ABBR,
    datasets: [{
      label: 'Completed',
      data: DAYS_ABBR.map((_, i) =>
        filtered.filter(t => t.createdAt && new Date(t.createdAt).getDay() === i && isCompleted(t)).length
      ),
      backgroundColor: DAYS_ABBR.map((_, i) => i === new Date().getDay() ? '#312783' : 'rgba(49,39,131,.35)'),
      borderRadius: 6,
    }],
  }), [filtered]);

  // ── Priority breakdown doughnut ───────────────────────────────────────────
  const priorityData = useMemo(() => {
    const h = filtered.filter(t => (t.priority||'low').toLowerCase() === 'high').length;
    const m = filtered.filter(t => (t.priority||'low').toLowerCase() === 'medium').length;
    const l = filtered.filter(t => (t.priority||'low').toLowerCase() === 'low').length;
    return {
      labels: ['High','Medium','Low'],
      datasets: [{
        data: [h, m, l],
        backgroundColor: ['#ef4444','#f59e0b','#22c55e'],
        borderWidth: 0,
        hoverOffset: 4,
      }],
    };
  }, [filtered]);

  // ── Monthly tasks created ─────────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const now = new Date();
    const labels = [], counts = [], dones = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(MONTHS[d.getMonth()]);
      const bucket = tasks.filter(t => {
        if (!t.createdAt) return false;
        const td = new Date(t.createdAt);
        return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth();
      });
      counts.push(bucket.length);
      dones.push(bucket.filter(isCompleted).length);
    }
    return {
      labels,
      datasets: [
        { label:'Total',     data:counts, backgroundColor:'rgba(49,39,131,.25)', borderRadius:5 },
        { label:'Completed', data:dones,  backgroundColor:'rgba(54,169,225,.6)',  borderRadius:5 },
      ],
    };
  }, [tasks]);

  // ── Heatmap data ──────────────────────────────────────────────────────────
  const heatmapData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const grid  = DAYS_ABBR.map(() => Array(24).fill(0));
    filtered.forEach(t => {
      if (!t.createdAt) return;
      const d = new Date(t.createdAt);
      grid[d.getDay()][d.getHours()]++;
    });
    return { days: DAYS_ABBR, hours, grid };
  }, [filtered]);

  // ── Priority bars ─────────────────────────────────────────────────────────
  const priorityStats = useMemo(() => {
    const total = filtered.length || 1;
    return ['high','medium','low'].map(p => ({
      label: p,
      count: filtered.filter(t => (t.priority||'low').toLowerCase() === p).length,
      total,
      color: PRIORITY_COLORS[p].solid,
    }));
  }, [filtered]);

  // ── Insights ──────────────────────────────────────────────────────────────
  const insights = useMemo(() => {
    const msgs = [];
    if (kpis.compRate > 80)   msgs.push({ text:'Completion rate is excellent — above 80%.', type:'success' });
    if (kpis.overdue > 5)     msgs.push({ text:`${kpis.overdue} overdue tasks need immediate attention.`, type:'warn' });
    if (kpis.compRate < 40)   msgs.push({ text:'Completion rate is below 40%. Review workload balance.', type:'warn' });
    const peak = heatmapData.grid.reduce((best, row, di) =>
      row.reduce((b, cnt, hi) => cnt > b.count ? { day: DAYS_ABBR[di], hour: hi, count: cnt } : b, best),
      { day:'', hour:0, count:0 }
    );
    if (peak.count > 0) msgs.push({ text:`Most active on ${peak.day} around ${peak.hour}:00 — schedule key tasks then.`, type:'info' });
    const highPend = filtered.filter(t => (t.priority||'').toLowerCase()==='high' && !isCompleted(t)).length;
    if (highPend > 3) msgs.push({ text:`${highPend} high-priority tasks still pending — prioritise these.`, type:'warn' });
    if (msgs.length === 0) msgs.push({ text:'All metrics look healthy. Keep the momentum going!', type:'success' });
    return msgs;
  }, [kpis, heatmapData, filtered]);

  // ── Badges ────────────────────────────────────────────────────────────────
  const badges = useMemo(() => [
    { name:'Velocity Pro',   desc:'50+ tasks completed',  icon:Zap,         color:'#f59e0b', earned: kpis.done >= 50   },
    { name:'Precision',      desc:'80%+ completion rate',  icon:Target,      color:'#22c55e', earned: kpis.compRate >= 80 },
    { name:'Overdue Zero',   desc:'Zero overdue tasks',    icon:CheckCircle2,color:'#36a9e1', earned: kpis.overdue === 0 },
    { name:'High Achiever',  desc:'10+ high-pri done',     icon:Award,       color:'#ef4444', earned: filtered.filter(t=>isCompleted(t)&&(t.priority||'').toLowerCase()==='high').length >= 10 },
    { name:'Consistent',     desc:'Tasks every day (7d)',  icon:Activity,    color:'#a855f7', earned: (() => {
      const now = new Date();
      for (let i = 0; i < 7; i++) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        if (!tasks.some(t => t.createdAt && new Date(t.createdAt).toDateString() === d.toDateString())) return false;
      }
      return true;
    })() },
    { name:'Planner',        desc:'100+ tasks created',   icon:Calendar,    color:'#312783', earned: tasks.length >= 100 },
  ], [kpis, filtered, tasks]);

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCSV = useCallback(() => {
    setExporting(true);
    const hdrs = ['Title','Priority','Status','Created','Due'];
    const rows = filtered.map(t => [
      `"${(t.title||'').replace(/"/g,'""')}"`,
      t.priority || 'None',
      isCompleted(t) ? 'Completed' : isOverdue(t) ? 'Overdue' : 'Pending',
      t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '',
      t.dueDate   ? new Date(t.dueDate).toLocaleDateString()   : '',
    ]);
    const csv  = [hdrs, ...rows].map(r => r.join(',')).join('\n');
    const link = document.createElement('a');
    link.href  = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
    link.download = `fundco-analytics-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    setTimeout(() => setExporting(false), 600);
  }, [filtered]);

  // ── Chart theme override ──────────────────────────────────────────────────
  const cOpts = (overrides = {}) => ({
    ...chartDefaults,
    plugins: { ...chartDefaults.plugins, ...overrides.plugins },
    scales:  overrides.noScales ? undefined : { ...chartDefaults.scales, ...overrides.scales },
    ...overrides,
  });

  const trendRate = kpis.prevRate ? Math.round(kpis.compRate - kpis.prevRate) : 0;

  return (
    <div className="space-y-6 py-4">

      {/* ── Header ── */}
      <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-3" style={{ color:'var(--text-primary)' }}>
            <BarChart2 className="w-6 h-6" style={{ color:'var(--brand-primary)' }} />
            Tasks Performance Analytics
          </h1>
          <p className="text-sm mt-0.5" style={{ color:'var(--text-secondary)' }}>
            {filtered.length} tasks in view · Last updated {new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border transition-all hover:opacity-80 disabled:opacity-40"
            style={{ borderColor:'var(--border-color)', color:'var(--text-secondary)', backgroundColor:'var(--bg-surface)' }}>
            {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export CSV
          </button>
        </div>
      </motion.div>

      {/* ── Filters ── */}
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.1 }}
        className="flex flex-wrap gap-4 items-center p-4 rounded-2xl border"
        style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}>
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 flex-shrink-0" style={{ color:'var(--text-muted)' }} />
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color:'var(--text-muted)' }}>Period</span>
        </div>
        <div className="flex gap-1">
          {[['7','7d'],['30','30d'],['90','90d'],['all','All time']].map(([v,l]) => (
            <Pill key={v} label={l} active={period===v} onClick={() => setPeriod(v)} />
          ))}
        </div>
        <div className="w-px h-4 flex-shrink-0" style={{ backgroundColor:'var(--border-color)' }} />
        <div className="flex gap-1">
          {[['all','All'],['high','High'],['medium','Med'],['low','Low']].map(([v,l]) => (
            <Pill key={v} label={l} active={priority===v} onClick={() => setPriority(v)} />
          ))}
        </div>
        <div className="w-px h-4 flex-shrink-0" style={{ backgroundColor:'var(--border-color)' }} />
        <div className="flex gap-1">
          {[['all','All'],['completed','Done'],['pending','Pending']].map(([v,l]) => (
            <Pill key={v} label={l} active={status===v} onClick={() => setStatus(v)} />
          ))}
        </div>
      </motion.div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard label="Total Tasks"   value={fmtNum(kpis.total)}   icon={BarChart2}    color="#312783"  spark={sparklines.created} delay={0}   />
        <KPICard label="Completed"     value={fmtNum(kpis.done)}    icon={CheckCircle2} color="#22c55e"  spark={sparklines.done}    delay={.05} trend={trendRate} />
        <KPICard label="Pending"       value={fmtNum(kpis.pending)} icon={Clock}        color="#f59e0b"  delay={.1} />
        <KPICard label="Overdue"       value={fmtNum(kpis.overdue)} icon={AlertTriangle}color="#ef4444"  spark={sparklines.overdue} delay={.15} />
        <KPICard label="Completion"    value={fmtPct(kpis.compRate)}icon={TrendingUp}   color="#36a9e1"  delay={.2} trend={trendRate} />
        <KPICard label="Perf. Score"   value={fmtPct(kpis.score)}   icon={Zap}          color="#a855f7"  delay={.25} />
      </div>

      {/* ── Completion rate rings ── */}
      <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:.3 }}
        className="rounded-2xl border p-5"
        style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}>
        <p className="text-xs font-black uppercase tracking-widest mb-5" style={{ color:'var(--text-muted)' }}>
          Completion by Priority
        </p>
        <div className="flex items-center justify-around flex-wrap gap-6">
          {['high','medium','low'].map(p => {
            const total = filtered.filter(t => (t.priority||'low').toLowerCase() === p).length;
            const done  = filtered.filter(t => (t.priority||'low').toLowerCase() === p && isCompleted(t)).length;
            const pct   = total ? (done / total) * 100 : 0;
            const color = PRIORITY_COLORS[p].solid;
            return (
              <div key={p} className="flex flex-col items-center gap-3">
                <Ring pct={pct} size={96} stroke={8} color={color} />
                <div className="text-center">
                  <p className="text-xs font-bold capitalize" style={{ color:'var(--text-primary)' }}>{p} Priority</p>
                  <p className="text-xs" style={{ color:'var(--text-muted)' }}>{done}/{total} tasks</p>
                </div>
              </div>
            );
          })}
          <div className="flex flex-col items-center gap-3">
            <Ring pct={kpis.compRate} size={96} stroke={8} color="var(--brand-primary)" />
            <div className="text-center">
              <p className="text-xs font-bold" style={{ color:'var(--text-primary)' }}>Overall</p>
              <p className="text-xs" style={{ color:'var(--text-muted)' }}>{kpis.done}/{kpis.total} tasks</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Charts row 1: Trend + Weekly ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:.35 }}
          className="lg:col-span-2 rounded-2xl border p-5"
          style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-black uppercase tracking-widest" style={{ color:'var(--text-muted)' }}>
              Task Velocity
            </p>
            <div className="flex gap-3 text-xs">
              {[['#36a9e1','Created'],['#22c55e','Completed']].map(([c,l]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor:c }} />
                  <span style={{ color:'var(--text-muted)' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ height:220 }}>
            <Line data={trendData} options={cOpts({ plugins: { legend:{ display:false }, tooltip: chartDefaults.plugins.tooltip } })} />
          </div>
        </motion.div>

        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:.4 }}
          className="rounded-2xl border p-5"
          style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}>
          <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color:'var(--text-muted)' }}>
            Weekly Pattern
          </p>
          <div style={{ height:220 }}>
            <Bar data={weeklyData} options={cOpts()} />
          </div>
        </motion.div>
      </div>

      {/* ── Charts row 2: Monthly + Priority doughnut + Priority bars ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:.45 }}
          className="lg:col-span-2 rounded-2xl border p-5"
          style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-black uppercase tracking-widest" style={{ color:'var(--text-muted)' }}>
              6-Month Overview
            </p>
            <div className="flex gap-3 text-xs">
              {[['rgba(49,39,131,.5)','Total'],['rgba(54,169,225,.8)','Completed']].map(([c,l]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-md" style={{ backgroundColor:c }} />
                  <span style={{ color:'var(--text-muted)' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ height:200 }}>
            <Bar data={monthlyData} options={cOpts({ plugins: { legend:{ display:false }, tooltip: chartDefaults.plugins.tooltip } })} />
          </div>
        </motion.div>

        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:.5 }}
          className="rounded-2xl border p-5 space-y-5"
          style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}>
          <p className="text-xs font-black uppercase tracking-widest" style={{ color:'var(--text-muted)' }}>
            Priority Mix
          </p>
          <div className="flex items-center gap-4">
            <div style={{ width:100, height:100 }} className="flex-shrink-0">
              <Doughnut data={priorityData} options={{
                responsive:true, maintainAspectRatio:false,
                cutout:'72%',
                plugins:{ legend:{ display:false }, tooltip:{ enabled:false } },
              }} />
            </div>
            <div className="flex-1 space-y-3">
              {priorityStats.map(ps => (
                <PriorityBar key={ps.label} {...ps} />
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Heatmap ── */}
      <Section title="Activity Heatmap" icon={Activity} delay={.55}>
        <div className="rounded-2xl border p-5"
          style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}>
          <p className="text-xs mb-4" style={{ color:'var(--text-muted)' }}>
            Task creation frequency by day and hour
          </p>
          <Heatmap data={heatmapData} />
        </div>
      </Section>

      {/* ── Insights + Badges ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="AI Insights" icon={TrendingUp} delay={.6}>
          <div className="rounded-2xl border p-5 space-y-3"
            style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}>
            {insights.map((ins, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                  style={{ backgroundColor: ins.type==='success' ? '#22c55e' : ins.type==='warn' ? '#f59e0b' : '#36a9e1' }} />
                <p style={{ color:'var(--text-secondary)' }}>{ins.text}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Achievements" icon={Award} delay={.65}>
          <div className="rounded-2xl border p-4 grid grid-cols-1 sm:grid-cols-2 gap-2"
            style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}>
            {badges.map(b => <Badge key={b.name} {...b} />)}
          </div>
        </Section>
      </div>

      {/* ── Task history ── */}
      <Section title="Recent Tasks" icon={Calendar} delay={.7}>
        <div className="rounded-2xl border p-5"
          style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}>
          {filtered.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color:'var(--text-muted)' }}>
              No tasks match the current filters
            </p>
          ) : (
            <>
              <div className="max-h-72 overflow-y-auto">
                {filtered.slice(0, 20).map((t, i) => <TaskRow key={t._id || i} task={t} index={i} />)}
              </div>
              {filtered.length > 20 && (
                <p className="text-xs text-center mt-3" style={{ color:'var(--text-muted)' }}>
                  Showing 20 of {filtered.length} tasks — export CSV for full list
                </p>
              )}
            </>
          )}
        </div>
      </Section>

    </div>
  );
};

export default PerformanceAnalytics;