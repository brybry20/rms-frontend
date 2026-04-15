import logo from '../assets/logo2.png';
import './Navbar.css';

export default function Navbar({ user, onLogout, title }) {
  const initial = user?.username?.[0]?.toUpperCase() ?? '?';
  const role    = user?.role ? user.role.replace(/_/g, ' ') : null;

  return (
    <header className="navbar">
      <div className="navbar-band">
        <div className="navbar-inner">

          {/* Left */}
          <div className="navbar-left">
            <div className="navbar-logo-wrap">
              <img src={logo} alt="Deltaplus" />
            </div>
            <div className="navbar-sep" />
            <span className="navbar-title">{title ?? 'Deltaplus RMA'}</span>
          </div>

          {/* Right */}
          <div className="navbar-right">
            {role && (
              <span className="navbar-role">{role}</span>
            )}

            <div className="navbar-user">
              <div className="navbar-avatar">{initial}</div>
              <span className="navbar-username">{user?.username}</span>
            </div>

            <button className="navbar-logout" onClick={onLogout}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span>Logout</span>
            </button>
          </div>

        </div>
      </div>
      <div className="navbar-accent" />
    </header>
  );
}