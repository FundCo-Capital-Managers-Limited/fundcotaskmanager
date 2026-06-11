import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  FileText,
  Mail,
  Plus,
  RefreshCcw,
  Search,
  Send,
  Sparkles,
  Users,
} from 'lucide-react';
import api from '../utils/api.js';
import userApi from '../utils/userApi.js';
import { useNotifications } from '../context/NotificationContext.jsx';
import {
  EmptyState,
  FilterChip,
  LoadingScreen,
  Modal,
  PageHeader,
  Panel,
  SearchInput,
  StatCard,
} from '../components/ui.jsx';

const TYPE_OPTIONS = [
  { value: 'standup', label: 'Standup' },
  { value: 'internal', label: 'Internal' },
  { value: 'client', label: 'Client' },
  { value: 'board', label: 'Board' },
  { value: 'review', label: 'Review' },
  { value: 'planning', label: 'Planning' },
  { value: 'retrospective', label: 'Retrospective' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'other', label: 'Other' },
];

const TYPE_LABELS = TYPE_OPTIONS.reduce((accumulator, option) => ({ ...accumulator, [option.value]: option.label }), {});
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High'];

const emptyTaskForm = {
  ownerId: '',
  title: '',
  description: '',
  priority: 'Medium',
  dueDate: '',
};

const emptyCreateForm = {
  title: '',
  meetingDate: new Date().toISOString().split('T')[0],
  meetingType: 'internal',
  overview: '',
  keyUpdates: '',
  decisions: '',
  blockers: '',
  nextSteps: '',
  attendees: [],
  circulateTo: [],
  distributeToParticipants: true,
  sendEmailCopy: false,
  actionItems: [],
  file: null,
};

const fullName = (user) => user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown user';
const formatDate = (value) => value ? format(new Date(value), 'MMM d, yyyy') : 'No date';
const formatDateTime = (value) => value ? format(new Date(value), 'MMM d, yyyy h:mm a') : 'Not yet';

const buildStructuredSummary = (form) => {
  const sections = [
    { title: 'Meeting Overview', value: form.overview },
    { title: 'Key Updates', value: form.keyUpdates },
    { title: 'Decisions Taken', value: form.decisions },
    { title: 'Risks And Blockers', value: form.blockers },
    { title: 'Next Steps', value: form.nextSteps },
  ].filter((section) => String(section.value || '').trim());

  return sections.map((section) => `${section.title}\n${String(section.value).trim()}`).join('\n\n');
};

