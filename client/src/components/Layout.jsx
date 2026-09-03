import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { alertApi } from '../api/alertApi';

export const Layout = () => {
  const { user, logout, isStaff, isInstructor } = useAuth();
  const navigate = useNavigate();
  const [alertBadgeCount, setAlertBadgeCount] = useState(0);

  useEffect(() => {
    if (isStaff) {
      alertApi.getAlertCount()
        .then(res => {
          if (res.status === 'success' && res.data?.total !== undefined) {
            setAlertBadgeCount(res.data.total);
          }
        })
        .catch(() => {});
    }
  }, [isStaff]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <header className="navbar">
        <div className="navbar-brand">
          <div className="brand-logo">🧘</div>
          <span className="brand-title">Class Booking</span>
        </div>

        <nav className="nav-links">
          {isStaff && (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                Dashboard
              </NavLink>
              <NavLink to="/classes" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                Classes
              </NavLink>
              <NavLink to="/members" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                Members
              </NavLink>
              <NavLink to="/rooms" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                Rooms
              </NavLink>
              <NavLink to="/sessions" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                Sessions
              </NavLink>
              <NavLink to="/bookings" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                Bookings
              </NavLink>
              <NavLink to="/recurring-sessions" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                Recurring
              </NavLink>
              <NavLink to="/membership-alerts" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                Alerts
                {alertBadgeCount > 0 && <span className="nav-badge">{alertBadgeCount}</span>}
              </NavLink>
            </>
          )}

          {isInstructor && (
            <>
              <NavLink to="/sessions" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                My Sessions
              </NavLink>
              <NavLink to="/bookings" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                My Bookings
              </NavLink>
            </>
          )}
        </nav>

        <div className="user-section">
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span className={`role-pill ${isStaff ? 'staff' : 'instructor'}`}>{user?.role}</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="main-content">
        <Outlet context={{ refreshAlertBadge: () => {
          if (isStaff) alertApi.getAlertCount().then(r => setAlertBadgeCount(r.data?.total || 0));
        }}} />
      </main>
    </div>
  );
};
