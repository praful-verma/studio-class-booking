import { useState, useEffect } from 'react';
import { dashboardApi } from '../api/dashboardApi';
import { StatusPill } from '../components/StatusPill';

export const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await dashboardApi.getDashboardMetrics();
      if (res.status === 'success' && res.data) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="alert alert-danger">{error}</div>
        <button className="btn btn-primary" onClick={fetchDashboard}>Retry</button>
      </div>
    );
  }

  const { summary, bookingsByStatus, bookingsByClass, attendancePerWeek } = data || {};

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Operational Dashboard</h2>
          <p className="page-subtitle">Real-time studio activity metrics and attendance analytics</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchDashboard}>
          Refresh Metrics
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon">📅</div>
          <div className="kpi-content">
            <span className="kpi-label">Sessions Today</span>
            <span className="kpi-value">{summary?.sessionsToday || 0}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">🎟️</div>
          <div className="kpi-content">
            <span className="kpi-label">Bookings Today</span>
            <span className="kpi-value">{summary?.bookingsToday || 0}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">⚠️</div>
          <div className="kpi-content">
            <span className="kpi-label">No-Shows This Week</span>
            <span className="kpi-value text-danger">{summary?.noShowsThisWeek || 0}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">⏳</div>
          <div className="kpi-content">
            <span className="kpi-label">Waitlisted Members</span>
            <span className="kpi-value text-warning">{summary?.currentWaitlistedMembers || 0}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Bookings by Status */}
        <div className="card">
          <div className="card-header">
            <h3>Bookings by Status</h3>
          </div>
          <div className="card-body">
            <div className="status-summary-list">
              {bookingsByStatus && Object.entries(bookingsByStatus).map(([status, count]) => (
                <div key={status} className="status-summary-item">
                  <StatusPill status={status} />
                  <span className="status-count-value">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bookings by Class */}
        <div className="card">
          <div className="card-header">
            <h3>Bookings by Class Template</h3>
          </div>
          <div className="card-body">
            {(!bookingsByClass || bookingsByClass.length === 0) ? (
              <p className="empty-text">No bookings grouped by class found.</p>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Class Title</th>
                      <th>Discipline</th>
                      <th>Total Bookings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookingsByClass.map((c) => (
                      <tr key={c._id}>
                        <td><strong>{c.title}</strong></td>
                        <td><span className="discipline-tag">{c.discipline}</span></td>
                        <td><strong>{c.count}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 8-Week Attendance Trend */}
      <div className="card margin-top">
        <div className="card-header">
          <h3>8-Week Attendance Trend</h3>
        </div>
        <div className="card-body">
          {(!attendancePerWeek || attendancePerWeek.length === 0) ? (
            <p className="empty-text">No historical attendance data available.</p>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Week</th>
                    <th>Date Range</th>
                    <th>Attended Bookings</th>
                  </tr>
                </thead>
                <tbody>
                  {attendancePerWeek.map((w) => (
                    <tr key={w.weekIndex}>
                      <td><strong>{w.weekLabel}</strong></td>
                      <td className="text-muted">
                        {new Date(w.startDate).toLocaleDateString()} – {new Date(w.endDate).toLocaleDateString()}
                      </td>
                      <td>
                        <span className="badge-count">{w.count}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
