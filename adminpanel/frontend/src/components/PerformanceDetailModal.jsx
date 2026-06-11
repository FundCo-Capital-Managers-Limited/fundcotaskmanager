import React, { useEffect, useMemo, useState } from 'react';
import { Award, Brain, Loader2, Target, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal, ProgressBar, StatusPill } from './ui.jsx';
import userApi from '../utils/userApi.js';
import { formatPersonName } from '../utils/adminFormat.js';

const StatCard = ({ label, value, tone = 'var(--brand-primary)' }) => (
  <div className="rounded-[1rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
    <p className="text-[0.68rem] font-black uppercase tracking-[0.1em]" style={{ color: 'var(--c-text-faint)' }}>{label}</p>
    <p className="mt-2 text-2xl font-black" style={{ color: tone }}>{value}</p>
  </div>
);

const breakdownRows = (data) => {
  const breakdown = data?.breakdown || {};
  return [
    { label: 'Base task points', value: breakdown.basePoints || 0, tone: 'var(--brand-primary)' },
    { label: 'Approval bonus', value: breakdown.approvalBonus || 0, tone: '#2563eb' },
    { label: 'On-time bonus', value: breakdown.onTimeBonus || 0, tone: '#16a34a' },
    { label: 'Checklist bonus', value: breakdown.checklistBonus || 0, tone: '#d97706' },
    { label: 'Goal points', value: breakdown.goalPoints || 0, tone: '#7c3aed' },
    { label: 'Penalties', value: breakdown.penaltyTotal || 0, tone: '#dc2626' },
  ];
};

