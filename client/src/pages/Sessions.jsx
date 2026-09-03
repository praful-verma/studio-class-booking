import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { sessionApi } from '../api/sessionApi';
import { classApi } from '../api/classApi';
import { roomApi } from '../api/roomApi';
import { fetchApi } from '../api/client';
import { Modal } from '../components/Modal';
import { StatusPill } from '../components/StatusPill';

export const Sessions = () => {
  const { isStaff } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    classId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    primaryInstructor: '',
    room: '',
    coInstructors: [],
    duration: '',
    capacity: ''
  });

  useEffect(() => {
    fetchSessions();
    if (isStaff) {
      fetchDropdownResources();
    }
  }, [statusFilter, isStaff]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await sessionApi.getSessions({ status: statusFilter });
      if (res.status === 'success' && res.data?.sessions) {
        setSessions(res.data.sessions);
      }
    } catch (err) {
      setError(err.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownResources = async () => {
    try {
      const [classRes, roomRes, usersRes] = await Promise.all([
        classApi.getClasses(false),
        roomApi.getRooms(false),
        fetchApi('/users?role=INSTRUCTOR').catch(() => ({ data: { users: [] } }))
      ]);

      if (classRes.data?.classes) setClasses(classRes.data.classes);
      if (roomRes.data?.rooms) setRooms(roomRes.data.rooms);
      if (usersRes.data?.users) setInstructors(usersRes.data.users);
    } catch (e) {}
  };

  const handleOpenCreateModal = () => {
    setEditingSession(null);
    setFormError('');
    setFormData({
      classId: classes[0]?._id || '',
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      primaryInstructor: instructors[0]?._id || '',
      room: rooms[0]?._id || '',
      coInstructors: [],
      duration: '',
      capacity: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (s) => {
    setEditingSession(s);
    setFormError('');
    const dateStr = s.date ? new Date(s.date).toISOString().split('T')[0] : '';
    setFormData({
      classId: s.classId?._id || s.classId || '',
      date: dateStr,
      startTime: s.startTime || '09:00',
      primaryInstructor: s.primaryInstructor?._id || s.primaryInstructor || '',
      room: s.room?._id || s.room || '',
      coInstructors: (s.coInstructors || []).map(co => co._id || co),
      duration: s.duration || '',
      capacity: s.capacity || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccess('');

    try {
      const payload = {
        ...formData,
        duration: formData.duration ? Number(formData.duration) : undefined,
        capacity: formData.capacity ? Number(formData.capacity) : undefined
      };

      if (editingSession) {
        await sessionApi.updateSession(editingSession._id, payload);
        setSuccess('Session updated successfully!');
      } else {
        await sessionApi.createSession(payload);
        setSuccess('Session created successfully!');
      }
      setIsModalOpen(false);
      fetchSessions();
    } catch (err) {
      setFormError(err.message || 'Failed to save session due to scheduling conflict.');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this session?')) return;
    try {
      setError('');
      await sessionApi.cancelSession(id);
      setSuccess('Session cancelled successfully.');
      fetchSessions();
    } catch (err) {
      setError(err.message || 'Failed to cancel session.');
    }
  };

  const handleExportCsv = async (sessionId) => {
    try {
      setError('');
      const csvText = await sessionApi.exportAttendanceCsv(sessionId);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-${sessionId}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError(err.message || 'Failed to export attendance CSV.');
    }
  };

  const handleCoInstructorChange = (instId) => {
    const current = formData.coInstructors;
    if (current.includes(instId)) {
      setFormData({ ...formData, coInstructors: current.filter(id => id !== instId) });
    } else {
      setFormData({ ...formData, coInstructors: [...current, instId] });
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Class Sessions</h2>
          <p className="page-subtitle">
            {isStaff ? 'Schedule and manage studio class instances' : 'Your assigned teaching schedule'}
          </p>
        </div>
        {isStaff && (
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            + Schedule Session
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="filter-bar">
        <div className="form-group">
          <label>Status Filter:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading scheduled sessions...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="card empty-card">
          <p>No sessions found matching your criteria.</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Class Title</th>
                  <th>Date & Start Time</th>
                  <th>Room</th>
                  <th>Primary Instructor</th>
                  <th>Co-Instructors</th>
                  <th>Duration / Cap</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s._id} className={s.status === 'CANCELLED' ? 'archived-row' : ''}>
                    <td>
                      <strong>{s.classId?.title || 'Class'}</strong>
                      <div className="text-muted text-xs">{s.classId?.discipline}</div>
                    </td>
                    <td>
                      <div><strong>{new Date(s.date).toLocaleDateString()}</strong></div>
                      <div className="text-muted">{s.startTime} UTC</div>
                    </td>
                    <td>{s.room?.name || '—'}</td>
                    <td><strong>{s.primaryInstructor?.name || 'Unassigned'}</strong></td>
                    <td className="text-muted text-xs">
                      {s.coInstructors && s.coInstructors.length > 0
                        ? s.coInstructors.map(co => co.name).join(', ')
                        : 'None'}
                    </td>
                    <td>{s.duration}m / {s.capacity} cap</td>
                    <td><StatusPill status={s.status} /></td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleExportCsv(s._id)}
                          title="Export Attendance CSV"
                        >
                          📄 CSV
                        </button>

                        {isStaff && s.status !== 'CANCELLED' && (
                          <>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenEditModal(s)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleCancel(s._id)}
                            >
                              Cancel
                            </button>
                          </>
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
      {isStaff && (
        <Modal
          isOpen={isModalOpen}
          title={editingSession ? 'Edit Session' : 'Schedule New Class Session'}
          onClose={() => setIsModalOpen(false)}
        >
          {formError && <div className="alert alert-danger">{formError}</div>}

          <form onSubmit={handleSubmit} className="form-grid">
            <div className="form-group full-width">
              <label>Select Class *</label>
              <select
                required
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
              >
                <option value="">-- Choose Class --</option>
                {classes.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.title} ({c.discipline} — Default: {c.defaultDuration}m / {c.defaultCapacity} cap)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Session Date *</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Start Time (HH:MM) *</label>
              <input
                type="text"
                required
                placeholder="e.g. 09:30"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Primary Instructor *</label>
              <select
                required
                value={formData.primaryInstructor}
                onChange={(e) => setFormData({ ...formData, primaryInstructor: e.target.value })}
              >
                <option value="">-- Choose Primary Instructor --</option>
                {instructors.map(i => (
                  <option key={i._id} value={i._id}>{i.name} ({i.email})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Studio Room *</label>
              <select
                required
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
              >
                <option value="">-- Choose Room --</option>
                {rooms.map(r => (
                  <option key={r._id} value={r._id}>{r.name} (Cap: {r.capacity})</option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label>Co-Instructors (Optional)</label>
              <div className="checkbox-group">
                {instructors
                  .filter(i => i._id !== formData.primaryInstructor)
                  .map(i => (
                    <label key={i._id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.coInstructors.includes(i._id)}
                        onChange={() => handleCoInstructorChange(i._id)}
                      />
                      {i.name}
                    </label>
                  ))}
              </div>
            </div>

            <div className="form-group">
              <label>Duration (mins, optional override)</label>
              <input
                type="number"
                min={1}
                placeholder="Uses Class Default"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Capacity (mats, optional override)</label>
              <input
                type="number"
                min={1}
                placeholder="Uses Class Default"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              />
            </div>

            <div className="modal-actions full-width">
              <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingSession ? 'Save Changes' : 'Schedule Session'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
