const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Reusable fetch wrapper for backend API calls.
 * Handles JWT token injection, response parsing, and error formatting.
 */
export const fetchApi = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // Special handling for file downloads like CSV
  if (options.responseType === 'blob' || options.responseType === 'text') {
    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = 'Failed to download file.';
      try {
        const json = JSON.parse(errorText);
        errorMsg = json.message || errorMsg;
      } catch (e) {
        errorMsg = errorText || errorMsg;
      }
      const err = new Error(errorMsg);
      err.status = response.status;
      throw err;
    }
    return options.responseType === 'blob' ? response.blob() : response.text();
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'An unexpected error occurred');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};
