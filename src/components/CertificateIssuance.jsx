import React, { useState, useRef, useEffect } from 'react';
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
  const [currentAccount, setCurrentAccount] = useState('');
  const [registeredInstitution, setRegisteredInstitution] = useState(null);
  const certificateRef = useRef();

  // Check if current account is a registered institution
  useEffect(() => {
    const checkRegistration = async () => {
      try {
        const accounts = await window.ethereum?.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          const account = accounts[0].toLowerCase();
          setCurrentAccount(account);

          // Check if this account is registered
          const institutions = JSON.parse(sessionStorage.getItem('institutions')) || [];
          const registered = institutions.find(inst => inst.address.toLowerCase() === account);
          setRegisteredInstitution(registered);
        }
      } catch (err) {
        console.error('Error checking institution registration:', err);
      }
    };

    checkRegistration();

    // Listen for account changes
    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        const account = accounts[0].toLowerCase();
        setCurrentAccount(account);
        const institutions = JSON.parse(sessionStorage.getItem('institutions')) || [];
        const registered = institutions.find(inst => inst.address.toLowerCase() === account);
        setRegisteredInstitution(registered);
      }
    };

    window.ethereum?.on('accountsChanged', handleAccountsChanged);
    window.addEventListener('institutionsUpdated', checkRegistration);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.removeEventListener('institutionsUpdated', checkRegistration);
    };
  }, []);

  const downloadCertificatePDF = async () => {
    try {
      const element = certificateRef.current;

      // Use higher scale for better quality
      const canvas = await html2canvas(element, {
        scale: 4,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');

      // A4 landscape dimensions (297mm x 210mm)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();   // 297mm
      const pageHeight = pdf.internal.pageSize.getHeight();  // 210mm

      // Calculate aspect ratio and size to fit on page
      const imgAspectRatio = canvas.width / canvas.height;
      let imgWidth = pageWidth - 15;  // Leave margins
      let imgHeight = imgWidth / imgAspectRatio;

      // If too tall, scale down by height
      if (imgHeight > pageHeight - 10) {
        imgHeight = pageHeight - 15;
        imgWidth = imgHeight * imgAspectRatio;
      }

      // Center on page
      const xPos = (pageWidth - imgWidth) / 2;
      const yPos = (pageHeight - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', xPos, yPos, imgWidth, imgHeight);

      // Add hidden payload to PDF for robust upload-based verification
      if (issuanceResult?.certificatePayload) {
        const payloadText = `CERT_PAYLOAD:${JSON.stringify(issuanceResult.certificatePayload)}`;
        // Put small, near-invisible text in the bottom margin so human-readable layout isn't affected.
        pdf.setFontSize(1);
        pdf.setTextColor(255, 255, 255);
        pdf.text(payloadText, 5, pageHeight - 3);
      }

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

      // Check if institution is registered
      if (!registeredInstitution) {
        throw new Error('❌ Your institution is not registered. Please register your institution first before issuing certificates.');
      }

      // Check if certificate ID already exists globally (across all institutions)
      const allIssuedCertificates = JSON.parse(sessionStorage.getItem('allIssuedCertificates')) || [];
      const certificateExists = allIssuedCertificates.some(cert => cert.certificateId === formData.certificateId);

      if (certificateExists) {
        throw new Error('❌ Certificate already exists with this ID, please give another ID');
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

      const issuanceResult = await issueCertificateWithRecord({
        certificateId: formData.certificateId,
        studentAddress: formData.studentAddress,
        ipfsHash: 'QmTest' + Math.random().toString(36).substr(2, 9),
        metadata: metadata,
        institutionName: registeredInstitution.name,  // Use registered institution name
        courseName: formData.courseProgram,
        grade: formData.grade,
        expiryDate: expiryDate
      });

      // Store certificate data in sessionStorage for quick retrieval
      const certificateData = {
        certificateId: formData.certificateId,
        studentAddress: formData.studentAddress,
        studentName: formData.studentName,
        studentId: formData.studentId,
        courseProgram: formData.courseProgram,
        grade: formData.grade,
        completionDate: formData.completionDate,
        expiryDate: formData.expiryDate,  // Store as date string for display
        expiryDate_raw: expiryDate,  // Timestamp for hashing / contract
        institutionAddress: registeredInstitution.address,  // Use registered institution address
        institutionName: registeredInstitution.name,  // Use registered institution name
        institutionCategory: formData.institutionCategory,
        issueDate: new Date().toLocaleDateString(),
        issueDate_raw: Math.floor(Date.now() / 1000),
        issuer: accounts[0],
        transactionHash: issuanceResult.hash,
        certificateHash: issuanceResult.certificateHash,
        issuanceTimestamp: new Date().getTime()
      };

      // Save to sessionStorage with certificate ID as key
      sessionStorage.setItem(formData.certificateId, JSON.stringify(certificateData));

      // Also maintain a list of all issued certificates for current session
      let allCertificates = JSON.parse(sessionStorage.getItem('allIssuedCertificates')) || [];
      allCertificates.push({
        certificateId: formData.certificateId,
        studentAddress: formData.studentAddress,
        timestamp: new Date().getTime()
      });
      sessionStorage.setItem('allIssuedCertificates', JSON.stringify(allCertificates));

      // Embed the full canonical payload for hashing and verification
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const issueDateFormatted = new Date().toLocaleString();
      const certificatePayload = {
        certificateId: formData.certificateId,
        studentAddress: formData.studentAddress,
        institutionName: registeredInstitution.name,
        courseName: formData.courseProgram,
        grade: formData.grade,
        expiryDate: expiryDate,
        issueDate: issueDateFormatted,
        issueDate_raw: currentTimestamp,
        expiryDate_raw: expiryDate
      };

      // Store minimal QR payload: only certificateId (plain string).
      const qrData = formData.certificateId;
      setQrValue(qrData);

      setIssuanceResult({
        certificateId: formData.certificateId,
        hash: 'Certificate issued successfully',
        metadata: {
          ...formData,
          issueDate: issueDateFormatted
        },
        qrData: qrData,
        certificatePayload: certificatePayload,
        transactionHash: issuanceResult.hash,
        certificateHash: issuanceResult.certificateHash
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

      {/* Institution Registration Status Alert */}
      {currentAccount && (
        <div className={`institution-status-alert ${registeredInstitution ? 'registered' : 'not-registered'}`}>
          {registeredInstitution ? (
            <>
              <h3>✅ Institution Registered</h3>
              <p className="address-info">Wallet Address: <code>{currentAccount.slice(0, 10)}...{currentAccount.slice(-8)}</code></p>
            </>
          ) : (
            <>
              <h3>❌ Institution Not Registered</h3>
              <p className="warning-text">⚠️ Please register your institution first before issuing certificates.</p>
              <p>Wallet: <code>{currentAccount.slice(0, 10)}...{currentAccount.slice(-8)}</code></p>
            </>
          )}
        </div>
      )}

      {!issuanceResult ? (
        <form onSubmit={handleSubmit} className="certificate-form" style={{ opacity: registeredInstitution ? 1 : 0.5, pointerEvents: registeredInstitution ? 'auto' : 'none' }}>
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
            {/* Professional Certificate Template */}
            <div className="certificate-template">
              <div className="cert-unique-id-badge">ID: {issuanceResult.certificateId}</div>
              {/* Header */}
              <div className="cert-header">
                <div className="cert-logo">🎓</div>
                <h1 className="cert-title">CERTIFICATE OF ACHIEVEMENT</h1>
                <p className="cert-subtitle">Blockchain-Verified Credential</p>
              </div>

              {/* Border decoration */}
              <div className="cert-border-top"></div>

              {/* Main Content */}
              <div className="cert-body">
                <p className="cert-intro">This certifies that</p>
                <h2 className="cert-recipient">{issuanceResult.metadata.studentName}</h2>
                <p className="cert-middle">has successfully completed</p>
                <p className="cert-course">{issuanceResult.metadata.courseProgram}</p>
                <p className="cert-middle">with a grade of</p>
                <p className="cert-grade">{issuanceResult.metadata.grade}</p>

                {/* Footer border */}
                <div className="cert-border-bottom"></div>

                {/* Details Table */}
                <div className="cert-details">
                  <div className="cert-detail-row">
                    <span className="cert-detail-label">Certificate ID:</span>
                    <span className="cert-detail-value">{issuanceResult.certificateId}</span>
                  </div>
                  <div className="cert-detail-row">
                    <span className="cert-detail-label">Institution Name:</span>
                    <span className="cert-detail-value">{issuanceResult.metadata.institutionName || registeredInstitution?.name || 'Unknown'}</span>
                  </div>
                  <div className="cert-detail-row">
                    <span className="cert-detail-label">Institution Address:</span>
                    <span className="cert-detail-value">{registeredInstitution?.address || issuanceResult.metadata.institutionAddress || 'Unknown'}</span>
                  </div>
                  <div className="cert-detail-row">
                    <span className="cert-detail-label">Student Address:</span>
                    <span className="cert-detail-value">{issuanceResult.metadata.studentAddress}</span>
                  </div>
                  <div className="cert-detail-row">
                    <span className="cert-detail-label">Student ID:</span>
                    <span className="cert-detail-value">{issuanceResult.metadata.studentId}</span>
                  </div>
                  <div className="cert-detail-row">
                    <span className="cert-detail-label">Completion Date:</span>
                    <span className="cert-detail-value">{issuanceResult.metadata.completionDate}</span>
                  </div>
                  <div className="cert-detail-row">
                    <span className="cert-detail-label">Expiry Date:</span>
                    <span className="cert-detail-value">{issuanceResult.metadata.expiryDate}</span>
                  </div>
                  <div className="cert-detail-row">
                    <span className="cert-detail-label">Issue Date:</span>
                    <span className="cert-detail-value">{issuanceResult.metadata.issueDate}</span>
                  </div>
                  <div className="cert-detail-row">
                    <span className="cert-detail-label">Blockchain Verified:</span>
                    <span className="cert-detail-value">✅ Yes</span>
                  </div>
                </div>

                {/* QR Code */}
                <div className="cert-qr-section">
                  <p className="cert-qr-label">Verify</p>
                  <div className="cert-qr-box">
                    <QRCode
                      value={qrValue}
                      size={100}
                      level="M"
                      includeMargin={false}
                      renderAs="svg"
                    />
                  </div>
                  <p className="cert-qr-hint">Scan</p>
                </div>
              </div>

              {/* Signature area */}
              <div className="cert-signature">
                <p className="signature-line">_________________</p>
                <p className="signature-label">Authorized Issuer</p>
              </div>
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

        /* Professional Certificate Template Styles */
        .certificate-template {
          max-width: 760px;
          width: 100%;
          margin: 0 auto;
          padding: 28px 30px;
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          border: 3px solid #667eea;
          border-radius: 12px;
          position: relative;
          box-shadow: 0 10px 25px rgba(102, 126, 234, 0.2);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 460px;
          aspect-ratio: 11.7 / 8.3;
          overflow: hidden;
        }

        .cert-unique-id-badge {
          position: absolute;
          top: 14px;
          right: 16px;
          background: rgba(255, 255, 255, 0.95);
          color: #0f2a5c;
          border: 1px solid #667eea;
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 700;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
          z-index: 5;
        }

        .cert-header {
          text-align: center;
          margin-bottom: 15px;
        }

        .cert-logo {
          font-size: 45px;
          margin-bottom: 8px;
        }

        .cert-title {
          font-size: 36px;
          margin: 0;
          color: #667eea;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .cert-subtitle {
          font-size: 14px;
          color: #764ba2;
          margin: 5px 0 0 0;
          font-style: italic;
        }

        .cert-border-top {
          height: 2px;
          background: linear-gradient(90deg, transparent, #667eea, transparent);
          margin: 15px 0;
        }

        .cert-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: center;
          padding-right: 120px;
        }

        .cert-intro {
          font-size: 14px;
          color: #333;
          margin: 0 0 10px 0;
          font-weight: 500;
        }

        .cert-recipient {
          font-size: 32px;
          color: #667eea;
          margin: 0 0 15px 0;
          font-weight: 700;
          font-style: italic;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .cert-middle {
          font-size: 13px;
          color: #555;
          margin: 8px 0;
        }

        .cert-course {
          font-size: 18px;
          color: #764ba2;
          margin: 12px 0;
          font-weight: 600;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .cert-grade {
          font-size: 22px;
          color: #28a745;
          margin: 12px 0;
          font-weight: 700;
        }

        .cert-border-bottom {
          height: 2px;
          background: linear-gradient(90deg, transparent, #667eea, transparent);
          margin: 15px 0;
        }

        .cert-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 20px;
          margin: 15px 0;
          font-size: 11px;
          background: rgba(102, 126, 234, 0.05);
          padding: 12px 15px;
          border-radius: 6px;
          padding-right: 120px;
        }

        .cert-detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          overflow: hidden;
        }

        .cert-detail-label {
          color: #667eea;
          font-weight: 600;
          flex-shrink: 0;
        }

        .cert-detail-value {
          color: #333;
          font-family: monospace;
          font-size: 10px;
          text-align: right;
          margin-left: 10px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cert-qr-section {
          position: absolute;
          bottom: 16px;
          right: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 110px;
          background: rgba(255, 255, 255, 0.92);
          padding: 6px;
          border-radius: 8px;
          border: 1px solid rgba(102, 126, 234, 0.35);
          box-shadow: 0 0 4px rgba(0, 0, 0, 0.08);
          z-index: 2;
        }

        .cert-qr-box {
          width: 100%;
          max-width: 100%;
          padding: 4px;
          background: white;
          border: 2px solid #ddd;
          border-radius: 4px;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
        }

        .cert-qr-box canvas,
        .cert-qr-box img {
          width: 100%;
          height: auto;
          display: block;
        }

        .cert-qr-label {
          font-size: 9px;
          color: #667eea;
          font-weight: 600;
          margin: 0 0 3px 0;
          text-align: center;
        }

        .cert-qr-box {
          padding: 4px;
          background: white;
          border: 2px solid #ddd;
          border-radius: 4px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .cert-qr-hint {
          font-size: 8px;
          color: #999;
          margin: 3px 0 0 0;
          text-align: center;
        }

        .cert-signature {
          text-align: center;
          margin-top: 10px;
        }

        .signature-line {
          margin: 0;
          color: #333;
          font-size: 12px;
        }

        .signature-label {
          margin: 0;
          color: #667eea;
          font-size: 10px;
          font-weight: 600;
        }

        @media (max-width: 1024px) {
          .certificate-template {
            max-width: 100%;
            padding: 30px 35px;
          }

          .cert-body {
            padding-right: 100px;
          }

          .cert-details {
            padding-right: 100px;
          }
        }

        @media (max-width: 768px) {
          .certificate-container {
            padding: 1rem;
          }

          .certificate-template {
            max-width: 100%;
            padding: 25px 20px;
          }

          .cert-title {
            font-size: 28px;
          }

          .cert-recipient {
            font-size: 24px;
          }

          .cert-details {
            grid-template-columns: 1fr;
            padding-right: 80px;
          }

          .cert-body {
            padding-right: 80px;
          }

          .cert-qr-section {
            width: 80px;
            bottom: 15px;
            right: 15px;
          }
        }

        @media (max-width: 480px) {
          .certificate-template {
            padding: 20px 15px;
            aspect-ratio: auto;
          }

          .cert-logo {
            font-size: 30px;
          }

          .cert-title {
            font-size: 20px;
            letter-spacing: 0.5px;
          }

          .cert-subtitle {
            font-size: 12px;
          }

          .cert-recipient {
            font-size: 18px;
          }

          .cert-course {
            font-size: 14px;
          }

          .cert-grade {
            font-size: 18px;
          }

          .cert-details {
            grid-template-columns: 1fr;
            font-size: 9px;
            padding: 10px;
            padding-right: 75px;
          }

          .cert-body {
            padding-right: 75px;
          }

          .cert-qr-section {
            width: 70px;
          }

          .cert-detail-value {
            font-size: 8px;
          }
        }
      `}</style>
    </div>
  );
}

export default CertificateIssuance;
