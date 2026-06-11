// src/components/AIExtractionPanel.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const AIExtractionPanel = ({ onExtract, prompt, setPrompt }) => {
    const [isExtracting, setIsExtracting] = useState(false);

    const handleExtract = async () => {
        if (!prompt.trim()) return toast.error('Prompt cannot be empty.');
        setIsExtracting(true);
        try {
            await onExtract();
        } catch {
            toast.error('Extraction failed.');
        } finally {
            setIsExtracting(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-8">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2"><Zap className="w-6 h-6 text-[var(--brand-primary)]" /> Meaningful Extraction Prompt</h2>
            <p className="text-sm text-[var(--text-secondary)]">Customize the prompt for AI to extract meaningful information from the full text.</p>
            <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                className="w-full h-32 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl px-4 py-3 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand-primary)] resize-none"
                placeholder="e.g., Extract key points, summaries, tables, and insights..."
            />
            <button
                onClick={handleExtract}
                disabled={isExtracting}
                className="w-full px-4 py-3 bg-[var(--brand-primary)] text-white rounded-3xl flex items-center justify-center gap-2 hover:bg-[var(--brand-primary)]/90 transition-all duration-200 disabled:opacity-60"
            >
                {isExtracting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />} Perform Meaningful Extraction
            </button>
        </motion.div>
    );
};

export default AIExtractionPanel;