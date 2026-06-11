import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  ClipboardList,
  FileText,
  FolderKanban,
  HardDrive,
  LayoutDashboard,
  ListTodo,
  LogOut,
  MessageSquare,
  Presentation,
  Settings,
  Target,
  TrendingUp,
  Users,
  UsersRound,
  Video,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext.jsx';

const navConfig = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['team-lead', 'executive', 'admin'] },
  { to: '/tasks', icon: ListTodo, label: 'Tasks', roles: ['team-lead', 'executive', 'admin'], badge: 'tasks' },
  { to: '/my-tasks', icon: ClipboardList, label: 'My Tasks', roles: ['team-lead', 'executive', 'admin'] },
  { to: '/projects', icon: FolderKanban, label: 'Projects', roles: ['team-lead', 'executive', 'admin'] },
  { to: '/goals', icon: Target, label: 'Goals', roles: ['team-lead', 'executive', 'admin'] },
  { to: '/reports', icon: FileText, label: 'Reports', roles: ['team-lead', 'executive', 'admin'], badge: 'reports' },
  { to: '/performance', icon: TrendingUp, label: 'Performance', roles: ['team-lead', 'executive', 'admin'] },
  { divider: true },
  { to: '/my-team', icon: UsersRound, label: 'My Team', roles: ['team-lead', 'executive', 'admin'] },
  { to: '/team-chat', icon: MessageSquare, label: 'Team Chat', roles: ['team-lead', 'executive', 'admin'], badge: 'chat' },
  { to: '/social', icon: MessageSquare, label: 'Social Feed', roles: ['team-lead', 'executive', 'admin'], badge: 'social' },
  { to: '/training', icon: BookOpen, label: 'Training', roles: ['team-lead', 'executive', 'admin'] },
  { to: '/reminders', icon: Bell, label: 'Reminders', roles: ['team-lead', 'executive', 'admin'], badge: 'reminders' },
  { to: '/meetings', icon: Video, label: 'Meetings', roles: ['team-lead', 'executive', 'admin'], badge: 'meetings' },
  { to: '/files', icon: HardDrive, label: 'File Storage', roles: ['team-lead', 'executive', 'admin'] },
  { to: '/deck-prep', icon: Presentation, label: 'Deck Prep', roles: ['team-lead', 'executive', 'admin'] },
  { to: '/settings', icon: Settings, label: 'Profile Settings', roles: ['team-lead', 'executive', 'admin'] },
  { divider: true },
  { to: '/users', icon: Users, label: 'Users', roles: ['admin'] },
];

const formatBadge = (value) => {
  if (!value || value <= 0) return '';
  return value > 99 ? '99+' : String(value);
};

const SidebarInner = ({ user, hasRole, onLogout, collapsed, onNavigate, counts }) => {
  const items = navConfig.filter((item) => !item.roles || item.roles.some((role) => hasRole(role)));
  const showText = !collapsed;
  const fullName = user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Admin';
  const roleLabel = user?.role === 'admin' ? 'Super Admin' : user?.role === 'executive' ? 'Executive' : user?.role === 'team-lead' ? 'Team Lead' : 'Standard';

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-4" style={{ borderColor: 'var(--c-border)' }}>
        <div className={`flex items-center ${showText ? 'gap-3' : 'justify-center'}`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem] text-white" style={{ background: 'var(--brand-primary)' }}>
            <span className="text-base font-black">F</span>
          </div>
          {showText ? (
            <div className="min-w-0">
              <p className="truncate text-[0.68rem] font-extrabold uppercase tracking-[0.16em]" style={{ color: 'var(--c-text-faint)' }}>FundCo AI</p>
              <p className="truncate text-sm font-black" style={{ color: 'var(--c-text)', fontFamily: 'var(--font-display)' }}>Admin Workspace</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="px-3 pt-3">
        <div className={`rounded-[0.95rem] border p-3 ${showText ? '' : 'flex justify-center'}`} style={{ background: 'var(--c-panel-subtle)', borderColor: 'var(--c-border)' }}>
          <div className={`flex items-center ${showText ? 'gap-3' : 'justify-center'}`}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-black text-white" style={{ background: 'var(--brand-secondary)' }}>
              {(user?.firstName || 'A')[0].toUpperCase()}
            </div>
            {showText ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-black" style={{ color: 'var(--c-text)' }}>{fullName}</p>
                <p className="truncate text-xs" style={{ color: 'var(--c-text-faint)' }}>{roleLabel}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <nav className="scrollbar-none flex-1 overflow-y-auto px-3 py-4">
        {showText ? <p className="section-title mb-2 px-3">Navigation</p> : null}
        <ul className="space-y-1">
          {items.map((item, index) => {
            if (item.divider) {
              return (
                <li key={`divider-${index}`} className="px-2 py-2">
                  <hr className="divider" />
                </li>
              );
            }

            const badge = formatBadge(counts?.[item.badge]);

            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={onNavigate}
                  className={`group relative flex items-center rounded-[0.8rem] px-3 py-2.5 text-sm font-bold transition-all ${showText ? 'gap-3' : 'justify-center'}`}
                  style={({ isActive }) =>
                    isActive
                      ? { background: 'var(--brand-primary)', color: '#ffffff', boxShadow: 'var(--shadow-sm)' }
                      : { color: 'var(--c-text-soft)' }
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className="h-[18px] w-[18px] shrink-0" style={{ opacity: isActive ? 1 : 0.9 }} />
                      {showText ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : null}
                      {badge ? (
                        <span
                          className={showText ? 'ml-auto rounded-full px-2 py-0.5 text-[0.65rem] font-black' : 'absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full'}
                          style={showText
                            ? { background: isActive ? 'rgba(255,255,255,0.18)' : 'var(--c-danger)', color: '#ffffff' }
                            : { background: 'var(--c-danger)' }}
                        >
                          {showText ? badge : null}
                        </span>
                      ) : null}
                      {!showText ? (
                        <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-[0.7rem] px-3 py-2 text-xs font-black opacity-0 transition-opacity group-hover:opacity-100" style={{ background: 'var(--c-panel-inverse)', color: 'var(--c-bg)' }}>
                          {item.label}{badge ? ` (${badge})` : ''}
                        </span>
                      ) : null}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t p-3" style={{ borderColor: 'var(--c-border)' }}>
        <button type="button" onClick={onLogout} className={`btn-danger w-full ${showText ? 'justify-start' : 'justify-center px-0'}`}>
          <LogOut className="h-4 w-4" />
          {showText ? 'Sign Out' : null}
        </button>
      </div>
    </div>
  );
};

const Sidebar = ({ user, hasRole, onLogout, collapsed, mobileOpen, onClose }) => {
  const { counts } = useNotifications();
  const width = collapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)';

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 hidden h-screen border-r lg:block" style={{ width, background: 'var(--c-panel)', borderColor: 'var(--c-border)' }}>
        <SidebarInner user={user} hasRole={hasRole} onLogout={onLogout} collapsed={collapsed} counts={counts} />
      </aside>

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.button type="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/45 lg:hidden" onClick={onClose} aria-label="Close navigation" />
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ duration: 0.2 }}
              className="fixed left-0 top-0 z-50 h-screen border-r lg:hidden"
              style={{ width: 'var(--sidebar-w)', background: 'var(--c-panel)', borderColor: 'var(--c-border)' }}
            >
              <SidebarInner user={user} hasRole={hasRole} onLogout={onLogout} collapsed={false} onNavigate={onClose} counts={counts} />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
