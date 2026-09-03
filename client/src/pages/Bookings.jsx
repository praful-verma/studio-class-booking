import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { bookingApi } from '../api/bookingApi';
import { memberApi } from '../api/memberApi';
import { sessionApi } from '../api/sessionApi';
import { classApi } from '../api/classApi';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { StatusPill } from '../components/StatusPill';

export const Bookings = () => {
  const { isStaff } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dropdowns
  const [members, setMembers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Create Booking Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormError, setCreateFormError] = useState('');
  const [createFormData, setCreateFormData] = useState({
    memberId: '',
    sessionId: '',
    staffNote: ''
  });

  // Action Modals State
  const [cancelBookingItem, setCancelBookingItem] = useState(null);
  const [cancelStaffNote, setCancelStaffNote] = useState('');

  const [attendanceItem, setAttendanceItem] = useState(null);
  const [attendanceStatus, setAttendanceStatus] = useState('ATTENDED');
  const [attendanceStaffNote, setAttendanceStaffNote] = useState('');
  const [actionError, setActionError] = useState('');

  // History Modal State
  const [historyBooking, setHistoryBooking] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [search, classId, sessionId, status, sortBy, order, page, limit]);

  useEffect(() => {
    fetchDropdowns();
  }, [isStaff]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await bookingApi.getBookings({
        search,
        classId,
        sessionId,
        status,
        sortBy,
        order,
        page,
        limit
      });

      if (res.status === 'success' && res.data) {
        setBookings(res.data.bookings || []);
        setTotal(res.data.total || 0);
        setPages(res.data.pages || 0);
      }
    } catch (err) {
      setError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [classRes, sessionRes] = await Promise.all([
        classApi.getClasses(false).catch(() => ({ data: { classes: [] } })),
        sessionApi.getSessions({ status: 'SCHEDULED' }).catch(() => ({ data: { sessions: [] } }))
      ]);

      if (classRes.data?.classes) setClasses(classRes.data.classes);
      if (sessionRes.data?.sessions) setSessions(sessionRes.data.sessions);

      if (isStaff) {
        const memRes = await memberApi.getMembers('').catch(() => ({ data: { members: [] } }));
        if (memRes.data?.members) setMembers(memRes.data.members);
      }
    } catch (e) {}
  };

  const handleOpenCreateModal = () => {
    setCreateFormError('');
    setCreateFormData({
      memberId: members[0]?._id || '',
      sessionId: sessions[0]?._id || '',
      staffNote: ''
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    setCreateFormError('');
    setSuccess('');

    try {
      const res = await bookingApi.createBooking(createFormData);
      const newStatus = res.data?.booking?.status;
      setSuccess(`Booking created successfully! Reservation Status: ${newStatus}`);
      setIsCreateModalOpen(false);
      fetchBookings();
    } catch (err) {
      setCreateFormError(err.message || 'Failed to create booking.');
    }
  };

  const handleOpenCancelModal = (booking) => {
    setActionError('');
    setCancelStaffNote('');
    setCancelBookingItem(booking);
  };

  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    setActionError('');
    setSuccess('');

    try {
      await bookingApi.cancelBooking(cancelBookingItem._id, cancelStaffNote);
      setSuccess('Booking cancelled successfully.');
      setCancelBookingItem(null);
      fetchBookings();
    } catch (err) {
      setActionError(err.message || 'Failed to cancel booking.');
    }
  };

  const handleOpenAttendanceModal = (booking) => {
    setActionError('');
    setAttendanceStatus('ATTENDED');
    setAttendanceStaffNote('');
    setAttendanceItem(booking);
  };

  const handleConfirmAttendance = async (e) => {
    e.preventDefault();
    setActionError('');
    setSuccess('');

    try {
      await bookingApi.settleAttendance(attendanceItem._id, attendanceStatus, attendanceStaffNote);
      setSuccess(`Attendance marked as ${attendanceStatus}.`);
      setAttendanceItem(null);
      fetchBookings();
    } catch (err) {
      setActionError(err.message || 'Failed to mark attendance.');
    }
  };

  const handleViewHistory = async (booking) => {
    setHistoryBooking(booking);
    setHistoryLogs([]);
    setHistoryLoading(true);

    try {
      const res = await bookingApi.getBookingHistory(booking._id);
      if (res.status === 'success' && res.data?.history) {
        setHistoryLogs(res.data.history);
      }
    } catch (err) {
      setError('Failed to load booking history log.');
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Member Reservations & Roster</h2>
          <p className="page-subtitle">
            {isStaff ? 'Search, filter, manage status transitions, and view immutable audit history' : 'Roster view for assigned sessions'}
          </p>
        </div>
        {isStaff && (
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            + Create Booking
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Filter and Search Bar */}
      <div className="filter-card">
        <div className="filter-grid">
          <div className="form-group">
            <label>Search Member:</label>
            <input
              type="text"
              placeholder="Name or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <div className="form-group">
            <label>Class Template:</label>
            <select value={classId} onChange={(e) => { setClassId(e.target.value); setPage(1); }}>
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c._id} value={c._id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Session:</label>
            <select value={sessionId} onChange={(e) => { setSessionId(e.target.value); setPage(1); }}>
              <option value="">All Sessions</option>
              {sessions.map(s => (
                <option key={s._id} value={s._id}>
                  {s.classId?.title} — {new Date(s.date).toLocaleDateString()} ({s.startTime})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Booking Status:</label>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              <option value="BOOKED">Booked</option>
              <option value="WAITLISTED">Waitlisted</option>
              <option value="ATTENDED">Attended</option>
              <option value="NO_SHOW">No Show</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="form-group">
            <label>Sort Field:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="createdAt">Booking Creation Time</option>
              <option value="startDateTime">Session Date & Time</option>
              <option value="status">Booking Status</option>
            </select>
          </div>

          <div className="form-group">
            <label>Order:</label>
            <select value={order} onChange={(e) => setOrder(e.target.value)}>
              <option value="desc">Descending (Newest first)</option>
              <option value="asc">Ascending (Oldest first)</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading booking records...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="card empty-card">
          <p>No bookings found matching your search and filter criteria.</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Class & Session Time</th>
                  <th>Room / Instructor</th>
                  <th>Booking Created</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b._id}>
                    <td>
                      <strong>{b.member?.name || 'Unknown Member'}</strong>
                      <div className="text-muted text-xs">{b.member?.email}</div>
                    </td>
                    <td>
                      <strong>{b.session?.classId?.title || 'Session'}</strong>
                      <div className="text-muted text-xs">
                        {b.session?.date ? new Date(b.session.date).toLocaleDateString() : ''} at {b.session?.startTime} UTC
                      </div>
                    </td>
                    <td>
                      <div>{b.session?.room?.name}</div>
                      <div className="text-muted text-xs">Inst: {b.session?.primaryInstructor?.name}</div>
                    </td>
                    <td className="text-muted text-xs">
                      {new Date(b.createdAt).toLocaleString()}
                    </td>
                    <td><StatusPill status={b.status} /></td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleViewHistory(b)}
                          title="View History Log"
                        >
                          📜 Audit Log
                        </button>

                        {isStaff && b.status === 'BOOKED' && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleOpenAttendanceModal(b)}
                          >
                            Mark Attendance
                          </button>
                        )}

                        {isStaff && (b.status === 'BOOKED' || b.status === 'WAITLISTED') && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleOpenCancelModal(b)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            pages={pages}
            total={total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </div>
      )}

      {/* Create Booking Modal */}
      {isStaff && (
        <Modal
          isOpen={isCreateModalOpen}
          title="Create Member Reservation"
          onClose={() => setIsCreateModalOpen(false)}
        >
          {createFormError && <div className="alert alert-danger">{createFormError}</div>}

          <form onSubmit={handleCreateBooking} className="form-grid">
            <div className="form-group full-width">
              <label>Select Member *</label>
              <select
                required
                value={createFormData.memberId}
                onChange={(e) => setCreateFormData({ ...createFormData, memberId: e.target.value })}
              >
                <option value="">-- Choose Member --</option>
                {members.map(m => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.email} — Expiry: {new Date(m.membershipExpiry).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label>Select Scheduled Session *</label>
              <select
                required
                value={createFormData.sessionId}
                onChange={(e) => setCreateFormData({ ...createFormData, sessionId: e.target.value })}
              >
                <option value="">-- Choose Session --</option>
                {sessions.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.classId?.title} — {new Date(s.date).toLocaleDateString()} ({s.startTime} UTC) — Room: {s.room?.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label>Staff Note / Reason (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Phone reservation requested by member"
                value={createFormData.staffNote}
                onChange={(e) => setCreateFormData({ ...createFormData, staffNote: e.target.value })}
              />
            </div>

            <div className="modal-actions full-width">
              <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Confirm Reservation
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Cancel Booking Modal */}
      <Modal
        isOpen={Boolean(cancelBookingItem)}
        title="Cancel Booking Reservation"
        onClose={() => setCancelBookingItem(null)}
      >
        {actionError && <div className="alert alert-danger">{actionError}</div>}
        <p className="margin-bottom">
          Are you sure you want to cancel the reservation for <strong>{cancelBookingItem?.member?.name}</strong>?
        </p>

        <form onSubmit={handleConfirmCancel} className="form-grid">
          <div className="form-group full-width">
            <label>Cancellation Reason / Staff Note</label>
            <input
              type="text"
              placeholder="e.g. Member requested cancellation via email"
              value={cancelStaffNote}
              onChange={(e) => setCancelStaffNote(e.target.value)}
            />
          </div>

          <div className="modal-actions full-width">
            <button type="button" className="btn btn-secondary" onClick={() => setCancelBookingItem(null)}>
              Abort
            </button>
            <button type="submit" className="btn btn-danger">
              Cancel Reservation
            </button>
          </div>
        </form>
      </Modal>

      {/* Settle Attendance Modal */}
      <Modal
        isOpen={Boolean(attendanceItem)}
        title="Mark Session Attendance"
        onClose={() => setAttendanceItem(null)}
      >
        {actionError && <div className="alert alert-danger">{actionError}</div>}
        <p className="margin-bottom">
          Mark attendance for <strong>{attendanceItem?.member?.name}</strong> on <strong>{attendanceItem?.session?.classId?.title}</strong>:
        </p>

        <form onSubmit={handleConfirmAttendance} className="form-grid">
          <div className="form-group full-width">
            <label>Attendance Status *</label>
            <select
              value={attendanceStatus}
              onChange={(e) => setAttendanceStatus(e.target.value)}
            >
              <option value="ATTENDED">Attended</option>
              <option value="NO_SHOW">No Show</option>
            </select>
          </div>

          <div className="form-group full-width">
            <label>Staff Note</label>
            <input
              type="text"
              placeholder="e.g. Checked in at front desk"
              value={attendanceStaffNote}
              onChange={(e) => setAttendanceStaffNote(e.target.value)}
            />
          </div>

          <div className="modal-actions full-width">
            <button type="button" className="btn btn-secondary" onClick={() => setAttendanceItem(null)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-success">
              Save Attendance
            </button>
          </div>
        </form>
      </Modal>

      {/* View History Audit Log Modal */}
      <Modal
        isOpen={Boolean(historyBooking)}
        title={`Audit Log — Booking #${historyBooking?._id}`}
        onClose={() => setHistoryBooking(null)}
      >
        {historyLoading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading history audit trail...</p>
          </div>
        ) : historyLogs.length === 0 ? (
          <p className="empty-text">No audit history entries found for this booking.</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table text-xs">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Transition</th>
                  <th>Changed By</th>
                  <th>Staff Note</th>
                </tr>
              </thead>
              <tbody>
                {historyLogs.map((log) => (
                  <tr key={log._id}>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td>
                      <span className="text-muted">{log.oldStatus}</span> &rarr; <strong>{log.newStatus}</strong>
                    </td>
                    <td>{log.changedBy?.name} ({log.changedBy?.role})</td>
                    <td className="text-muted">{log.staffNote || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
};
