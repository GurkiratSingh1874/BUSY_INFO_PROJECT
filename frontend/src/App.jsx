import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import Login from './components/Login';
import DashboardShell from './components/DashboardShell';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check auth session on application startup
  useEffect(() => {
    const checkAuth = async () => {
      // Skip auto-login check if this tab has not logged in during its session
      if (sessionStorage.getItem('isLoggedIn') !== 'true') {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          sessionStorage.removeItem('isLoggedIn');
        }
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (authenticatedUser) => {
    sessionStorage.setItem('isLoggedIn', 'true');
    setUser(authenticatedUser);
  };

  const handleLogoutSuccess = () => {
    sessionStorage.removeItem('isLoggedIn');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="app-loader">
        <Loader2 className="spinner loader-icon" />
        <p>Checking authentication session...</p>
      </div>
    );
  }

  return (
    <>
      {!user ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <DashboardShell user={user} onLogout={handleLogoutSuccess} />
      )}
    </>
  );
}

export default App;
