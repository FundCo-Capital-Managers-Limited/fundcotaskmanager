// src/components/ExtractedTextEditor.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const ExtractedTextEditor = ({ initialText, onSave, title = 'Edit Text' }) => {
    const [text, setText] = useState(initialText);

    const handleSave = () => {
        if (!text.trim()) return toast.error('Text cannot be empty.');
        onSave(text);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-8">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2"><Edit2 className="w-6 h-6 text-[var(--brand-primary)]" /> {title}</h2>
            <p className="text-sm text-[var(--text-secondary)]">Edit the text before proceeding.</p>
            <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                className="w-full h-96 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl px-6 py-4 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand-primary)] resize-y scrollbar-thin"
                placeholder="Text will appear here..."
            />
            <button
                onClick={handleSave}
                className="w-full px-4 py-3 bg-[var(--brand-primary)] text-white rounded-3xl flex items-center justify-center gap-2 hover:bg-[var(--brand-primary)]/90 transition-all duration-200"
            >
                <Save className="w-5 h-5" /> Save & Proceed
            </button>
        </motion.div>
    );
};

export default ExtractedTextEditor;