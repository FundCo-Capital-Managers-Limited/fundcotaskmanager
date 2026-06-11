// src/components/HistoryList.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { History as HistoryIcon, FileText, Eye } from 'lucide-react';
import { format } from 'date-fns';

const HistoryList = ({ histories, onSelect }) => {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2"><HistoryIcon className="w-6 h-6 text-[var(--brand-primary)]" /> Full Conversion History</h2>
            <p className="text-sm text-[var(--text-secondary)]">View and select past conversions.</p>
            {histories.length === 0 ? (
                <p className="text-center text-[var(--text-secondary)]">No history yet.</p>
            ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin">
                    {histories.map(hist => (
                        <motion.div
                            key={hist._id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-4 flex items-center justify-between cursor-pointer hover:border-[var(--brand-primary)] transition-all duration-200"
                            onClick={() => onSelect(hist)}
                        >
                            <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-[var(--brand-primary)]" />
                                <div className="min-w-0">
                                    <p className="font-medium text-[var(--text-primary)] truncate max-w-xs">{hist.originalFileId?.fileName || 'Untitled'}</p>
                                    <p className="text-xs text-[var(--text-secondary)]">{format(new Date(hist.createdAt), 'MMM d, yyyy HH:mm')}</p>
                                </div>
                            </div>
                            <Eye className="w-5 h-5 text-[var(--text-secondary)]" />
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
};

export default HistoryList;