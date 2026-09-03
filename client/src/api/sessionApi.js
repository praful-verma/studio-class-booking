import { fetchApi } from './client';

export const sessionApi = {
  getSessions: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.classId) query.append('classId', params.classId);
    if (params.roomId) query.append('roomId', params.roomId);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    const queryString = query.toString();
    return fetchApi(`/sessions${queryString ? `?${queryString}` : ''}`);
  },

  getSession: (id) => fetchApi(`/sessions/${id}`),

  createSession: (sessionData) =>
    fetchApi('/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData)
    }),

  updateSession: (id, sessionData) =>
    fetchApi(`/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(sessionData)
    }),

  cancelSession: (id) =>
    fetchApi(`/sessions/${id}/cancel`, {
      method: 'PATCH'
    }),

  generateRecurringSessions: (recurringData) =>
    fetchApi('/sessions/recurring', {
      method: 'POST',
      body: JSON.stringify(recurringData)
    }),

  exportAttendanceCsv: (sessionId) =>
    fetchApi(`/sessions/${sessionId}/attendance.csv`, {
      responseType: 'text'
    })
};
