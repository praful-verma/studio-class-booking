import { useState, useEffect } from 'react';
import { classApi } from '../api/classApi';
import { Modal } from '../components/Modal';

export const Classes = () => {
  const [classes, setClasses] = useState([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discipline: '',
    defaultDuration: 60,
    defaultCapacity: 20
  });

  useEffect(() => {
    fetchClasses();
  }, [includeArchived]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await classApi.getClasses(includeArchived);
      if (res.status === 'success' && res.data?.classes) {
        setClasses(res.data.classes);
      }
    } catch (err) {
      setError(err.message || 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingClass(null);
    setFormData({
      title: '',
      description: '',
      discipline: '',
      defaultDuration: 60,
      defaultCapacity: 20
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c) => {
    setEditingClass(c);
    setFormData({
      title: c.title || '',
      description: c.description || '',
      discipline: c.discipline || '',
      defaultDuration: c.defaultDuration || 60,
      defaultCapacity: c.defaultCapacity || 20
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingClass) {
        await classApi.updateClass(editingClass._id, formData);
        setSuccess('Class updated successfully!');
      } else {
        await classApi.createClass(formData);
        setSuccess('Class created successfully!');
      }
      setIsModalOpen(false);
      fetchClasses();
    } catch (err) {
      setError(err.message || 'Operation failed.');
    }
  };

  const handleArchive = async (id, title) => {
    if (!window.confirm(`Are you sure you want to archive "${title}"?`)) return;
    try {
      setError('');
      await classApi.archiveClass(id);
      setSuccess(`Class "${title}" archived.`);
      fetchClasses();
    } catch (err) {
      setError(err.message || 'Failed to archive class.');
    }
  };

  const handleRestore = async (id, title) => {
    try {
      setError('');
      await classApi.restoreClass(id);
      setSuccess(`Class "${title}" restored.`);
      fetchClasses();
    } catch (err) {
      setError(err.message || 'Failed to restore class.');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Class Definitions</h2>
          <p className="page-subtitle">Manage class templates, default durations, and max capacities</p>
        </div>
        <div className="page-actions">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
            Show Archived Classes
          </label>
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            + Create Class
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading classes...</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="card empty-card">
          <p>No classes found. Click "+ Create Class" to add your first template.</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Discipline</th>
                  <th>Description</th>
                  <th>Default Duration</th>
                  <th>Default Capacity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c._id} className={c.isArchived ? 'archived-row' : ''}>
                    <td><strong>{c.title}</strong></td>
                    <td><span className="discipline-tag">{c.discipline}</span></td>
                    <td className="text-muted">{c.description || '—'}</td>
                    <td>{c.defaultDuration} mins</td>
                    <td>{c.defaultCapacity} mats</td>
                    <td>
                      {c.isArchived ? (
                        <span className="status-pill danger">Archived</span>
                      ) : (
                        <span className="status-pill success">Active</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        {!c.isArchived && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenEditModal(c)}
                          >
                            Edit
                          </button>
                        )}

                        {c.isArchived ? (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleRestore(c._id, c.title)}
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleArchive(c._id, c.title)}
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
        title={editingClass ? 'Edit Class Template' : 'Create New Class Template'}
        onClose={() => setIsModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label>Class Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Vinyasa Flow Yoga"
            />
          </div>

          <div className="form-group">
            <label>Discipline / Category *</label>
            <input
              type="text"
              required
              value={formData.discipline}
              onChange={(e) => setFormData({ ...formData, discipline: e.target.value })}
              placeholder="e.g. Yoga, HIIT, Pilates"
            />
          </div>

          <div className="form-group full-width">
            <label>Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Class description and details"
            />
          </div>

          <div className="form-group">
            <label>Default Duration (mins) *</label>
            <input
              type="number"
              min={1}
              required
              value={formData.defaultDuration}
              onChange={(e) => setFormData({ ...formData, defaultDuration: Number(e.target.value) })}
            />
          </div>

          <div className="form-group">
            <label>Default Max Capacity *</label>
            <input
              type="number"
              min={1}
              required
              value={formData.defaultCapacity}
              onChange={(e) => setFormData({ ...formData, defaultCapacity: Number(e.target.value) })}
            />
          </div>

          <div className="modal-actions full-width">
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingClass ? 'Save Changes' : 'Create Class'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
