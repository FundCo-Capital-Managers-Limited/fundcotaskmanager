// src/components/DocumentUpload.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Loader2, FileText, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { format } from 'date-fns';

const DocumentUpload = ({ onSuccess, history, onSelectExisting }) => {
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected && selected.name.endsWith('.pdf')) {
            setFile(selected);
        } else {
            toast.error('Please select a PDF file.');
        }
    };

    const handleUpload = async () => {
        if (!file) return toast.error('No file selected.');
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('files', file);
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/files/pinFileToIPFS`, formData, {
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.data.success) {
                onSuccess(res.data.files[0]._id);
            }
        } catch (error) {
            toast.error('Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2"><Upload className="w-6 h-6 text-[var(--brand-primary)]" /> Upload or Select PDF</h2>
            <p className="text-sm text-[var(--text-secondary)]">Upload a new PDF or select from history. A modal will ask to convert to text after.</p>

            <div className="space-y-4">
                <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl px-4 py-3 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]"
                />
                <button
                    onClick={handleUpload}
                    disabled={isUploading || !file}
                    className="w-full px-4 py-3 bg-[var(--brand-primary)] text-white rounded-3xl flex items-center justify-center gap-2 hover:bg-[var(--brand-primary)]/90 transition-all duration-200 disabled:opacity-60"
                >
                    {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />} Upload New PDF
                </button>
                {file && <p className="text-sm text-[var(--text-secondary)]">Selected: {file.name}</p>}
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Previous PDFs</h3>
                <div className="max-h-64 overflow-y-auto space-y-3 scrollbar-thin">
                    {history.length === 0 ? (
                        <p className="text-center text-[var(--text-secondary)]">No previous PDFs uploaded.</p>
                    ) : (
                        history.map(hist => (
                            <div
                                key={hist._id}
                                onClick={() => onSelectExisting(hist)}
                                className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-4 flex items-center justify-between cursor-pointer hover:border-[var(--brand-primary)] transition-all duration-200"
                            >
                                <div className="flex items-center gap-3">
                                    <FileText className="w-5 h-5 text-[var(--brand-primary)]" />
                                    <div className="min-w-0">
                                        <p className="font-medium text-[var(--text-primary)] truncate max-w-xs">{hist.originalFileId?.fileName || 'Untitled'}</p>
                                        <p className="text-xs text-[var(--text-secondary)]">{format(new Date(hist.createdAt), 'MMM d, yyyy HH:mm')}</p>
                                    </div>
                                </div>
                                <Eye className="w-5 h-5 text-[var(--text-secondary)]" />
                            </div>
                        ))
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default DocumentUpload;