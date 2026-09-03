import { fetchApi } from './client';

export const roomApi = {
  getRooms: (includeArchived = false) =>
    fetchApi(`/rooms${includeArchived ? '?includeArchived=true' : ''}`),

  getRoom: (id) => fetchApi(`/rooms/${id}`),

  createRoom: (roomData) =>
    fetchApi('/rooms', {
      method: 'POST',
      body: JSON.stringify(roomData)
    }),

  updateRoom: (id, roomData) =>
    fetchApi(`/rooms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(roomData)
    }),

  archiveRoom: (id) =>
    fetchApi(`/rooms/${id}/archive`, {
      method: 'PATCH'
    }),

  restoreRoom: (id) =>
    fetchApi(`/rooms/${id}/restore`, {
      method: 'PATCH'
    })
};
