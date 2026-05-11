import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, ChevronDown, ChevronUp, ExternalLink, X } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext.jsx';

const stackOffsets = [
  { top: 0, scale: 1, opacity: 1 },
  { top: 10, scale: 0.98, opacity: 0.88 },
  { top: 20, scale: 0.96, opacity: 0.76 },
];

const NotificationStack = () => {
  const navigate = useNavigate();
  const {
    popupItems,
    popupsExpanded,
    dismissPopup,
    clearPopups,
    togglePopupsExpanded,
    markRead,
  } = useNotifications();

  if (!popupItems.length) return null;

  const visibleItems = popupsExpanded ? popupItems : popupItems.slice(0, 3);

  const openNotification = async (item) => {
    if (item?.id && !String(item.id).startsWith('admin-live-')) {
      await markRead(item.id);
    }
    dismissPopup(item.id);
    if (item?.to) navigate(item.to);
  };

  return (
    <div className="pointer-events-none fixed right-3 top-[calc(var(--topbar-h)+0.5rem)] z-[90] w-[min(24rem,calc(100vw-1rem))] sm:right-4 sm:w-[24rem]">
      <div className="pointer-events-auto mb-2 flex items-center justify-between rounded-full border px-3 py-2 shadow-lg" style={{ background: 'var(--c-panel)', borderColor: 'var(--c-border)' }}>
        <button type="button" onClick={() => togglePopupsExpanded()} className="flex min-w-0 items-center gap-2 text-left">
          <Bell className="h-4 w-4 shrink-0" style={{ color: 'var(--brand-primary)' }} />
          <span className="truncate text-xs font-black uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-muted)' }}>
            {popupItems.length} live notification{popupItems.length === 1 ? '' : 's'}
          </span>
        </button>
        <div className="flex items-center gap-1">
          {popupItems.length > 0 ? (
            <button type="button" onClick={clearPopups} className="rounded-full px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-muted)' }}>
              {popupItems.length > 1 ? 'Clear all' : 'Clear'}
            </button>
          ) : null}
          <button type="button" onClick={() => togglePopupsExpanded()} className="flex h-8 w-8 items-center justify-center rounded-full" style={{ color: 'var(--c-text-muted)' }}>
            {popupsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className={`relative ${popupsExpanded ? 'space-y-2' : 'h-36'}`}>
        <AnimatePresence initial={false}>
          {visibleItems.map((item, index) => {
            const collapsedStyle = stackOffsets[Math.min(index, stackOffsets.length - 1)];
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: 120, scale: 0.96 }}
                animate={popupsExpanded
                  ? { opacity: 1, x: 0, y: 0, scale: 1 }
                  : { opacity: collapsedStyle.opacity, x: 0, y: collapsedStyle.top, scale: collapsedStyle.scale }}
                exit={{ opacity: 0, x: 140, scale: 0.92, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                className={`${popupsExpanded ? 'relative' : 'absolute inset-x-0'} pointer-events-auto`}
                style={popupsExpanded ? undefined : { top: `${collapsedStyle.top}px`, zIndex: 40 - index }}
              >
                <div className="rounded-[1.25rem] border shadow-xl" style={{ background: 'var(--c-panel)', borderColor: 'var(--c-border)' }}>
                  <div className="flex items-start gap-3 px-4 py-3">
                    <button type="button" onClick={() => openNotification(item)} className="min-w-0 flex-1 text-left">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black" style={{ color: 'var(--c-text)' }}>{item.title}</p>
                          {item.description ? (
                            <p className="mt-1 line-clamp-3 text-xs leading-5" style={{ color: 'var(--c-text-muted)' }}>{item.description}</p>
                          ) : null}
                          <div className="mt-2 flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-faint)' }}>
                            <span>{item.type || 'system'}</span>
                            <span>&bull;</span>
                            <span>{new Date(item.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                        {popupsExpanded ? <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--c-text-faint)' }} /> : null}
                      </div>
                    </button>
                    <button type="button" onClick={() => dismissPopup(item.id)} className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ color: 'var(--c-text-faint)' }}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default NotificationStack;

