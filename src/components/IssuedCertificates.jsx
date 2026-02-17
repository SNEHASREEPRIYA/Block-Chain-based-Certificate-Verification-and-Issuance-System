import React, { useState, useEffect } from 'react';

function IssuedCertificates() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  return (
    <div className="issued-certificates">
      <h2>Issued Certificates</h2>
      
      <div className="certificates-list">
        {loading ? (
          <div className="loading">Loading certificates...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : certificates.length === 0 ? (
          <div className="no-certificates">No certificates have been issued yet.</div>
        ) : (
          <div className="certificates-grid">
            {certificates.map((cert, index) => (
              <div key={index} className="certificate-card">
                <h3>Certificate #{cert.certificateId}</h3>
                <div className="certificate-details">
                  <p><strong>Student:</strong> {cert.studentAddress}</p>
                  <p><strong>Course:</strong> {cert.courseName}</p>
                  <p><strong>Grade:</strong> {cert.grade}</p>
                  <p><strong>Issue Date:</strong> {new Date(cert.issueDate).toLocaleDateString()}</p>
                  <p><strong>Status:</strong> {cert.isRevoked ? 'Revoked' : 'Active'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .issued-certificates {
          padding: 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        h2 {
          color: #2c3e50;
          margin-bottom: 2rem;
          text-align: center;
        }

        .certificates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 2rem;
        }

        .certificate-card {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          transition: transform 0.2s ease;
        }

        .certificate-card:hover {
          transform: translateY(-2px);
        }

        .certificate-card h3 {
          color: #3498db;
          margin-bottom: 1rem;
          font-size: 1.2rem;
        }

        .certificate-details p {
          margin: 0.5rem 0;
          color: #2c3e50;
        }

        .loading, .error-message, .no-certificates {
          text-align: center;
          padding: 2rem;
          color: #666;
        }

        .error-message {
          color: #e74c3c;
        }

        @media (max-width: 768px) {
          .issued-certificates {
            padding: 1rem;
          }

          .certificates-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  );
}

export default IssuedCertificates;