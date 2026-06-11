// src/components/EditablePPTPreview.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Save, ChevronLeft, ChevronRight, X } from 'lucide-react';
import toast from 'react-hot-toast';

const EditablePPTPreview = ({ pptJson, setPptJson, templateStyles }) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [editingSlide, setEditingSlide] = useState(null);
    const [tempTitle, setTempTitle] = useState('');
    const [tempContent, setTempContent] = useState('');

    const slideStyle = {
        backgroundColor: templateStyles?.colors?.background || 'var(--bg-surface)',
        color: templateStyles?.colors?.text || 'var(--text-primary)',
        fontFamily: templateStyles?.fonts?.body || 'system-ui',
    };

    const startEdit = (index) => {
        setEditingSlide(index);
        setTempTitle(pptJson.slides[index].title);
        setTempContent(pptJson.slides[index].content);
        setCurrentSlide(index);
    };

    const saveEdit = () => {
        const newSlides = [...pptJson.slides];
        newSlides[editingSlide].title = tempTitle;
        newSlides[editingSlide].content = tempContent;
        setPptJson({ ...pptJson, slides: newSlides });
        setEditingSlide(null);
        toast.success('Slide updated successfully!');
    };

    const cancelEdit = () => {
        setEditingSlide(null);
    };

    const prevSlide = () => setCurrentSlide(prev => Math.max(0, prev - 1));
    const nextSlide = () => setCurrentSlide(prev => Math.min(pptJson.slides.length - 1, prev + 1));

    if (!pptJson || !pptJson.slides || pptJson.slides.length === 0) {
        return <p className="text-center text-[var(--text-secondary)]">No slides available. Please extract or generate first.</p>;
    }

    return (
        <motion.div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2"><Eye className="w-5 h-5 text-[var(--brand-primary)]" /> Editable Slides Preview (Template Applied)</h3>
            <div className="relative bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-6 min-h-[400px] flex items-center justify-center shadow-sm" style={slideStyle}>
                <motion.div key={currentSlide} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="w-full text-center space-y-4">
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Title</label>
                        <input
                            value={editingSlide === currentSlide ? tempTitle : pptJson.slides[currentSlide].title}
                            onChange={e => editingSlide === currentSlide ? setTempTitle(e.target.value) : null}
                            disabled={editingSlide !== currentSlide}
                            className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl px-4 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand-primary)] disabled:opacity-70"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Content</label>
                        <textarea
                            value={editingSlide === currentSlide ? tempContent : pptJson.slides[currentSlide].content}
                            onChange={e => editingSlide === currentSlide ? setTempContent(e.target.value) : null}
                            disabled={editingSlide !== currentSlide}
                            className="w-full h-48 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl px-4 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand-primary)] disabled:opacity-70 resize-none"
                        />
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">Layout: {pptJson.slides[currentSlide].layout}</p>
                    {editingSlide === currentSlide ? (
                        <div className="flex gap-2">
                            <button onClick={saveEdit} className="flex-1 py-2 bg-emerald-600 text-white rounded-3xl flex items-center justify-center gap-1">Save</button>
                            <button onClick={cancelEdit} className="flex-1 py-2 bg-red-500 text-white rounded-3xl flex items-center justify-center gap-1">Cancel</button>
                        </div>
                    ) : (
                        <button onClick={() => startEdit(currentSlide)} className="w-full py-2 bg-[var(--brand-primary)] text-white rounded-3xl flex items-center justify-center gap-1">Edit This Slide</button>
                    )}
                </motion.div>

                <div className="absolute bottom-4 left-0 right-0 flex justify-between px-8">
                    <button onClick={prevSlide} disabled={currentSlide === 0 || editingSlide !== null} className="p-2 rounded-2xl hover:bg-[var(--bg-hover)] disabled:opacity-50">
                        <ChevronLeft className="w-6 h-6 text-[var(--brand-primary)]" />
                    </button>
                    <span className="text-sm font-medium text-[var(--text-primary)]">Slide {currentSlide + 1} / {pptJson.slides.length}</span>
                    <button onClick={nextSlide} disabled={currentSlide === pptJson.slides.length - 1 || editingSlide !== null} className="p-2 rounded-2xl hover:bg-[var(--bg-hover)] disabled:opacity-50">
                        <ChevronRight className="w-6 h-6 text-[var(--brand-primary)]" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default EditablePPTPreview;