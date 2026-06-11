// src/App.jsx
import React, { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, useNavigate, Route, Outlet, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
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
import Appraisals from './pages/Appraisals';
import Meeting from './pages/Meeting';
import Training from './pages/Training';
import Feedback from './pages/Feedback';
import DeckPrep from './pages/DeckPrep';
import MeetingLobby from './pages/MeetingLobby';
import VideoRoom from './pages/VideoRoom';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext.jsx';

// ← NEW: Lazy load the heavy report page
const ReportGeneration = lazy(() => import('./pages/ReportGeneration'));

const App = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem('currentUser');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  const handleAuthSubmit = (data) => {
    const user = {
      email: data.email,
      name: data.name || 'User',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'User')}&background=random`,
    };
    setCurrentUser(user);
    navigate('/', { replace: true });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    navigate('/login', { replace: true });
  };

  const ProtectedLayout = () => (
    <Layout user={currentUser} onLogout={handleLogout}>
      <Outlet />
    </Layout>
  );

  return (
    <ThemeProvider>
      <NotificationProvider currentUser={currentUser}>
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
          <Route path="/appraisals" element={<Appraisals />} />
          <Route path="/meeting" element={<Meeting />} />
          <Route path="/training" element={<Training />} />
          <Route path="/feedback" element={<Feedback />} />
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
      </NotificationProvider>
    </ThemeProvider>
  );
};

export default App;