const PerformanceDetailModal = ({ open, userSummary, onClose }) => {
  const [detail, setDetail] = useState(null);
  const [aiNote, setAiNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    if (!open || !userSummary?._id) {
      setDetail(null);
      setAiNote('');
      return;
    }

    let active = true;
    setLoading(true);
    setLoadingAi(true);

    userApi.get(`/api/performance/user/${userSummary._id}/details`)
      .then((detailResponse) => {
        if (!active) return;
        setDetail(detailResponse.data);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(error.response?.data?.message || 'Failed to load performance details');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    userApi.get(`/api/performance/user/${userSummary._id}/ai-note`)
      .then((noteResponse) => {
        if (!active) return;
        setAiNote(noteResponse.data?.aiNote || '');
      })
      .catch(() => {
        if (!active) return;
        setAiNote('');
      })
      .finally(() => {
        if (!active) return;
        setLoadingAi(false);
      });

    return () => {
      active = false;
    };
  }, [open, userSummary?._id]);

  const priorityRows = useMemo(() => {
    const stats = detail?.taskStatsByPriority || {};
    return ['Low', 'Medium', 'High'].map((priority) => {
      const entry = stats[priority] || {};
      return {
        priority,
        count: Number(entry.count || 0),
        completed: Number(entry.completed || 0),
        basePoints: Number(entry.basePoints || 0),
        approvalBonus: Number(entry.approvalBonus || 0),
        checklistBonus: Number(entry.checklistBonus || 0),
      };
    });
  }, [detail]);

  const personName = formatPersonName(detail?.user || userSummary || {});

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={personName || 'Performance details'}
      subtitle={detail?.user?.position || userSummary?.position || 'Performance breakdown and AI analysis'}
      width="max-w-5xl"
    >
      {loading ? (
        <div className="flex min-h-72 items-center justify-center">
          <div className="flex items-center gap-3 text-sm font-semibold" style={{ color: 'var(--c-text-soft)' }}>
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading performance details...
          </div>
        </div>
      ) : detail ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Total score" value={detail.totalScore || 0} tone="var(--brand-primary)" />
            <StatCard label="Task points" value={detail.taskPoints || 0} tone="#2563eb" />
            <StatCard label="Goal points" value={detail.goalPoints || 0} tone="#16a34a" />
            <StatCard label="Completion" value={`${detail.completionRate || 0}%`} tone="#d97706" />
          </div>

          <section className="rounded-[1.15rem] border p-5" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel)' }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.1em]" style={{ color: 'var(--c-text-faint)' }}>Level and momentum</p>
                <h4 className="mt-2 text-lg font-black" style={{ color: 'var(--c-text)' }}>{detail.level || 'Unranked'}</h4>
              </div>
              {detail.nextLevel ? <StatusPill tone="secondary">Next: {detail.nextLevel.name}</StatusPill> : null}
            </div>
            {detail.nextLevel ? (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold" style={{ color: 'var(--c-text-soft)' }}>
                  <span>Progress to next level</span>
                  <span>{detail.nextLevel.progress || 0}%</span>
                </div>
                <ProgressBar value={detail.nextLevel.progress || 0} />
              </div>
            ) : null}
          </section>

          <section className="rounded-[1.15rem] border p-5" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel)' }}>
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
              <h4 className="text-sm font-black uppercase tracking-[0.08em]" style={{ color: 'var(--c-text)' }}>Transparent score breakdown</h4>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {breakdownRows(detail).map((row) => (
                <div key={row.label} className="rounded-[0.95rem] border px-4 py-3" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                  <p className="text-xs font-black uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-faint)' }}>{row.label}</p>
                  <p className="mt-1 text-xl font-black" style={{ color: row.tone }}>{row.value >= 0 ? `+${row.value}` : row.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[1.15rem] border p-5" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel)' }}>
              <div className="mb-4 flex items-center gap-2">
                <Target className="h-4 w-4" style={{ color: '#16a34a' }} />
                <h4 className="text-sm font-black uppercase tracking-[0.08em]" style={{ color: 'var(--c-text)' }}>Task execution by priority</h4>
              </div>
              <div className="space-y-3">
                {priorityRows.map((row) => {
                  const completion = row.count ? Math.round((row.completed / row.count) * 100) : 0;
                  return (
                    <div key={row.priority} className="rounded-[0.95rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-sm font-black" style={{ color: 'var(--c-text)' }}>{row.priority}</p>
                        <span className="text-xs font-semibold" style={{ color: 'var(--c-text-soft)' }}>{row.completed}/{row.count} completed</span>
                      </div>
                      <ProgressBar value={completion} tone={row.priority === 'High' ? '#dc2626' : row.priority === 'Medium' ? '#d97706' : '#16a34a'} />
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs" style={{ color: 'var(--c-text-soft)' }}>
                        <span>Base: {row.basePoints}</span>
                        <span>Approval: {row.approvalBonus}</span>
                        <span>Checklist: {row.checklistBonus}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[1.15rem] border p-5" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel)' }}>
              <div className="mb-4 flex items-center gap-2">
                <Award className="h-4 w-4" style={{ color: '#7c3aed' }} />
                <h4 className="text-sm font-black uppercase tracking-[0.08em]" style={{ color: 'var(--c-text)' }}>Goal summary</h4>
              </div>
              <div className="space-y-3">
                <StatCard label="Goals tracked" value={detail.totalGoals || 0} tone="#7c3aed" />
                <StatCard label="Goals completed" value={detail.completedGoals || 0} tone="#16a34a" />
                {Array.isArray(detail.goalDetails) && detail.goalDetails.length ? (
                  <div className="rounded-[0.95rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                    <p className="text-xs font-black uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-faint)' }}>Recent goal performance</p>
                    <div className="mt-3 space-y-2">
                      {detail.goalDetails.slice(0, 4).map((goal) => (
                        <div key={`${goal.title}-${goal.timeframe}`} className="rounded-[0.85rem] border px-3 py-2" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel)' }}>
                          <p className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>{goal.title}</p>
                          <p className="mt-1 text-xs" style={{ color: 'var(--c-text-soft)' }}>
                            {goal.progress}% progress · {goal.done}/{goal.total} sub-goals complete
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-[1.15rem] border p-5" style={{ borderColor: 'rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.06)' }}>
            <div className="mb-4 flex items-center gap-2">
              <Brain className="h-4 w-4" style={{ color: '#b45309' }} />
              <h4 className="text-sm font-black uppercase tracking-[0.08em]" style={{ color: '#92400e' }}>Super AI analysis</h4>
            </div>
            {loadingAi ? (
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#92400e' }}>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating analysis...
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-7" style={{ color: 'var(--c-text-soft)' }}>
                {aiNote || 'AI analysis is not available for this user yet.'}
              </p>
            )}
          </section>
        </div>
      ) : (
        <div className="py-16 text-center text-sm font-semibold" style={{ color: 'var(--c-text-soft)' }}>
          No performance details available.
        </div>
      )}
    </Modal>
  );
};

export default PerformanceDetailModal;



