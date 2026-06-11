// src/components/Sidebar.jsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  List, CheckCircle, Menu, Info, X, LayoutDashboard, Clock,
  Calendar, MessageSquare, File, FileText, CreditCard, Sparkles,
  AlertCircle, Bell, Target, Award, Video, BookOpen, Instagram,
  ChevronRight, ChevronLeft,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import axios from 'axios';
import { useNotifications } from '../context/NotificationContext.jsx';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';
const UNREAD_POSTS_KEY = 'socialFeedUnreadCount';

const Sidebar = ({ user, isExpanded, onToggle }) => {
  const [mobileOpen,        setMobileOpen]        = useState(false);
  const [chatUnreadTotal,   setChatUnreadTotal]   = useState(0);
  const [socialUnreadTotal, setSocialUnreadTotal] = useState(() => {
    const s = localStorage.getItem(UNREAD_POSTS_KEY);
    return s ? parseInt(s, 10) : 0;
  });

  const fullName = user?.fullName || user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';
  const { counts } = useNotifications();
  const initial  = (user?.firstName || user?.name || 'U').charAt(0).toUpperCase();
  const chatBadge = Math.max(chatUnreadTotal, counts.chat || 0);
  const socialBadge = Math.max(socialUnreadTotal, counts.social || 0);
  const taskBadge = counts.tasks || 0;
  const reminderBadge = counts.reminders || 0;
  const meetingBadge = counts.meetings || 0;

  /* ── Fetch unread counts ─────────────────────────────────────────────── */
  const fetchUnreadTotal = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !user) return;
      const res = await axios.get(`${API_BASE_URL}/api/chats/unread-counts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        const total = Object.values(res.data.counts || {}).reduce((s, n) => s + n, 0);
        setChatUnreadTotal(total);
      }
    } catch {}
  }, [user]);

  useEffect(() => { fetchUnreadTotal(); }, [fetchUnreadTotal]);
  useEffect(() => {
    const fn = () => fetchUnreadTotal();
    window.addEventListener('focus', fn);
    return () => window.removeEventListener('focus', fn);
  }, [fetchUnreadTotal]);

  useEffect(() => {
    const fn = (e) => setChatUnreadTotal(e.detail?.total ?? 0);
    window.addEventListener('chatUnreadUpdate', fn);
    return () => window.removeEventListener('chatUnreadUpdate', fn);
  }, []);

  useEffect(() => {
    const fn = (e) => setSocialUnreadTotal(e.detail?.total ?? 0);
    const focus = () => {
      const s = localStorage.getItem(UNREAD_POSTS_KEY);
      setSocialUnreadTotal(s ? parseInt(s, 10) : 0);
    };
    window.addEventListener('socialFeedUnreadUpdate', fn);
    window.addEventListener('focus', focus);
    return () => { 
      window.removeEventListener('socialFeedUnreadUpdate', fn); 
      window.removeEventListener('focus', focus); 
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const menuItems = [
    { text: 'Dashboard',      path: '/',                   icon: LayoutDashboard },
    { text: 'Pending Tasks',  path: '/pending',            icon: List },
    { text: 'Assigned', path: '/assigned',           icon: AlertCircle,     badge: taskBadge },
    { text: 'Completed',      path: '/complete',           icon: CheckCircle },
    { text: 'Analytics',       path: '/analytics',           icon: Calendar },
    { text: 'Calendar',       path: '/calendar',           icon: Calendar },
    { text: 'Goals',          path: '/goals',              icon: Target },
    { text: 'Reminders',      path: '/reminders',          icon: Bell,           badge: reminderBadge },
    { text: 'Team Chat',      path: '/team-chat',          icon: MessageSquare,  badge: chatBadge },
    { text: 'Meeting',        path: '/meetroom',           icon: Video,          badge: meetingBadge },
    { text: 'Social Feed',    path: '/social-feed',        icon: Instagram,      badge: socialBadge },
    { text: 'AI Tools',       path: '/ai-tools',           icon: Sparkles },
    { text: 'File Storage',   path: '/file-storage',       icon: File },
    { text: 'Reports',        path: '/reports',            icon: FileText },
    { text: 'Performance',    path: '/performance',        icon: CreditCard },
    { text: 'Deck Prep',      path: '/document-converter', icon: FileText },
    { text: 'Training',       path: '/training',           icon: BookOpen },
    { text: 'Feedback',       path: '/feedback',           icon: BookOpen },
  ];

  /* ── Single nav item ─────────────────────────────────────────────────── */
  const NavItem = ({ item, isMobile = false }) => {
    const { text, path, icon: Icon, badge } = item;
    const show = isExpanded || isMobile;
    return (
      <li>
        <NavLink
          to={path}
          title={!show ? text : undefined}
          onClick={() => isMobile && setMobileOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-all relative group
            ${show ? 'px-3' : 'px-2 justify-center'}
            ${isActive ? 'sidebar-active' : 'sidebar-item'}`
          }
          style={({ isActive }) => isActive
            ? { backgroundColor: 'var(--brand-primary)', color: '#ffffff' }
            : { color: 'var(--text-secondary)' }
          }
        >
          {({ isActive }) => (
            <>
              {/* Icon wrapper */}
              <span className={`relative flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-colors
                ${isActive ? 'text-white' : ''}`}
                style={!isActive ? { backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' } : { backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <Icon className="w-4 h-4" />
                {/* Collapsed badge dot */}
                {!show && badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              {show && (
                <>
                  <span className="flex-1 truncate">{text}</span>
                  {badge > 0 && (
                    <span className="ml-auto min-w-[20px] h-5 px-1.5 bg-green-500 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </>
              )}
              {/* Tooltip on collapsed */}
              {!show && (
                <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: 'var(--brand-primary)' }}>
                  {text}
                </span>
              )}
            </>
          )}
        </NavLink>
      </li>
    );
  };

  /* ── User avatar block ───────────────────────────────────────────────── */
  const UserBlock = ({ expanded }) => (
    <div className={`flex ${expanded ? 'items-center gap-3 px-3' : 'justify-center'} py-3 mb-2`}>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
        style={{ backgroundColor: 'var(--brand-primary)' }}
      >
        {initial}
      </div>
      {expanded && (
        <div className="min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
            {fullName.split(' ')[0]}
          </p>
          <p className="text-xs flex items-center gap-1" style={{ color: 'var(--brand-accent)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            Active
          </p>
        </div>
      )}
    </div>
  );

  /* ── Quick Tip ───────────────────────────────────────────────────────── */
  const QuickTip = () => (
    <div className="mx-3 mt-4 p-3 rounded-xl border" style={{ backgroundColor: 'var(--brand-light)', borderColor: 'var(--border-color)' }}>
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--brand-primary)' }} />
        <div>
          <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--brand-primary)' }}>Quick Tip</p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Tackle high-priority tasks first.</p>
          <a href="https://fundco.ng" target="_blank" rel="noopener noreferrer"
            className="text-xs font-semibold mt-1 inline-block hover:underline"
            style={{ color: 'var(--brand-accent)' }}>Learn More →</a>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop Sidebar ────────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col fixed top-14 left-0 z-40 transition-[width] duration-300 overflow-hidden"
        style={{
          width: isExpanded ? 240 : 64,
          height: 'calc(100vh - 56px)',
          backgroundColor: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-border)',
        }}
      >
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3" style={{ scrollbarWidth: 'thin' }}>
          <UserBlock expanded={isExpanded} />
          {isExpanded && (
            <p className="px-4 text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
              Navigation
            </p>
          )}
          <ul className={`space-y-0.5 ${isExpanded ? 'px-2' : 'px-2'}`}>
            {menuItems.map((item) => <NavItem key={item.text} item={item} />)}
          </ul>
          {isExpanded && <QuickTip />}
        </div>
        {/* Toggle button — pinned at bottom */}
        <button
          onClick={onToggle}
          className="flex items-center justify-center flex-shrink-0 h-10 border-t transition-colors"
          style={{
            borderColor: 'var(--sidebar-border)',
            color: 'var(--text-muted)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isExpanded
            ? <><ChevronLeft className="w-4 h-4" /><span className="text-xs font-medium ml-1">Collapse</span></>
            : <ChevronRight className="w-4 h-4" />
          }
        </button>
      </aside>

      {/* ── Mobile hamburger ───────────────────────────────────────────── */}
      {!mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden fixed top-3.5 left-4 z-[65] p-2 rounded-xl border shadow-sm transition-colors"
          style={{
            backgroundColor: 'var(--brand-primary)',
            borderColor: 'transparent',
            color: '#fff',
          }}
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
          {chatUnreadTotal > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {chatUnreadTotal > 9 ? '9+' : chatUnreadTotal}
            </span>
          )}
        </button>
      )}

      {/* ── Mobile Drawer ──────────────────────────────────────────────── */}
      <div
        className={`lg:hidden fixed inset-0 z-[64] transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
        {/* Drawer */}
        <div
          className={`absolute top-0 left-0 w-72 h-full flex flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
          style={{ backgroundColor: 'var(--sidebar-bg)' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-4 border-b flex-shrink-0"
            style={{ borderColor: 'var(--sidebar-border)', backgroundColor: 'var(--brand-primary)' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                {initial}
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">{fullName.split(' ')[0]}</p>
                <p className="text-xs text-white/50">Active now</p>
              </div>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Nav items */}
          <div className="flex-1 overflow-y-auto py-3 px-2">
            <ul className="space-y-0.5">
              {menuItems.map((item) => <NavItem key={item.text} item={item} isMobile />)}
            </ul>
            <QuickTip />
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;