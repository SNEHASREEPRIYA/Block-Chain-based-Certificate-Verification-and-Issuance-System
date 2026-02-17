import React, { useState } from 'react';
import QRCode from 'qrcode.react';
import { verifyCertificate } from '../utils/certificateContract';

function HashVerification() {
    const [certificateId, setCertificateId] = useState('');
    const [verificationResult, setVerificationResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [qrInput, setQrInput] = useState('');
    const [showQRScanner, setShowQRScanner] = useState(false);

    const handleVerify = async () => {
        if (!certificateId.trim()) {
            setError('Please enter a Certificate ID');
            setVerificationResult(null);
            return;
        }

        setLoading(true);
        setError('');
        setVerificationResult(null);

        try {
            console.log('Verifying certificate:', certificateId);
            const result = await verifyCertificate(certificateId);

            setVerificationResult({
                certificateId: certificateId,
                isValid: result.isValid,
                certificate: result.certificate,
                timestamp: new Date().toLocaleString()
            });
        } catch (err) {
            console.error('Verification error:', err);
            setError(err.message || 'Failed to verify certificate. Please check the Certificate ID.');
            
            // Still show result box with invalid status
            setVerificationResult({
                certificateId: certificateId,
                isValid: false,
                error: err.message || 'Certificate not found or invalid',
                timestamp: new Date().toLocaleString()
            });
        } finally {
            setLoading(false);
        }
    };

    const handleQRScan = (qrData) => {
        try {
            const data = JSON.parse(qrData);
            setCertificateId(data.certificateId);
            setShowQRScanner(false);
        } catch (err) {
            setError('Invalid QR code format');
        }
    };

    return (
        <div className="verification-container">
            <h2 className="title">🔐 Verify Certificate Hash</h2>

            <div className="verification-methods">
                <div className="method-tabs">
                    <button
                        className={`tab ${!showQRScanner ? 'active' : ''}`}
                        onClick={() => setShowQRScanner(false)}
                    >
                        🆔 Enter Certificate ID
                    </button>
                    <button
                        className={`tab ${showQRScanner ? 'active' : ''}`}
                        onClick={() => setShowQRScanner(true)}
                    >
                        📱 Scan QR Code
                    </button>
                </div>

                {!showQRScanner ? (
                    <div className="input-section">
                        <label>📋 Certificate ID</label>
                        <div className="input-group">
                            <input
                                type="text"
                                placeholder="Enter Certificate ID (e.g., CERT-2024-001)"
                                value={certificateId}
                                onChange={(e) => setCertificateId(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
                            />
                            <button onClick={handleVerify} disabled={loading} className="verify-btn">
                                {loading ? '⏳ Verifying...' : '✅ Verify'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="qr-scanner-section">
                        <p className="scanner-info">📱 Scan the QR code from the certificate using your device camera</p>
                        <div className="qr-input-box">
                            <textarea
                                placeholder='Paste QR code data or manually enter: {"certificateId":"CERT-001","studentAddress":"0x...","issuerAddress":"0x..."}'
                                value={qrInput}
                                onChange={(e) => setQrInput(e.target.value)}
                                rows="5"
                            />
                            <button
                                onClick={() => handleQRScan(qrInput)}
                                disabled={!qrInput.trim()}
                                className="qr-process-btn"
                            >
                                🔍 Process QR Data
                            </button>
                        </div>
                        {certificateId && (
                            <div className="qr-success">
                                ✅ Certificate ID extracted: <strong>{certificateId}</strong>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {error && <div className="alert error">❌ {error}</div>}

            {verificationResult && (
                <div className={`result-section ${verificationResult.isValid ? 'valid' : 'invalid'}`}>
                    <div className="result-header">
                        {verificationResult.isValid ? (
                            <>
                                <h3>✅ CERTIFICATE VERIFIED</h3>
                                <p className="status-badge valid">VALID & AUTHENTIC</p>
                            </>
                        ) : (
                            <>
                                <h3>❌ CERTIFICATE INVALID</h3>
                                <p className="status-badge invalid">
                                    {verificationResult.error || 'NOT FOUND ON BLOCKCHAIN'}
                                </p>
                            </>
                        )}
                        <p className="verification-time">Verified at: {verificationResult.timestamp}</p>
                    </div>

                    {verificationResult.isValid && verificationResult.certificate && (
                        <div className="certificate-details">
                            <h4>📄 Certificate Details</h4>
                            <div className="details-grid">
                                <div className="detail-item">
                                    <label>📋 Certificate ID:</label>
                                    <span>{verificationResult.certificate.certificateId}</span>
                                </div>
                                <div className="detail-item">
                                    <label>👤 Student Address:</label>
                                    <code>{verificationResult.certificate.studentAddress}</code>
                                </div>
                                <div className="detail-item">
                                    <label>🏛️ Institution:</label>
                                    <span>{verificationResult.certificate.institutionName}</span>
                                </div>
                                <div className="detail-item">
                                    <label>📚 Course:</label>
                                    <span>{verificationResult.certificate.courseName}</span>
                                </div>
                                <div className="detail-item">
                                    <label>⭐ Grade:</label>
                                    <span>{verificationResult.certificate.grade}</span>
                                </div>
                                <div className="detail-item">
                                    <label>👨‍💼 Issuer:</label>
                                    <code>{verificationResult.certificate.issuer.slice(0, 10)}...{verificationResult.certificate.issuer.slice(-8)}</code>
                                </div>
                                <div className="detail-item">
                                    <label>📅 Issue Date:</label>
                                    <span>{verificationResult.certificate.issueDate}</span>
                                </div>
                                <div className="detail-item">
                                    <label>⏰ Expiry Date:</label>
                                    <span>{verificationResult.certificate.expiryDate}</span>
                                </div>
                                {verificationResult.certificate.isRevoked && (
                                    <div className="detail-item full-width revoked-warning">
                                        <label>⚠️ Status:</label>
                                        <span style={{ color: '#dc3545', fontWeight: 'bold' }}>REVOKED</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => {
                            setVerificationResult(null);
                            setCertificateId('');
                            setQrInput('');
                        }}
                        className="reset-btn"
                    >
                        🔄 Verify Another
                    </button>
                </div>
            )}

            <style jsx>{`
        .verification-container {
          max-width: 900px;
          margin: 2rem auto;
          padding: 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .title {
          text-align: center;
          color: #667eea;
          margin-bottom: 2rem;
          font-size: 1.8rem;
        }

        .verification-methods {
          margin-bottom: 2rem;
        }

        .method-tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          border-bottom: 2px solid #ddd;
        }

        .tab {
          padding: 1rem 1.5rem;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          color: #666;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .tab.active {
          color: #667eea;
          border-bottom-color: #667eea;
        }

        .tab:hover {
          color: #667eea;
        }

        .input-section {
          padding: 1.5rem;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .input-section label {
          display: block;
          font-weight: 600;
          color: #333;
          margin-bottom: 0.75rem;
        }

        .input-group {
          display: flex;
          gap: 1rem;
        }

        .input-group input {
          flex: 1;
          padding: 0.75rem;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.3s ease;
        }

        .input-group input:focus {
          outline: none;
          border-color: #667eea;
        }

        .verify-btn {
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.3s ease;
          white-space: nowrap;
        }

        .verify-btn:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .verify-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .qr-scanner-section {
          padding: 1.5rem;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .scanner-info {
          color: #666;
          margin-bottom: 1rem;
          text-align: center;
        }

        .qr-input-box {
          margin-bottom: 1rem;
        }

        .qr-input-box textarea {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-family: monospace;
          font-size: 0.9rem;
          resize: vertical;
          transition: border-color 0.3s ease;
        }

        .qr-input-box textarea:focus {
          outline: none;
          border-color: #667eea;
        }

        .qr-process-btn {
          margin-top: 1rem;
          padding: 0.75rem 1.5rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .qr-process-btn:hover:not(:disabled) {
          background: #764ba2;
        }

        .qr-process-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .qr-success {
          margin-top: 1rem;
          padding: 1rem;
          background: #d4edda;
          color: #155724;
          border: 2px solid #28a745;
          border-radius: 8px;
          text-align: center;
        }

        .alert {
          padding: 1rem;
          border-radius: 8px;
          margin: 1rem 0;
          font-size: 1rem;
        }

        .alert.error {
          background: #f8d7da;
          color: #721c24;
          border: 2px solid #f5c6cb;
        }

        .result-section {
          padding: 2rem;
          border-radius: 12px;
          margin-top: 2rem;
        }

        .result-section.valid {
          background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
          border: 2px solid #28a745;
        }

        .result-section.invalid {
          background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
          border: 2px solid #dc3545;
        }

        .result-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .result-header h3 {
          font-size: 1.8rem;
          margin: 0 0 0.5rem 0;
        }

        .status-badge {
          display: inline-block;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-weight: bold;
          font-size: 0.95rem;
          margin: 0.5rem 0;
        }

        .status-badge.valid {
          background: #28a745;
          color: white;
        }

        .status-badge.invalid {
          background: #dc3545;
          color: white;
        }

        .verification-time {
          color: #666;
          font-size: 0.9rem;
          margin-top: 1rem;
        }

        .certificate-details {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }

        .certificate-details h4 {
          color: #667eea;
          margin-bottom: 1rem;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .detail-item.full-width {
          grid-column: 1 / -1;
        }

        .detail-item label {
          font-weight: 600;
          color: #333;
        }

        .detail-item span,
        .detail-item code {
          padding: 0.5rem;
          background: #f8f9fa;
          border-radius: 4px;
          word-break: break-all;
        }

        .detail-item code {
          font-family: monospace;
          font-size: 0.9rem;
        }

        .revoked-warning {
          background: #fff3cd;
          padding: 1rem;
          border-left: 4px solid #ffc107;
        }

        .reset-btn {
          display: block;
          margin: 0 auto;
          padding: 0.75rem 1.5rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .reset-btn:hover {
          background: #764ba2;
        }

        @media (max-width: 768px) {
          .verification-container {
            padding: 1rem;
          }

          .method-tabs {
            flex-direction: column;
          }

          .input-group {
            flex-direction: column;
          }

          .details-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
        </div>
    );
}

export default HashVerification;
