import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckSquare,
  Download,
  FileText,
  FolderKanban,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import userApi from '../utils/userApi.js';
import {
  EmptyState,
  FilterChip,
  LoadingScreen,
  MiniStat,
  PageHeader,
  Panel,
  StatCard,
  StatusPill,
} from '../components/ui.jsx';

const PRESETS = [
  { value: 'all', label: 'Full history' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'this-month', label: 'This month' },
  { value: 'quarter-to-date', label: 'Quarter to date' },
  { value: 'year-to-date', label: 'Year to date' },
  { value: 'custom', label: 'Custom' },
];

const MODULE_FALLBACK = [
  { key: 'people', title: 'People & Access', description: 'User growth, login activity, and management actions.' },
  { key: 'tasks', title: 'Tasks', description: 'Task creation, review flow, delivery pressure, and priority mix.' },
  { key: 'goals', title: 'Goals', description: 'Goal creation, progress pressure, and follow-up activity.' },
  { key: 'reports', title: 'Reports', description: 'Report creation, submission, review, and AI-assisted writing volume.' },
  { key: 'projects', title: 'Projects', description: 'Project records, milestones, issues, and risk handling.' },
  { key: 'meetings', title: 'Meetings', description: 'Meeting scheduling and live room activity.' },
  { key: 'meetingReports', title: 'Meeting Reports', description: 'Meeting report circulation, views, acknowledgements, and action items.' },
  { key: 'social', title: 'Social Feed', description: 'Posts, announcements, and comment activity.' },
  { key: 'chat', title: 'Team Chat', description: 'Messages, stickers, and reaction activity across team conversations.' },
  { key: 'files', title: 'File Storage', description: 'File uploads, deletes, shared files, and starred content.' },
  { key: 'aiDocuments', title: 'AI Documents', description: 'Deck requests, generated outputs, and failed document jobs.' },
  { key: 'training', title: 'Training', description: 'Course publishing, progress, exams, and certifications.' },
  { key: 'reminders', title: 'Reminders', description: 'Reminder scheduling and operational follow-up items.' },
  { key: 'notifications', title: 'Notifications', description: 'Notification generation, reads, and pending follow-up.' },
  { key: 'feedback', title: 'Feedback', description: 'Direct platform feedback from users to management.' },
];

const DEFAULT_MODULE_KEYS = MODULE_FALLBACK.map((item) => item.key);
const SUMMARY_ICONS = [Users, CheckSquare, FolderKanban, MessageSquare, Sparkles, Bell];
const MODULE_ICON_MAP = {
  people: Users,
  tasks: CheckSquare,
  goals: Target,
  reports: FileText,
  projects: FolderKanban,
  meetings: CalendarDays,
  meetingReports: FileText,
  social: MessageSquare,
  chat: MessageSquare,
  files: FileText,
  aiDocuments: Sparkles,
  training: BookOpen,
  reminders: Bell,
  notifications: Bell,
  feedback: MessageSquare,
};

const formatValue = (value) => {
  if (typeof value === 'number') return value.toLocaleString();
  return value ?? '-';
};

const formatDateTime = (value) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const formatUserScopeLabel = (report) => {
  if (!report) return 'All users';
  if (report.allUsersSelected) return 'All users';
  const count = report.selectedUserIds?.length || 0;
  return `${formatValue(count)} selected user${count === 1 ? '' : 's'}`;
};

const toneToPill = (tone) => {
  if (tone === 'good') return 'brand';
  if (tone === 'risk') return 'secondary';
  return 'neutral';
};

