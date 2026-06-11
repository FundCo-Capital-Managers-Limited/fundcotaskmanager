// src/components/ReportEditor.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Save, X, Loader2, XCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

const ReportEditor = ({ user, tasks, initialReport, onClose, onSaved }) => {
  const [title, setTitle] = useState('');
  const [reportType, setReportType] = useState('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Pre-fill form when editing an existing report
  useEffect(() => {
    if (initialReport) {
      setTitle(initialReport.title || '');
      setReportType(initialReport.reportType || 'daily');
      setStartDate(initialReport.periodStart ? new Date(initialReport.periodStart).toISOString().split('T')[0] : '');
      setEndDate(initialReport.periodEnd ? new Date(initialReport.periodEnd).toISOString().split('T')[0] : '');
      setContent(initialReport.content || '');
    }
  }, [initialReport]);

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

  const handleSaveDraft = async () => {
    if (!title.trim() || !content.trim()) {
      return toast.error('Title and content are required');
    }

    setIsSaving(true);
    const payload = {
      title,
      reportType,
      periodStart: startDate || new Date().toISOString().split('T')[0],
      periodEnd: endDate || new Date().toISOString().split('T')[0],
      content,
      aiGenerated: false,
    };

    try {
      if (initialReport) {
        // UPDATE existing report
        await axios.put(`${import.meta.env.VITE_API_URL}/api/reports/${initialReport._id}`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        toast.success('Report updated successfully!');
      } else {
        // CREATE new report
        await axios.post(`${import.meta.env.VITE_API_URL}/api/reports`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        toast.success('Report saved as draft successfully! Check Report History.');
      }

      if (onSaved) onSaved();
      if (onClose) onClose();
      else {
        setTitle('');
        setContent('');
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err.response?.data?.message || 'Failed to save report');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = async () => {
    if (!content.trim()) return toast.error('Write some content before exporting');

    setIsExporting(true);
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

      const cleanContent = cleanMarkdownForPDF(content);

      addText(title || 'Progress Report', 18, true, 1.6);
      y += 0.4;

      addText(
        `${reportType.toUpperCase()} Report • ${new Date().toLocaleDateString('en-US', {
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

      doc.save(`${(title || 'report').replace(/[^a-z0-9]/gi, '_')}.pdf`);
      toast.success('Clean, professional PDF exported!');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto bg-[var(--bg-surface)] rounded-3xl shadow-xl p-8 border border-[var(--border-color)] relative"
    >
      {/* Close button when editing */}
      {initialReport && onClose && (
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-[var(--text-secondary)] hover:text-red-500 transition-colors"
        >
          <XCircle className="w-8 h-8" />
        </button>
      )}

      <h2 className="text-2xl font-bold text-[var(--brand-primary)] mb-6 flex items-center gap-3">
        <FileText className="w-7 h-7" />
        {initialReport ? 'Edit Report' : 'Manual Report Editor'}
      </h2>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Report Title (e.g. Weekly Progress Report)"
        className="w-full text-2xl font-semibold bg-transparent border-b border-[var(--border-color)] focus:border-[var(--brand-primary)] outline-none pb-3 mb-8 text-[var(--text-primary)]"
      />

      <div className="grid grid-cols-3 gap-4 mb-8">
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          className="p-4 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="p-4 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="p-4 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
        />
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your report here..."
        className="w-full h-96 p-6 text-lg resize-y border border-[var(--border-color)] rounded-3xl focus:ring-2 focus:ring-[var(--brand-primary)] outline-none bg-[var(--bg-surface)] text-[var(--text-primary)]"
      />

      <div className="flex gap-4 mt-10">
        <button
          onClick={handleSaveDraft}
          disabled={isSaving}
          className="flex-1 py-4 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 disabled:bg-[var(--text-muted)] text-white rounded-3xl font-semibold flex items-center justify-center gap-3 transition-all"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {isSaving ? 'Saving...' : initialReport ? 'Save Changes' : 'Save as Draft'}
        </button>

        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-[var(--text-muted)] text-white rounded-3xl font-semibold flex items-center justify-center gap-3 transition-all"
        >
          {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
          {isExporting ? 'Exporting PDF...' : 'Export as PDF'}
        </button>
      </div>
    </motion.div>
  );
};

export default ReportEditor;