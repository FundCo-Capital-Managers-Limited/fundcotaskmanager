import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ChevronDown, ExternalLink, LogOut, Mail, Menu, Moon, RefreshCw, Settings, Sun, X } from 'lucide-react';
import { ThemeContext } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext.jsx';

const toneStyles = {
  chat: { bg: 'rgba(54,169,225,0.12)', color: '#36a9e1' },
  secondary: { bg: 'rgba(49,39,131,0.08)', color: 'var(--brand-primary)' },
  warning: { bg: 'rgba(245,158,11,0.12)', color: '#c98512' },
  info: { bg: 'rgba(14,165,233,0.12)', color: '#0284c7' },
  brand: { bg: 'rgba(49,39,131,0.12)', color: 'var(--brand-primary)' },
  success: { bg: 'rgba(15,159,110,0.12)', color: '#0f9f6e' },
  neutral: { bg: 'var(--bg-subtle)', color: 'var(--text-secondary)' },
};

const emailLinks = [
  { name: 'Outlook', href: 'https://outlook.live.com', color: '#0078d4' },
  { name: 'Gmail', href: 'https://mail.google.com', color: '#ea4335' },
  { name: 'Yahoo Mail', href: 'https://mail.yahoo.com', color: '#6001d2' },
];

const formatUpdatedAt = (value) => {
  if (!value) return 'Not refreshed yet';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not refreshed yet';
  return `Updated ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const formatRelative = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const NotificationDropdown = ({ items, total, loading, lastUpdated, onRefresh, onMarkAll, onSelect }) => (
  <div className="absolute right-0 top-[calc(100%+0.65rem)] z-50 w-[min(26rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border shadow-2xl" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
    <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--border-color)' }}>
      <div>
        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Notifications</p>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{formatUpdatedAt(lastUpdated)}</p>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" onClick={onRefresh} className="h-9 w-9 rounded-xl transition-colors hover:bg-[var(--bg-hover)]" aria-label="Refresh notifications">
          <RefreshCw className={`mx-auto h-4 w-4 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <button type="button" onClick={onMarkAll} className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-colors hover:bg-[var(--bg-hover)]" style={{ color: 'var(--brand-primary)' }}>
          <CheckCheck className="h-4 w-4" />
          Mark all
        </button>
      </div>
    </div>
    <div className="max-h-[26rem] overflow-y-auto py-2">
      {loading && items.length === 0 ? <div className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>Loading notifications...</div> : null}
      {!loading && items.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>All caught up</p>
          <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-muted)' }}>Task updates, reminders, team chat, meetings, and social activity will show up here.</p>
        </div>
      ) : null}
      {items.map((item) => {
        const tone = toneStyles[item.tone] || toneStyles.neutral;
        return (
          <button key={item.id} type="button" onClick={() => onSelect(item)} className="mx-2 flex w-[calc(100%-1rem)] items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold" style={{ backgroundColor: tone.bg, color: tone.color }}>
              {(item.type || 'N').slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
                {!item.isRead ? <span className="h-2 w-2 rounded-full bg-[var(--brand-accent)]" /> : null}
              </span>
              {item.description ? <span className="mt-1 block text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>{item.description}</span> : null}
              <span className="mt-1 block text-[11px]" style={{ color: 'var(--text-muted)' }}>{formatRelative(item.createdAt)}</span>
            </span>
          </button>
        );
      })}
    </div>
    <div className="border-t px-4 py-3 text-xs" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
      {total > 0 ? `${total} items need attention` : 'No unread notifications'}
    </div>
  </div>
);

const Navbar = ({ user = {}, onLogout }) => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const { items, counts, loading, lastUpdated, refresh, markRead, markAllRead, markTypeRead } = useNotifications();
  const dropdownRef = useRef(null);
  const mobileRef = useRef(null);
  const notificationRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const fullName = user?.fullName || user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';
  const initial = (user?.firstName || user?.name || 'U').charAt(0).toUpperCase();
  const total = counts?.total || 0;

  useEffect(() => {
    const closeMenus = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setDropdownOpen(false);
      if (mobileRef.current && !mobileRef.current.contains(event.target)) setMobileOpen(false);
      if (notificationRef.current && !notificationRef.current.contains(event.target)) setNotificationOpen(false);
    };
    document.addEventListener('mousedown', closeMenus);
    return () => document.removeEventListener('mousedown', closeMenus);
  }, []);

  const meetingCount = counts?.meetings || 0;

  useEffect(() => {
    if (!notificationOpen || meetingCount <= 0) return;
    markTypeRead?.('meeting');
  }, [meetingCount, markTypeRead, notificationOpen]);

  const handleLogout = () => {
    setDropdownOpen(false);
    setMobileOpen(false);
    onLogout();
  };

  const handleSelectNotification = async (item) => {
    if (item?._id) await markRead(item._id);
    setNotificationOpen(false);
    navigate(item?.to || '/');
  };

  const menuHoverIn = (event) => { event.currentTarget.style.backgroundColor = 'var(--bg-hover)'; };
  const menuHoverOut = (event) => { event.currentTarget.style.backgroundColor = 'transparent'; };
  const hoverIn = (event) => { event.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.10)'; };
  const hoverOut = (event) => { event.currentTarget.style.backgroundColor = 'transparent'; };

  const DropdownShell = ({ children }) => (
    <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-2xl border shadow-xl" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
      {children}
    </div>
  );

  const mobileMenu = useMemo(() => (
    <div className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-2xl border shadow-xl" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
      <div className="flex items-center gap-3 border-b px-4 py-4" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
        {user.avatar ? <img src={user.avatar} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full font-bold text-white" style={{ backgroundColor: 'var(--brand-primary)' }}>{initial}</div>}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{fullName}</p>
          <p className="truncate text-xs" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
        </div>
      </div>
      <div className="border-b" style={{ borderColor: 'var(--border-color)' }}>
        <button onClick={() => setEmailOpen((open) => !open)} className="flex w-full items-center justify-between px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
          <span className="flex items-center gap-3"><Mail className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />Email services</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${emailOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} />
        </button>
        {emailOpen ? (
          <div className="space-y-1 px-4 pb-3">
            {emailLinks.map((link) => (
              <a key={link.name} href={link.href} target="_blank" rel="noopener noreferrer" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium" style={{ color: link.color }}>
                {link.name}<ExternalLink className="h-3 w-3 opacity-70" />
              </a>
            ))}
          </div>
        ) : null}
      </div>
      <button onClick={toggleTheme} className="flex w-full items-center gap-3 px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }} onMouseEnter={menuHoverIn} onMouseLeave={menuHoverOut}>
        {theme === 'light' ? <Moon className="h-4 w-4" style={{ color: 'var(--text-muted)' }} /> : <Sun className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />}
        <span className="font-medium">{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
      </button>
      <button onClick={() => { setMobileOpen(false); navigate('/profile'); }} className="flex w-full items-center gap-3 px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }} onMouseEnter={menuHoverIn} onMouseLeave={menuHoverOut}>
        <Settings className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
        <span className="font-medium">Profile settings</span>
      </button>
      <button onClick={handleLogout} className="flex w-full items-center gap-3 border-t px-4 py-3 text-sm text-red-500" style={{ borderColor: 'var(--border-color)' }} onMouseEnter={(event) => { event.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.07)'; }} onMouseLeave={menuHoverOut}>
        <LogOut className="h-4 w-4" /><span className="font-medium">Sign out</span>
      </button>
    </div>
  ), [emailOpen, fullName, handleLogout, initial, navigate, theme, toggleTheme, user.avatar, user.email]);

  return (
    <header className="fixed top-0 left-0 w-full z-[60] border-b" style={{ backgroundColor: 'var(--navbar-bg)', borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="flex items-center justify-between px-4 sm:px-6 h-14 max-w-screen-2xl mx-auto">
        <button onClick={() => navigate('/')} className="flex items-center gap-3 flex-shrink-0 group" aria-label="Dashboard">
          <img src="/Fundco.svg" alt="FundCo" className="h-8 w-auto object-contain brightness-0 invert opacity-90 group-hover:opacity-100 transition-opacity" />
          <span className="hidden sm:block text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>Capital Managers</span>
        </button>
        <div className="hidden md:flex items-center gap-1.5">
          <div className="relative">
            <button onClick={() => setEmailOpen((open) => !open)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium" style={{ color: 'rgba(255,255,255,0.65)' }} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
              <Mail className="w-4 h-4" />Email<ChevronDown className={`w-3.5 h-3.5 transition-transform ${emailOpen ? 'rotate-180' : ''}`} />
            </button>
            {emailOpen ? <div className="absolute top-10 right-0 w-44 rounded-2xl shadow-xl py-1.5 z-50 border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>{emailLinks.map((link) => <a key={link.name} href={link.href} target="_blank" rel="noopener noreferrer" onClick={() => setEmailOpen(false)} className="flex items-center justify-between px-4 py-2.5 text-sm font-medium" style={{ color: link.color }} onMouseEnter={menuHoverIn} onMouseLeave={menuHoverOut}>{link.name}<ExternalLink className="w-3 h-3 opacity-70" /></a>)}</div> : null}
          </div>
          <div ref={notificationRef} className="relative">
            <button onClick={() => setNotificationOpen((open) => !open)} className="relative flex h-10 w-10 items-center justify-center rounded-lg" style={{ color: 'rgba(255,255,255,0.78)' }} onMouseEnter={hoverIn} onMouseLeave={hoverOut} aria-label="Open notifications">
              <Bell className="h-4.5 w-4.5" />
              {total > 0 ? <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black text-white" style={{ height: 20, backgroundColor: '#ef4444' }}>{total > 99 ? '99+' : total}</span> : null}
            </button>
            {notificationOpen ? <NotificationDropdown items={items} total={total} loading={loading} lastUpdated={lastUpdated} onRefresh={refresh} onMarkAll={markAllRead} onSelect={handleSelectNotification} /> : null}
          </div>
          <button onClick={toggleTheme} title={theme === 'light' ? 'Dark mode' : 'Light mode'} className="p-2 rounded-lg" style={{ color: 'rgba(255,255,255,0.65)' }} onMouseEnter={hoverIn} onMouseLeave={hoverOut} aria-label="Toggle theme">
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          <button onClick={() => navigate('/profile')} className="p-2 rounded-lg" style={{ color: 'rgba(255,255,255,0.65)' }} onMouseEnter={hoverIn} onMouseLeave={hoverOut} aria-label="Settings">
            <Settings className="w-4 h-4" />
          </button>
          <div ref={dropdownRef} className="relative ml-1">
            <button onClick={() => setDropdownOpen((open) => !open)} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg" style={{ color: 'rgba(255,255,255,0.9)' }} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
              {user.avatar ? <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover ring-2 ring-white/20" /> : <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-white/20 flex-shrink-0" style={{ backgroundColor: 'var(--brand-accent)', color: '#fff' }}>{initial}</div>}
              <div className="text-left hidden lg:block">
                <p className="text-xs font-semibold leading-tight truncate max-w-[120px]">{fullName}</p>
                <p className="text-xs truncate max-w-[120px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{user.email}</p>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} style={{ color: 'rgba(255,255,255,0.45)' }} />
            </button>
            {dropdownOpen ? (
              <DropdownShell>
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{fullName}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
                </div>
                <button onClick={() => { setDropdownOpen(false); navigate('/profile'); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm" style={{ color: 'var(--text-primary)' }} onMouseEnter={menuHoverIn} onMouseLeave={menuHoverOut}>
                  <Settings className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />Profile settings
                </button>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 border-t" style={{ borderColor: 'var(--border-color)' }} onMouseEnter={(event) => { event.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.07)'; }} onMouseLeave={menuHoverOut}>
                  <LogOut className="w-4 h-4" />Sign out
                </button>
              </DropdownShell>
            ) : null}
          </div>
        </div>
        <div ref={mobileRef} className="md:hidden relative">
          <button onClick={() => setMobileOpen((open) => !open)} className="p-2 rounded-lg" style={{ color: 'rgba(255,255,255,0.8)' }} onMouseEnter={hoverIn} onMouseLeave={hoverOut} aria-label="Menu">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          {mobileOpen ? mobileMenu : null}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
