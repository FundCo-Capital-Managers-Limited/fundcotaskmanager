import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';

const Layout = ({ children }) => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sideWidth = useMemo(
    () => (collapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)'),
    [collapsed],
  );

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <Navbar
        user={user}
        collapsed={collapsed}
        onMenu={() => setMobileOpen(true)}
        onToggleSidebar={() => setCollapsed((current) => !current)}
        onLogout={handleLogout}
      />
      <Sidebar
        user={user}
        hasRole={hasRole}
        onLogout={handleLogout}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <main className="main-content" style={{ marginLeft: sideWidth, paddingTop: 'var(--topbar-h)' }}>
        <div className="mx-auto max-w-[1720px] px-4 pb-8 pt-5 lg:px-6 lg:pb-10 lg:pt-6 xl:px-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
