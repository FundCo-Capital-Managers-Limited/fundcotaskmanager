// src/pages/Feedback.jsx
import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { Send, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Feedback = () => {
    const { user } = useOutletContext();
    const navigate = useNavigate();
    const [category, setCategory] = useState('');
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!category || !feedback.trim()) {
            return toast.error('Please complete all fields');
        }
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/feedback/submit`, { category, feedback }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Thank you for your feedback!');
            setCategory('');
            setFeedback('');
        } catch (err) {
            toast.error('Failed to submit feedback');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[var(--bg-app)] flex flex-col font-sans">
            <Toaster position="bottom-right" />
            <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl shadow-xl overflow-hidden">
                    <header className="border-b border-[var(--border-color)] px-8 py-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Send className="w-7 h-7 text-[var(--brand-primary)]" />
                            <div>
                                <h1 className="text-2xl font-bold text-[var(--text-primary)]">App Feedback</h1>
                                <p className="text-sm text-[var(--brand-primary)]">Help us improve</p>
                            </div>
                        </div>
                        <button onClick={() => navigate('/')} className="flex items-center gap-2 px-5 py-2.5 border border-[var(--border-color)] text-[var(--brand-primary)] rounded-3xl hover:bg-[var(--bg-hover)]">
                            <ArrowLeft className="w-5 h-5" /> Dashboard
                        </button>
                    </header>
                    <main className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-2">What is your feedback about?</label>
                                <select
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    className="w-full p-4 border border-[var(--border-color)] rounded-3xl text-[var(--text-primary)] bg-[var(--bg-surface)]"
                                >
                                    <option value="">Select a category</option>
                                    <option value="Feature Request">Feature Request</option>
                                    <option value="Bug Report">Bug Report</option>
                                    <option value="Usability Issue">Usability Issue</option>
                                    <option value="General Feedback">General Feedback</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-2">Your feedback</label>
                                <textarea
                                    value={feedback}
                                    onChange={e => setFeedback(e.target.value)}
                                    placeholder="Describe your experience, suggestions, or issues in detail..."
                                    className="w-full h-40 p-6 border border-[var(--border-color)] rounded-3xl text-[var(--text-primary)] bg-[var(--bg-surface)] resize-y"
                                    disabled={isSubmitting}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting || !category || !feedback.trim()}
                                className="w-full py-4 bg-[var(--brand-primary)] text-white rounded-3xl font-semibold flex items-center justify-center gap-3 hover:bg-[var(--brand-primary)]/90 disabled:opacity-50"
                            >
                                <Send className="w-5 h-5" />
                                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                            </button>
                        </form>
                    </main>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default Feedback;