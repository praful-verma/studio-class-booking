import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { alertApi } from '../api/alertApi';
import { StatusPill } from '../components/StatusPill';

export const MembershipAlerts = () => {
  const { refreshAlertBadge } = useOutletContext() || {};
  const [alerts, setAlerts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await alertApi.getAlerts();
      if (res.status === 'success' && res.data) {
        setAlerts(res.data.alerts || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      setError(err.message || 'Failed to load membership expiry alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (memberId, memberName) => {
    try {
      setError('');
      setSuccess('');
      await alertApi.dismissAlert(memberId);
      setSuccess(`Expiry alert for "${memberName}" dismissed.`);
      fetchAlerts();
      if (refreshAlertBadge) refreshAlertBadge();
    } catch (err) {
      setError(err.message || 'Failed to dismiss alert.');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Membership Expiry Alerts</h2>
          <p className="page-subtitle">Members whose membership has expired or will expire within the next 7 days (inclusive)</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchAlerts}>
          Refresh Alerts ({total})
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Checking active membership expiry alerts...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="card empty-card">
          <p>🎉 All clear! No active or pending membership expiry alerts.</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Email Address</th>
                  <th>Membership Expiry</th>
                  <th>Alert Status</th>
                  <th>Time Remaining</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.memberId}>
                    <td><strong>{a.name}</strong></td>
                    <td>{a.email}</td>
                    <td>{new Date(a.membershipExpiry).toLocaleDateString()}</td>
                    <td><StatusPill status={a.status} /></td>
                    <td>
                      {a.daysRemaining < 0 ? (
                        <span className="text-danger font-medium">Expired {Math.abs(a.daysRemaining)} days ago</span>
                      ) : a.daysRemaining === 0 ? (
                        <span className="text-warning font-medium">Expires Today</span>
                      ) : (
                        <span className="text-warning font-medium">Expires in {a.daysRemaining} days</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDismiss(a.memberId, a.name)}
                        title="Dismiss Alert"
                      >
                        🔕 Dismiss Alert
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