const exportActivityPdf = async (report) => {
  const jsPDF = (await import('jspdf')).default;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  const printWidth = pageWidth - (margin * 2);
  let y = margin;

  const ensureSpace = (spaceNeeded = 22) => {
    if (y + spaceNeeded <= pageHeight - margin) return;
    doc.addPage();
    y = margin;
  };

  const writeBlock = (text, size = 10, bold = false, color = [25, 32, 46], gap = 14) => {
    if (!text) return;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(text), printWidth);
    lines.forEach((line) => {
      ensureSpace(gap);
      doc.text(line, margin, y);
      y += gap;
    });
  };

  const writeRule = () => {
    ensureSpace(18);
    doc.setDrawColor(215, 221, 232);
    doc.line(margin, y, pageWidth - margin, y);
    y += 16;
  };

  const writeSection = (title, subtitle = '') => {
    ensureSpace(44);
    writeBlock(title, 15, true, [49, 39, 131], 18);
    if (subtitle) writeBlock(subtitle, 10, false, [88, 102, 127], 14);
    y += 4;
  };

  const generatedAt = formatDateTime(report.generatedAt);
  const fileDate = new Date().toISOString().slice(0, 10);
  const selectedModuleTitles = (report.availableModules || [])
    .filter((item) => (report.selectedModules || []).includes(item.key))
    .map((item) => item.title);
  const selectedUserLine = report.allUsersSelected
    ? 'All users on the platform'
    : `${formatValue(report.selectedUserIds?.length || 0)} selected user${(report.selectedUserIds?.length || 0) === 1 ? '' : 's'}`;

  writeBlock('FundCo AI Platform Activity Report', 20, true, [11, 18, 32], 24);
  writeBlock(`Generated: ${generatedAt}`, 10, false, [88, 102, 127], 14);
  writeBlock(`Window: ${report.period?.label || 'Full history'}`, 10, false, [88, 102, 127], 14);
  writeBlock(`Users in scope: ${selectedUserLine}`, 10, false, [88, 102, 127], 14);
  writeBlock(`Modules included: ${selectedModuleTitles.join(', ') || 'All modules'}`, 10, false, [88, 102, 127], 14);
  if (report.platformStartedAt) {
    writeBlock(`Platform live since: ${formatDateTime(report.platformStartedAt)}`, 10, false, [88, 102, 127], 14);
  }
  writeBlock(`Detailed activity events in export: ${formatValue(report.eventsCount)}`, 10, false, [88, 102, 127], 14);
  y += 8;

  if (Array.isArray(report.notes) && report.notes.length) {
    writeSection('Management notes');
    report.notes.forEach((note) => writeBlock(`- ${note}`, 10, false, [47, 61, 82], 14));
    writeRule();
  }

  if (report.managementReview) {
    writeSection('Super management review');
    writeBlock(report.managementReview.overview, 10, false, [47, 61, 82], 14);
    y += 4;

    if (Array.isArray(report.managementReview.findings) && report.managementReview.findings.length) {
      writeBlock('Main findings', 11, true, [11, 18, 32], 16);
      report.managementReview.findings.forEach((item) => {
        writeBlock(`${item.area}: ${item.detail}`, 10, false, [47, 61, 82], 14);
      });
      y += 4;
    }

    if (Array.isArray(report.managementReview.integrityFlags) && report.managementReview.integrityFlags.length) {
      writeBlock('Integrity checks', 11, true, [11, 18, 32], 16);
      report.managementReview.integrityFlags.forEach((item) => {
        const unitText = item.unitSector ? ` (${item.unitSector})` : '';
        writeBlock(`${item.subject}${unitText}: ${item.detail}`, 10, false, [47, 61, 82], 14);
      });
      y += 4;
    }

    if (Array.isArray(report.managementReview.usersNeedingAttention) && report.managementReview.usersNeedingAttention.length) {
      writeBlock('Users needing attention', 11, true, [11, 18, 32], 16);
      report.managementReview.usersNeedingAttention.forEach((item) => {
        writeBlock(`${item.name} (${item.role}, ${item.unitSector})`, 10, true, [11, 18, 32], 14);
        item.reasons?.forEach((reason) => {
          writeBlock(`- ${reason}`, 10, false, [47, 61, 82], 14);
        });
        y += 4;
      });
    }

    if (report.managementReview.conclusion) {
      writeBlock(`Conclusion: ${report.managementReview.conclusion}`, 10, true, [11, 18, 32], 15);
    }
    writeRule();
  }

  writeSection('Executive snapshot');
  report.summaryCards?.forEach((card) => {
    writeBlock(`${card.label}: ${formatValue(card.value)}`, 11, true, [11, 18, 32], 15);
    if (card.helper) writeBlock(card.helper, 10, false, [88, 102, 127], 14);
    y += 4;
  });
  writeRule();

  writeSection('Platform footprint', 'Current scale of the live environment.');
  report.footprintCards?.forEach((item) => {
    writeBlock(`${item.label}: ${formatValue(item.value)}`, 10, true, [11, 18, 32], 14);
    if (item.helper) writeBlock(item.helper, 9, false, [88, 102, 127], 13);
  });
  writeRule();

  report.moduleSections?.forEach((section) => {
    writeSection(section.title, section.description);
    section.metrics?.forEach((metric) => {
      writeBlock(`${metric.label}: ${formatValue(metric.value)}`, 10, true, [11, 18, 32], 14);
      if (metric.helper) writeBlock(metric.helper, 9, false, [88, 102, 127], 13);
    });
    writeRule();
  });

  writeSection('Leadership highlights');
  const actorLine = (report.highlights?.topActors || [])
    .map((item) => `${item.name} (${item.role}) - ${formatValue(item.count)}`)
    .join(' | ');
  const unitLine = (report.highlights?.topUnits || [])
    .map((item) => `${item.name} - ${formatValue(item.count)}`)
    .join(' | ');
  const moduleLine = (report.highlights?.busiestModules || [])
    .map((item) => `${item.name} - ${formatValue(item.count)}`)
    .join(' | ');
  writeBlock(`Most active people: ${actorLine || 'No data'}`, 10, false, [47, 61, 82], 14);
  writeBlock(`Most active units: ${unitLine || 'No data'}`, 10, false, [47, 61, 82], 14);
  writeBlock(`Busiest modules: ${moduleLine || 'No data'}`, 10, false, [47, 61, 82], 14);
  writeRule();

  writeSection('Detailed activity ledger', 'Each selected module is listed separately below.');
  (report.eventSections || []).forEach((section) => {
    writeBlock(`${section.title} (${formatValue(section.count)} events)`, 12, true, [11, 18, 32], 16);
    if (!section.events?.length) {
      writeBlock('No activity recorded in this module for the selected window.', 9, false, [88, 102, 127], 13);
      y += 4;
      return;
    }

    section.events.forEach((event, index) => {
      const heading = `${index + 1}. ${formatDateTime(event.at)} | ${event.action}`;
      writeBlock(heading, 10, true, [11, 18, 32], 14);
      writeBlock(`Actor: ${event.actorName || 'Unknown user'}`, 9, false, [88, 102, 127], 13);
      if (event.subject) writeBlock(`Subject: ${event.subject}`, 9, false, [88, 102, 127], 13);
      if (event.detail) writeBlock(`Detail: ${event.detail}`, 9, false, [88, 102, 127], 13);
      y += 4;
    });
    writeRule();
  });

  doc.save(`fundco_platform_activity_${fileDate}.pdf`);
};

