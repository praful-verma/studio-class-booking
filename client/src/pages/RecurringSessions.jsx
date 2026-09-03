import { useState, useEffect } from 'react';
import { sessionApi } from '../api/sessionApi';
import { classApi } from '../api/classApi';
import { roomApi } from '../api/roomApi';
import { fetchApi } from '../api/client';
import { StatusPill } from '../components/StatusPill';

export const RecurringSessions = () => {
  const [classes, setClasses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const [formData, setFormData] = useState({
    classId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    weeklyPattern: ['MONDAY', 'WEDNESDAY'],
    startTime: '09:00',
    primaryInstructor: '',
    room: '',
    coInstructors: [],
    duration: '',
    capacity: ''
  });

  const DAYS_OF_WEEK = [
    { label: 'Monday', value: 'MONDAY' },
    { label: 'Tuesday', value: 'TUESDAY' },
    { label: 'Wednesday', value: 'WEDNESDAY' },
    { label: 'Thursday', value: 'THURSDAY' },
    { label: 'Friday', value: 'FRIDAY' },
    { label: 'Saturday', value: 'SATURDAY' },
    { label: 'Sunday', value: 'SUNDAY' }
  ];

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const [classRes, roomRes, usersRes] = await Promise.all([
        classApi.getClasses(false),
        roomApi.getRooms(false),
        fetchApi('/users?role=INSTRUCTOR').catch(() => ({ data: { users: [] } }))
      ]);

      if (classRes.data?.classes) {
        setClasses(classRes.data.classes);
        if (classRes.data.classes.length > 0) {
          setFormData(prev => ({ ...prev, classId: classRes.data.classes[0]._id }));
        }
      }
      if (roomRes.data?.rooms) {
        setRooms(roomRes.data.rooms);
        if (roomRes.data.rooms.length > 0) {
          setFormData(prev => ({ ...prev, room: roomRes.data.rooms[0]._id }));
        }
      }
      if (usersRes.data?.users) {
        setInstructors(usersRes.data.users);
        if (usersRes.data.users.length > 0) {
          setFormData(prev => ({ ...prev, primaryInstructor: usersRes.data.users[0]._id }));
        }
      }
    } catch (e) {}
  };

  const handleDayToggle = (dayVal) => {
    const current = formData.weeklyPattern;
    if (current.includes(dayVal)) {
      setFormData({ ...formData, weeklyPattern: current.filter(d => d !== dayVal) });
    } else {
      setFormData({ ...formData, weeklyPattern: [...current, dayVal] });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (formData.weeklyPattern.length === 0) {
      setError('Please select at least one day of the week for the weekly pattern.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        duration: formData.duration ? Number(formData.duration) : undefined,
        capacity: formData.capacity ? Number(formData.capacity) : undefined
      };

      const res = await sessionApi.generateRecurringSessions(payload);
      if (res.status === 'success' && res.data) {
        setResult(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate recurring sessions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Bulk Recurring Session Generator</h2>
          <p className="page-subtitle">Schedule recurring sessions across a date range with automatic conflict detection and skipping</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group full-width">
            <label>Select Class Template *</label>
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
            <label>Start Date *</label>
            <input
              type="date"
              required
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>End Date *</label>
            <input
              type="date"
              required
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>

          <div className="form-group full-width">
            <label>Weekly Pattern (Days of Week) *</label>
            <div className="checkbox-group">
              {DAYS_OF_WEEK.map(d => (
                <label key={d.value} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.weeklyPattern.includes(d.value)}
                    onChange={() => handleDayToggle(d.value)}
                  />
                  {d.label}
                </label>
              ))}
            </div>
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
              <option value="">-- Choose Instructor --</option>
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
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Generating Sessions...' : '⚡ Generate Recurring Sessions'}
            </button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      {result && (
        <div className="margin-top">
          <div className="summary-alert-banner">
            <div>
              <h3>Generation Summary</h3>
              <p>
                Successfully created <strong>{result.created}</strong> sessions. Skipped <strong>{result.skipped}</strong> occurrences due to conflicts or duplicates.
              </p>
            </div>
            <div className="summary-badge-group">
              <span className="status-pill success">Created: {result.created}</span>
              <span className="status-pill warning">Skipped: {result.skipped}</span>
            </div>
          </div>

          {/* Skipped Occurrences Table */}
          {result.skippedSessions && result.skippedSessions.length > 0 && (
            <div className="card margin-top">
              <div className="card-header">
                <h3>Skipped Occurrences & Conflict Reasons</h3>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Start Time</th>
                        <th>Skipped Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.skippedSessions.map((sk, idx) => (
                        <tr key={idx}>
                          <td><strong>{sk.date}</strong></td>
                          <td>{sk.startTime} UTC</td>
                          <td><span className="text-danger font-medium">{sk.reason}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Created Sessions Table */}
          {result.createdSessions && result.createdSessions.length > 0 && (
            <div className="card margin-top">
              <div className="card-header">
                <h3>Newly Created Sessions ({result.createdSessions.length})</h3>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Class Title</th>
                        <th>Date & Time</th>
                        <th>Room</th>
                        <th>Instructor</th>
                        <th>Duration / Cap</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.createdSessions.map((s) => (
                        <tr key={s._id}>
                          <td><strong>{s.classId?.title}</strong></td>
                          <td>
                            <div>{new Date(s.date).toLocaleDateString()}</div>
                            <div className="text-muted text-xs">{s.startTime} UTC</div>
                          </td>
                          <td>{s.room?.name}</td>
                          <td>{s.primaryInstructor?.name}</td>
                          <td>{s.duration}m / {s.capacity} cap</td>
                          <td><StatusPill status={s.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
