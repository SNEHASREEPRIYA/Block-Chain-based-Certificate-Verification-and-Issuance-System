import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <img src="/certificate-check.png" alt="Blockchain" className="nav-logo" />
        <span>Certificate System</span>
      </div>

      <button className="hamburger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
        ☰
      </button>

      <div className={`nav-links ${mobileMenuOpen ? 'open' : ''}`}>
        <Link to="/" className="nav-link" onClick={() => setMobileMenuOpen(false)}>🏠 Home</Link>
        <Link to="/issue" className="nav-link" onClick={() => setMobileMenuOpen(false)}>📜 Issue Cert</Link>
        <Link to="/student-certs" className="nav-link" onClick={() => setMobileMenuOpen(false)}>👤 Student Certs</Link>
        <Link to="/verify-hash" className="nav-link" onClick={() => setMobileMenuOpen(false)}>🔐 Verify Hash</Link>
        <Link to="/contact" className="nav-link" onClick={() => setMobileMenuOpen(false)}>🏛️ Register Inst.</Link>
        <Link to="/institutions" className="nav-link" onClick={() => setMobileMenuOpen(false)}>📚 Institutions</Link>
      </div>

      <style jsx>{`
        .navigation {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          position: sticky;
          top: 0;
          z-index: 1000;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: white;
          font-size: 1.3rem;
          font-weight: 700;
          text-decoration: none;
        }

        .nav-logo {
          width: 32px;
          height: 32px;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
        }

        .hamburger {
          display: none;
          background: none;
          border: none;
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
        }

        .nav-links {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .nav-link {
          color: white;
          text-decoration: none;
          font-weight: 500;
          padding: 0.6rem 1rem;
          border-radius: 6px;
          transition: all 0.3s ease;
          white-space: nowrap;
          font-size: 0.95rem;
        }

        .nav-link:hover {
          background-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        @media (max-width: 768px) {
          .navigation {
            padding: 1rem;
          }

          .hamburger {
            display: block;
          }

          .nav-brand {
            font-size: 1.1rem;
          }

          .nav-links {
            position: absolute;
            top: 60px;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            flex-direction: column;
            gap: 0;
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }

          .nav-links.open {
            max-height: 400px;
          }

          .nav-link {
            width: 100%;
            padding: 1rem;
            border-radius: 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }

          .nav-link:hover {
            background-color: rgba(255, 255, 255, 0.15);
          }
        }
      `}</style>
    </nav>
  );
}

export default Navigation;