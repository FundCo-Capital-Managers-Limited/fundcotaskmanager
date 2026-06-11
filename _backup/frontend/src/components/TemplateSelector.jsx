// src/components/TemplateSelector.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, Upload, Check, Loader2, FileText, Eye, Plus, Trash2, Edit2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import EditablePPTPreview from './EditablePPTPreview';

const TemplateSelector = ({ onSelect }) => {
    const [templates, setTemplates] = useState([]);
    const [selected, setSelected] = useState(null);
    const [templateFile, setTemplateFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewType, setPreviewType] = useState(null);
    const [extractedTemplateJson, setExtractedTemplateJson] = useState(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [cleanedJson, setCleanedJson] = useState(null);
    const [isCleaning, setIsCleaning] = useState(false);

    const fetchTemplates = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/files`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                params: { tags: JSON.stringify(['template']), type: 'pdf,jpg,jpeg,png,ppt,pptx' }
            });
            setTemplates(res.data.files || []);
        } catch (error) {
            toast.error('Failed to load templates.');
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleTemplateUpload = async () => {
        if (!templateFile) return toast.error('Select a file.');
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('files', templateFile);
            formData.append('tags', JSON.stringify(['template']));
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/files/pinFileToIPFS`, formData, {
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.data.success) {
                await fetchTemplates();
                toast.success('Template uploaded successfully!');
            }
        } catch (error) {
            toast.error('Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
            setTemplateFile(null);
        }
    };

    const handleSelect = (template) => {
        setSelected(template._id);
        setExtractedTemplateJson(null);
        setCleanedJson(null);
        const url = `https://gateway.pinata.cloud/ipfs/${template.cid}`;
        setPreviewUrl(url);
        setPreviewType(template.type);
        toast.success('Template selected! Preview below.');
    };

    const handleExtractStructure = async () => {
        if (!selected) return toast.error('Select a template first.');
        setIsExtracting(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/documents/extract-template-structure`, { templateId: selected }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setExtractedTemplateJson(res.data.extractedJson);
            toast.success('Template structure extracted! View and clean below.');
        } catch (error) {
            toast.error('Failed to extract template structure.');
        } finally {
            setIsExtracting(false);
        }
    };

    const handleCleanTemplate = async () => {
        if (!extractedTemplateJson) return toast.error('Extract structure first.');
        setIsCleaning(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/documents/clean-template`, { templateId: selected }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setCleanedJson(res.data.cleanedJson);
            toast.success('Template cleaned successfully! All texts cleared.');
        } catch (error) {
            toast.error('Failed to clean template.');
        } finally {
            setIsCleaning(false);
        }
    };

    const handleCreatePPT = () => {
        if (!cleanedJson) return toast.error('Clean the template first.');
        onSelect({ templateId: selected, cleanedJson });
    };

    const renderPreview = () => {
        if (!previewUrl) return <p className="text-center text-[var(--text-secondary)]">Select a template to preview.</p>;
        if (previewType.startsWith('image/')) {
            return <img src={previewUrl} alt="Template preview" className="max-w-full h-auto rounded-3xl shadow-md" />;
        } else if (previewType === 'pdf') {
            return <iframe src={previewUrl} className="w-full h-96 border border-[var(--border-color)] rounded-3xl" title="PDF Preview" />;
        } else if (previewType === 'ppt' || previewType === 'pptx') {
            return (
                <div className="flex flex-col items-center justify-center h-96 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl shadow-sm">
                    <FileText className="w-12 h-12 text-[var(--brand-primary)] mb-4" />
                    <p className="text-sm text-[var(--text-secondary)]">PPT/PPTX preview not supported in browser.</p>
                    <p className="text-xs mt-2 text-[var(--text-secondary)]">Extract structure to view and edit slides.</p>
                    <a href={previewUrl} download className="mt-4 px-4 py-2 bg-[var(--brand-primary)] text-white rounded-3xl flex items-center gap-1">Download Original</a>
                </div>
            );
        }
        return <p className="text-center text-[var(--text-secondary)]">Preview not available for this file type.</p>;
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2"><ImageIcon className="w-6 h-6 text-[var(--brand-primary)]" /> Select PPT Template</h2>
            <p className="text-sm text-[var(--text-secondary)]">Upload a new template (image, PDF, PPT/PPTX) or choose from existing ones. Preview, clean, and create PPT.</p>

            <div className="space-y-4">
                <input
                    type="file"
                    accept="image/*,.pdf,.ppt,.pptx"
                    onChange={e => setTemplateFile(e.target.files[0])}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl px-4 py-3 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]"
                />
                <button
                    onClick={handleTemplateUpload}
                    disabled={isUploading || !templateFile}
                    className="w-full px-4 py-3 bg-[var(--brand-primary)] text-white rounded-3xl flex items-center justify-center gap-2 hover:bg-[var(--brand-primary)]/90 transition-all duration-200 disabled:opacity-60"
                >
                    {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />} Upload New Template
                </button>
            </div>

            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-6">Existing Templates</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
                {templates.length === 0 ? (
                    <p className="text-center text-[var(--text-secondary)]">No templates uploaded yet.</p>
                ) : (
                    templates.map(t => (
                        <div
                            key={t._id}
                            onClick={() => handleSelect(t)}
                            className={`bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-4 flex items-center gap-3 cursor-pointer hover:border-[var(--brand-primary)] transition-all duration-200 ${selected === t._id ? 'bg-[var(--brand-light)] border-[var(--brand-primary)]' : ''}`}
                        >
                            <ImageIcon className="w-5 h-5 text-[var(--brand-primary)]" />
                            <span className="flex-1 text-[var(--text-primary)] truncate">{t.fileName}</span>
                            {selected === t._id && <Check className="w-5 h-5 text-emerald-500" />}
                        </div>
                    ))
                )}
            </div>

            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-6">Template Preview & Edit</h3>
            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-4 min-h-[400px] flex items-center justify-center">
                {renderPreview()}
            </div>

            {selected && (
                <div className="space-y-4 mt-6">
                    <button
                        onClick={handleExtractStructure}
                        disabled={isExtracting}
                        className="w-full px-4 py-3 bg-[var(--brand-primary)] text-white rounded-3xl flex items-center justify-center gap-2 hover:bg-[var(--brand-primary)]/90 transition-all duration-200 disabled:opacity-60"
                    >
                        {isExtracting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Edit2 className="w-5 h-5" />} Extract & Load Structure
                    </button>
                    {extractedTemplateJson && (
                        <>
                            <EditablePPTPreview pptJson={{ slides: extractedTemplateJson.slides }} setPptJson={(newJson) => setExtractedTemplateJson({ ...extractedTemplateJson, slides: newJson.slides })} templateStyles={extractedTemplateJson.templateStyles || {}} />
                            <button
                                onClick={handleCleanTemplate}
                                disabled={isCleaning}
                                className="w-full px-4 py-3 bg-emerald-600 text-white rounded-3xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all duration-200 disabled:opacity-60"
                            >
                                {isCleaning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />} Clean All Texts
                            </button>
                            <button
                                onClick={handleCreatePPT}
                                className="w-full px-4 py-3 bg-[var(--brand-primary)] text-white rounded-3xl flex items-center justify-center gap-2 hover:bg-[var(--brand-primary)]/90 transition-all duration-200"
                            >
                                <Plus className="w-5 h-5" /> Use This Template for PPT
                            </button>
                        </>
                    )}
                </div>
            )}
        </motion.div>
    );
};

export default TemplateSelector;