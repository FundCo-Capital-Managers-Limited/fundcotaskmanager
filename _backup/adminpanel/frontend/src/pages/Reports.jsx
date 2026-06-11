import React, { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import { CheckCircle2, FileText, Search, Send, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import api from '../utils/api.js';
import { EmptyState, FilterChip, LoadingScreen, Modal, PageHeader, Panel, SearchInput, StatCard } from '../components/ui.jsx';

const ST = { submitted: { c: '#d97706', bg: '#fffbeb' }, approved: { c: '#059669', bg: '#ecfdf5' }, rejected: { c: '#dc2626', bg: '#fef2f2' } };

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter) params.status = filter;
      if (search) params.search = search;
      const [r, s] = await Promise.all([api.get('/reports', { params }), api.get('/reports/stats')]);
      setReports(r.data.reports || []);
      setStats(s.data.stats || {});
    } catch {
      toast.error('Failed');
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const review = async (id, action, feedback = '') => {
    try {
      await api.post(`/reports/${id}/review`, { action, feedback });
      toast.success(`Report ${action}`);
      fetchAll();
      setViewing(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  const addNote = async (id, content) => {
    try {
      await api.post(`/reports/${id}/note`, { content });
      toast.success('Note added');
      fetchAll();
      setViewing(null);
    } catch {
      toast.error('Failed');
    }
  };

  return (
    <div className="page-shell">
      <PageHeader title="Reports" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Pending', value: stats.submitted || 0, tone: '#d97706' },
          { label: 'Approved', value: stats.approved || 0, tone: '#059669' },
          { label: 'Rejected', value: stats.rejected || 0, tone: '#dc2626' },
          { label: 'Total', value: stats.total || 0, tone: 'var(--c-accent)' },
        ].map((item) => <StatCard key={item.label} label={item.label} value={item.value} icon={FileText} tone={item.tone} />)}
      </div>
      <Panel>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reports..." icon={Search} />
          <div className="flex flex-wrap gap-2">
            {['', 'submitted', 'approved', 'rejected'].map((item) => <FilterChip key={item || 'all'} active={filter === item} onClick={() => setFilter(item)}>{item || 'All'}</FilterChip>)}
          </div>
        </div>
      </Panel>
      {loading ? <LoadingScreen height="18rem" /> : reports.length === 0 ? <EmptyState icon={FileText} title="No reports found" description="When reports are submitted they will appear here for review." /> : (
        <Panel title="Submission queue" subtitle={`${reports.length} reports visible`}>
          <div className="space-y-3">
            {reports.map((report) => {
              const st = ST[report.status] || ST.submitted;
              const userName = report.user ? `${report.user.firstName} ${report.user.lastName}` : 'Unknown';
              return (
                <div key={report._id} className="card p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setViewing(report)}>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="badge capitalize" style={{ background: st.bg, color: st.c }}>{report.status}</span>
                        {report.aiGenerated ? <span className="badge" style={{ background: '#eff6ff', color: '#2563eb' }}>AI</span> : null}
                      </div>
                      <h3 className="text-base font-bold" style={{ color: 'var(--c-text-0)' }}>{report.title}</h3>
                      <p className="mt-1 text-sm" style={{ color: 'var(--c-text-3)' }}>{userName} - {report.reportType} - {report.submittedAt ? format(new Date(report.submittedAt), 'MMM d, yyyy') : 'Draft'}</p>
                    </div>
                    {report.status === 'submitted' ? <div className="flex gap-2"><button className="btn-secondary" onClick={() => review(report._id, 'approved')}><ThumbsUp className="h-4 w-4" /></button><button className="btn-danger" onClick={() => review(report._id, 'rejected')}><ThumbsDown className="h-4 w-4" /></button></div> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}
      <ReportModal open={!!viewing} report={viewing} onClose={() => setViewing(null)} onReview={review} onAddNote={addNote} />
    </div>
  );
};

const ReportModal = ({ open, report, onClose, onReview, onAddNote }) => {
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState('');
  if (!report) return null;

  return (
    <Modal open={open} onClose={onClose} title={report.title} subtitle={`${report.user ? `${report.user.firstName} ${report.user.lastName}` : 'Unknown'} - ${report.reportType}`} width="max-w-4xl">
      <div className="space-y-5">
        <div className="prose max-w-none rounded-[1.35rem] border p-4" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-1)' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.content}</ReactMarkdown>
        </div>
        {report.feedback ? <div className="rounded-[1.35rem] border p-4" style={{ borderColor: '#fbbf24', background: 'var(--c-warning-bg)' }}><p className="font-bold" style={{ color: '#92400e' }}>Admin Feedback</p><p className="mt-1 text-sm" style={{ color: 'var(--c-text-1)' }}>{report.feedback}</p></div> : null}
        {report.adminNotes?.length ? <div className="space-y-3">{report.adminNotes.map((item, index) => <div key={index} className="rounded-[1.35rem] border p-4" style={{ borderColor: 'var(--c-border)' }}><p className="font-bold" style={{ color: 'var(--c-accent)' }}>{item.user?.firstName} {item.user?.lastName}</p><p className="mt-1 text-sm" style={{ color: 'var(--c-text-1)' }}>{item.content}</p></div>)}</div> : null}
        <div className="flex gap-2"><input className="input-base" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Write an admin note..." /><button className="btn-primary" onClick={() => { if (note.trim()) { onAddNote(report._id, note.trim()); setNote(''); } }}><Send className="h-4 w-4" /></button></div>
        {report.status === 'submitted' ? <><textarea className="input-base min-h-28" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Optional feedback..." /><div className="flex gap-3"><button className="btn-primary flex-1" style={{ background: '#059669' }} onClick={() => onReview(report._id, 'approved', feedback)}><CheckCircle2 className="h-4 w-4" />Approve</button><button className="btn-danger flex-1" onClick={() => onReview(report._id, 'rejected', feedback)}><X className="h-4 w-4" />Reject</button></div></> : null}
      </div>
    </Modal>
  );
};

export default Reports;
