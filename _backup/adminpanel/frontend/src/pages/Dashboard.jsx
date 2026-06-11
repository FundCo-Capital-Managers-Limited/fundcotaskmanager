import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileText,
  ListTodo,
  Target,
  TrendingUp,
  TriangleAlert,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { EmptyState, LoadingScreen, PageHeader, Panel, ProgressBar, StatCard } from '../components/ui.jsx';

const PIE_COLORS = ['#312783', '#36a9e1', '#c98512', '#d64545'];

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState({});
  const [taskStats, setTaskStats] = useState({});
  const [goalStats, setGoalStats] = useState({});
  const [reportStats, setReportStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/performance/analytics'),
      api.get('/tasks/stats'),
      api.get('/goals/stats'),
      api.get('/reports/stats'),
    ])
      .then(([a, t, g, r]) => {
        setAnalytics(a.data.analytics || {});
        setTaskStats(t.data.stats || {});
        setGoalStats(g.data.stats || {});
        setReportStats(r.data.stats || {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const taskDistribution = useMemo(
    () =>
      [
        { name: 'Completed', value: taskStats.completed || 0 },
        { name: 'Pending', value: taskStats.pending || 0 },
        { name: 'Overdue', value: taskStats.overdue || 0 },
        { name: 'In Review', value: taskStats.submitted || 0 },
      ].filter((item) => item.value > 0),
    [taskStats],
  );

  const trendData = [
    { label: 'Mon', velocity: Math.max((analytics.completionRate || 42) - 18, 18), focus: 30 },
    { label: 'Tue', velocity: Math.max((analytics.completionRate || 42) - 9, 22), focus: 38 },
    { label: 'Wed', velocity: Math.max((analytics.completionRate || 42) - 3, 28), focus: 43 },
    { label: 'Thu', velocity: Math.max((analytics.completionRate || 42) + 4, 35), focus: 51 },
    { label: 'Fri', velocity: Math.max((analytics.completionRate || 42) + 9, 41), focus: 58 },
    { label: 'Sat', velocity: Math.max((analytics.completionRate || 42) + 2, 39), focus: 49 },
  ];

  if (loading) return <LoadingScreen />;

  const greeting =
    new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening';

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Overview"
        title={`Good ${greeting}, ${user?.firstName || 'Admin'}`}
        actions={
          <>
            <button className="btn-secondary rounded-full" onClick={() => navigate('/reports')}>
              <FileText className="h-4 w-4" />
              Reports
            </button>
            <button className="btn-primary rounded-full" onClick={() => navigate('/tasks')}>
              <ArrowUpRight className="h-4 w-4" />
              Open Tasks
            </button>
          </>
        }

      />

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <StatCard label="Team Members" value={analytics.totalUsers || 0} icon={Users} tone="var(--brand-secondary)" helper="Visible accounts in scope" />
        <StatCard label="Total Tasks" value={analytics.totalTasks || 0} icon={ListTodo} tone="var(--brand-primary)" helper={`${analytics.pendingApproval || 0} waiting for review`} />
        <StatCard label="Completed" value={analytics.completedTasks || 0} icon={CheckCircle2} tone="var(--c-success)" helper={`${analytics.completionRate || 0}% completion rate`} />
        <StatCard label="Overdue" value={analytics.overdueTasks || 0} icon={TriangleAlert} tone="var(--c-danger)" helper="Items that need action soon" />
      </div>

      <div className="grid gap-4 2xl:grid-cols-[1.55fr_0.95fr]">
        <Panel title="Work Pace" subtitle="This week">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid vertical={false} stroke="var(--c-border)" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--c-text-faint)', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--c-text-faint)', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--c-surface)',
                    border: '1px solid var(--c-border)',
                    borderRadius: 16,
                    boxShadow: 'var(--shadow-md)',
                  }}
                />
                <Area type="monotone" dataKey="focus" stroke="#36a9e1" fill="#36a9e1" fillOpacity={0.1} strokeWidth={2.4} />
                <Area type="monotone" dataKey="velocity" stroke="#312783" fill="#312783" fillOpacity={0.12} strokeWidth={2.4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Task Mix" subtitle="Current status">
          {taskDistribution.length ? (
            <div className="space-y-5">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={taskDistribution} innerRadius={64} outerRadius={90} paddingAngle={4} dataKey="value">
                      {taskDistribution.map((entry, index) => (
                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--c-surface)',
                        border: '1px solid var(--c-border)',
                        borderRadius: 16,
                        boxShadow: 'var(--shadow-md)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {taskDistribution.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between rounded-[1.2rem] border px-4 py-3" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ background: PIE_COLORS[index % PIE_COLORS.length] }} />
                      <span className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>{item.name}</span>
                    </div>
                    <span className="text-sm font-black" style={{ color: 'var(--c-text)' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState icon={ListTodo} title="No task data yet" description="Task totals will appear here after work items are loaded." />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 2xl:grid-cols-[1.2fr_0.9fr_0.9fr]">
        <Panel title="Quick Actions" subtitle="Fast routes into active work">
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { label: 'Pending Review', value: analytics.pendingApproval || 0, icon: Clock3, tone: 'var(--c-warning)', to: '/tasks' },
              { label: 'Submitted Reports', value: reportStats.submitted || 0, icon: FileText, tone: 'var(--brand-primary)', to: '/reports' },
              { label: 'Active Goals', value: goalStats.active || 0, icon: Target, tone: 'var(--brand-secondary)', to: '/goals' },
              { label: 'Completion Rate', value: `${analytics.completionRate || 0}%`, icon: TrendingUp, tone: 'var(--c-success)', to: '/performance' },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.to)}
                className="surface-card surface-card-hover flex items-center justify-between rounded-[1.4rem] p-4 text-left"
              >
                <div>
                  <p className="section-title mb-2">{item.label}</p>
                  <p className="stat-value text-3xl" style={{ color: item.tone }}>{item.value}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'var(--c-surface-3)' }}>
                  <item.icon className="h-5 w-5" style={{ color: item.tone }} />
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Goals" subtitle="Current progress">
          <div className="space-y-4">
            {[
              { label: 'Total Goals', value: goalStats.total || 0, tone: 'var(--brand-primary)' },
              { label: 'Active', value: goalStats.active || 0, tone: 'var(--brand-secondary)' },
              { label: 'Completed', value: goalStats.completed || 0, tone: 'var(--c-success)' },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.3rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
                <p className="section-title mb-2">{item.label}</p>
                <p className="stat-value text-3xl" style={{ color: item.tone }}>{item.value}</p>
              </div>
            ))}
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span style={{ color: 'var(--c-text-soft)' }}>Average progress</span>
                <span className="font-black" style={{ color: 'var(--brand-primary)' }}>{goalStats.avgProgress || 0}%</span>
              </div>
              <ProgressBar value={goalStats.avgProgress || 0} />
            </div>
          </div>
        </Panel>

        <Panel title="Reports" subtitle="Review state">
          <div className="space-y-4">
            {[
              { label: 'Submitted', value: reportStats.submitted || 0, tone: 'var(--c-warning)' },
              { label: 'Approved', value: reportStats.approved || 0, tone: 'var(--c-success)' },
              { label: 'Rejected', value: reportStats.rejected || 0, tone: 'var(--c-danger)' },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.3rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
                <p className="section-title mb-2">{item.label}</p>
                <p className="stat-value text-3xl" style={{ color: item.tone }}>{item.value}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default Dashboard;
