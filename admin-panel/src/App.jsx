// Admin panel asosiy routing
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Layout from './components/layout/Layout.jsx';
import LoginPage from './pages/Auth/LoginPage.jsx';
import DashboardPage from './pages/Dashboard/DashboardPage.jsx';
import UsersPage from './pages/Users/UsersPage.jsx';
import TerritoriesPage from './pages/Territories/TerritoriesPage.jsx';
import SessionsPage from './pages/Sessions/SessionsPage.jsx';
import NotificationsPage from './pages/Notifications/NotificationsPage.jsx';
import LeaderboardPage from './pages/Leaderboard/LeaderboardPage.jsx';
import NightEventPage from './pages/NightEvent/NightEventPage.jsx';
import SettingsPage from './pages/Settings/SettingsPage.jsx';
import LogsPage from './pages/Logs/LogsPage.jsx';
import StatisticsPage from './pages/Statistics/StatisticsPage.jsx';
import AdminsPage from './pages/Admins/AdminsPage.jsx';

// Protected route - faqat autentifikatsiya qilingan adminlar uchun
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector(state => state.adminAuth);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/territories" element={<TerritoriesPage />} />
                <Route path="/sessions" element={<SessionsPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/night-event" element={<NightEventPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/logs" element={<LogsPage />} />
                <Route path="/statistics" element={<StatisticsPage />} />
                <Route path="/admins" element={<AdminsPage />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;
