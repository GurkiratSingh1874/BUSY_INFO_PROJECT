import React, { useState } from 'react';
import { Lock, Mail, AlertTriangle, Loader2, Shield, User } from 'lucide-react';

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed. Please check your credentials.');
      }

      // Success! Pass the user up to App
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
  };

  return (
    <div className="login-card-wrapper">
      <div className="glass-card login-card">
        {/* Brand & Header Section */}
        <div className="login-header">
          <div className="login-logo-badge">
            <Lock size={22} className="login-lock-icon" />
          </div>
          <h1 className="login-title">Sign In</h1>
          <p className="login-subtitle">Project & Task Tracker</p>
        </div>

        {error && (
          <div className="error-alert login-error-alert">
            <AlertTriangle className="error-icon" size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={16} />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={16} />
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary btn-login-submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="spinner" size={16} />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials for Fast Testing / Review */}
        <div className="login-demo-panel">
          <span className="demo-panel-label">Quick Demo Accounts</span>
          <div className="demo-accounts-grid">
            <button
              type="button"
              onClick={() => handleQuickFill('manager@example.com', 'manager123')}
              className="btn-demo-pill"
              title="Click to fill Manager credentials"
            >
              <Shield size={12} />
              <span>Manager</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('member1@example.com', 'member123')}
              className="btn-demo-pill"
              title="Click to fill Alice (Member) credentials"
            >
              <User size={12} />
              <span>Alice</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('member2@example.com', 'member123')}
              className="btn-demo-pill"
              title="Click to fill Bob (Member) credentials"
            >
              <User size={12} />
              <span>Bob</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
