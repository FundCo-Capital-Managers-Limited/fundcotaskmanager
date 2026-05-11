import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarDays,
  CheckCircle2,
  Eye,
  FileText,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext.jsx';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4001';
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const TYPE_LABELS = {
  standup: 'Standup',
  internal: 'Internal',
  client: 'Client',
  board: 'Board',
  review: 'Review',
  planning: 'Planning',
  retrospective: 'Retrospective',
  workshop: 'Workshop',
  other: 'Other',
};

const sectionCardStyle = {
  backgroundColor: 'var(--bg-surface)',
  borderColor: 'var(--border-color)',
};

const inputStyle = {
  backgroundColor: 'var(--input-bg)',
  color: 'var(--text-primary)',
  border: '1px solid var(--input-border)',
};

const fullName = (user) => user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown user';

const formatDate = (value) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const formatDateTime = (value) => {
  if (!value) return 'Not yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not yet';
  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const SummaryCard = ({ title, value, hint, tone }) => (
  <div className="rounded-2xl border p-4" style={sectionCardStyle}>
    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{title}</p>
    <p className="mt-2 text-2xl font-black" style={{ color: tone }}>{value}</p>
    <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{hint}</p>
  </div>
);

const MeetingReports = () => {
  const { user } = useOutletContext();
  const { markMeetingReportsRead } = useNotifications();
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ inbox: 0, pendingAcknowledgement: 0, createdByMe: 0 });
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [search, setSearch] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const [reportsRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/meeting-reports`, { params: { scope: 'inbox', search }, headers: headers() }),
        axios.get(`${API_BASE}/api/meeting-reports/stats`, { headers: headers() }),
      ]);
      setReports(reportsRes.data.reports || []);
      setStats(statsRes.data.stats || { inbox: 0, pendingAcknowledgement: 0, createdByMe: 0 });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load meeting reports');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    markMeetingReportsRead();
  }, [markMeetingReportsRead]);

  const openReport = async (reportId) => {
    setDetailLoading(true);
    setSelectedReport(null);
    try {
      const { data } = await axios.get(`${API_BASE}/api/meeting-reports/${reportId}`, { headers: headers() });
      setSelectedReport(data.report || null);
      markMeetingReportsRead();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load meeting report');
    } finally {
      setDetailLoading(false);
    }
  };

  const acknowledgeReport = async () => {
    if (!selectedReport?._id) return;
    try {
      const { data } = await axios.post(`${API_BASE}/api/meeting-reports/${selectedReport._id}/acknowledge`, {}, { headers: headers() });
      setSelectedReport(data.report || null);
      setReports((current) => current.map((report) => report._id === data.report?._id ? data.report : report));
      fetchReports();
      toast.success('Meeting report acknowledged');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to acknowledge meeting report');
    }
  };

  const visibleReports = useMemo(() => reports.filter((report) => {
    if (!search) return true;
    const haystack = `${report.title || ''} ${report.summaryText || ''}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  }), [reports, search]);

  const canAcknowledge = useMemo(() => {
    if (!selectedReport || !user?._id) return false;
    const status = (selectedReport.recipientStatus || []).find((entry) => entry.user?._id === user._id);
    return Boolean(status) && !status.acknowledged;
  }, [selectedReport, user?._id]);

  const viewedCount = useMemo(() => visibleReports.filter((report) => {
    const status = (report.recipientStatus || []).find((entry) => entry.user?._id === user?._id);
    return Boolean(status?.viewed);
  }).length, [visibleReports, user?._id]);

  const acknowledgedCount = useMemo(() => visibleReports.filter((report) => {
    const status = (report.recipientStatus || []).find((entry) => entry.user?._id === user?._id);
    return Boolean(status?.acknowledged);
  }).length, [visibleReports, user?._id]);

  return (
    <div className="space-y-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Meeting Reports</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Review meeting outcomes shared with you, open the report detail, and acknowledge it for accountability.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchReports}
          className="rounded-xl border px-4 py-2 text-sm font-bold"
          style={sectionCardStyle}
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard title="Inbox" value={stats.inbox || 0} hint="Reports shared with you" tone="var(--brand-primary)" />
        <SummaryCard title="Pending Ack" value={stats.pendingAcknowledgement || 0} hint="Still waiting on your acknowledgement" tone="#d97706" />
        <SummaryCard title="Viewed" value={viewedCount} hint="Reports you already opened" tone="#2563eb" />
        <SummaryCard title="Acknowledged" value={acknowledgedCount} hint="Reports you confirmed" tone="#059669" />
      </div>

      <div className="rounded-3xl border p-5" style={sectionCardStyle}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Reports Inbox</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Meeting reports sent by executives, team leads, and admins show up here.
            </p>
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-2xl px-10 py-3 text-sm outline-none"
              style={inputStyle}
              placeholder="Search meeting reports..."
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border p-10 text-center text-sm" style={sectionCardStyle}>Loading meeting reports...</div>
      ) : visibleReports.length === 0 ? (
        <div className="rounded-3xl border p-10 text-center" style={sectionCardStyle}>
          <FileText className="mx-auto h-10 w-10" style={{ color: 'var(--text-muted)' }} />
          <p className="mt-4 font-bold" style={{ color: 'var(--text-primary)' }}>No meeting reports yet</p>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            When a meeting report is shared with you, it will appear here instantly.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleReports.map((report) => {
            const recipientStatus = (report.recipientStatus || []).find((entry) => entry.user?._id === user?._id);
            const viewed = recipientStatus?.viewed;
            const acknowledged = recipientStatus?.acknowledged;
            return (
              <button
                key={report._id}
                type="button"
                onClick={() => openReport(report._id)}
                className="w-full rounded-3xl border p-5 text-left transition-transform hover:-translate-y-0.5"
                style={sectionCardStyle}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }}>
                        {TYPE_LABELS[report.meetingType] || 'Meeting'}
                      </span>
                      <span
                        className="rounded-full px-3 py-1 text-xs font-bold"
                        style={acknowledged
                          ? { backgroundColor: '#dcfce7', color: '#166534' }
                          : viewed
                            ? { backgroundColor: '#e0f2fe', color: '#075985' }
                            : { backgroundColor: '#fff7ed', color: '#c2410c' }}
                      >
                        {acknowledged ? 'Acknowledged' : viewed ? 'Viewed' : 'Not viewed'}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-black" style={{ color: 'var(--text-primary)' }}>{report.title}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" />{formatDate(report.meetingDate)}</span>
                      <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />{report.recipients?.length || 0} recipient{report.recipients?.length === 1 ? '' : 's'}</span>
                      <span>By {fullName(report.createdBy)}</span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                      {report.summaryText || 'Attachment only'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                      Open report
                      <Eye className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {(selectedReport || detailLoading) ? (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1090] bg-black/55" onClick={() => !detailLoading && setSelectedReport(null)} />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              className="fixed left-1/2 top-1/2 z-[1091] max-h-[88vh] w-[94vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border"
              style={sectionCardStyle}
            >
              <div className="flex items-start justify-between gap-4 border-b px-5 py-4" style={{ borderColor: 'var(--border-color)' }}>
                <div className="min-w-0">
                  <h3 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{detailLoading ? 'Loading meeting report...' : selectedReport?.title}</h3>
                  {!detailLoading && selectedReport ? (
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {TYPE_LABELS[selectedReport.meetingType] || 'Meeting'} | {formatDate(selectedReport.meetingDate)} | By {fullName(selectedReport.createdBy)}
                    </p>
                  ) : null}
                </div>
                <button type="button" onClick={() => setSelectedReport(null)} className="rounded-2xl p-2 transition-colors hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-secondary)' }}>
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[calc(88vh-82px)] overflow-y-auto p-5">
                {detailLoading || !selectedReport ? (
                  <div className="py-16 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>Loading meeting report details...</div>
                ) : (
                  <div className="space-y-5">
                    <div className="rounded-2xl border p-4" style={sectionCardStyle}>
                      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Meeting Summary</p>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7" style={{ color: 'var(--text-primary)' }}>
                        {selectedReport.summaryText || 'No typed summary was provided. Open the attached file if one was uploaded.'}
                      </p>
                    </div>

                    {selectedReport.attachment?.url ? (
                      <div className="rounded-2xl border p-4" style={sectionCardStyle}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Attachment</p>
                            <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedReport.attachment.fileName}</p>
                          </div>
                          <a href={selectedReport.attachment.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold text-white" style={{ backgroundColor: 'var(--brand-primary)' }}>
                            <FileText className="h-4 w-4" />
                            Open attachment
                          </a>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border p-4" style={sectionCardStyle}>
                        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Recipients</p>
                        <div className="mt-3 space-y-2">
                          {(selectedReport.recipientStatus || []).map((entry) => (
                            <div key={entry.user?._id} className="rounded-2xl border px-3 py-3 text-sm" style={{ ...sectionCardStyle, backgroundColor: 'var(--bg-subtle)' }}>
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{fullName(entry.user)}</p>
                                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{entry.user?.position || entry.user?.email}</p>
                                </div>
                                <div className="text-right text-xs" style={{ color: 'var(--text-secondary)' }}>
                                  <p>{entry.viewed ? `Viewed ${formatDateTime(entry.viewedAt)}` : 'Not viewed'}</p>
                                  <p className="mt-1">{entry.acknowledged ? `Acknowledged ${formatDateTime(entry.acknowledgedAt)}` : 'Not acknowledged'}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border p-4" style={sectionCardStyle}>
                        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Action Items</p>
                        <div className="mt-3 space-y-2">
                          {(selectedReport.actionItems || []).length === 0 ? (
                            <div className="rounded-2xl border px-3 py-5 text-center text-sm" style={{ ...sectionCardStyle, backgroundColor: 'var(--bg-subtle)' }}>
                              <p style={{ color: 'var(--text-secondary)' }}>No action items were attached to this meeting report.</p>
                            </div>
                          ) : (
                            selectedReport.actionItems.map((item) => (
                              <div key={item._id} className="rounded-2xl border px-3 py-3 text-sm" style={{ ...sectionCardStyle, backgroundColor: 'var(--bg-subtle)' }}>
                                <div>
                                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.text}</p>
                                  <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    {item.owner ? `Suggested owner: ${fullName(item.owner)}` : 'Suggested owner: Unassigned'}
                                    {item.dueDate ? ` | Due ${formatDate(item.dueDate)}` : ''}
                                    {item.priority ? ` | ${item.priority}` : ''}
                                  </p>
                                  {item.notes ? <p className="mt-2 text-xs leading-6" style={{ color: 'var(--text-secondary)' }}>{item.notes}</p> : null}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3">
                      {canAcknowledge ? (
                        <button type="button" onClick={acknowledgeReport} className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white" style={{ backgroundColor: 'var(--brand-primary)' }}>
                          <CheckCircle2 className="h-4 w-4" />
                          Acknowledge report
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default MeetingReports;
