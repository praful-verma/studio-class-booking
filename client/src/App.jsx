import { useState, useEffect } from 'react';

function App() {
  const [apiStatus, setApiStatus] = useState('Checking...');
  const [apiMessage, setApiMessage] = useState('');
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetch(`${apiUrl}/health`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'ok') {
          setApiStatus('Connected');
          setApiMessage(data.message);
        } else {
          setApiStatus('Disconnected');
        }
      })
      .catch(() => {
        setApiStatus('Offline');
      });
  }, [apiUrl]);

  return (
    <div className="container">
      <span className="badge">System Status</span>
      <h1>Class Booking</h1>
      <p className="subtitle">
        Project foundation successfully initialized. Application is ready for feature development.
      </p>

      <div className="status-card">
        <div className="status-item">
          <span className="status-label">Frontend Application</span>
          <span className="status-pill connected">Running</span>
        </div>
        <div className="status-item">
          <span className="status-label">Backend API URL</span>
          <span className="status-value">{apiUrl}</span>
        </div>
        <div className="status-item">
          <span className="status-label">API Health Status</span>
          <span className={`status-pill ${apiStatus === 'Connected' ? 'connected' : 'checking'}`}>
            {apiStatus}
          </span>
        </div>
        {apiMessage && (
          <div className="status-item">
            <span className="status-label">API Message</span>
            <span className="status-value">{apiMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
