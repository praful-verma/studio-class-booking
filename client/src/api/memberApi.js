import { fetchApi } from './client';

export const memberApi = {
  getMembers: (search = '') =>
    fetchApi(`/members${search ? `?search=${encodeURIComponent(search)}` : ''}`),

  getMember: (id) => fetchApi(`/members/${id}`),

  createMember: (memberData) =>
    fetchApi('/members', {
      method: 'POST',
      body: JSON.stringify(memberData)
    }),

  updateMember: (id, memberData) =>
    fetchApi(`/members/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(memberData)
    })
};
