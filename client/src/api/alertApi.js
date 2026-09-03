import { fetchApi } from './client';

export const alertApi = {
  getAlerts: () => fetchApi('/membership-alerts'),
  getAlertCount: () => fetchApi('/membership-alerts/count'),
  dismissAlert: (memberId) =>
    fetchApi(`/membership-alerts/${memberId}/dismiss`, {
      method: 'PATCH'
    })
};
