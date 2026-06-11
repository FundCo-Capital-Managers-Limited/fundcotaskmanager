// src/components/ReportHistoryList.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Download, Send, Trash2, Search, Edit } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ReportEditor from './ReportEditor';
import jsPDF from 'jspdf';

const ReportHistoryList = ({ user }) => {
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState('');
  const [viewingReport, setViewingReport] = useState(null);
  const [editingReport, setEditingReport] = useState(null);

  const fetchReports = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/reports`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setReports(res.data.reports || []);
    } catch (err) {
      toast.error('Failed to load history');
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const filtered = reports.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (id) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/reports/${id}/submit`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      toast.success('Report submitted successfully!');
      fetchReports();
    } catch (err) {
      toast.error('Submit failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this report permanently?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/reports/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      toast.success('Report deleted');
      fetchReports();
      setViewingReport(null);
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  // Clean Markdown for PDF export
  const cleanMarkdownForPDF = (text) => {
    return text
      .replace(/^#{1,6}\s*/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^\s*[-*+]\s+/gm, '• ')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const exportReportToPDF = async (report) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter',
      });

      const margin = 1;
      const pageWidth = doc.internal.pageSize.getWidth();
      const printableWidth = pageWidth - 2 * margin;
      let y = margin + 0.6;

      const addText = (text, fontSize, isBold = false, lineSpacing = 1.15) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        const lines = doc.splitTextToSize(text, printableWidth);
        lines.forEach((line) => {
          if (y > 10) {
            doc.addPage();
            y = margin + 0.6;
          }
          doc.text(line, margin, y);
          y += (fontSize / 72) * lineSpacing;
        });
      };

      const cleanContent = cleanMarkdownForPDF(report.content);

      addText(report.title, 18, true, 1.6);
      y += 0.4;

      addText(
        `${report.reportType.toUpperCase()} Report • ${new Date(report.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`,
        12,
        false,
        1.2
      );
      y += 0.6;

      const paragraphs = cleanContent
        .split('\n\n')
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      paragraphs.forEach((paragraph) => {
        addText(paragraph, 12, false, 1.2);
        y += 0.3;
      });

      doc.save(`${report.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
      toast.success('Clean, professional PDF exported from history!');
    } catch (err) {
      console.error(err);
      toast.error('PDF export failed');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Search className="w-6 h-6 text-[var(--brand-primary)]" />
        <input
          type="text"
          placeholder="Search reports..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 p-4 rounded-3xl border border-[var(--border-color)] focus:border-[var(--brand-primary)] outline-none bg-[var(--bg-surface)] text-[var(--text-primary)]"
        />
      </div>

      <div className="grid gap-6">
        {filtered.map((report) => (
          <motion.div
            key={report._id}
            className="bg-[var(--bg-surface)] p-6 rounded-3xl shadow flex justify-between items-center border border-[var(--border-color)]"
          >
            <div>
              <h4 className="font-semibold text-xl text-[var(--text-primary)]">{report.title}</h4>
              <p className="text-sm text-[var(--text-secondary)]">
                {new Date(report.createdAt).toLocaleDateString()} • {report.reportType}
              </p>
              <span
                className={`inline-block px-4 py-1 text-xs rounded-full mt-2 ${
                  report.status === 'draft'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                    : report.status === 'reviewed'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                    : 'bg-[var(--brand-light)] text-[var(--brand-primary)]'
                }`}
              >
                {report.status.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setViewingReport(report)}
                className="flex items-center gap-2 px-6 py-3 hover:bg-[var(--bg-hover)] rounded-3xl transition-all text-[var(--text-primary)]"
              >
                <Eye className="w-5 h-5" /> View
              </button>

              <button
                onClick={() => setEditingReport(report)}
                className="flex items-center gap-2 px-6 py-3 hover:bg-amber-100 rounded-3xl transition-all text-[var(--text-primary)]"
              >
                <Edit className="w-5 h-5" /> Edit
              </button>

              <button
                onClick={() => exportReportToPDF(report)}
                className="flex items-center gap-2 px-6 py-3 hover:bg-emerald-100 rounded-3xl transition-all text-[var(--text-primary)]"
              >
                <Download className="w-5 h-5" /> PDF
              </button>

              {report.status === 'draft' && (
                <button
                  onClick={() => handleSubmit(report._id)}
                  className="px-8 py-3 bg-[var(--brand-primary)] text-white rounded-3xl hover:bg-[var(--brand-primary)]/90"
                >
                  Submit
                </button>
              )}

              {report.status === 'draft' && (
                <button
                  onClick={() => handleDelete(report._id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* VIEW MODAL - Now shows Admin Feedback */}
      {viewingReport && (
        <motion.div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10000]">
          <div className="bg-[var(--bg-surface)] w-full max-w-4xl max-h-[90vh] overflow-auto rounded-3xl p-10 border border-[var(--border-color)]">
            <div className="prose max-w-none text-[var(--text-primary)]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewingReport.content}</ReactMarkdown>
            </div>

            {/* ADMIN FEEDBACK SECTION */}
            {viewingReport.feedback && (
              <div className="mt-10 p-6 bg-amber-50 dark:bg-amber-900/30 rounded-3xl border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-amber-600 font-semibold text-lg">Admin Feedback</span>
                </div>
                <p className="text-[var(--text-primary)] whitespace-pre-wrap">{viewingReport.feedback}</p>
              </div>
            )}

            <button
              onClick={() => setViewingReport(null)}
              className="mt-8 px-8 py-4 bg-[var(--bg-subtle)] rounded-3xl w-full text-lg font-medium text-[var(--text-primary)]"
            >
              Close
            </button>
          </div>
        </motion.div>
      )}

      {/* Edit Modal */}
      {editingReport && (
        <motion.div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10000]">
          <div className="bg-[var(--bg-surface)] w-full max-w-4xl max-h-[90vh] overflow-auto rounded-3xl border border-[var(--border-color)]">
            <ReportEditor
              user={user}
              tasks={[]}               
              initialReport={editingReport}  
              onClose={() => setEditingReport(null)}  
              onSaved={() => {
                fetchReports();
                setEditingReport(null);
              }}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ReportHistoryList;