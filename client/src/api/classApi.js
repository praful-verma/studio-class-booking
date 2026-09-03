import { fetchApi } from './client';

export const classApi = {
  getClasses: (includeArchived = false) =>
    fetchApi(`/classes${includeArchived ? '?includeArchived=true' : ''}`),

  getClass: (id) => fetchApi(`/classes/${id}`),

  createClass: (classData) =>
    fetchApi('/classes', {
      method: 'POST',
      body: JSON.stringify(classData)
    }),

  updateClass: (id, classData) =>
    fetchApi(`/classes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(classData)
    }),

  archiveClass: (id) =>
    fetchApi(`/classes/${id}/archive`, {
      method: 'PATCH'
    }),

  restoreClass: (id) =>
    fetchApi(`/classes/${id}/restore`, {
      method: 'PATCH'
    })
};
