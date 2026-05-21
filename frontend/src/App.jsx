// src/App.jsx
import React, { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, useNavigate, Route, Outlet, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import NotificationStack from './components/NotificationStack';
import Login from './components/Login';
import Signup from './components/Signup';
import './index.css';
import Dashboard from './pages/Dashboard';
import PendingPage from './pages/PendingPage';
import CompletePage from './pages/CompletePage';
import Profile from './components/Profile';
import AssignedTasks from './pages/Assigned';
import CalendarView from './pages/Calendar';
import TeamChat from './pages/TeamChat';
import UrlShortener from './pages/UrlShortener';
import FileStorage from './pages/FileStorage';
import PerformanceAnalytics from './pages/PerformanceAnalytics';
import PerformanceDashboard from './pages/PerformanceDashboard';
import SocialFeed from './pages/SocialFeed';
import AiTools from './pages/AiTools';
import Reminders from './pages/Reminders';
import Goals from './pages/Goals';
import Projects from './pages/Projects';
import RevenueProjects from './pages/RevenueProjects';
import Appraisals from './pages/Appraisals';
import Meeting from './pages/Meeting';
import Training from './pages/Training';
import Feedback from './pages/Feedback';
import DeckPrep from './pages/DeckPrep';
import MeetingLobby from './pages/MeetingLobby';
import VideoRoom from './pages/VideoRoom';
import MeetingReports from './pages/MeetingReports.jsx';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext.jsx';
import {
  bootstrapUserSession,
  logoutUserSession,
  readStoredUser,
  userAuthEvents,
} from './security/authClient.js';

// ← NEW: Lazy load the heavy report page
const ReportGeneration = lazy(() => import('./pages/ReportGeneration'));

const hasKnownUserSession = () => Boolean(
  localStorage.getItem('token')
  || localStorage.getItem('currentUser')
  || localStorage.getItem('fundcoUserRefreshExpiresAt')
);

const serializeUser = (value) => {
  try {
    return JSON.stringify(value || null);
  } catch {
    return '';
  }
};

const App = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => readStoredUser());
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let active = true;

    const syncStoredUser = () => {
      const nextUser = readStoredUser();
      setCurrentUser((previousUser) => (
        serializeUser(previousUser) === serializeUser(nextUser)
          ? previousUser
          : nextUser
      ));
    };

    const syncSession = async () => {
      await bootstrapUserSession();
      if (!active) return;
      syncStoredUser();
      setAuthReady(true);
    };

    syncSession();

    const handleAuthChange = () => syncStoredUser();
    window.addEventListener(userAuthEvents.AUTH_CHANGE_EVENT, handleAuthChange);

    return () => {
      active = false;
      window.removeEventListener(userAuthEvents.AUTH_CHANGE_EVENT, handleAuthChange);
    };
  }, []);

  useEffect(() => {
    if (!authReady) return undefined;

    let active = true;
    let resumeTimeoutId = null;

    const syncFromStorage = () => {
      if (!active) return;
      const nextUser = readStoredUser();
      setCurrentUser((previousUser) => (
        serializeUser(previousUser) === serializeUser(nextUser)
          ? previousUser
          : nextUser
      ));
    };

    const refreshSession = async () => {
      if (!currentUser && !hasKnownUserSession()) return;

      try {
        await bootstrapUserSession();
      } catch {
        // bootstrapUserSession already normalizes local state when recovery fails
      } finally {
        syncFromStorage();
      }
    };

    const scheduleRefresh = () => {
      if (!active) return;
      window.clearTimeout(resumeTimeoutId);
      resumeTimeoutId = window.setTimeout(refreshSession, 180);
    };

    const intervalId = window.setInterval(refreshSession, 10 * 60 * 1000);
    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        scheduleRefresh();
      }
    };

    window.addEventListener('focus', scheduleRefresh);
    window.addEventListener('pageshow', scheduleRefresh);
    window.addEventListener('online', scheduleRefresh);
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.clearTimeout(resumeTimeoutId);
      window.removeEventListener('focus', scheduleRefresh);
      window.removeEventListener('pageshow', scheduleRefresh);
      window.removeEventListener('online', scheduleRefresh);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [authReady, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  const handleAuthSubmit = (data) => {
    const user = data?.user || readStoredUser();
    setCurrentUser(user);
    navigate('/', { replace: true });
  };

  const handleLogout = () => {
    logoutUserSession().finally(() => {
      setCurrentUser(null);
      navigate('/login', { replace: true });
    });
  };

  const ProtectedLayout = () => (
    <Layout user={currentUser} onLogout={handleLogout}>
      <Outlet />
    </Layout>
  );

  return (
    <ThemeProvider>
      <NotificationProvider currentUser={currentUser}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4200,
          style: {
            fontSize: 13,
            fontWeight: 700,
            borderRadius: 16,
            padding: '12px 14px',
            color: 'var(--text-primary)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 14px 38px rgba(15, 23, 42, 0.18)',
          },
        }}
      />
      <NotificationStack />
      {!authReady ? (
        <div className="flex min-h-screen items-center justify-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading session...
        </div>
      ) : (
      <Routes>
        <Route path="/login" element={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"><Login onSubmit={handleAuthSubmit} onSwitchMode={() => navigate('/signup')} /></div>} />
        <Route path="/signup" element={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"><Signup onSubmit={handleAuthSubmit} onSwitchMode={() => navigate('/login')} /></div>} />

        <Route element={currentUser ? <ProtectedLayout /> : <Navigate to="/login" replace />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pending" element={<PendingPage />} />
          <Route path="/complete" element={<CompletePage />} />
          <Route path="/profile" element={<Profile user={currentUser} setCurrentUser={setCurrentUser} onLogout={handleLogout} />} />
          <Route path="/assigned" element={<AssignedTasks />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/team-chat" element={<TeamChat />} />
          <Route path="/url-shortener" element={<UrlShortener />} />
          <Route path="/file-storage" element={<FileStorage />} />
          <Route path="/analytics" element={<PerformanceAnalytics />} />
          <Route path="/performance" element={<PerformanceDashboard />} />
          <Route path="/social-feed" element={<SocialFeed />} />
          <Route path="/ai-tools" element={<AiTools />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:projectId" element={<Projects />} />
          <Route path="/revenue-projects" element={<RevenueProjects />} />
          <Route path="/appraisals" element={<Appraisals />} />
          <Route path="/meeting" element={<Meeting />} />
          <Route path="/training" element={<Training />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/meeting-reports" element={<MeetingReports />} />
          <Route path="/deck-prep" element={<DeckPrep />} />
          <Route path="/document-converter" element={<Navigate to="/deck-prep" replace />} />

          {/* ← LAZY LOADED + Suspense (this fixes the huge chunk) */}
          <Route
            path="/reports"
            element={
              <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading Report Tool...</div>}>
                <ReportGeneration />
              </Suspense>
            }
          />

          <Route path="/meetroom" element={<MeetingLobby />} />
        </Route>

        <Route
          path="/room/:roomId"
          element={currentUser ? <VideoRoom embeddedUser={currentUser} onLogout={handleLogout} /> : <Navigate to="/login" replace />}
        />

        <Route path="*" element={<Navigate to={currentUser ? '/' : '/login'} replace />} />
      </Routes>
      )}
      </NotificationProvider>
    </ThemeProvider>
  );
};

export default App;
