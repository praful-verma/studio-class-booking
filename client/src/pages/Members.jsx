import { useState, useEffect } from 'react';
import { memberApi } from '../api/memberApi';
import { Modal } from '../components/Modal';

export const Members = () => {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    membershipExpiry: ''
  });

  useEffect(() => {
    fetchMembers();
  }, [search]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await memberApi.getMembers(search);
      if (res.status === 'success' && res.data?.members) {
        setMembers(res.data.members);
      }
    } catch (err) {
      setError(err.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingMember(null);
    setFormData({
      name: '',
      email: '',
      membershipExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (m) => {
    setEditingMember(m);
    const expiryDateStr = m.membershipExpiry
      ? new Date(m.membershipExpiry).toISOString().split('T')[0]
      : '';
    setFormData({
      name: m.name || '',
      email: m.email || '',
      membershipExpiry: expiryDateStr
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingMember) {
        await memberApi.updateMember(editingMember._id, formData);
        setSuccess('Member updated successfully!');
      } else {
        await memberApi.createMember(formData);
        setSuccess('Member registered successfully!');
      }
      setIsModalOpen(false);
      fetchMembers();
    } catch (err) {
      setError(err.message || 'Operation failed.');
    }
  };

  const isExpired = (expiryDate) => {
    return new Date(expiryDate) < new Date(new Date().setHours(0,0,0,0));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Member Roster</h2>
          <p className="page-subtitle">Manage studio members, profile details, and membership expiration dates</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreateModal}>
          + Register Member
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="filter-bar">
        <div className="search-box full-width">
          <input
            type="text"
            placeholder="Search by member name or email address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading members...</p>
        </div>
      ) : members.length === 0 ? (
        <div className="card empty-card">
          <p>No members found matching your search.</p>
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
                  <th>Membership Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const expired = isExpired(m.membershipExpiry);
                  return (
                    <tr key={m._id}>
                      <td><strong>{m.name}</strong></td>
                      <td>{m.email}</td>
                      <td>{new Date(m.membershipExpiry).toLocaleDateString()}</td>
                      <td>
                        {expired ? (
                          <span className="status-pill danger">EXPIRED</span>
                        ) : (
                          <span className="status-pill success">ACTIVE</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEditModal(m)}
                        >
                          Edit Profile / Expiry
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form */}
      <Modal
        isOpen={isModalOpen}
        title={editingMember ? 'Edit Member Profile' : 'Register New Studio Member'}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group full-width">
            <label>Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Jane Doe"
            />
          </div>

          <div className="form-group full-width">
            <label>Email Address *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. jane@example.com"
            />
          </div>

          <div className="form-group full-width">
            <label>Membership Expiry Date *</label>
            <input
              type="date"
              required
              value={formData.membershipExpiry}
              onChange={(e) => setFormData({ ...formData, membershipExpiry: e.target.value })}
            />
          </div>

          <div className="modal-actions full-width">
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingMember ? 'Save Changes' : 'Register Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
