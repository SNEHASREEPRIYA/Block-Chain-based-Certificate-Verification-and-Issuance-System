import React, { useState, useRef } from 'react';
import { ethers } from 'ethers';
import QRCode from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import WalletConnect from './WalletConnect';
import { issueCertificateWithRecord } from '../utils/certificateContract';
import './CertificateIssuance.css';

function CertificateIssuance() {
  const [formData, setFormData] = useState({
    certificateId: '',
    studentName: '',
    studentId: '',
    courseProgram: '',
    grade: '',
    completionDate: '',
    institutionAddress: '',
    studentAddress: '',
    expiryDate: ''
  });

  const [issuanceResult, setIssuanceResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrValue, setQrValue] = useState('');
  const certificateRef = useRef();

  const downloadCertificatePDF = async () => {
    try {
      const element = certificateRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Certificate-${issuanceResult.certificateId}.pdf`);
    } catch (err) {
      alert('Failed to download certificate: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask to issue certificates');
      }

      if (!formData.certificateId.trim()) {
        throw new Error('Certificate ID is required and must be unique');
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const metadata = JSON.stringify({
        studentName: formData.studentName,
        studentId: formData.studentId,
        courseProgram: formData.courseProgram,
        grade: formData.grade,
        completionDate: formData.completionDate,
        issueDate: new Date().toISOString(),
        institutionCategory: formData.institutionCategory,
        issuer: accounts[0]
      });

      const expiryDate = Math.floor(new Date(formData.expiryDate).getTime() / 1000);

      await issueCertificateWithRecord({
        certificateId: formData.certificateId,
        studentAddress: formData.studentAddress,
        ipfsHash: 'QmTest' + Math.random().toString(36).substr(2, 9),
        metadata: metadata,
        institutionName: 'Institution',  // Default institution name
        courseName: formData.courseProgram,
        grade: formData.grade,
        expiryDate: expiryDate
      });

      const qrData = JSON.stringify({
        certificateId: formData.certificateId,
        studentAddress: formData.studentAddress,
        issuerAddress: accounts[0]
      });

      setQrValue(qrData);

      setIssuanceResult({
        certificateId: formData.certificateId,
        hash: 'Certificate issued successfully',
        metadata: formData,
        qrData: qrData
      });

      setFormData({
        certificateId: '',
        studentName: '',
        studentId: '',
        courseProgram: '',
        grade: '',
        completionDate: '',
        institutionAddress: '',
        studentAddress: '',
        expiryDate: ''
      });

    } catch (err) {
      setError(err.message || 'Failed to issue certificate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="certificate-container">
      <h2 className="title">🎓 Issue Blockchain Certificate</h2>
      <WalletConnect />

      {!issuanceResult ? (
        <form onSubmit={handleSubmit} className="certificate-form">
          <div className="form-group">
            <label>📋 Certificate ID (Must be unique)</label>
            <input
              type="text"
              placeholder="e.g., CERT-2024-001"
              value={formData.certificateId}
              onChange={(e) => setFormData({ ...formData, certificateId: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>👤 Student Name</label>
            <input
              type="text"
              placeholder="Enter student name"
              value={formData.studentName}
              onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>🆔 Student ID</label>
            <input
              type="text"
              placeholder="Enter student ID"
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>📚 Course/Program</label>
            <input
              type="text"
              placeholder="e.g., Data Science"
              value={formData.courseProgram}
              onChange={(e) => setFormData({ ...formData, courseProgram: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>⭐ Grade</label>
            <input
              type="text"
              placeholder="e.g., A+"
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>📅 Completion Date</label>
            <input
              type="date"
              value={formData.completionDate}
              onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>⏰ Expiry Date</label>
            <input
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              required
            />
          </div>



          <div className="form-group">
            <label>🔗 Institution Blockchain Address</label>
            <input
              type="text"
              placeholder="0x..."
              value={formData.institutionAddress}
              onChange={(e) => setFormData({ ...formData, institutionAddress: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>📍 Student Blockchain Address</label>
            <input
              type="text"
              placeholder="0x..."
              value={formData.studentAddress}
              onChange={(e) => setFormData({ ...formData, studentAddress: e.target.value })}
              required
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? '🔄 Issuing Certificate...' : '✅ Issue Certificate'}
          </button>

          {error && <div className="result-box error">❌ {error}</div>}
        </form>
      ) : (
        <div className="result-container">
          <div ref={certificateRef} className="certificate-content">
            <div className="result-box success">
              <h3>✅ Certificate Issued Successfully!</h3>
              <p><strong>Certificate ID:</strong> {issuanceResult.certificateId}</p>
              <p><strong>Student:</strong> {issuanceResult.metadata.studentName}</p>
              <p><strong>Student ID:</strong> {issuanceResult.metadata.studentId}</p>
              <p><strong>Course:</strong> {issuanceResult.metadata.courseProgram}</p>
              <p><strong>Grade:</strong> {issuanceResult.metadata.grade}</p>
              <p><strong>Completion Date:</strong> {issuanceResult.metadata.completionDate}</p>
              <p><strong>Institution Address:</strong> {issuanceResult.metadata.institutionAddress}</p>
              <p><strong>Issue Date:</strong> {new Date(issuanceResult.metadata.issueDate).toLocaleDateString()}</p>
            </div>

            <div className="qr-container">
              <h3>📱 QR Code (Share with Student)</h3>
              <div className="qr-box">
                <QRCode
                  value={qrValue}
                  size={256}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="qr-note">Student can scan this QR code to verify the certificate</p>
            </div>
          </div>

          <div className="action-buttons">
            <button className="download-btn" onClick={downloadCertificatePDF}>
              📥 Download Certificate (PDF)
            </button>
            <button
              className="reset-btn"
              onClick={() => {
                setIssuanceResult(null);
                setQrValue('');
              }}
            >
              🔄 Issue Another Certificate
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .certificate-container {
          max-width: 700px;
          margin: 2rem auto;
          padding: 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .title {
          text-align: center;
          color: #667eea;
          margin-bottom: 1.5rem;
          font-size: 1.8rem;
        }

        .certificate-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        label {
          font-weight: 600;
          color: #333;
          margin-bottom: 0.5rem;
        }

        input, select {
          padding: 0.75rem;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.3s ease;
        }

        input:focus, select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .file-upload {
          position: relative;
        }

        .file-name {
          margin-top: 0.5rem;
          color: #667eea;
          font-size: 0.9rem;
        }

        .submit-btn {
          padding: 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.3s ease;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .result-box {
          padding: 1.5rem;
          border-radius: 8px;
          margin-top: 1rem;
        }

        .result-box.success {
          background: #d4edda;
          color: #155724;
          border: 2px solid #28a745;
        }

        .result-box.error {
          background: #f8d7da;
          color: #721c24;
          border: 2px solid #f5c6cb;
        }

        .result-container {
          text-align: center;
        }

        .qr-container {
          margin: 2rem 0;
          padding: 2rem;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .qr-container h3 {
          color: #667eea;
          margin-bottom: 1rem;
        }

        .qr-box {
          display: flex;
          justify-content: center;
          padding: 1rem;
          background: white;
          border-radius: 8px;
          border: 2px solid #ddd;
        }

        .qr-note {
          color: #666;
          font-size: 0.9rem;
          margin-top: 1rem;
        }

        .reset-btn {
          padding: 0.75rem 1.5rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .reset-btn:hover {
          background: #764ba2;
        }

        .certificate-content {
          width: 100%;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 1.5rem;
          flex-wrap: wrap;
        }

        .download-btn {
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.3s ease;
        }

        .download-btn:hover {
          transform: translateY(-2px);
        }

        @media (max-width: 768px) {
          .certificate-container {
            padding: 1rem;
          }

          .qr-box {
            padding: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}

export default CertificateIssuance;
