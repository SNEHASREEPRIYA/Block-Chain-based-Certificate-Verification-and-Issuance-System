import React, { useState, useEffect } from 'react';

function IssuedCertificates() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load certificates from sessionStorage
    loadCertificates();
  }, []);

  const loadCertificates = () => {
    try {
      setLoading(true);

      // Get all issued certificate IDs from sessionStorage
      const allIssuedCerts = JSON.parse(sessionStorage.getItem('allIssuedCertificates')) || [];
      console.log('Loading issued certificates:', allIssuedCerts.length);

      if (allIssuedCerts.length === 0) {
        setCertificates([]);
        setError('');
        setLoading(false);
        return;
      }

      // Fetch full data for each certificate
      const certificatesList = [];
      for (const cert of allIssuedCerts) {
        const fullData = JSON.parse(sessionStorage.getItem(cert.certificateId));
        if (fullData) {
          certificatesList.push({
            certificateId: fullData.certificateId,
            studentAddress: fullData.studentAddress,
            studentName: fullData.studentName,
            studentId: fullData.studentId,
            courseName: fullData.courseProgram,
            grade: fullData.grade,
            completionDate: fullData.completionDate,
            expiryDate: fullData.expiryDate,
            issuer: fullData.issuer,
            issueDate: fullData.issueDate,
            transactionHash: fullData.transactionHash,
            certificateHash: fullData.certificateHash,
            isRevoked: false,
            issuanceTimestamp: fullData.issuanceTimestamp
          });
        }
      }

      setCertificates(certificatesList);
      setError('');
    } catch (err) {
      console.error('Error loading certificates:', err);
      setError('Failed to load certificates');
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadCertificates();
  };

  return (
    <div className="issued-certificates">
      <div className="certificates-header">
        <h2>📜 Issued Certificates</h2>
        <button onClick={handleRefresh} disabled={loading} className="refresh-btn">
          {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      <div className="certificates-list">
        {loading ? (
          <div className="loading">⏳ Loading certificates...</div>
        ) : error ? (
          <div className="error-message">❌ {error}</div>
        ) : certificates.length === 0 ? (
          <div className="no-certificates">📭 No certificates have been issued yet. Start by issuing your first certificate!</div>
        ) : (
          <div className="certificates-grid">
            {certificates.map((cert, index) => (
              <div key={index} className="certificate-card">
                <div className="certificate-header">
                  <h3>🎓 {cert.certificateId}</h3>
                  <span className="badge active">Active</span>
                </div>
                <div className="certificate-details">
                  <div className="detail-row">
                    <span className="label">👤 Student:</span>
                    <span className="value">{cert.studentName}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">🆔 Student ID:</span>
                    <span className="value">{cert.studentId}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">📚 Course:</span>
                    <span className="value">{cert.courseName}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">⭐ Grade:</span>
                    <span className="value">{cert.grade}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">📅 Issue Date:</span>
                    <span className="value">{new Date(cert.issueDate).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">⏰ Expiry:</span>
                    <span className="value">{new Date(cert.expiryDate).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">📍 Address:</span>
                    <span className="value address-value">{cert.studentAddress.substring(0, 10)}...{cert.studentAddress.substring(cert.studentAddress.length - 8)}</span>
                  </div>
                  <div className="detail-row hash-row">
                    <span className="label">🔐 Hash:</span>
                    <span className="value hash-value" title={cert.certificateHash}>{cert.certificateHash?.substring(0, 20)}...</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .issued-certificates {
          padding: 2rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          min-height: 400px;
        }

        .certificates-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        h2 {
          color: white;
          margin: 0;
          font-size: 1.8rem;
        }

        .refresh-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 2px solid white;
          padding: 0.7rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .refresh-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.05);
        }

        .refresh-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .certificates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 2rem;
          margin-top: 1.5rem;
        }

        .certificate-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          border-left: 5px solid #667eea;
        }

        .certificate-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .certificate-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          border-bottom: 2px solid #f0f0f0;
          padding-bottom: 1rem;
        }

        .certificate-header h3 {
          color: #667eea;
          margin: 0;
          font-size: 1.3rem;
        }

        .badge {
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .badge.active {
          background: #4caf50;
          color: white;
        }

        .certificate-details {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .detail-row.hash-row {
          border-top: 1px solid #f0f0f0;
          padding-top: 0.8rem;
        }

        .label {
          font-weight: 600;
          color: #667eea;
          min-width: 120px;
        }

        .value {
          color: #2c3e50;
          word-break: break-word;
        }

        .address-value {
          font-family: 'Courier New', monospace;
          background: #f5f5f5;
          padding: 0.3rem 0.6rem;
          border-radius: 4px;
          font-size: 0.85rem;
        }

        .hash-value {
          font-family: 'Courier New', monospace;
          background: #f5f5f5;
          padding: 0.3rem 0.6rem;
          border-radius: 4px;
          font-size: 0.75rem;
          cursor: help;
        }

        .loading, .error-message, .no-certificates {
          text-align: center;
          padding: 3rem 2rem;
          color: white;
          font-size: 1.1rem;
        }

        .error-message {
          color: #ffcdd2;
        }

        .no-certificates {
          font-size: 1.2rem;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .issued-certificates {
            padding: 1.5rem;
          }

          .certificates-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          h2 {
            font-size: 1.5rem;
          }

          .certificates-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .certificate-card {
            padding: 1.2rem;
          }

          .detail-row {
            flex-direction: column;
            gap: 0.3rem;
          }

          .label {
            min-width: auto;
          }
        }
      `}</style>
    </div>
  );
}

export default IssuedCertificates;