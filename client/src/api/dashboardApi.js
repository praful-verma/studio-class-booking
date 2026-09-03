import { fetchApi } from './client';

export const dashboardApi = {
  getDashboardMetrics: () => fetchApi('/dashboard')
};
