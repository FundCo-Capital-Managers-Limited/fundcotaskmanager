// src/layouts/Layout.jsx
import React, { useCallback, useEffect, useState, useRef } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { MessageCircle, X, Trash2, StickyNote, Minus, Send } from 'lucide-react';
import axios from 'axios';
import { Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL;
const NAV_H   = 56; // matches h-14

const Layout = ({ onLogout, user: initialUser }) => {
  const [user,         setUser]         = useState(initialUser);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return false;
    return localStorage.getItem('sidebarExpanded') !== 'false';
  });
  const [tasks,        setTasks]        = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [error,        setError]        = useState(null);
  const [isChatOpen,   setIsChatOpen]   = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput,    setChatInput]    = useState('');
  const [isChatLoading,setIsChatLoading]= useState(false);
  const [isNoteOpen,   setIsNoteOpen]   = useState(false);
  const [noteContent,  setNoteContent]  = useState('');

  const chatEndRef    = useRef(null);
  const chatInputRef  = useRef(null);
  const noteModalRef  = useRef(null);

  useEffect(() => {
    localStorage.setItem('sidebarExpanded', isSidebarExpanded);
  }, [isSidebarExpanded]);

  /* ── User ──────────────────────────────────────────────────────────────── */
  const fetchCurrentUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const { data } = await axios.get(`${API_URL}/api/user/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) setUser(data.user);
    } catch {}
  }, []);
  useEffect(() => { fetchCurrentUser(); }, [fetchCurrentUser]);

  /* ── Tasks ─────────────────────────────────────────────────────────────── */
  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token');
      const { data } = await axios.get(`${API_URL}/api/tasks/gp`, { headers: { Authorization: `Bearer ${token}` } });
      const arr = Array.isArray(data) ? data : Array.isArray(data?.tasks) ? data.tasks : Array.isArray(data?.data) ? data.data : [];
      setTasks(arr);
      return true;
    } catch (err) {
      setError(err.message || 'Could not load tasks.');
      if (err.response?.status === 401) onLogout();
      return false;
    } finally {
      setTasksLoading(false);
    }
  }, [onLogout]);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !API_URL) return undefined;

    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    const getTaskId = (task) => String(task?._id || task?.id || '');

    const upsertTask = (incomingTask) => {
      const nextId = getTaskId(incomingTask);
      if (!nextId) return;

      setTasks((prev) => {
        const index = prev.findIndex((task) => getTaskId(task) === nextId);
        if (index === -1) return [incomingTask, ...prev];
        const next = [...prev];
        next[index] = { ...next[index], ...incomingTask };
        return next;
      });
    };

    const removeTask = (taskId) => {
      const targetId = String(taskId || '');
      if (!targetId) return;
      setTasks((prev) => prev.filter((task) => getTaskId(task) !== targetId));
    };

    const handleTaskReviewed = ({ taskId, status }) => {
      if (!taskId || !status) return;
      setTasks((prev) => prev.map((task) => (
        getTaskId(task) === String(taskId)
          ? { ...task, submissionStatus: status }
          : task
      )));
    };

    socket.on('newTask', upsertTask);
    socket.on('updateTask', upsertTask);
    socket.on('deleteTask', removeTask);
    socket.on('taskReviewed', handleTaskReviewed);

    return () => {
      socket.off('newTask', upsertTask);
      socket.off('updateTask', upsertTask);
      socket.off('deleteTask', removeTask);
      socket.off('taskReviewed', handleTaskReviewed);
      socket.disconnect();
    };
  }, []);

  /* ── Chat ──────────────────────────────────────────────────────────────── */
  const fetchChatHistory = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const { data } = await axios.get(`${API_URL}/api/bot/chat/history`, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) setChatMessages(data.messages || []);
    } catch {}
  }, []);

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;
    const msg = chatInput.trim();
    setChatMessages((p) => [...p, { text: msg, sender: 'user', timestamp: new Date().toISOString() }]);
    setChatInput('');
    setIsChatLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(`${API_URL}/api/bot/chat`, { message: msg }, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) {
        setChatMessages((p) => [...p, ...data.messages.filter((m) => m.sender === 'bot')]);
        if (data.messages.some((m) => /created|updated|deleted/.test(m.text))) fetchTasks();
      }
    } catch {
      setChatMessages((p) => [...p, { text: "Sorry, I couldn't respond. Please try again.", sender: 'bot', timestamp: new Date().toISOString() }]);
    } finally {
      setIsChatLoading(false);
      chatInputRef.current?.focus();
    }
  };

  const clearChat = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/bot/chat`, { headers: { Authorization: `Bearer ${token}` } });
      setChatMessages([]);
    } catch {}
  }, []);

  const toggleChat = () => {
    setIsChatOpen((p) => { if (!p) fetchChatHistory(); return !p; });
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen]);

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape' && isNoteOpen) setIsNoteOpen(false); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [isNoteOpen]);

  const sidebarW = typeof window !== 'undefined' && window.innerWidth >= 1024
    ? (isSidebarExpanded ? 240 : 64)
    : 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-app)' }}>
      <Sidebar user={user} isExpanded={isSidebarExpanded} onToggle={() => setIsSidebarExpanded((p) => !p)} />

      {/* Main column */}
      <div
        className="flex flex-col min-h-screen transition-[margin] duration-300"
        style={{ marginLeft: sidebarW }}
      >
        <Navbar user={user} onLogout={onLogout} />

        <main className="flex-1 px-4 sm:px-6 pb-24" style={{ paddingTop: NAV_H + 24 }}>
          <div className="max-w-screen-2xl mx-auto">
            <Outlet context={{ user, tasks, tasksLoading, fetchTasks, error, onLogout }} />
          </div>
        </main>
      </div>

      {/* ── Sticky Note Modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {isNoteOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-[1001] p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
            onClick={(e) => { if (noteModalRef.current && !noteModalRef.current.contains(e.target)) setIsNoteOpen(false); }}
          >
            <motion.div
              ref={noteModalRef}
              initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              style={{ backgroundColor: 'var(--bg-surface)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2">
                  <StickyNote className="w-4 h-4" style={{ color: '#f59e0b' }} />
                  <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Quick Note</span>
                  <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>(not saved)</span>
                </div>
                <button onClick={() => setIsNoteOpen(false)} className="p-1" style={{ color: 'var(--text-muted)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5">
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Write a quick note…"
                  className="w-full h-40 text-sm focus:outline-none resize-none leading-relaxed bg-transparent"
                  style={{ color: 'var(--text-primary)' }}
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <button
                  onClick={() => setNoteContent('')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear
                </button>
                <button
                  onClick={() => setIsNoteOpen(false)}
                  className="flex items-center gap-1.5 text-xs font-bold text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  <Minus className="w-3.5 h-3.5" /> Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Chat Panel ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed bottom-0 right-0 mt-20 w-full sm:w-96 flex flex-col shadow-2xl z-[1000] border-l"
            style={{
              top: NAV_H,
              height: `calc(100vh - ${NAV_H}px)`,
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
            }}
          >
            {/* Chat header */}
            <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
              style={{ backgroundColor: 'var(--brand-primary)' }}>
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                <span className="font-bold text-white text-sm">TM Assistant</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={clearChat} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors" title="Clear">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={toggleChat} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ backgroundColor: 'var(--bg-subtle)' }}>
              {chatMessages.length === 0 && (
                <div className="text-center py-10">
                  <MessageCircle className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--brand-primary)', opacity: 0.3 }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>TM Assistant</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    Ask me to create, update,<br />or manage your tasks
                  </p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                    style={msg.sender === 'user'
                      ? { backgroundColor: 'var(--brand-primary)', color: '#fff', borderBottomRightRadius: 4 }
                      : { backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderBottomLeftRadius: 4 }
                    }
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl border"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                    <div className="flex gap-1.5">
                      {[0,1,2].map((i) => (
                        <span key={i} className="w-2 h-2 rounded-full animate-bounce"
                          style={{ backgroundColor: 'var(--brand-primary)', animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleChatSubmit}
              className="flex items-center gap-2 px-4 py-3 border-t flex-shrink-0"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <input
                ref={chatInputRef}
                type="text" value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask anything…"
                className="flex-1 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none border transition-colors"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--input-border)',
                }}
              />
              <button type="submit" disabled={isChatLoading || !chatInput.trim()}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-white disabled:opacity-40 hover:opacity-90 transition-opacity flex-shrink-0"
                style={{ backgroundColor: 'var(--brand-primary)' }}>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FABs ──────────────────────────────────────────────────────────── */}
      <button
        onClick={() => setIsNoteOpen(true)}
        className="fixed bottom-20 right-6 sm:bottom-6 sm:right-20 w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all z-[999]"
        style={{ backgroundColor: 'var(--brand-accent)' }}
        title="Quick Note"
      >
        <StickyNote className="w-4 h-4" />
      </button>

      {!isChatOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-6 right-6 w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all z-[999]"
          style={{ backgroundColor: 'var(--brand-primary)' }}
          title="Open Assistant"
        >
          <MessageCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default Layout;