import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Menu, Moon, RefreshCw, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';

const toneStyles = {
  chat: { bg: 'var(--brand-secondary-soft)', color: 'var(--brand-secondary)' },
  secondary: { bg: 'var(--brand-primary-soft)', color: 'var(--brand-primary)' },
  warning: { bg: 'var(--c-warning-soft)', color: 'var(--c-warning)' },
  info: { bg: 'var(--c-info-soft)', color: 'var(--c-info)' },
  brand: { bg: 'var(--brand-primary-soft)', color: 'var(--brand-primary)' },
  success: { bg: 'var(--c-success-soft)', color: 'var(--c-success)' },
  neutral: { bg: 'var(--c-panel-subtle)', color: 'var(--c-text-soft)' },
};

const formatUpdatedAt = (value) => {
  if (!value) return 'Not refreshed yet';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not refreshed yet';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatCreatedAt = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const NotificationDropdown = ({ items, total, loading, lastUpdated, onRefresh, onMarkAll, onSelect }) => (
  <div className="surface-panel absolute right-0 top-[calc(100%+0.65rem)] z-50 w-[min(26rem,calc(100vw-1.5rem))] overflow-hidden" style={{ boxShadow: 'var(--shadow-lg)' }}>
    <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--c-border)' }}>
      <div>
        <p className="text-sm font-black" style={{ color: 'var(--c-text)' }}>Notifications</p>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--c-text-faint)' }}>
          Updated {formatUpdatedAt(lastUpdated)}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" onClick={onRefresh} className="btn-ghost h-9 w-9 rounded-[0.7rem] p-0" aria-label="Refresh notifications">
          <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
        </button>
        <button type="button" onClick={onMarkAll} className="btn-ghost h-9 w-9 rounded-[0.7rem] p-0" aria-label="Mark all as read">
          <CheckCheck className="h-4 w-4" />
        </button>
      </div>
    </div>

    <div className="max-h-[28rem] overflow-y-auto py-2">
      {loading && items.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm" style={{ color: 'var(--c-text-soft)' }}>
          Loading notifications...
        </div>
      ) : null}

      {!loading && items.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm font-black" style={{ color: 'var(--c-text)' }}>All clear</p>
          <p className="mt-1 text-xs leading-6" style={{ color: 'var(--c-text-soft)' }}>
            New chat activity, approvals, reminders, meetings, and system alerts will appear here.
          </p>
        </div>
      ) : null}

      {items.map((item) => {
        const tone = toneStyles[item.tone] || toneStyles.neutral;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="mx-2 flex w-[calc(100%-1rem)] items-start gap-3 rounded-[0.85rem] px-3 py-3 text-left transition-colors hover:bg-[var(--c-panel-subtle)]"
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.7rem] text-xs font-black" style={{ background: tone.bg, color: tone.color }}>
              {item.count > 99 ? '99+' : item.count || 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-sm font-black" style={{ color: 'var(--c-text)' }}>{item.title}</span>
                {item.synthetic ? (
                  <span className="rounded-full px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-[0.08em]" style={{ background: 'var(--c-panel-subtle)', color: 'var(--c-text-faint)' }}>
                    Summary
                  </span>
                ) : null}
              </span>
              {item.description ? (
                <span className="mt-1 block text-xs leading-5" style={{ color: 'var(--c-text-soft)' }}>{item.description}</span>
              ) : null}
              {item.createdAt ? (
                <span className="mt-1.5 block text-[0.68rem] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-faint)' }}>
                  {formatCreatedAt(item.createdAt)}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>

    <div className="border-t px-4 py-3 text-xs" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-faint)' }}>
      {total > 0 ? total + ' items need attention' : 'No pending admin items'}
    </div>
  </div>
);

const Navbar = ({ onMenu }) => {
  const navigate = useNavigate();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { items, counts, loading, lastUpdated, refresh, markRead, markAllRead, markTypeRead } = useNotifications();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    const close = (event) => {
      if (!notificationRef.current?.contains(event.target)) setNotificationOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const meetingCount = counts?.meetings || 0;

  useEffect(() => {
    if (!notificationOpen || meetingCount <= 0) return;
    markTypeRead?.('meeting');
  }, [meetingCount, markTypeRead, notificationOpen]);

  const total = counts?.total || 0;

  const handleSelect = async (item) => {
    setNotificationOpen(false);
    if (!item?.synthetic && item?.id) {
      await markRead(item.id);
    }
    if (item?.to) navigate(item.to);
  };

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 border-b"
      style={{
        height: 'var(--topbar-h)',
        background: 'color-mix(in srgb, var(--c-bg) 92%, var(--c-panel))',
        borderColor: 'var(--c-border)',
      }}
    >
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenu}
            className="flex h-10 w-10 items-center justify-center rounded-[0.75rem] transition-colors hover:bg-[var(--c-panel-subtle)] lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" style={{ color: 'var(--c-text)' }} />
          </button>

          <div>
            <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em]" style={{ color: 'var(--c-text-faint)' }}>
              FundCo Capital Managers
            </p>
            <p className="text-xl font-black tracking-[-0.03em]" style={{ color: 'var(--c-text)', fontFamily: 'var(--font-display)' }}>
              FundCo AI
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div ref={notificationRef} className="relative">
            <button
              type="button"
              onClick={() => setNotificationOpen((open) => !open)}
              className="relative flex h-10 w-10 items-center justify-center rounded-[0.75rem] transition-colors hover:bg-[var(--c-panel-subtle)]"
              aria-label="Open notifications"
            >
              <Bell className="h-5 w-5" style={{ color: 'var(--c-text)' }} />
              {total > 0 ? (
                <span
                  className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full px-1.5 text-[0.65rem] font-black text-white"
                  style={{ height: 20, background: 'var(--c-danger)' }}
                >
                  {total > 99 ? '99+' : total}
                </span>
              ) : null}
            </button>

            {notificationOpen ? (
              <NotificationDropdown
                items={items}
                total={total}
                loading={loading}
                lastUpdated={lastUpdated}
                onRefresh={refresh}
                onMarkAll={markAllRead}
                onSelect={handleSelect}
              />
            ) : null}
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-[0.75rem] transition-colors hover:bg-[var(--c-panel-subtle)]"
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-5 w-5" style={{ color: 'var(--c-text)' }} />
            ) : (
              <Moon className="h-5 w-5" style={{ color: 'var(--c-text)' }} />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
