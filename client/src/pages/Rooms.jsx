import { useState, useEffect } from 'react';
import { roomApi } from '../api/roomApi';
import { Modal } from '../components/Modal';

export const Rooms = () => {
  const [rooms, setRooms] = useState([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    capacity: 20,
    location: ''
  });

  useEffect(() => {
    fetchRooms();
  }, [includeArchived]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await roomApi.getRooms(includeArchived);
      if (res.status === 'success' && res.data?.rooms) {
        setRooms(res.data.rooms);
      }
    } catch (err) {
      setError(err.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingRoom(null);
    setFormData({
      name: '',
      capacity: 20,
      location: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (r) => {
    setEditingRoom(r);
    setFormData({
      name: r.name || '',
      capacity: r.capacity || 20,
      location: r.location || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingRoom) {
        await roomApi.updateRoom(editingRoom._id, formData);
        setSuccess('Room updated successfully!');
      } else {
        await roomApi.createRoom(formData);
        setSuccess('Room created successfully!');
      }
      setIsModalOpen(false);
      fetchRooms();
    } catch (err) {
      setError(err.message || 'Operation failed.');
    }
  };

  const handleArchive = async (id, name) => {
    if (!window.confirm(`Are you sure you want to archive room "${name}"?`)) return;
    try {
      setError('');
      await roomApi.archiveRoom(id);
      setSuccess(`Room "${name}" archived.`);
      fetchRooms();
    } catch (err) {
      setError(err.message || 'Failed to archive room.');
    }
  };

  const handleRestore = async (id, name) => {
    try {
      setError('');
      await roomApi.restoreRoom(id);
      setSuccess(`Room "${name}" restored.`);
      fetchRooms();
    } catch (err) {
      setError(err.message || 'Failed to restore room.');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Studio Rooms</h2>
          <p className="page-subtitle">Manage studio spaces, locations, and seating/mat capacities</p>
        </div>
        <div className="page-actions">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
            Show Archived Rooms
          </label>
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            + Create Room
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading studio rooms...</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="card empty-card">
          <p>No studio rooms found. Click "+ Create Room" to add your first studio space.</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Room Name</th>
                  <th>Location / Floor</th>
                  <th>Capacity Cap</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r._id} className={r.isArchived ? 'archived-row' : ''}>
                    <td><strong>{r.name}</strong></td>
                    <td className="text-muted">{r.location || '—'}</td>
                    <td>{r.capacity} mats</td>
                    <td>
                      {r.isArchived ? (
                        <span className="status-pill danger">Archived</span>
                      ) : (
                        <span className="status-pill success">Active</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        {!r.isArchived && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenEditModal(r)}
                          >
                            Edit
                          </button>
                        )}

                        {r.isArchived ? (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleRestore(r._id, r.name)}
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleArchive(r._id, r.name)}
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form */}
      <Modal
        isOpen={isModalOpen}
        title={editingRoom ? 'Edit Studio Room' : 'Create New Studio Room'}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group full-width">
            <label>Room Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Studio A (Main Hall)"
            />
          </div>

          <div className="form-group">
            <label>Capacity *</label>
            <input
              type="number"
              min={1}
              required
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
            />
          </div>

          <div className="form-group">
            <label>Location / Floor</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. Floor 2, East Wing"
            />
          </div>

          <div className="modal-actions full-width">
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingRoom ? 'Save Changes' : 'Create Room'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
