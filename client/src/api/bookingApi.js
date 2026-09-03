import { fetchApi } from './client';

export const bookingApi = {
  getBookings: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.classId) query.append('classId', params.classId);
    if (params.sessionId) query.append('sessionId', params.sessionId);
    if (params.status) query.append('status', params.status);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.order) query.append('order', params.order);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryString = query.toString();
    return fetchApi(`/bookings${queryString ? `?${queryString}` : ''}`);
  },

  getBooking: (id) => fetchApi(`/bookings/${id}`),

  getBookingHistory: (id) => fetchApi(`/bookings/${id}/history`),

  createBooking: (bookingData) =>
    fetchApi('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData)
    }),

  cancelBooking: (id, staffNote) =>
    fetchApi(`/bookings/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ staffNote })
    }),

  settleAttendance: (id, status, staffNote) =>
    fetchApi(`/bookings/${id}/attendance`, {
      method: 'PATCH',
      body: JSON.stringify({ status, staffNote })
    })
};