const PlatformActivity = () => {
  const { user } = useAuth();
  const [preset, setPreset] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [allUsersSelected, setAllUsersSelected] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedModules, setSelectedModules] = useState(DEFAULT_MODULE_KEYS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [report, setReport] = useState(null);

  const moduleOptions = useMemo(
    () => report?.availableModules || MODULE_FALLBACK,
    [report]
  );

  const userOptions = useMemo(
    () => report?.availableUsers || [],
    [report]
  );

  const fetchReport = useCallback(async ({ silent = false } = {}) => {
    if (user?.role !== 'admin') return;

    if (preset === 'custom' && !from && !to) {
      toast.error('Choose a start date, an end date, or both for a custom report.');
      return;
    }

    if (!selectedModules.length) {
      toast.error('Select at least one module before generating the report.');
      return;
    }

    if (!allUsersSelected && !selectedUserIds.length) {
      toast.error('Select at least one user or switch back to All Users.');
      return;
    }

    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const params = {
        preset,
        modules: selectedModules.join(','),
      };
      if (!allUsersSelected) params.userIds = selectedUserIds.join(',');
      if (preset === 'custom') {
        if (from) params.from = from;
        if (to) params.to = to;
      }

      const { data } = await userApi.get('/api/platform-activity/report', { params });
      setReport(data.report || null);
      setAllUsersSelected(Boolean(data.report?.allUsersSelected));
      setSelectedUserIds(data.report?.allUsersSelected ? [] : (data.report?.selectedUserIds || []));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate platform activity report');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [allUsersSelected, from, preset, selectedModules, selectedUserIds, to, user?.role]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchReport();
    } else {
      setLoading(false);
    }
    // initial load only; filter changes are applied when the admin explicitly regenerates the report
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const moduleLookup = useMemo(
    () => new Map(moduleOptions.map((item) => [item.key, item])),
    [moduleOptions]
  );

  const filteredUserOptions = useMemo(() => {
    const needle = userSearch.trim().toLowerCase();
    if (!needle) return userOptions;
    return userOptions.filter((item) => (
      item.name.toLowerCase().includes(needle)
      || item.role.toLowerCase().includes(needle)
      || item.unitSector.toLowerCase().includes(needle)
    ));
  }, [userOptions, userSearch]);

  const previewEventSections = useMemo(
    () => (report?.eventSections || []).map((section) => ({
      ...section,
      previewEvents: (section.events || []).slice(0, 20),
    })),
    [report]
  );

  const toggleModule = (key) => {
    setSelectedModules((current) => (
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    ));
  };

  const selectAllModules = () => {
    setSelectedModules(moduleOptions.map((item) => item.key));
  };

  const clearModules = () => {
    setSelectedModules([]);
  };

  const toggleUser = (userId) => {
    setSelectedUserIds((current) => (
      current.includes(userId)
        ? current.filter((item) => item !== userId)
        : [...current, userId]
    ));
  };

  const selectAllUsers = () => {
    setAllUsersSelected(true);
    setSelectedUserIds([]);
  };

  const enableSpecificUsers = () => {
    setAllUsersSelected(false);
  };

  const handleExport = async () => {
    if (!report) return;
    setExporting(true);
    try {
      await exportActivityPdf(report);
      toast.success('Activity report exported to PDF');
    } catch (error) {
      toast.error(error.message || 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="page-shell">
        <EmptyState
          icon={ShieldCheck}
          title="Unavailable"
          description="Only super admins can generate the full platform activity report."
        />
      </div>
    );
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Super Admin only"
        title="Platform Activity Report"
        description="Generate a direct management report across the platform, filter it by module, and export the full result to PDF."
        actions={(
          <>
            <button
              type="button"
              onClick={() => fetchReport({ silent: true })}
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black transition-colors"
              style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel)', color: 'var(--c-text)' }}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Regenerate'}
            </button>
            <button type="button" onClick={handleExport} disabled={!report || exporting} className="btn-primary rounded-full">
              <Download className="h-4 w-4" />
              {exporting ? 'Exporting...' : 'Export PDF'}
            </button>
          </>
        )}
      />

      <Panel title="Report window" subtitle="Choose the time window, the people in scope, and the exact modules you want management to review.">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((item) => (
              <FilterChip key={item.value} active={preset === item.value} onClick={() => setPreset(item.value)}>
                {item.label}
              </FilterChip>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <div>
              <label className="label">Start date</label>
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="input-base"
                disabled={preset !== 'custom'}
              />
            </div>
            <div>
              <label className="label">End date</label>
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="input-base"
                disabled={preset !== 'custom'}
              />
            </div>
            <button type="button" onClick={() => fetchReport()} className="btn-primary rounded-full lg:self-end">
              <CalendarDays className="h-4 w-4" />
              Generate report
            </button>
          </div>

          <div className="rounded-[1rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-title">Users in scope</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--c-text-muted)' }}>
                  Choose All Users or narrow the report to a selected list.
                </p>
              </div>
              <StatusPill tone="brand">
                {allUsersSelected ? 'All users' : `${formatValue(selectedUserIds.length)} selected`}
              </StatusPill>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm font-black" style={{ color: 'var(--c-text)' }}>
                <input
                  type="checkbox"
                  checked={allUsersSelected}
                  onChange={(event) => {
                    if (event.target.checked) selectAllUsers();
                    else enableSpecificUsers();
                  }}
                />
                All Users
              </label>
              {!allUsersSelected ? (
                <span className="text-xs font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-faint)' }}>
                  Specific user mode
                </span>
              ) : null}
            </div>

            <details className="rounded-[0.9rem] border" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel)' }}>
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black" style={{ color: 'var(--c-text)' }}>
                {allUsersSelected ? 'All Users selected' : `${formatValue(selectedUserIds.length)} user${selectedUserIds.length === 1 ? '' : 's'} selected`}
              </summary>
              <div className="border-t px-4 py-4" style={{ borderColor: 'var(--c-border)' }}>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Search by name, role, or unit"
                  className="input-base mb-4"
                />
                <div className={`max-h-72 space-y-2 overflow-auto pr-1 ${allUsersSelected ? 'opacity-60' : ''}`}>
                  {filteredUserOptions.map((item) => (
                    <label
                      key={item.userId}
                      className="flex items-start gap-3 rounded-[0.85rem] border px-3 py-3"
                      style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}
                    >
                      <input
                        type="checkbox"
                        checked={allUsersSelected ? false : selectedUserIds.includes(item.userId)}
                        disabled={allUsersSelected}
                        onChange={() => toggleUser(item.userId)}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-black" style={{ color: 'var(--c-text)' }}>{item.name}</p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--c-text-muted)' }}>
                          {item.role} - {item.unitSector}
                        </p>
                      </div>
                    </label>
                  ))}
                  {!filteredUserOptions.length ? (
                    <p className="text-sm" style={{ color: 'var(--c-text-muted)' }}>
                      No users match your search.
                    </p>
                  ) : null}
                </div>
              </div>
            </details>
          </div>

          <div className="rounded-[1rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-title">Modules in scope</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--c-text-muted)' }}>
                  Pick the exact modules you want in this report.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={selectAllModules}
                  className="rounded-full border px-3 py-1.5 text-xs font-black transition-colors"
                  style={{ borderColor: 'var(--c-border)', color: 'var(--c-text)' }}
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={clearModules}
                  className="rounded-full border px-3 py-1.5 text-xs font-black transition-colors"
                  style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-soft)' }}
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {moduleOptions.map((item) => (
                <FilterChip
                  key={item.key}
                  active={selectedModules.includes(item.key)}
                  onClick={() => toggleModule(item.key)}
                >
                  {item.title}
                </FilterChip>
              ))}
            </div>
          </div>

          {report ? (
            <div className="grid gap-3 lg:grid-cols-5">
              <div className="rounded-[0.85rem] border px-4 py-3" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                <p className="section-title">Current window</p>
                <p className="mt-2 text-sm font-black" style={{ color: 'var(--c-text)' }}>{report.period?.label}</p>
              </div>
              <div className="rounded-[0.85rem] border px-4 py-3" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                <p className="section-title">Platform start</p>
                <p className="mt-2 text-sm font-black" style={{ color: 'var(--c-text)' }}>{report.platformStartedAt ? formatDateTime(report.platformStartedAt) : 'Unknown'}</p>
              </div>
              <div className="rounded-[0.85rem] border px-4 py-3" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                <p className="section-title">Modules selected</p>
                <p className="mt-2 text-sm font-black" style={{ color: 'var(--c-text)' }}>{formatValue(report.selectedModules?.length || 0)}</p>
              </div>
              <div className="rounded-[0.85rem] border px-4 py-3" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                <p className="section-title">Users in scope</p>
                <p className="mt-2 text-sm font-black" style={{ color: 'var(--c-text)' }}>{formatUserScopeLabel(report)}</p>
              </div>
              <div className="rounded-[0.85rem] border px-4 py-3" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                <p className="section-title">Detailed events</p>
                <p className="mt-2 text-sm font-black" style={{ color: 'var(--c-text)' }}>{formatValue(report.eventsCount)} ledger entries</p>
              </div>
            </div>
          ) : null}
        </div>
      </Panel>

      {report?.notes?.length ? (
        <Panel title="Report notes" subtitle="What this report includes and how to read it.">
          <div className="space-y-2">
            {report.notes.map((note, index) => (
              <div key={`${note}-${index}`} className="rounded-[0.8rem] border px-4 py-3 text-sm leading-6" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)', color: 'var(--c-text-soft)' }}>
                {note}
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {report?.managementReview ? (
        <Panel title="Super management review" subtitle="A direct reading of what the selected data says about usage, control, follow-through, and possible score inflation.">
          <div className="space-y-4">
            <div className="rounded-[0.9rem] border px-4 py-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
              <p className="text-sm leading-7" style={{ color: 'var(--c-text-soft)' }}>
                {report.managementReview.overview}
              </p>
              {report.managementReview.conclusion ? (
                <p className="mt-3 text-sm font-black leading-7" style={{ color: 'var(--c-text)' }}>
                  {report.managementReview.conclusion}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="space-y-3">
                <p className="section-title">Main findings</p>
                {(report.managementReview.findings || []).map((item, index) => (
                  <div key={`${item.area}-${index}`} className="rounded-[0.9rem] border px-4 py-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <StatusPill tone={toneToPill(item.tone)}>{item.area}</StatusPill>
                    </div>
                    <p className="text-sm leading-7" style={{ color: 'var(--c-text-soft)' }}>
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <p className="section-title">Users needing attention</p>
                {(report.managementReview.usersNeedingAttention || []).length === 0 ? (
                  <div className="rounded-[0.9rem] border px-4 py-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                    <p className="text-sm leading-7" style={{ color: 'var(--c-text-soft)' }}>
                      No selected users stood out for weak usage or missing work evidence in this window.
                    </p>
                  </div>
                ) : (
                  (report.managementReview.usersNeedingAttention || []).map((item, index) => (
                    <div key={`${item.userId}-${index}`} className="rounded-[0.9rem] border px-4 py-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <StatusPill tone={toneToPill(item.tone)}>{item.name}</StatusPill>
                        <StatusPill tone="neutral">{item.role}</StatusPill>
                        <StatusPill tone="neutral">{item.unitSector}</StatusPill>
                      </div>
                      <div className="space-y-2">
                        {(item.reasons || []).map((reason, reasonIndex) => (
                          <p key={`${item.userId}-reason-${reasonIndex}`} className="text-sm leading-7" style={{ color: 'var(--c-text-soft)' }}>
                            {reason}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-3">
                <p className="section-title">Integrity checks</p>
                {(report.managementReview.integrityFlags || []).map((item, index) => (
                  <div key={`${item.subject}-${index}`} className="rounded-[0.9rem] border px-4 py-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <StatusPill tone={toneToPill(item.tone)}>{item.subject}</StatusPill>
                      {item.unitSector ? <StatusPill tone="neutral">{item.unitSector}</StatusPill> : null}
                    </div>
                    <p className="text-sm leading-7" style={{ color: 'var(--c-text-soft)' }}>
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {report?.summaryCards?.map((card, index) => {
          const Icon = SUMMARY_ICONS[index % SUMMARY_ICONS.length];
          return (
            <StatCard
              key={card.label}
              label={card.label}
              value={formatValue(card.value)}
              helper={card.helper}
              icon={Icon}
              tone={index % 2 === 0 ? 'var(--brand-primary)' : 'var(--brand-secondary)'}
            />
          );
        })}
      </div>

      <Panel title="Platform footprint" subtitle="The current scale of the selected reporting scope after applying your user and module filters.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {report?.footprintCards?.map((item) => (
            <MiniStat
              key={item.label}
              label={item.label}
              value={formatValue(item.value)}
              helper={item.helper}
              tone="var(--brand-primary)"
            />
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        {report?.moduleSections?.map((section) => {
          const Icon = MODULE_ICON_MAP[section.key] || FileText;
          const moduleMeta = moduleLookup.get(section.key);
          return (
            <Panel
              key={section.key}
              title={section.title}
              subtitle={moduleMeta?.description || section.description}
              action={<StatusPill tone="brand">{formatValue(section.metrics?.length || 0)} metrics</StatusPill>}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[0.8rem]" style={{ background: 'var(--brand-primary-soft)', color: 'var(--brand-primary)' }}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm leading-6" style={{ color: 'var(--c-text-muted)' }}>
                  {moduleMeta?.description || section.description}
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {section.metrics?.map((metric) => (
                  <MiniStat key={`${section.key}-${metric.label}`} label={metric.label} value={formatValue(metric.value)} helper={metric.helper} />
                ))}
              </div>
            </Panel>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Most active people" subtitle="People with the highest level of recorded activity in the selected modules and time window.">
          <div className="space-y-3">
            {(report?.highlights?.topActors || []).length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--c-text-muted)' }}>No activity recorded for this window.</p>
            ) : (
              report.highlights.topActors.map((item, index) => (
                <div key={`${item.userId}-${index}`} className="rounded-[0.85rem] border px-4 py-3" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black" style={{ color: 'var(--c-text)' }}>{item.name}</p>
                      <p className="mt-1 text-xs" style={{ color: 'var(--c-text-muted)' }}>{item.role} - {item.unitSector}</p>
                    </div>
                    <StatusPill tone="brand">{formatValue(item.count)} actions</StatusPill>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Most active units" subtitle="Business areas generating the highest level of recorded activity in the selected modules.">
          <div className="space-y-3">
            {(report?.highlights?.topUnits || []).length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--c-text-muted)' }}>No unit activity recorded for this window.</p>
            ) : (
              report.highlights.topUnits.map((item, index) => (
                <div key={`${item.name}-${index}`} className="flex items-center justify-between rounded-[0.85rem] border px-4 py-3" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                  <div>
                    <p className="text-sm font-black" style={{ color: 'var(--c-text)' }}>{item.name}</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--c-text-muted)' }}>Activity count across the selected period</p>
                  </div>
                  <StatusPill tone="secondary">{formatValue(item.count)}</StatusPill>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Busiest modules" subtitle="Where the selected report window recorded the highest level of activity.">
          <div className="space-y-3">
            {(report?.highlights?.busiestModules || []).length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--c-text-muted)' }}>No module activity recorded for this window.</p>
            ) : (
              report.highlights.busiestModules.map((item, index) => (
                <div key={`${item.name}-${index}`} className="flex items-center justify-between rounded-[0.85rem] border px-4 py-3" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                  <div>
                    <p className="text-sm font-black" style={{ color: 'var(--c-text)' }}>{item.name}</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--c-text-muted)' }}>Events recorded in this module</p>
                  </div>
                  <StatusPill tone="brand">{formatValue(item.count)}</StatusPill>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      <Panel
        title="Detailed activity ledger"
        subtitle={`Activity is grouped by module below. The PDF export includes all ${formatValue(report?.eventsCount || 0)} events in the current report.`}
      >
        {previewEventSections.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No activity recorded"
            description="No management-relevant activity landed inside the selected window."
          />
        ) : (
          <div className="space-y-5">
            {previewEventSections.map((section) => {
              const Icon = MODULE_ICON_MAP[section.key] || FileText;
              return (
                <div key={section.key} className="rounded-[1rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                  <div className="mb-4 flex flex-col gap-3 border-b pb-4 md:flex-row md:items-start md:justify-between" style={{ borderColor: 'var(--c-border)' }}>
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[0.8rem]" style={{ background: 'var(--brand-primary-soft)', color: 'var(--brand-primary)' }}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black" style={{ color: 'var(--c-text)' }}>{section.title}</h3>
                        <p className="mt-1 text-sm leading-6" style={{ color: 'var(--c-text-muted)' }}>
                          {section.description}
                        </p>
                      </div>
                    </div>
                    <StatusPill tone="brand">{formatValue(section.count)} events</StatusPill>
                  </div>

                  {section.previewEvents.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--c-text-muted)' }}>
                      No activity recorded in this module for the selected window.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {section.previewEvents.map((event, index) => (
                        <div key={`${section.key}-${event.at}-${index}`} className="rounded-[0.9rem] border px-4 py-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel)' }}>
                          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <StatusPill tone="brand">{event.action}</StatusPill>
                              </div>
                              <h4 className="text-sm font-black leading-6" style={{ color: 'var(--c-text)' }}>
                                {event.subject || 'Platform activity'}
                              </h4>
                              <p className="mt-1 text-sm" style={{ color: 'var(--c-text-soft)' }}>
                                {event.actorName || 'Unknown user'}
                              </p>
                              {event.detail ? (
                                <p className="mt-2 text-sm leading-6" style={{ color: 'var(--c-text-muted)' }}>
                                  {event.detail}
                                </p>
                              ) : null}
                            </div>
                            <div className="shrink-0 text-xs font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-faint)' }}>
                              {formatDateTime(event.at)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {section.count > section.previewEvents.length ? (
                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-faint)' }}>
                      Showing {formatValue(section.previewEvents.length)} of {formatValue(section.count)} events on screen. PDF export includes the full section.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
};

export default PlatformActivity;



