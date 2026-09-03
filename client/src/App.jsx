import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Classes } from './pages/Classes';
import { Members } from './pages/Members';
import { Rooms } from './pages/Rooms';
import { Sessions } from './pages/Sessions';
import { Bookings } from './pages/Bookings';
import { RecurringSessions } from './pages/RecurringSessions';
import { MembershipAlerts } from './pages/MembershipAlerts';

function HomeRedirect() {
  const { user, isStaff } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return isStaff ? <Navigate to="/dashboard" replace /> : <Navigate to="/sessions" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute requiredRole="INSTRUCTOR">
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomeRedirect />} />

            {/* STAFF-only Routes */}
            <Route
              path="dashboard"
              element={
                <ProtectedRoute requiredRole="STAFF">
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="classes"
              element={
                <ProtectedRoute requiredRole="STAFF">
                  <Classes />
                </ProtectedRoute>
              }
            />
            <Route
              path="members"
              element={
                <ProtectedRoute requiredRole="STAFF">
                  <Members />
                </ProtectedRoute>
              }
            />
            <Route
              path="rooms"
              element={
                <ProtectedRoute requiredRole="STAFF">
                  <Rooms />
                </ProtectedRoute>
              }
            />
            <Route
              path="recurring-sessions"
              element={
                <ProtectedRoute requiredRole="STAFF">
                  <RecurringSessions />
                </ProtectedRoute>
              }
            />
            <Route
              path="membership-alerts"
              element={
                <ProtectedRoute requiredRole="STAFF">
                  <MembershipAlerts />
                </ProtectedRoute>
              }
            />

            {/* Shared Routes (STAFF & INSTRUCTOR) */}
            <Route path="sessions" element={<Sessions />} />
            <Route path="bookings" element={<Bookings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