const MeetingReports = () => {
  const { markMeetingReportsRead } = useNotifications();
  const [tab, setTab] = useState('manage');
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    recipients: 0,
    viewedRecipients: 0,
    acknowledgedRecipients: 0,
    pendingViewRecipients: 0,
    pendingAcknowledgementRecipients: 0,
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [taskModal, setTaskModal] = useState({ open: false, reportId: '', itemId: '', preset: null });
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [taskSaving, setTaskSaving] = useState(false);
  const [form, setForm] = useState(emptyCreateForm);

  const structuredSummary = useMemo(() => buildStructuredSummary(form), [form]);
  const recipientIds = useMemo(() => {
    const ids = new Set(form.circulateTo);
    if (form.distributeToParticipants) {
      form.attendees.forEach((value) => ids.add(value));
    }
    return [...ids];
  }, [form.attendees, form.circulateTo, form.distributeToParticipants]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const [reportsRes, statsRes, usersRes] = await Promise.all([
        userApi.get('/api/meeting-reports', { params: { scope, search } }),
        userApi.get('/api/meeting-reports/stats'),
        api.get('/users', { params: { isActive: true } }),
      ]);

      setReports(reportsRes.data.reports || []);
      setStats(statsRes.data.stats || {});
      setUsers(usersRes.data.users || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load meeting reports');
    } finally {
      setLoading(false);
    }
  }, [scope, search]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    markMeetingReportsRead();
  }, [markMeetingReportsRead]);

  const togglePerson = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((entry) => entry !== value)
        : [...current[key], value],
    }));
  };

  const updateActionItem = (index, patch) => {
    setForm((current) => ({
      ...current,
      actionItems: current.actionItems.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  };

  const addActionItem = () => {
    setForm((current) => ({
      ...current,
      actionItems: [
        ...current.actionItems,
        { text: '', owner: '', dueDate: '', priority: 'Medium', notes: '' },
      ],
    }));
  };

  const removeActionItem = (index) => {
    setForm((current) => ({
      ...current,
      actionItems: current.actionItems.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const resetForm = () => {
    setForm(emptyCreateForm);
  };

  const submitReport = async (event) => {
    event.preventDefault();
    const summaryText = structuredSummary.trim();

    if (!form.title.trim()) {
      toast.error('Meeting report title is required');
      return;
    }
    if (!summaryText && !form.file) {
      toast.error('Add meeting content or upload a meeting file before sending');
      return;
    }

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('title', form.title.trim());
      payload.append('meetingDate', form.meetingDate);
      payload.append('meetingType', form.meetingType);
      payload.append('summaryText', summaryText);
      payload.append('attendees', JSON.stringify(form.attendees));
      payload.append('circulateTo', JSON.stringify(form.circulateTo));
      payload.append('distributeToParticipants', String(form.distributeToParticipants));
      payload.append('sendEmailCopy', String(form.sendEmailCopy));
      payload.append('actionItems', JSON.stringify(form.actionItems.filter((item) => String(item.text || '').trim())));
      if (form.file) payload.append('file', form.file);

      await userApi.post('/api/meeting-reports', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Meeting report shared successfully');
      resetForm();
      setTab('manage');
      fetchReports();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to share meeting report');
    } finally {
      setSubmitting(false);
    }
  };

  const openReport = async (reportId) => {
    setDetailLoading(true);
    setSelectedReport(null);
    try {
      const { data } = await userApi.get(`/api/meeting-reports/${reportId}`);
      setSelectedReport(data.report || null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load meeting report detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const resendReport = async (reportId, sendEmailCopy = false) => {
    try {
      await userApi.post(`/api/meeting-reports/${reportId}/resend`, { sendEmailCopy });
      toast.success(sendEmailCopy ? 'Meeting report resent with email copy' : 'Meeting report notifications resent');
      fetchReports();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend meeting report');
    }
  };

  const openTaskModal = (reportId, item) => {
    setTaskForm({
      ownerId: item?.owner?._id || '',
      title: item?.text || '',
      description: item?.notes || '',
      priority: item?.priority || 'Medium',
      dueDate: item?.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : '',
    });
    setTaskModal({ open: true, reportId, itemId: item?._id || '', preset: item || null });
  };

  const convertActionItem = async (event) => {
    event.preventDefault();
    if (!taskForm.ownerId || !taskForm.title.trim()) {
      toast.error('Assignee and task title are required');
      return;
    }

    setTaskSaving(true);
    try {
      const { data } = await api.post('/tasks', {
        ownerId: taskForm.ownerId,
        title: taskForm.title.trim(),
        description: taskForm.description,
        priority: taskForm.priority,
        dueDate: taskForm.dueDate || undefined,
        checklist: [],
      });

      const taskId = data.task?._id;
      if (taskId) {
        await userApi.post(`/api/meeting-reports/${taskModal.reportId}/action-items/${taskModal.itemId}/link-task`, { taskId });
      }

      toast.success('Action item converted into a task');
      setTaskModal({ open: false, reportId: '', itemId: '', preset: null });
      setTaskForm(emptyTaskForm);
      if (selectedReport?._id === taskModal.reportId) {
        openReport(taskModal.reportId);
      } else {
        fetchReports();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create task from action item');
    } finally {
      setTaskSaving(false);
    }
  };

  const reportCards = useMemo(() => reports.map((report) => {
    const viewedCount = (report.recipientStatus || []).filter((entry) => entry.viewed).length;
    const acknowledgedCount = (report.recipientStatus || []).filter((entry) => entry.acknowledged).length;
    return {
      ...report,
      viewedCount,
      acknowledgedCount,
    };
  }), [reports]);

  return (
    <div className="page-shell">
      <PageHeader
        title="Meeting Reports"
        description="Prepare a clear meeting report, distribute it to the right people, and track who has actually opened and acknowledged it."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Reports" value={stats.total || 0} icon={FileText} tone="var(--brand-primary)" />
        <StatCard label="Recipients" value={stats.recipients || 0} icon={Users} tone="var(--brand-secondary)" />
        <StatCard label="Awaiting View" value={stats.pendingViewRecipients || 0} icon={Search} tone="#d97706" />
        <StatCard label="Awaiting Acknowledgement" value={stats.pendingAcknowledgementRecipients || 0} icon={CheckCircle2} tone="#dc2626" />
      </div>

      <Panel>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'manage', label: 'Management Queue' },
              { key: 'create', label: 'Create Report' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className="rounded-full px-4 py-2 text-sm font-bold transition-colors"
                style={tab === item.key
                  ? { background: 'var(--brand-primary)', color: '#ffffff' }
                  : { background: 'var(--c-panel-subtle)', color: 'var(--c-text-soft)' }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === 'manage' ? (
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
              <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search meeting reports..." icon={Search} />
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'created', label: 'Created By Me' },
                  { key: 'inbox', label: 'Team Recipients' },
                ].map((item) => (
                  <FilterChip key={item.key} active={scope === item.key} onClick={() => setScope(item.key)}>
                    {item.label}
                  </FilterChip>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-full px-4 py-2 text-xs font-bold" style={{ background: 'var(--c-panel-subtle)', color: 'var(--c-text-soft)' }}>
              {recipientIds.length} recipient{recipientIds.length === 1 ? '' : 's'} selected
            </div>
          )}
        </div>
      </Panel>

      {tab === 'create' ? (
        <form onSubmit={submitReport} className="space-y-4">
          <Panel title="Meeting Details" subtitle="Capture the meeting context and structure the report before distribution.">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <label className="label">Title</label>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="input-base"
                  placeholder="Weekly portfolio review report"
                />
              </div>
              <div>
                <label className="label">Meeting Date</label>
                <input
                  type="date"
                  value={form.meetingDate}
                  onChange={(event) => setForm((current) => ({ ...current, meetingDate: event.target.value }))}
                  className="input-base"
                />
              </div>
              <div>
                <label className="label">Meeting Type</label>
                <select
                  value={form.meetingType}
                  onChange={(event) => setForm((current) => ({ ...current, meetingType: event.target.value }))}
                  className="input-base"
                >
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Meeting Overview</label>
                <textarea
                  value={form.overview}
                  onChange={(event) => setForm((current) => ({ ...current, overview: event.target.value }))}
                  className="input-base min-h-28"
                  placeholder="What was this meeting about and what was the context?"
                />
              </div>
              <div>
                <label className="label">Key Updates</label>
                <textarea
                  value={form.keyUpdates}
                  onChange={(event) => setForm((current) => ({ ...current, keyUpdates: event.target.value }))}
                  className="input-base min-h-28"
                  placeholder="Key progress updates, highlights, and notable changes."
                />
              </div>
              <div>
                <label className="label">Decisions Taken</label>
                <textarea
                  value={form.decisions}
                  onChange={(event) => setForm((current) => ({ ...current, decisions: event.target.value }))}
                  className="input-base min-h-28"
                  placeholder="Decisions that should be visible to participants and leadership."
                />
              </div>
              <div>
                <label className="label">Risks / Blockers</label>
                <textarea
                  value={form.blockers}
                  onChange={(event) => setForm((current) => ({ ...current, blockers: event.target.value }))}
                  className="input-base min-h-28"
                  placeholder="Blockers, concerns, or unresolved issues that came up."
                />
              </div>
              <div className="lg:col-span-2">
                <label className="label">Next Steps</label>
                <textarea
                  value={form.nextSteps}
                  onChange={(event) => setForm((current) => ({ ...current, nextSteps: event.target.value }))}
                  className="input-base min-h-28"
                  placeholder="What should happen next after the meeting?"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="label">Meeting File (optional)</label>
                <label className="flex cursor-pointer items-center justify-between rounded-[1rem] border px-4 py-3 text-sm" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                  <span style={{ color: 'var(--c-text-soft)' }}>{form.file ? form.file.name : 'Upload PDF, TXT, DOC, or DOCX'}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.txt,.doc,.docx"
                    onChange={(event) => setForm((current) => ({ ...current, file: event.target.files?.[0] || null }))}
                  />
                  <span className="rounded-xl px-3 py-1.5 text-xs font-bold" style={{ background: 'var(--brand-light)', color: 'var(--brand-primary)' }}>Choose file</span>
                </label>
              </div>
            </div>
          </Panel>

          <Panel title="Structured Report Preview" subtitle="This is the final structured report that will be sent to participants.">
            <div className="rounded-[1rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                <p className="text-sm font-black" style={{ color: 'var(--c-text)' }}>Structured meeting report</p>
              </div>
              <pre className="whitespace-pre-wrap text-sm leading-7" style={{ color: 'var(--c-text-1)', fontFamily: 'var(--font-sans)' }}>
                {structuredSummary || 'Add the meeting content above and the structured report will appear here.'}
              </pre>
            </div>
          </Panel>

          <Panel title="Distribution" subtitle="Choose the attendees, who should receive the report, and how it should be delivered.">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[1rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                <p className="label">Attendees</p>
                <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                  {users.map((person) => (
                    <label key={`attendee-${person._id}`} className="flex items-start gap-3 rounded-[0.95rem] border px-3 py-3 text-sm" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel)' }}>
                      <input type="checkbox" checked={form.attendees.includes(person._id)} onChange={() => togglePerson('attendees', person._id)} className="mt-0.5" />
                      <div>
                        <p className="font-semibold" style={{ color: 'var(--c-text)' }}>{fullName(person)}</p>
                        <p className="text-xs" style={{ color: 'var(--c-text-muted)' }}>{person.position || person.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="rounded-[1rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                <p className="label">Circulate To</p>
                <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                  {users.map((person) => (
                    <label key={`circulate-${person._id}`} className="flex items-start gap-3 rounded-[0.95rem] border px-3 py-3 text-sm" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel)' }}>
                      <input type="checkbox" checked={form.circulateTo.includes(person._id)} onChange={() => togglePerson('circulateTo', person._id)} className="mt-0.5" />
                      <div>
                        <p className="font-semibold" style={{ color: 'var(--c-text)' }}>{fullName(person)}</p>
                        <p className="text-xs" style={{ color: 'var(--c-text-muted)' }}>{person.position || person.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-[1rem] border px-4 py-3 text-sm" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                <input
                  type="checkbox"
                  checked={form.distributeToParticipants}
                  onChange={(event) => setForm((current) => ({ ...current, distributeToParticipants: event.target.checked }))}
                />
                <span style={{ color: 'var(--c-text)' }}>Distribute to participants automatically</span>
              </label>
              <label className="flex items-center gap-3 rounded-[1rem] border px-4 py-3 text-sm" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                <input
                  type="checkbox"
                  checked={form.sendEmailCopy}
                  onChange={(event) => setForm((current) => ({ ...current, sendEmailCopy: event.target.checked }))}
                />
                <span style={{ color: 'var(--c-text)' }}>Send email copy too</span>
              </label>
            </div>
          </Panel>

          <Panel title="Action Items" subtitle="Capture any follow-up work and convert it into tasks later from the management queue.">
            <div className="flex justify-end">
              <button type="button" className="btn-secondary" onClick={addActionItem}>
                <Plus className="h-4 w-4" />
                Add action item
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {form.actionItems.length === 0 ? (
                <div className="rounded-[1rem] border p-5 text-center text-sm" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)', color: 'var(--c-text-muted)' }}>
                  No action items added yet.
                </div>
              ) : form.actionItems.map((item, index) => (
                <div key={`action-item-${index}`} className="rounded-[1rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="label">Action Item</label>
                      <input
                        value={item.text}
                        onChange={(event) => updateActionItem(index, { text: event.target.value })}
                        className="input-base"
                        placeholder="Follow up with the operations team on the revised timeline"
                      />
                    </div>
                    <div>
                      <label className="label">Suggested Owner</label>
                      <select value={item.owner} onChange={(event) => updateActionItem(index, { owner: event.target.value })} className="input-base">
                        <option value="">Unassigned</option>
                        {users.map((person) => (
                          <option key={`${index}-${person._id}`} value={person._id}>{fullName(person)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Due Date</label>
                      <input type="date" value={item.dueDate} onChange={(event) => updateActionItem(index, { dueDate: event.target.value })} className="input-base" />
                    </div>
                    <div>
                      <label className="label">Priority</label>
                      <select value={item.priority} onChange={(event) => updateActionItem(index, { priority: event.target.value })} className="input-base">
                        {PRIORITY_OPTIONS.map((priority) => (
                          <option key={`${index}-${priority}`} value={priority}>{priority}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="label">Notes</label>
                      <textarea
                        value={item.notes}
                        onChange={(event) => updateActionItem(index, { notes: event.target.value })}
                        className="input-base min-h-24"
                        placeholder="Context for whoever will take this action item forward."
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button type="button" className="btn-danger" onClick={() => removeActionItem(index)}>
                      Remove item
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={resetForm}>Reset</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              <Send className="h-4 w-4" />
              {submitting ? 'Sending report...' : 'Send Meeting Report'}
            </button>
          </div>
        </form>
      ) : (
        <>
          {loading ? (
            <LoadingScreen height="18rem" />
          ) : reportCards.length === 0 ? (
            <EmptyState icon={FileText} title="No meeting reports found" description="Reports created by executives, team leads, and admins will appear here for review and follow-up." />
          ) : (
            <Panel title="Meeting report queue" subtitle={`${reportCards.length} meeting report${reportCards.length === 1 ? '' : 's'} visible`}>
              <div className="space-y-3">
                {reportCards.map((report) => (
                  <div key={report._id} className="card p-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <button type="button" onClick={() => openReport(report._id)} className="min-w-0 flex-1 text-left">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="badge" style={{ background: 'var(--c-panel-subtle)', color: 'var(--c-text-soft)' }}>
                            {TYPE_LABELS[report.meetingType] || 'Meeting'}
                          </span>
                          <span className="badge" style={{ background: '#eff6ff', color: '#2563eb' }}>
                            {report.viewedCount}/{report.recipientStatus?.length || 0} viewed
                          </span>
                          <span className="badge" style={{ background: '#ecfdf5', color: '#059669' }}>
                            {report.acknowledgedCount}/{report.recipientStatus?.length || 0} acknowledged
                          </span>
                        </div>
                        <h3 className="text-base font-bold" style={{ color: 'var(--c-text-0)' }}>{report.title}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--c-text-3)' }}>
                          <span>{formatDate(report.meetingDate)}</span>
                          <span>By {fullName(report.createdBy)}</span>
                          <span>{report.recipientStatus?.length || 0} recipient{report.recipientStatus?.length === 1 ? '' : 's'}</span>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm leading-6" style={{ color: 'var(--c-text-1)' }}>
                          {report.summaryText || 'Attachment only'}
                        </p>
                      </button>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button type="button" className="btn-secondary" onClick={() => resendReport(report._id, false)}>
                          <RefreshCcw className="h-4 w-4" />
                          Resend
                        </button>
                        <button type="button" className="btn-secondary" onClick={() => resendReport(report._id, true)}>
                          <Mail className="h-4 w-4" />
                          Resend + Email
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </>
      )}

      <Modal
        open={Boolean(selectedReport) || detailLoading}
        onClose={() => setSelectedReport(null)}
        title={detailLoading ? 'Loading meeting report...' : selectedReport?.title || 'Meeting Report'}
        subtitle={selectedReport ? `${TYPE_LABELS[selectedReport.meetingType] || 'Meeting'} | ${formatDate(selectedReport.meetingDate)} | ${fullName(selectedReport.createdBy)}` : ''}
        width="max-w-5xl"
      >
        {detailLoading || !selectedReport ? (
          <LoadingScreen height="16rem" />
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
              <div className="rounded-[1.1rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                <p className="section-title">Meeting Summary</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7" style={{ color: 'var(--c-text-1)' }}>
                  {selectedReport.summaryText || 'No written summary was included. Use the attachment if one was uploaded.'}
                </p>
                {selectedReport.attachment?.url ? (
                  <a href={selectedReport.attachment.url} target="_blank" rel="noreferrer" className="btn-primary mt-4 inline-flex">
                    <FileText className="h-4 w-4" />
                    Open Attachment
                  </a>
                ) : null}
              </div>

              <div className="rounded-[1.1rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                <p className="section-title">Distribution Snapshot</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[0.9rem] border px-4 py-3" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel)' }}>
                    <p className="text-xs font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-faint)' }}>Recipients</p>
                    <p className="mt-2 text-xl font-black" style={{ color: 'var(--brand-primary)' }}>{selectedReport.recipientStatus?.length || 0}</p>
                  </div>
                  <div className="rounded-[0.9rem] border px-4 py-3" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel)' }}>
                    <p className="text-xs font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-faint)' }}>Action Items</p>
                    <p className="mt-2 text-xl font-black" style={{ color: 'var(--brand-secondary)' }}>{selectedReport.actionItems?.length || 0}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary" onClick={() => resendReport(selectedReport._id, false)}>
                    <RefreshCcw className="h-4 w-4" />
                    Resend
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => resendReport(selectedReport._id, true)}>
                    <Mail className="h-4 w-4" />
                    Resend + Email
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr,1fr]">
              <div className="rounded-[1.1rem] border p-4" style={{ borderColor: 'var(--c-border)' }}>
                <p className="section-title">Recipient Accountability</p>
                <div className="mt-3 space-y-2">
                  {(selectedReport.recipientStatus || []).map((entry) => (
                    <div key={entry.user?._id} className="rounded-[0.95rem] border px-4 py-3" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold" style={{ color: 'var(--c-text)' }}>{fullName(entry.user)}</p>
                          <p className="mt-1 text-xs" style={{ color: 'var(--c-text-muted)' }}>{entry.user?.position || entry.user?.email}</p>
                        </div>
                        <div className="text-right text-xs font-bold">
                          <p style={{ color: entry.viewed ? '#2563eb' : 'var(--c-text-faint)' }}>
                            {entry.viewed ? `Viewed ${formatDateTime(entry.viewedAt)}` : 'Not viewed'}
                          </p>
                          <p className="mt-1" style={{ color: entry.acknowledged ? '#059669' : '#d97706' }}>
                            {entry.acknowledged ? `Acknowledged ${formatDateTime(entry.acknowledgedAt)}` : 'Awaiting acknowledgement'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.1rem] border p-4" style={{ borderColor: 'var(--c-border)' }}>
                <div className="flex items-center justify-between gap-3">
                  <p className="section-title">Action Items</p>
                  <span className="badge" style={{ background: 'var(--c-panel-subtle)', color: 'var(--c-text-soft)' }}>
                    {(selectedReport.actionItems || []).length}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {(selectedReport.actionItems || []).length === 0 ? (
                    <EmptyState icon={Plus} title="No action items" description="This report did not include follow-up work items to convert." />
                  ) : selectedReport.actionItems.map((item) => (
                    <div key={item._id} className="rounded-[0.95rem] border px-4 py-3" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold" style={{ color: 'var(--c-text)' }}>{item.text}</p>
                          <p className="mt-1 text-xs" style={{ color: 'var(--c-text-muted)' }}>
                            {item.owner ? `Suggested owner: ${fullName(item.owner)}` : 'Suggested owner: Unassigned'}
                            {item.dueDate ? ` | Due ${formatDate(item.dueDate)}` : ''}
                            {item.priority ? ` | ${item.priority}` : ''}
                          </p>
                          {item.notes ? <p className="mt-2 text-sm leading-6" style={{ color: 'var(--c-text-1)' }}>{item.notes}</p> : null}
                        </div>
                        {item.convertedTaskId ? (
                          <span className="badge" style={{ background: '#ecfdf5', color: '#059669' }}>Task linked</span>
                        ) : (
                          <button type="button" className="btn-primary" onClick={() => openTaskModal(selectedReport._id, item)}>
                            <Send className="h-4 w-4" />
                            Convert
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={taskModal.open}
        onClose={() => {
          setTaskModal({ open: false, reportId: '', itemId: '', preset: null });
          setTaskForm(emptyTaskForm);
        }}
        title="Convert Action Item To Task"
        subtitle="Create an assigned task directly from this meeting report action item."
        width="max-w-2xl"
      >
        <form onSubmit={convertActionItem} className="grid gap-4">
          <div>
            <label className="label">Assign To</label>
            <select value={taskForm.ownerId} onChange={(event) => setTaskForm((current) => ({ ...current, ownerId: event.target.value }))} className="input-base">
              <option value="">Select team member...</option>
              {users.map((person) => (
                <option key={person._id} value={person._id}>{fullName(person)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Task Title</label>
            <input value={taskForm.title} onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} className="input-base" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea value={taskForm.description} onChange={(event) => setTaskForm((current) => ({ ...current, description: event.target.value }))} className="input-base min-h-28" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Priority</label>
              <select value={taskForm.priority} onChange={(event) => setTaskForm((current) => ({ ...current, priority: event.target.value }))} className="input-base">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div>
              <label className="label">Due Date</label>
              <input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm((current) => ({ ...current, dueDate: event.target.value }))} className="input-base" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setTaskModal({ open: false, reportId: '', itemId: '', preset: null })}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={taskSaving}>
              {taskSaving ? 'Creating task...' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MeetingReports;



