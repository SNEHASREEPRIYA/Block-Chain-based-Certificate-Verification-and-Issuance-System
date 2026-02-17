import React, { useState } from 'react';
import { ethers } from 'ethers';
import { saveCertificate } from '../utils/certificateService';

function IssuerPortal() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [certificateData, setCertificateData] = useState({
    studentName: '',
    studentAddress: '',
    certificateId: '',
    institutionName: '',
    courseName: '',
    grade: '',
    issueDate: '',
    expiryDate: ''
  });

  const handleIssue = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const issuerAddress = await signer.getAddress();
      
      // Save to database
      await saveCertificate({
        ...certificateData,
        issuer: issuerAddress,
        status: 'active'
      });
      
      // Reset form
      setCertificateData({
        studentName: '',
        studentAddress: '',
        certificateId: '',
        institutionName: '',
        courseName: '',
        grade: '',
        issueDate: '',
        expiryDate: ''
      });
      
      alert('Certificate issued successfully!');
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to issue certificate: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="issuer-container">
      <h2>Issue New Certificate</h2>
      <form onSubmit={handleIssue}>
        <div className="form-group">
          <input
            type="text"
            value={certificateData.studentName}
            onChange={(e) => setCertificateData({...certificateData, studentName: e.target.value})}
            placeholder="Student Name"
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <input
            type="text"
            value={certificateData.studentAddress}
            onChange={(e) => setCertificateData({...certificateData, studentAddress: e.target.value})}
            placeholder="Student Wallet Address"
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <input
            type="text"
            value={certificateData.certificateId}
            onChange={(e) => setCertificateData({...certificateData, certificateId: e.target.value})}
            placeholder="Certificate ID"
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <input
            type="text"
            value={certificateData.institutionName}
            onChange={(e) => setCertificateData({...certificateData, institutionName: e.target.value})}
            placeholder="Institution Name"
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <input
            type="text"
            value={certificateData.courseName}
            onChange={(e) => setCertificateData({...certificateData, courseName: e.target.value})}
            placeholder="Course Name"
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <input
            type="text"
            value={certificateData.grade}
            onChange={(e) => setCertificateData({...certificateData, grade: e.target.value})}
            placeholder="Grade"
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <input
            type="date"
            value={certificateData.issueDate}
            onChange={(e) => setCertificateData({...certificateData, issueDate: e.target.value})}
            placeholder="Issue Date"
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <input
            type="date"
            value={certificateData.expiryDate}
            onChange={(e) => setCertificateData({...certificateData, expiryDate: e.target.value})}
            placeholder="Expiry Date (Optional)"
            disabled={loading}
          />
        </div>
        {error && <div className="error-message">{error}</div>}
        <button type="submit" className="issue-button" disabled={loading}>
          {loading ? 'Issuing...' : 'Issue Certificate'}
        </button>
      </form>

      <style jsx>{`
        .issuer-container {
          max-width: 800px;
          margin: 2rem auto;
          padding: 2rem;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        h2 {
          color: #2c3e50;
          text-align: center;
          margin-bottom: 2rem;
          font-size: 2rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        input {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 1rem;
          transition: all 0.3s ease;
        }

        input:focus {
          border-color: #3498db;
          box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
          outline: none;
        }

        input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        .issue-button {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #3498db, #2980b9);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .issue-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #2980b9, #2c3e50);
          transform: translateY(-1px);
        }

        .issue-button:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
        }

        .error-message {
          color: #e74c3c;
          background: #fdf3f2;
          padding: 1rem;
          border-radius: 8px;
          margin-top: 1rem;
          text-align: center;
        }

        @media (max-width: 768px) {
          .issuer-container {
            margin: 1rem;
            padding: 1.5rem;
          }

          h2 {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}

export default IssuerPortal;