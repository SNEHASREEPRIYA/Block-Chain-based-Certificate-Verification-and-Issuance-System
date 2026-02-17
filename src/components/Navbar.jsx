import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <img src="/certificate-check.png" alt="Blockchain" className="navbar-logo" />
        <span className="navbar-title">Blockchain</span>
      </div>
      <div className="navbar-menu">
        <Link to="/" className="nav-item">Home</Link>
        <Link to="/issue" className="nav-item">Issue Certificate</Link>
        <Link to="/institutions" className="nav-item">Institutions</Link>
        <Link to="/contact" className="nav-item">Institution Registration Portal</Link>
      </div>

      <style jsx>{`
        .navbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 2rem;
          background: #2c3e50;
          color: white;
        }

        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .navbar-logo {
          width: 32px;
          height: 32px;
        }

        .navbar-title {
          font-size: 1.5rem;
          font-weight: 600;
        }

        .navbar-menu {
          display: flex;
          gap: 2rem;
        }

        .nav-item {
          color: white;
          text-decoration: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          transition: background-color 0.3s ease;
        }

        .nav-item:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </nav>
  );
}

export default Navbar;