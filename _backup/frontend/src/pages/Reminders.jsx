// src/pages/Reminders.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Bell, Plus, Settings, X, Clock, Trash2, Edit, ArrowLeft, Loader2, List, Grid, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import io from 'socket.io-client';
import moment from 'moment-timezone';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const API_BASE_URL = import.meta.env.VITE_API_URL;
const SOCKET_URL = API_BASE_URL;

const Reminders = () => {
    const { user } = useOutletContext();
    const navigate = useNavigate();
    const socketRef = useRef(null);

    const [reminders, setReminders] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [selectedReminder, setSelectedReminder] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewMode, setViewMode] = useState('grid');
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        type: 'custom',
        message: '',
        targetId: '',
        targetModel: '',
        deliveryChannels: { inApp: true, email: true, push: false },
        remindAt: new Date(),
        repeatInterval: '',
        emailOverride: '',
    });

    const getAuthHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

    const fetchReminders = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data } = await axios.get(`${API_BASE_URL}/api/reminders`, { headers: getAuthHeaders() });
            setReminders(data.reminders || []);
        } catch (e) {
            if (e.response?.status !== 401) toast.error('Failed to load reminders');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchTasks = useCallback(async () => {
        try {
            const { data } = await axios.get(`${API_BASE_URL}/api/tasks/gp`, { headers: getAuthHeaders() });
            setTasks(data.tasks || []);
        } catch (e) {}
    }, []);

    // Socket
    useEffect(() => {
        if (!user || socketRef.current) return;
        const socket = io(SOCKET_URL, { auth: { token: localStorage.getItem('token') } });
        socketRef.current = socket;

        socket.on('newReminder', (rem) => setReminders(prev => [rem, ...prev]));
        socket.on('reminderUpdated', (rem) => setReminders(prev => prev.map(r => r._id === rem._id ? rem : r)));
        socket.on('reminderDeleted', (id) => setReminders(prev => prev.filter(r => r._id !== id)));

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [user]);

    useEffect(() => {
        fetchReminders();
        fetchTasks();
    }, [fetchReminders, fetchTasks]);

    // ==================== FRESH CREATE MODAL ====================
    const openCreateModal = () => {
        setFormData({
            type: 'custom',
            message: '',
            targetId: '',
            targetModel: '',
            deliveryChannels: { inApp: true, email: true, push: false },
            remindAt: new Date(),
            repeatInterval: '',
            emailOverride: '',
        });
        setShowCreate(true);
    };

    const openEdit = () => {
        if (!selectedReminder) return;
        setFormData({
            type: selectedReminder.type || 'custom',
            message: selectedReminder.message || '',
            targetId: selectedReminder.targetId || '',
            targetModel: selectedReminder.targetModel || '',
            deliveryChannels: selectedReminder.deliveryChannels || { inApp: true, email: true, push: false },
            remindAt: new Date(selectedReminder.remindAt),
            repeatInterval: selectedReminder.repeatInterval || '',
            emailOverride: selectedReminder.emailOverride || '',
        });
        setIsEditing(true);
    };

    const closeModal = () => {
        setShowCreate(false);
        setShowDetails(false);
        setIsEditing(false);
        setSelectedReminder(null);
    };

    // Create handler
    const handleCreate = async () => {
        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                targetModel: formData.targetId ? 'Task' : null,
                repeatInterval: formData.repeatInterval ? parseInt(formData.repeatInterval) : null,
            };
            await axios.post(`${API_BASE_URL}/api/reminders`, payload, { headers: getAuthHeaders() });
            toast.success('Reminder created successfully!');
            closeModal();
            await fetchReminders();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to create reminder');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Update handler
    const handleUpdate = async () => {
        if (!selectedReminder) return;
        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                targetModel: formData.targetId ? 'Task' : null,
                repeatInterval: formData.repeatInterval ? parseInt(formData.repeatInterval) : null,
            };
            const { data } = await axios.put(`${API_BASE_URL}/api/reminders/${selectedReminder._id}`, payload, { headers: getAuthHeaders() });
            toast.success('Reminder updated successfully!');
            await fetchReminders();
            closeModal();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to update reminder');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedReminder) return;
        if (!window.confirm('Delete this reminder permanently?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/reminders/${selectedReminder._id}`, { headers: getAuthHeaders() });
            toast.success('Reminder deleted');
            closeModal();
            await fetchReminders();
        } catch (e) {
            toast.error('Failed to delete reminder');
        }
    };

    const handleSnooze = async (id, minutes = 60) => {
        try {
            await axios.put(`${API_BASE_URL}/api/reminders/${id}/snooze`, { snoozeMinutes: minutes }, { headers: getAuthHeaders() });
            toast.success(`Snoozed for ${minutes} minutes`);
            await fetchReminders();
        } catch (e) {
            toast.error('Failed to snooze');
        }
    };

    const handleDismiss = async (id) => {
        try {
            await axios.put(`${API_BASE_URL}/api/reminders/${id}/dismiss`, {}, { headers: getAuthHeaders() });
            toast.success('Reminder dismissed');
            await fetchReminders();
        } catch (e) {
            toast.error('Failed to dismiss');
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[var(--bg-app)] font-sans">
            <Toaster position="bottom-right" />

            <header className="bg-[var(--bg-surface)] border-b border-[var(--border-color)] px-6 py-4 sticky top-0 z-20">
                <div className="max-w-[1600px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Bell className="w-8 h-8 text-[var(--brand-primary)]" />
                        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Reminders</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={openCreateModal} className="px-6 py-3 bg-[var(--brand-primary)] text-white rounded-3xl flex items-center gap-2 hover:bg-[var(--brand-primary)]/90">
                            <Plus className="w-5 h-5" /> Create Reminder
                        </button>
                        <button onClick={() => navigate('/')} className="flex items-center gap-2 px-6 py-3 border border-[var(--border-color)] text-[var(--brand-primary)] rounded-3xl hover:bg-[var(--bg-hover)]">
                            <ArrowLeft className="w-5 h-5" /> Dashboard
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-[1600px] mx-auto px-6 py-8">
                <div className="flex gap-2 mb-6">
                    <button onClick={() => setViewMode('grid')} className={`p-3 rounded-3xl ${viewMode === 'grid' ? 'bg-[var(--brand-light)] text-[var(--brand-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}>
                        <Grid className="w-5 h-5" />
                    </button>
                    <button onClick={() => setViewMode('list')} className={`p-3 rounded-3xl ${viewMode === 'list' ? 'bg-[var(--brand-light)] text-[var(--brand-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}>
                        <List className="w-5 h-5" />
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[var(--brand-primary)]" /></div>
                ) : reminders.length === 0 ? (
                    <div className="text-center py-20 text-[var(--text-secondary)]">No reminders yet. Create your first one!</div>
                ) : (
                    <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                        {reminders.map(rem => (
                            <motion.div
                                key={rem._id}
                                onClick={() => { setSelectedReminder(rem); setShowDetails(true); setIsEditing(false); }}
                                className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-5 hover:border-[var(--brand-primary)] cursor-pointer transition-all"
                            >
                                <div className="flex justify-between items-start">
                                    <Bell className="w-6 h-6 text-[var(--brand-primary)]" />
                                </div>
                                <p className="mt-3 font-medium line-clamp-2">{rem.message}</p>
                                <p className="text-xs text-[var(--text-secondary)] mt-2">
                                    {moment(rem.remindAt).tz('Africa/Lagos').format('MMM D, YYYY • h:mm A')}
                                </p>
                                {rem.isUserCreated && <span className="inline-block mt-2 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Custom</span>}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* ==================== CREATE / EDIT MODAL (shared) ==================== */}
            <AnimatePresence>
                {(showCreate || (showDetails && isEditing)) && (
                    <motion.div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]" onClick={closeModal}>
                        <motion.div className="bg-[var(--bg-surface)] rounded-3xl p-8 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                            <h2 className="text-2xl font-semibold mb-6">{showCreate ? 'Create New Reminder' : 'Edit Reminder'}</h2>

                            <div className="space-y-6">
                                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full p-3 border border-[var(--border-color)] rounded-3xl">
                                    <option value="custom">Custom Reminder</option>
                                    <option value="task_due">Task Due</option>
                                    <option value="goal_deadline">Goal Deadline</option>
                                </select>

                                {formData.type !== 'custom' && (
                                    <select value={formData.targetId} onChange={e => setFormData({ ...formData, targetId: e.target.value })} className="w-full p-3 border border-[var(--border-color)] rounded-3xl">
                                        <option value="">Select linked task/goal</option>
                                        {tasks.map(t => <option key={t._id} value={t._id}>{t.title}</option>)}
                                    </select>
                                )}

                                <input placeholder="Reminder message" value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} className="w-full p-3 border border-[var(--border-color)] rounded-3xl" />

                                <div>
                                    <label className="block text-sm mb-1 text-[var(--text-secondary)]">Remind at</label>
                                    <DatePicker selected={formData.remindAt} onChange={date => setFormData({ ...formData, remindAt: date })} showTimeSelect dateFormat="Pp" className="w-full p-3 border border-[var(--border-color)] rounded-3xl" />
                                </div>

                                <div>
                                    <label className="block text-sm mb-1 text-[var(--text-secondary)]">Repeat every (minutes, optional)</label>
                                    <input type="number" placeholder="e.g. 60" value={formData.repeatInterval} onChange={e => setFormData({ ...formData, repeatInterval: e.target.value })} className="w-full p-3 border border-[var(--border-color)] rounded-3xl" />
                                </div>

                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <label className="flex items-center gap-2"><input type="checkbox" checked={formData.deliveryChannels.inApp} onChange={e => setFormData({ ...formData, deliveryChannels: { ...formData.deliveryChannels, inApp: e.target.checked } })} /> In-App</label>
                                    <label className="flex items-center gap-2"><input type="checkbox" checked={formData.deliveryChannels.email} onChange={e => setFormData({ ...formData, deliveryChannels: { ...formData.deliveryChannels, email: e.target.checked } })} /> Email</label>
                                    <label className="flex items-center gap-2"><input type="checkbox" checked={formData.deliveryChannels.push} onChange={e => setFormData({ ...formData, deliveryChannels: { ...formData.deliveryChannels, push: e.target.checked } })} /> Push</label>
                                </div>

                                <div className="flex gap-3">
                                    <button onClick={closeModal} className="flex-1 py-3 border border-[var(--border-color)] rounded-3xl">Cancel</button>
                                    <button onClick={showCreate ? handleCreate : handleUpdate} disabled={isSubmitting} className="flex-1 py-3 bg-[var(--brand-primary)] text-white rounded-3xl disabled:opacity-50">
                                        {isSubmitting ? 'Saving...' : (showCreate ? 'Create Reminder' : 'Save Changes')}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* View Details Modal */}
            <AnimatePresence>
                {showDetails && selectedReminder && !isEditing && (
                    <motion.div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]" onClick={closeModal}>
                        <motion.div className="bg-[var(--bg-surface)] rounded-3xl p-8 w-full max-w-lg relative" onClick={e => e.stopPropagation()}>
                            <button onClick={closeModal} className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                                <X className="w-6 h-6" />
                            </button>

                            <h2 className="text-2xl font-semibold mb-4">Reminder Details</h2>
                            <p className="text-lg leading-relaxed">{selectedReminder.message}</p>
                            <p className="text-sm text-[var(--text-secondary)] mt-6">
                                {moment(selectedReminder.remindAt).tz('Africa/Lagos').format('dddd, MMMM D, YYYY • h:mm A')}
                            </p>

                            <div className="flex gap-3 mt-8">
                                <button onClick={openEdit} className="flex-1 py-3 bg-[var(--brand-primary)] text-white rounded-3xl flex items-center justify-center gap-2">
                                    <Edit className="w-4 h-4" /> Edit
                                </button>
                                <button onClick={handleDelete} className="flex-1 py-3 bg-red-500 text-white rounded-3xl flex items-center justify-center gap-2">
                                    <Trash2 className="w-4 h-4" /> Delete
                                </button>
                            </div>

                            <div className="flex gap-3 mt-3">
                                <button onClick={() => handleSnooze(selectedReminder._id, 60)} className="flex-1 py-3 border border-[var(--border-color)] rounded-3xl">Snooze 1 hour</button>
                                <button onClick={() => handleDismiss(selectedReminder._id)} className="flex-1 py-3 border border-[var(--border-color)] text-red-600 rounded-3xl">Dismiss</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Reminders;