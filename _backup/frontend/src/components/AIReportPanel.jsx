// src/components/AIReportPanel.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Send, Zap, CheckSquare, Square, Loader2, Download, Save } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import jsPDF from 'jspdf';

const AIReportPanel = ({ user, tasks: allTasks }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [reportType, setReportType] = useState('weekly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [filteredTasks, setFilteredTasks] = useState([]);

  useEffect(() => {
    let filtered = allTasks || [];
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filtered = filtered.filter(task => {
        if (!task.dueDate) return false;
        const due = new Date(task.dueDate);
        return due >= start && due <= end;
      });
    }
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setFilteredTasks(filtered);
  }, [allTasks, startDate, endDate]);

  const toggleTask = (id) => {
    const newSet = new Set(selectedTaskIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedTaskIds(newSet);
  };

  const generateReport = async () => {
    if (selectedTaskIds.size === 0) {
      return toast.error('Please select at least one task for the report');
    }
    setIsGenerating(true);
    setGeneratedContent('');
    const selectedTasks = filteredTasks.filter(t => selectedTaskIds.has(t._id));

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/grok/report-generator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `You are writing a natural, honest, first-person progress report as if I (the employee) am reporting to my manager.
Only use the tasks provided below. Do not invent anything.
Be truthful about what was completed and what was not.
Include checklist progress where relevant.
Report type: ${reportType}
Period: ${startDate || 'N/A'} to ${endDate || 'N/A'}
${customPrompt ? `Additional instructions: ${customPrompt}` : ''}

Tasks:\n${JSON.stringify(selectedTasks.map(t => ({
              title: t.title,
              description: t.description,
              completed: t.completed,
              checklist: t.checklist || [],
              dueDate: t.dueDate,
              priority: t.priority,
            })), null, 2)}`,
          }],
          taskContext: JSON.stringify(selectedTasks),
          toolId: 'report-generator',
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullText += parsed.content;
                setGeneratedContent(fullText);
              }
            } catch (e) {}
          }
        }
      }
      toast.success('AI Report generated!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveGeneratedReport = async () => {
    if (!generatedContent) return;
    try {
      const formData = new FormData();
      formData.append('title', `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} AI Report`);
      formData.append('reportType', reportType);
      formData.append('periodStart', startDate || new Date().toISOString().split('T')[0]);
      formData.append('periodEnd', endDate || new Date().toISOString().split('T')[0]);
      formData.append('content', generatedContent);
      formData.append('aiGenerated', true);

      await axios.post(`${import.meta.env.VITE_API_URL}/api/reports`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      toast.success('AI Report saved to history!');
      setIsOpen(false);
      setGeneratedContent('');
      setSelectedTaskIds(new Set());
    } catch (err) {
      toast.error('Failed to save AI report');
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

  const exportGeneratedPDF = () => {
    if (!generatedContent) return;
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

      const cleanContent = cleanMarkdownForPDF(generatedContent);

      addText(`${reportType.toUpperCase()} AI Report`, 18, true, 1.6);
      y += 0.4;

      addText(
        `Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
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

      doc.save('ai-generated-report.pdf');
      toast.success('AI Report exported as clean PDF!');
    } catch (err) {
      console.error(err);
      toast.error('PDF export failed');
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-6 bg-[var(--brand-primary)] text-white rounded-3xl text-xl font-semibold flex items-center justify-center gap-4 hover:scale-105 transition-all shadow-xl"
      >
        <Zap className="w-7 h-7" />
        Generate Report with AI
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[var(--bg-surface)] w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-[var(--border-color)]"
            >
              <div className="px-8 py-6 border-b flex items-center justify-between bg-[var(--bg-subtle)]">
                <div className="flex items-center gap-3">
                  <Zap className="w-8 h-8 text-[var(--brand-primary)]" />
                  <h3 className="text-2xl font-bold text-[var(--text-primary)]">AI Report Generator</h3>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-[var(--text-secondary)] hover:text-red-500">
                  <X className="w-8 h-8" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Report Type</label>
                    <select
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                      className="w-full p-4 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">From</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full p-4 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">To</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full p-4 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
                      />
                    </div>
                  </div>
                </div>

                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Any special instructions? (optional)"
                  className="w-full h-28 p-5 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] resize-y"
                />

                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2 text-[var(--text-primary)]">
                    <Calendar className="w-5 h-5" />
                    Select Tasks to Include ({selectedTaskIds.size} selected)
                  </h4>
                  <div className="max-h-80 overflow-y-auto border border-[var(--border-color)] rounded-3xl p-4 space-y-3 bg-[var(--bg-surface)]">
                    {filteredTasks.length === 0 ? (
                      <p className="text-center py-12 text-[var(--text-muted)]">No tasks found in this period</p>
                    ) : (
                      filteredTasks.map((task) => (
                        <div
                          key={task._id}
                          onClick={() => toggleTask(task._id)}
                          className="flex items-center gap-4 p-4 hover:bg-[var(--bg-hover)] rounded-3xl cursor-pointer transition-all"
                        >
                          {selectedTaskIds.has(task._id) ? (
                            <CheckSquare className="w-6 h-6 text-[var(--brand-primary)]" />
                          ) : (
                            <Square className="w-6 h-6 text-[var(--text-muted)]" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-[var(--text-primary)]">{task.title}</p>
                            {task.description && <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{task.description}</p>}
                            {task.checklist?.length > 0 && (
                              <p className="text-xs text-[var(--brand-primary)] mt-1">
                                Checklist: {task.checklist.filter(c => c.completed).length}/{task.checklist.length} done
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {generatedContent && (
                  <div className="prose dark:prose-invert max-w-none bg-[var(--bg-subtle)] p-6 rounded-3xl text-[var(--text-primary)]">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedContent}</ReactMarkdown>
                  </div>
                )}
              </div>

              <div className="px-8 py-6 border-t flex gap-4 bg-[var(--bg-surface)]">
                <button
                  onClick={generateReport}
                  disabled={isGenerating || selectedTaskIds.size === 0}
                  className="flex-1 py-5 bg-[var(--brand-primary)] text-white font-semibold rounded-3xl flex items-center justify-center gap-3 disabled:opacity-60"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Generating live report...
                    </>
                  ) : (
                    <>
                      <Send className="w-6 h-6" />
                      Generate Report with AI
                    </>
                  )}
                </button>

                {generatedContent && (
                  <>
                    <button
                      onClick={handleSaveGeneratedReport}
                      className="px-8 py-5 bg-emerald-600 text-white font-semibold rounded-3xl flex items-center gap-2 hover:bg-emerald-700 transition-all"
                    >
                      <Save className="w-5 h-5" />
                      Save Report
                    </button>
                    <button
                      onClick={exportGeneratedPDF}
                      className="px-8 py-5 bg-[var(--brand-primary)] text-white font-semibold rounded-3xl flex items-center gap-2 hover:bg-[var(--brand-primary)]/90 transition-all"
                    >
                      <Download className="w-5 h-5" />
                      Export PDF
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIReportPanel;