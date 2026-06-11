// src/pages/DocumentConverter.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
    Upload, FileText, Zap, Edit2, Image as ImageIcon, Eye, History as HistoryIcon,
    ArrowLeft, Loader2, Download, ChevronRight, ChevronLeft, AlertCircle, Plus
} from 'lucide-react';
import DocumentUpload from '../components/DocumentUpload';
import AIExtractionPanel from '../components/AIExtractionPanel';
import ExtractedTextEditor from '../components/ExtractedTextEditor';
import TemplateSelector from '../components/TemplateSelector';
import EditablePPTPreview from '../components/EditablePPTPreview';
import HistoryList from '../components/HistoryList';

const DocumentConverter = () => {
    const { user } = useOutletContext();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [documentId, setDocumentId] = useState(null);
    const [fullText, setFullText] = useState('');
    const [extractedText, setExtractedText] = useState('');
    const [pptJson, setPptJson] = useState(null);
    const [templateId, setTemplateId] = useState(null);
    const [extractionPrompt, setExtractionPrompt] = useState('Extract key points, summaries, headings, tables, and meaningful insights from the full text.');
    const [pptPrompt, setPptPrompt] = useState('Generate a professional 10-20 page PPT summarizing the key points, with clear titles, bullets, and logical flow.');
    const [fileId, setFileId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [cleanedJson, setCleanedJson] = useState(null);

    const fetchHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/documents/history`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setHistory(res.data.histories || []);
        } catch (error) {
            toast.error('Failed to load history.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleDocumentReady = () => {
        setShowConvertModal(true);
    };

    const handleConfirmConvert = (convert) => {
        setShowConvertModal(false);
        if (convert) {
            handleRawExtract();
        } else {
            setStep(3);
        }
    };

    const handleSelectExisting = async (hist) => {
        setDocumentId(hist._id);
        setFileId(hist.originalFileId._id);
        setFullText(hist.fullText || '');
        setExtractedText(hist.extractedText || '');
        setPptJson(hist.pptJson || null);
        setTemplateId(hist.templateFileId?._id || null);
        setErrorMessage('');
        handleDocumentReady();
        toast.success('Selected existing document!');
    };

    const handleUploadSuccess = async (uploadedFileId) => {
        setIsLoading(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/documents`, { fileId: uploadedFileId }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setDocumentId(res.data.document._id);
            setFileId(uploadedFileId);
            fetchHistory();
            toast.success('PDF uploaded successfully!');
            handleDocumentReady();
        } catch (error) {
            toast.error('Failed to initialize document.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRawExtract = async () => {
        if (!documentId) return toast.error('No document selected.');
        setIsLoading(true);
        setErrorMessage('');
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/documents/raw-extract`, { documentId }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.data.fullText.trim() === '') {
                setErrorMessage('No text extracted. The PDF may be scanned or image-based. Please use an OCR tool to make it searchable and re-upload.');
                toast.warning('Empty extraction - check error message.');
                setFullText('');
            } else {
                setFullText(res.data.fullText);
                setStep(3);
                toast.success('Full PDF text extracted successfully!');
            }
        } catch (error) {
            setErrorMessage(error.response?.data?.message || 'Raw extraction failed. Please try again or check if PDF is searchable.');
            toast.error('Raw extraction failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveFullText = (editedText) => {
        setFullText(editedText);
        setStep(4);
        toast.success('Full text saved! Proceed to meaningful extraction.');
    };

    const handleMeaningfulExtract = async () => {
        if (!documentId) return toast.error('No document selected.');
        if (!fullText.trim()) return toast.error('No full text available. Perform raw extraction first.');
        setIsLoading(true);
        setErrorMessage('');
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/documents/extract`, { documentId, prompt: extractionPrompt }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setExtractedText(res.data.extractedText);
            setStep(5);
            toast.success('Meaningful content extracted!');
        } catch (error) {
            setErrorMessage(error.response?.data?.message || 'Meaningful extraction failed.');
            toast.error('Meaningful extraction failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveExtracted = (editedText) => {
        setExtractedText(editedText);
        setStep(6);
        toast.success('Meaningful text saved! Select template.');
    };

    const handleTemplateSelect = (data) => {
        setTemplateId(data.templateId);
        setCleanedJson(data.cleanedJson);
        setStep(7);
        toast.success('Template prepared! Generate PPT.');
    };

    const handleGeneratePPT = async () => {
        if (!documentId) return toast.error('No document selected.');
        if (!extractedText.trim()) return toast.error('No meaningful text available. Perform extraction first.');
        setIsLoading(true);
        setErrorMessage('');
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/documents/generate-ppt`, { documentId, prompt: pptPrompt, templateId, templateJson: cleanedJson }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setPptJson(res.data.pptJson || { slides: [] });
            toast.success('PPT generated! Adjust and save.');
        } catch (error) {
            setErrorMessage(error.response?.data?.message || 'PPT generation failed.');
            toast.error('PPT generation failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportPPT = () => {
        if (!pptJson || !pptJson.slides || pptJson.slides.length === 0) return toast.error('No PPT to save.');
        import('pptxgenjs').then(PptxGenJS => {
            const pptx = new PptxGenJS.default();
            pptJson.slides.forEach((slide) => {
                const s = pptx.addSlide();
                s.addText(slide.title, { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: '363636' });
                s.addText(slide.content, { x: 0.5, y: 1.5, fontSize: 18, color: '363636' });
            });
            pptx.writeFile({ fileName: 'generated_presentation.pptx' });
            toast.success('PPT saved and exported!');
        }).catch(error => {
            toast.error('Save failed.');
            console.error(error);
        });
    };

    const stepConfig = [
        { id: 1, icon: Upload, title: 'Upload / Select PDF' },
        { id: 2, icon: FileText, title: 'Raw PDF Extraction' },
        { id: 3, icon: Edit2, title: 'Edit Text' },
        { id: 4, icon: Zap, title: 'Meaningful Extraction Prompt' },
        { id: 5, icon: Edit2, title: 'Edit Meaningful Text' },
        { id: 6, icon: ImageIcon, title: 'Select Template' },
        { id: 7, icon: Eye, title: 'Preview & Adjust PPT' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="min-h-screen bg-[var(--bg-app)] flex flex-col font-sans"
        >
            <Toaster position="top-right" />
            <div className="flex-1 max-w-[1600px] mx-auto w-full px-6 py-12">
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl shadow-lg flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <header className="bg-[var(--bg-subtle)] border-b border-[var(--border-color)] px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FileText className="w-8 h-8 text-[var(--brand-primary)]" />
                            <div className="min-w-0">
                                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Document Converter & PPT Generator</h1>
                                <p className="text-sm text-[var(--text-secondary)]">Upload PDF, extract, generate PPT</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] text-[var(--brand-primary)] rounded-3xl hover:bg-[var(--bg-hover)]">
                                <ArrowLeft className="w-5 h-5" /> Back
                            </button>
                        </div>
                    </header>

                    <main className="flex-1 p-8 space-y-8 overflow-y-auto scrollbar-thin">
                        <nav className="flex flex-wrap gap-3">
                            {stepConfig.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => setStep(s.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-3xl font-semibold transition-all duration-200 ${step === s.id ? 'bg-[var(--brand-primary)] text-white' : 'bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}
                                >
                                    <s.icon className="w-5 h-5" /> {s.title}
                                </button>
                            ))}
                        </nav>

                        <AnimatePresence mode="wait">
                            {isLoading ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-64">
                                    <Loader2 className="w-12 h-12 animate-spin text-[var(--brand-primary)]" />
                                    <p className="mt-4 text-lg text-[var(--text-primary)]">Processing...</p>
                                </motion.div>
                            ) : (
                                <>
                                    {step === 1 && <DocumentUpload onSuccess={handleUploadSuccess} history={history} onSelectExisting={handleSelectExisting} />}
                                    {step === 2 && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-8">
                                            <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2"><FileText className="w-6 h-6 text-[var(--brand-primary)]" /> Raw PDF Extraction</h2>
                                            <p className="text-sm text-[var(--text-secondary)]">Click to convert the PDF to text using AI. This is required for further processing.</p>
                                            <button
                                                onClick={handleRawExtract}
                                                className="w-full px-4 py-3 bg-[var(--brand-primary)] text-white rounded-3xl flex items-center justify-center gap-2 hover:bg-[var(--brand-primary)]/90 transition-all duration-200"
                                            >
                                                <FileText className="w-5 h-5" /> Convert PDF to Text
                                            </button>
                                            {errorMessage && (
                                                <div className="p-4 bg-red-50 border border-red-200 rounded-3xl flex items-start gap-2">
                                                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                                                    <p className="text-sm text-red-600">{errorMessage}</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                    {step === 3 && <ExtractedTextEditor initialText={fullText} onSave={handleSaveFullText} title="Edit Full PDF Text" />}
                                    {step === 4 && <AIExtractionPanel onExtract={handleMeaningfulExtract} prompt={extractionPrompt} setPrompt={setExtractionPrompt} />}
                                    {step === 5 && <ExtractedTextEditor initialText={extractedText} onSave={handleSaveExtracted} title="Edit Meaningful Extracted Text" />}
                                    {step === 6 && <TemplateSelector onSelect={handleTemplateSelect} />}
                                    {step === 7 && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                            <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2"><Eye className="w-6 h-6 text-[var(--brand-primary)]" /> Preview & Adjust PPT</h2>
                                            <div>
                                                <label className="block text-sm text-[var(--text-secondary)] mb-2">PPT Generation Prompt (Re-generate if needed)</label>
                                                <textarea
                                                    value={pptPrompt}
                                                    onChange={e => setPptPrompt(e.target.value)}
                                                    className="w-full h-32 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl px-4 py-3 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand-primary)] resize-none"
                                                />
                                            </div>
                                            <div className="flex gap-4">
                                                <button onClick={handleGeneratePPT} className="flex-1 px-4 py-3 bg-[var(--brand-primary)] text-white rounded-3xl flex items-center justify-center gap-2 hover:bg-[var(--brand-primary)]/90 transition-all duration-200">
                                                    <Plus className="w-5 h-5" /> Generate / Re-generate PPT
                                                </button>
                                                <button onClick={handleExportPPT} disabled={!pptJson} className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-3xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all duration-200 disabled:opacity-50">
                                                    <Download className="w-5 h-5" /> Save & Export PPT
                                                </button>
                                            </div>
                                            {pptJson ? (
                                                <EditablePPTPreview pptJson={pptJson} setPptJson={setPptJson} templateStyles={cleanedJson?.templateStyles || {}} />
                                            ) : (
                                                <p className="text-center text-[var(--text-secondary)]">Generate PPT to preview and adjust.</p>
                                            )}
                                            {errorMessage && (
                                                <div className="p-4 bg-red-50 border border-red-200 rounded-3xl flex items-start gap-2">
                                                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                                                    <p className="text-sm text-red-600">{errorMessage}</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </>
                            )}
                        </AnimatePresence>
                    </main>
                </motion.div>

                {/* Convert Modal */}
                {showConvertModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1002] p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-[var(--bg-surface)] rounded-3xl p-6 w-full max-w-sm border border-[var(--border-color)] shadow-2xl"
                        >
                            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Convert PDF to Text?</h3>
                            <p className="text-sm text-[var(--text-secondary)] mb-6">Do you want to convert this PDF to full text using Grok AI? This is recommended for extraction.</p>
                            <div className="flex gap-4">
                                <button onClick={() => handleConfirmConvert(true)} className="flex-1 py-3 bg-[var(--brand-primary)] text-white rounded-3xl">Yes, Convert</button>
                                <button onClick={() => handleConfirmConvert(false)} className="flex-1 py-3 border border-[var(--border-color)] text-[var(--text-primary)] rounded-3xl">No, Skip</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 9999px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--brand-primary); }
            `}</style>
        </motion.div>
    );
};

export default DocumentConverter;