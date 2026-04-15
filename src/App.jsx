import { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import DealerDashboard from './components/DealerDashboard';
import AuthorizerDashboard from './components/AuthorizerDashboard';
import ApproverDashboard from './components/ApproverDashboard';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('login');
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in from sessionStorage (not localStorage)
    const storedUser = sessionStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      
      if (userData.role === 'dealer') setCurrentView('dealer');
      else if (userData.role === 'authorizer') setCurrentView('authorizer');
      else if (userData.role === 'approver') setCurrentView('approver');
      else if (userData.role === 'super_admin') setCurrentView('admin');
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    // Use sessionStorage instead of localStorage
    sessionStorage.setItem('user', JSON.stringify(userData));
    
    if (userData.role === 'dealer') setCurrentView('dealer');
    else if (userData.role === 'authorizer') setCurrentView('authorizer');
    else if (userData.role === 'approver') setCurrentView('approver');
    else if (userData.role === 'super_admin') setCurrentView('admin');
  };

  const handleLogout = () => {
    setUser(null);
    // Clear sessionStorage only for this tab
    sessionStorage.removeItem('user');
    setCurrentView('login');
  };

  const handleSwitchToRegister = () => setCurrentView('register');
  const handleSwitchToLogin = () => setCurrentView('login');

  return (
    <div className="app">
      {currentView === 'login' && (
        <Login onLogin={handleLogin} onSwitch={handleSwitchToRegister} />
      )}
      {currentView === 'register' && (
        <Register onSwitch={handleSwitchToLogin} />
      )}
      {currentView === 'dealer' && user && (
        <DealerDashboard user={user} onLogout={handleLogout} />
      )}
      {currentView === 'authorizer' && user && (
        <AuthorizerDashboard user={user} onLogout={handleLogout} />
      )}
      {currentView === 'approver' && user && (
        <ApproverDashboard user={user} onLogout={handleLogout} />
      )}
      {currentView === 'admin' && user && (
        <AdminDashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;