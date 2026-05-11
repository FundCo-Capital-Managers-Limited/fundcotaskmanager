import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  FolderKanban,
  Gauge,
  ListTodo,
  ShieldAlert,
  Target,
  Users,
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  EmptyState,
  LoadingScreen,
  MiniStat,
  PageHeader,
  Panel,
  StatCard,
  StatusPill,
  SurfaceMetric,
} from '../components/ui.jsx';

const CHART_COLORS = ['#312783', '#36a9e1', '#059669', '#d97706', '#dc2626'];
const healthTone = {
  'on-track': 'success',
  watch: 'warning',
  'at-risk': 'danger',
  settled: 'brand',
};

const formatShortDate = (value) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return new Intl.DateTimeFormat('en-NG', { month: 'short', day: 'numeric' }).format(date);
};

const formatCurrency = (value, currency = 'NGN') => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '-';
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
};

const personName = (user) => user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unassigned';

const ChartPanel = ({ title, data, valueKey, labelKey }) => (
  <Panel title={title}>
    {data.length ? (
      <div className="grid gap-4 lg:grid-cols-[13rem,1fr] lg:items-center">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey={valueKey} nameKey={labelKey} innerRadius={54} outerRadius={82} paddingAngle={4}>
                {data.map((item, index) => (
                  <Cell key={`${item[labelKey]}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--c-panel)',
                  border: '1px solid var(--c-border)',
                  borderRadius: 16,
                  boxShadow: 'var(--shadow-md)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          {data.map((item, index) => (
            <div
              key={`${item[labelKey]}-row`}
              className="flex items-center justify-between rounded-[0.8rem] border px-4 py-3"
              style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}
            >
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
                <span className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>{item[labelKey]}</span>
              </div>
              <span className="text-sm font-black" style={{ color: 'var(--c-text)' }}>{item[valueKey]}</span>
            </div>
          ))}
        </div>
      </div>
    ) : (
      <EmptyState icon={FolderKanban} title="No portfolio data" description="Project distribution appears here once projects are in place." />
    )}
  </Panel>
);

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState({});
  const [taskStats, setTaskStats] = useState({});
  const [goalStats, setGoalStats] = useState({});
  const [reportStats, setReportStats] = useState({});
  const [overview, setOverview] = useState({
    scorecard: {},
    portfolio: { byStatus: [], byHealth: [], topPriority: [] },
    weeklyReview: { priorities: [], approvalsBacklog: [], dueMilestones: [], wins: [] },
    workload: [],
    escalations: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/performance/analytics'),
      api.get('/tasks/stats'),
      api.get('/goals/stats'),
      api.get('/reports/stats'),
      api.get('/projects/ops/overview'),
    ])
      .then(([analyticsRes, taskRes, goalRes, reportRes, projectRes]) => {
        setAnalytics(analyticsRes.data.analytics || {});
        setTaskStats(taskRes.data.stats || {});
        setGoalStats(goalRes.data.stats || {});
        setReportStats(reportRes.data.stats || {});
        setOverview(projectRes.data.overview || {
          scorecard: {},
          portfolio: { byStatus: [], byHealth: [], topPriority: [] },
          weeklyReview: { priorities: [], approvalsBacklog: [], dueMilestones: [], wins: [] },
          workload: [],
          escalations: [],
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }, []);

  if (loading) return <LoadingScreen />;

  const scorecard = overview.scorecard || {};
  const priorities = overview.weeklyReview?.priorities || [];
  const approvalsBacklog = overview.weeklyReview?.approvalsBacklog || [];
  const dueMilestones = overview.weeklyReview?.dueMilestones || [];
  const wins = overview.weeklyReview?.wins || [];
  const topProjects = overview.portfolio?.topPriority || [];
  const workload = overview.workload || [];
  const escalations = overview.escalations || [];
  const totalTasks = Number(taskStats.total || 0);
  const completedTasks = Number(taskStats.completed || 0);
  const pendingTasks = Number(taskStats.pending || 0);
  const overdueTasks = Number(taskStats.overdue || 0);
  const submittedTasks = Number(taskStats.submitted || 0);
  const totalProjects = Number(scorecard.totalProjects || 0);
  const activeProjects = Number(scorecard.activeProjects || 0);
  const atRiskProjects = Number(scorecard.atRiskProjects || 0);
  const openRisks = Number(scorecard.openRisks || 0);
  const openIssues = Number(scorecard.openIssues || 0);
  const overdueMilestones = Number(scorecard.overdueMilestones || 0);
  const completedGoals = Number(goalStats.completed || goalStats.done || 0);
  const activeGoals = Number(goalStats.active || 0);
  const submittedReports = Number(reportStats.submitted || 0);
  const approvedReports = Number(reportStats.approved || 0);
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const approvalPressure = submittedTasks + approvalsBacklog.length;
  const workloadRiskCount = workload.filter((item) => Number(item.overdue || 0) > 0 || Number(item.review || 0) > 3).length;
  const deliveryFriction = overdueTasks + overdueMilestones + atRiskProjects + escalations.length;
  const deliveryConfidence = Math.max(8, 100 - Math.min(92, deliveryFriction * 6 + approvalPressure * 2));
  const budgetTracked = topProjects.reduce((sum, item) => sum + Number(item.metrics?.budgetActual || 0), 0);
  const budgetPlanned = topProjects.reduce((sum, item) => sum + Number(item.metrics?.budgetPlanned || 0), 0);
  const orgPulse = [
    {
      label: 'Execution health',
      value: `${completionRate}%`,
      detail: `${completedTasks} of ${totalTasks} tasks complete across your scope`,
      tone: completionRate >= 75 ? 'var(--c-success)' : completionRate >= 50 ? 'var(--c-warning)' : 'var(--c-danger)',
    },
    {
      label: 'Delivery confidence',
      value: `${deliveryConfidence}%`,
      detail: `${atRiskProjects} at-risk projects, ${escalations.length} live escalations`,
      tone: deliveryConfidence >= 75 ? 'var(--brand-primary)' : deliveryConfidence >= 55 ? 'var(--c-warning)' : 'var(--c-danger)',
    },
    {
      label: 'Approval pressure',
      value: approvalPressure,
      detail: `${submittedTasks} submitted tasks and ${approvalsBacklog.length} key items waiting`,
      tone: approvalPressure <= 4 ? 'var(--c-success)' : approvalPressure <= 10 ? 'var(--c-warning)' : 'var(--c-danger)',
    },
    {
      label: 'Team load watch',
      value: workloadRiskCount,
      detail: `${workloadRiskCount} team members need follow-up on load or review backlog`,
      tone: workloadRiskCount === 0 ? 'var(--c-success)' : workloadRiskCount <= 3 ? 'var(--c-warning)' : 'var(--c-danger)',
    },
  ];

  return (
    <div className="page-shell">
      <PageHeader
        title={`Good ${greeting}, ${user?.firstName || 'Admin'}`}
        description="See how your teams are performing, where delivery is slipping, what needs approval, and which parts of the company need attention right now."
        actions={
          <>
            <button className="btn-secondary rounded-full" onClick={() => navigate('/projects')}>
              <FolderKanban className="h-4 w-4" />
              Projects
            </button>
            <button className="btn-primary rounded-full" onClick={() => navigate('/tasks')}>
              <ListTodo className="h-4 w-4" />
              Team Tasks
            </button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <Panel title="Leadership Overview" >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {orgPulse.map((item) => (
              <SurfaceMetric key={item.label} title={item.label} value={item.value} detail={item.detail} tone={item.tone} />
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MiniStat label="People in scope" value={analytics.totalUsers || 0} tone="var(--brand-primary)" />
            <MiniStat label="Active projects" value={activeProjects} tone="var(--brand-secondary)" />
            <MiniStat label="Goals in motion" value={activeGoals} tone="#7c3aed" />
            <MiniStat label="Reports approved" value={approvedReports} tone="var(--c-success)" />
          </div>
        </Panel>

        <Panel title="What Needs Attention Now" subtitle="The fastest way to understand whether the company is under control">
          <div className="grid gap-3">
            <StatCard label="At-risk projects" value={atRiskProjects} icon={ShieldAlert} tone="var(--c-danger)" helper={`${openRisks} open risks, ${openIssues} open issues`} />
            <StatCard label="Review backlog" value={submittedTasks} icon={FileText} tone="var(--c-warning)" helper="Submitted work waiting on a decision" />
            <StatCard label="Overdue delivery" value={overdueTasks + overdueMilestones} icon={CalendarClock} tone="var(--brand-secondary)" helper={`${overdueTasks} tasks and ${overdueMilestones} milestones are late`} />
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
        <StatCard label="Team members" value={analytics.totalUsers || 0} icon={Users} tone="var(--brand-primary)" helper="Users and admins inside your operating scope" />
        <StatCard label="Total tasks" value={totalTasks} icon={ListTodo} tone="var(--brand-secondary)" helper={`${pendingTasks} still in progress`} />
        <StatCard label="Completed tasks" value={completedTasks} icon={CheckCircle2} tone="var(--c-success)" helper={`${completionRate}% completion rate`} />
        <StatCard label="Projects tracked" value={totalProjects} icon={FolderKanban} tone="var(--brand-primary)" helper={`${activeProjects} actively moving right now`} />
       
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        <Panel title="Team Effectiveness Scorecard" subtitle="How well the teams under you are executing and converting work into results">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SurfaceMetric title="Visible team members" value={analytics.totalUsers || 0} detail="Current operating scope" tone="var(--brand-primary)" />
            <SurfaceMetric title="Goals completed" value={completedGoals} detail={`${activeGoals} still active across teams`} tone="#7c3aed" />
            <SurfaceMetric title="Reports submitted" value={submittedReports} detail={`${approvedReports} have already been approved`} tone="var(--c-warning)" />
            <SurfaceMetric title="Budget at risk" value={scorecard.budgetAtRisk || 0} detail="Projects already above planned spend" tone="var(--c-warning)" />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MiniStat label="Open projects" value={scorecard.openProjects || 0} tone="var(--brand-primary)" />
            <MiniStat label="Approved tasks" value={taskStats.approved || 0} tone="var(--c-success)" />
            <MiniStat label="Open issues" value={openIssues} tone="var(--c-danger)" />
            <MiniStat label="Watch list" value={scorecard.watchProjects || 0} tone="var(--brand-secondary)" />
          </div>
        </Panel>

        <Panel title="Escalation Board" subtitle="Anything here is slowing the company down and needs intervention">
          <div className="space-y-3">
            {escalations.length ? escalations.map((item, index) => (
              <button
                key={`${item.type}-${item.projectId}-${index}`}
                type="button"
                onClick={() => navigate(item.route || `/projects/${item.projectId}`)}
                className="w-full rounded-[0.85rem] border p-4 text-left transition-colors hover:bg-[var(--c-panel-subtle)]"
                style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone={item.severity === 'critical' ? 'danger' : item.severity === 'high' ? 'warning' : 'info'}>
                        {item.type}
                      </StatusPill>
                      <StatusPill tone={item.severity === 'critical' ? 'danger' : item.severity === 'high' ? 'warning' : 'neutral'}>
                        {item.severity}
                      </StatusPill>
                    </div>
                    <p className="mt-2 text-sm font-black" style={{ color: 'var(--c-text)' }}>{item.title}</p>
                    <p className="mt-1 text-sm" style={{ color: 'var(--c-text-muted)' }}>{item.projectName}</p>
                    <p className="mt-2 text-sm leading-6" style={{ color: 'var(--c-text-soft)' }}>{item.detail}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0" style={{ color: 'var(--c-text-faint)' }} />
                </div>
              </button>
            )) : (
              <EmptyState icon={CheckCircle2} title="No current escalations" description="Critical risks, overdue milestones, and escalated issues will appear here." />
            )}
          </div>
        </Panel>
      </div>

      <Panel title="Task Operations Overview" subtitle="A clean view of how work is flowing through the teams you manage">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <SurfaceMetric title="Team members" value={analytics.totalUsers || 0} detail="People you can currently follow up on" tone="var(--brand-primary)" />
          <SurfaceMetric title="Total tasks" value={taskStats.total || 0} detail="All tracked task records" tone="var(--brand-secondary)" />
          <SurfaceMetric title="Completed" value={taskStats.completed || 0} detail="Finished tasks in scope" tone="var(--c-success)" />
          <SurfaceMetric title="Pending" value={taskStats.pending || 0} detail="Tasks still in execution" tone="#d97706" />
          <SurfaceMetric title="Overdue" value={taskStats.overdue || 0} detail="Work that has slipped beyond due date" tone="var(--c-danger)" />
          <SurfaceMetric title="In review" value={taskStats.submitted || 0} detail="Submitted work waiting for decision" tone="var(--c-warning)" />
        </div>
      </Panel>


      <div className="grid gap-4 2xl:grid-cols-[1.15fr,0.85fr]">
        <Panel title="Weekly Operating Review" subtitle="The conversations leadership should have this week">
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-faint)' }}>Priority projects</h3>
              {priorities.length ? priorities.map((item) => (
                <button
                  key={item.projectId}
                  type="button"
                  onClick={() => navigate(`/projects/${item.projectId}`)}
                  className="w-full rounded-[0.85rem] border p-4 text-left"
                  style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black" style={{ color: 'var(--c-text)' }}>{item.projectName}</p>
                    <StatusPill tone={healthTone[item.health] || 'neutral'}>{item.health.replace('-', ' ')}</StatusPill>
                  </div>
                  <p className="mt-2 text-sm" style={{ color: 'var(--c-text-muted)' }}>
                    {item.overdueTasks} overdue tasks • {item.overdueMilestones} overdue milestones • {item.openRisks} open risks
                  </p>
                </button>
              )) : <p className="text-sm" style={{ color: 'var(--c-text-muted)' }}>No flagged projects right now.</p>}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-faint)' }}>Approval backlog</h3>
              {approvalsBacklog.length ? approvalsBacklog.map((item) => (
                <button
                  key={item.taskId}
                  type="button"
                  onClick={() => navigate('/tasks')}
                  className="w-full rounded-[0.85rem] border p-4 text-left"
                  style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}
                >
                  <p className="font-black" style={{ color: 'var(--c-text)' }}>{item.taskTitle}</p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--c-text-muted)' }}>{item.projectName}</p>
                  <p className="mt-2 text-sm" style={{ color: 'var(--c-text-soft)' }}>
                    {personName(item.owner)} • submitted {formatShortDate(item.submittedAt)}
                  </p>
                </button>
              )) : <p className="text-sm" style={{ color: 'var(--c-text-muted)' }}>Nothing is waiting for approval.</p>}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-faint)' }}>Milestones due soon</h3>
              {dueMilestones.length ? dueMilestones.map((item) => (
                <button
                  key={item.milestoneId}
                  type="button"
                  onClick={() => navigate(`/projects/${item.projectId}`)}
                  className="w-full rounded-[0.85rem] border p-4 text-left"
                  style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}
                >
                  <p className="font-black" style={{ color: 'var(--c-text)' }}>{item.title}</p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--c-text-muted)' }}>{item.projectName}</p>
                  <p className="mt-2 text-sm" style={{ color: 'var(--c-text-soft)' }}>
                    {personName(item.owner)} • due {formatShortDate(item.dueDate)}
                  </p>
                </button>
              )) : <p className="text-sm" style={{ color: 'var(--c-text-muted)' }}>No milestones due in the next seven days.</p>}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-faint)' }}>Delivery wins</h3>
              {wins.length ? wins.map((item) => (
                <button
                  key={item.projectId}
                  type="button"
                  onClick={() => navigate(`/projects/${item.projectId}`)}
                  className="w-full rounded-[0.85rem] border p-4 text-left"
                  style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}
                >
                  <p className="font-black" style={{ color: 'var(--c-text)' }}>{item.projectName}</p>
                  <p className="mt-2 text-sm" style={{ color: 'var(--c-text-soft)' }}>
                    {item.completedMilestones} milestones completed • {item.completion}% task completion
                  </p>
                </button>
              )) : <p className="text-sm" style={{ color: 'var(--c-text-muted)' }}>No delivery wins captured yet.</p>}
            </div>
          </div>
        </Panel>

        <Panel title="Capacity and Delivery Load" subtitle="Who is stretched, who is stable, and where follow-up pressure is building">
          <div className="space-y-3">
            {workload.length ? workload.map((item, index) => (
              <div key={`${item.member?._id || index}`} className="rounded-[0.85rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black" style={{ color: 'var(--c-text)' }}>{personName(item.member)}</p>
                    <p className="mt-1 text-sm" style={{ color: 'var(--c-text-muted)' }}>{item.projects} active project surfaces</p>
                  </div>
                  <StatusPill tone={item.overdue > 0 ? 'danger' : item.review > 0 ? 'warning' : 'success'}>
                    {item.overdue > 0 ? 'overloaded' : item.review > 0 ? 'needs review' : 'stable'}
                  </StatusPill>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  <MiniStat label="Open" value={item.open} tone="var(--brand-primary)" />
                  <MiniStat label="Review" value={item.review} tone="var(--c-warning)" />
                  <MiniStat label="Overdue" value={item.overdue} tone="var(--c-danger)" />
                  <MiniStat label="High Pri" value={item.highPriority} tone="var(--brand-secondary)" />
                </div>
              </div>
            )) : (
              <EmptyState icon={Users} title="No workload data" description="Once project tasks are active, workload concentration will appear here." />
            )}
          </div>

        </Panel>
      </div>

      
    </div>
  );
};

export default Dashboard;
