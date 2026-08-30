import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, Cpu } from 'lucide-react';

function App() {
  const [backendStatus, setBackendStatus] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setBackendStatus({ loading: false, data, error: null });
      })
      .catch((error) => {
        console.error('Error fetching backend health:', error);
        setBackendStatus({ loading: false, data: null, error: error.message });
      });
  }, []);

  return (
    <div className="app-container">
      <div className="glass-card">
        <div className="header">
          <div className="logo-badge">
            <Activity className="icon-pulse" />
          </div>
          <h1>Project & Task Tracker</h1>
          <p className="subtitle">System Status Diagnostics</p>
        </div>

        <div className="status-grid">
          {/* Frontend Status */}
          <div className="status-item">
            <div className="status-header">
              <Cpu className="status-icon text-cyan" />
              <h3>Frontend Services</h3>
            </div>
            <div className="indicator-wrapper">
              <span className="dot dot-active"></span>
              <span className="status-text">Online & Running</span>
            </div>
            <p className="description">React SPA bootstrapped with Vite 5.2. Port 5173</p>
          </div>

          {/* Backend Status */}
          <div className="status-item">
            <div className="status-header">
              <ShieldCheck className="status-icon text-emerald" />
              <h3>Backend Services</h3>
            </div>
            {backendStatus.loading ? (
              <div className="indicator-wrapper">
                <span className="dot dot-loading"></span>
                <span className="status-text">Connecting...</span>
              </div>
            ) : backendStatus.error ? (
              <>
                <div className="indicator-wrapper">
                  <span className="dot dot-error"></span>
                  <span className="status-text text-red">Offline</span>
                </div>
                <p className="error-message">{backendStatus.error}</p>
              </>
            ) : (
              <>
                <div className="indicator-wrapper">
                  <span className="dot dot-active"></span>
                  <span className="status-text">Online</span>
                </div>
                <p className="success-message">
                  {backendStatus.data.message}
                </p>
                <div className="metadata-tag">
                  Server Time: {new Date(backendStatus.data.timestamp).toLocaleTimeString()}
                </div>
              </>
            )}
            <p className="description">Express API server with Mongoose schemas. Port 5000</p>
          </div>
        </div>

        <div className="footer">
          <p>Antigravity Engine • Milestone 1 Setup Successful</p>
        </div>
      </div>
    </div>
  );
}

export default App;
