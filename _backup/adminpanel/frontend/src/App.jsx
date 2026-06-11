import React, { Suspense, lazy } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import { LoadingScreen } from './components/ui.jsx';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Tasks = lazy(() => import('./pages/Tasks.jsx'));
const MyTasks = lazy(() => import('./pages/MyTasks.jsx'));
const Goals = lazy(() => import('./pages/Goals.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Performance = lazy(() => import('./pages/Performance.jsx'));
const Users = lazy(() => import('./pages/Users.jsx'));
const MyTeam = lazy(() => import('./pages/MyTeam.jsx'));
const Projects = lazy(() => import('./pages/Projects.jsx'));
const Social = lazy(() => import('./pages/Social.jsx'));
const TeamChat = lazy(() => import('./pages/TeamChat.jsx'));
const DeckPrep = lazy(() => import('./pages/DeckPrep.jsx'));
const FileStorage = lazy(() => import('./pages/FileStorage.jsx'));
const Training = lazy(() => import('./pages/Training.jsx'));
const Reminders = lazy(() => import('./pages/Reminders.jsx'));
const Meetings = lazy(() => import('./pages/Meetings.jsx'));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings.jsx'));

const Loader = () => <LoadingScreen />;

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3200,
          style: {
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            fontWeight: 700,
            borderRadius: 18,
            padding: '12px 16px',
            color: 'var(--c-text)',
            background: 'var(--c-panel)',
            border: '1px solid var(--c-border)',
            boxShadow: 'var(--shadow-md)',
          },
        }}
      />
      <Routes>
        <Route path="/login" element={user && !loading ? <Navigate to="/" replace /> : <Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Suspense fallback={<Loader />}><Dashboard /></Suspense>} />
          <Route path="/tasks" element={<Suspense fallback={<Loader />}><Tasks /></Suspense>} />
          <Route path="/my-tasks" element={<Suspense fallback={<Loader />}><MyTasks /></Suspense>} />
          <Route path="/goals" element={<Suspense fallback={<Loader />}><Goals /></Suspense>} />
          <Route path="/reports" element={<Suspense fallback={<Loader />}><Reports /></Suspense>} />
          <Route path="/performance" element={<Suspense fallback={<Loader />}><Performance /></Suspense>} />
          <Route path="/users" element={<Suspense fallback={<Loader />}><Users /></Suspense>} />
          <Route path="/my-team" element={<Suspense fallback={<Loader />}><MyTeam /></Suspense>} />
          <Route path="/projects" element={<Suspense fallback={<Loader />}><Projects /></Suspense>} />
          <Route path="/social" element={<Suspense fallback={<Loader />}><Social /></Suspense>} />
          <Route path="/team-chat" element={<Suspense fallback={<Loader />}><TeamChat /></Suspense>} />
          <Route path="/deck-prep" element={<Suspense fallback={<Loader />}><DeckPrep /></Suspense>} />
          <Route path="/files" element={<Suspense fallback={<Loader />}><FileStorage /></Suspense>} />
          <Route path="/training" element={<Suspense fallback={<Loader />}><Training /></Suspense>} />
          <Route path="/reminders" element={<Suspense fallback={<Loader />}><Reminders /></Suspense>} />
          <Route path="/meetings" element={<Suspense fallback={<Loader />}><Meetings /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<Loader />}><ProfileSettings /></Suspense>} />
          <Route path="/profile" element={<Navigate to="/settings" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

const App = () => (
  <AuthProvider>
    <NotificationProvider>
      <AppRoutes />
    </NotificationProvider>
  </AuthProvider>
);

export default App;
