import React, { useState } from 'react';
import InstitutionRegistration from './InstitutionRegistration';
import CertificateIssuance from './CertificateIssuance';

function AdminPanel() {
  const [activeTab, setActiveTab] = useState('registration');

  return (
    <div className="admin-container">
      <h2>Admin Panel</h2>
      
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'registration' ? 'active' : ''}`}
          onClick={() => setActiveTab('registration')}
        >
          Institution Registration
        </button>
        <button
          className={`tab-button ${activeTab === 'issuance' ? 'active' : ''}`}
          onClick={() => setActiveTab('issuance')}
        >
          Issue Certificate
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'registration' ? (
          <InstitutionRegistration />
        ) : (
          <CertificateIssuance />
        )}
      </div>

      <style jsx>{`
        .admin-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 24px;
        }

        h2 {
          color: #1976d2;
          margin-bottom: 24px;
          text-align: center;
        }

        .tab-navigation {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }

        .tab-button {
          flex: 1;
          padding: 12px 24px;
          background: #f5f5f5;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          color: #666;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .tab-button:hover {
          background: #e0e0e0;
        }

        .tab-button.active {
          background: #2196f3;
          color: white;
        }

        .tab-content {
          background: #f8f9fa;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .admin-button {
          background: #4CAF50;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        }

        .admin-button:disabled {
          background: #cccccc;
          cursor: not-allowed;
        }

        .error-message {
          color: #f44336;
          margin-top: 10px;
        }

        .success-message {
          color: #4CAF50;
          margin-top: 10px;
        }
      `}</style>
    </div>
  );
}

export default AdminPanel;