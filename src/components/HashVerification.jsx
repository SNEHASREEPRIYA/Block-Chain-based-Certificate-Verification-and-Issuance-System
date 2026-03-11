import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode.react';
import {
  verifyCertificate,
  verifyCertificateIntegrityEnhanced,
  hashCertificateData
} from '../utils/certificateContract';

function HashVerification() {
  const [certificateId, setCertificateId] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [hashVerificationResult, setHashVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrInput, setQrInput] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [camerPermissionError, setCameraPermissionError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const handleVerify = async () => {
    if (!certificateId.trim()) {
      setError('Please enter a Certificate ID');
      setVerificationResult(null);
      return;
    }

    setLoading(true);
    setError('');
    setVerificationResult(null);
    setHashVerificationResult(null);

    try {
      console.log('Verifying certificate:', certificateId);
      const result = await verifyCertificate(certificateId);

      setVerificationResult({
        certificateId: certificateId,
        isValid: result.isValid,
        certificate: result.certificate,
        source: result.source,
        timestamp: new Date().toLocaleString()
      });

      // If certificate is valid, perform hash integrity verification
      if (result.isValid && result.certificate) {
        try {
          console.log('Performing hash integrity check...');

          // Use raw expiryDate_raw for hash computation (exact timestamp used during issuance)
          const expiryDateTimestamp = result.certificate.expiryDate_raw || 0;

          const integrityData = {
            certificateId: result.certificate.certificateId,
            studentAddress: result.certificate.studentAddress,
            institutionName: result.certificate.institutionName,
            courseName: result.certificate.courseName,
            grade: result.certificate.grade,
            expiryDate: expiryDateTimestamp
          };

          console.log('✓ Data for hash computation:', integrityData);

          // Use enhanced verification that handles both blockchain and sessionStorage
          const hashVerification = await verifyCertificateIntegrityEnhanced(certificateId, integrityData);

          setHashVerificationResult({
            isIntegritityValid: hashVerification.isValid,
            computedHash: hashVerification.computedHash,
            storedHash: hashVerification.storedHash,
            hashesMatch: hashVerification.isValid,
            hashSource: hashVerification.hashSource
          });

          console.log('✅ Final Hash Verification Result:', {
            isValid: hashVerification.isValid,
            hashSource: hashVerification.hashSource,
            computedHash: hashVerification.computedHash,
            storedHash: hashVerification.storedHash
          });
        } catch (hashErr) {
          console.error('Error during hash integrity verification:', hashErr);
          setHashVerificationResult({
            isIntegritityValid: false,
            error: 'Could not verify hash integrity: ' + hashErr.message,
            computedHash: null,
            storedHash: null,
            hashesMatch: false
          });
        }
      }
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
      setCameraPermissionError('');
    } catch (err) {
      setError('Invalid QR code format. Expected: {"certificateId":"CERT-001","..."}');
    }
  };

  // Initialize camera for QR scanning
  const initializeCamera = async () => {
    try {
      setCameraPermissionError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      const errorMsg = err.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access to use QR scanner.'
        : err.name === 'NotFoundError'
          ? 'No camera found on this device.'
          : 'Error accessing camera: ' + err.message;
      setCameraPermissionError(errorMsg);
      setError(errorMsg);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  // Screenshot and analyze (simplified - shows how to integrate jsQR)
  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);

      // Note: To use real-time QR scanning, install jsqr:
      // npm install jsqr
      // Then uncomment the code below:

      /*
      const imageData = context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) {
        handleQRScan(code.data);
        stopCamera();
      } else {
        setError('No QR code detected. Please center the QR code in the camera and try again.');
      }
      */

      // For now, show manual entry option
      setError('📸 To enable real-time QR scanning, please install jsqr library and uncomment QR detection code.');
    } catch (err) {
      setError('Error capturing frame: ' + err.message);
    }
  };

  return (
    <div className="verification-container">
      <h2 className="title">🔐 Verify Certificate Authenticity & Integrity</h2>

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
            <label>📋 Enter Certificate ID (Required)</label>
            <p className="input-hint">
              Example: <code>CERT-2024-001</code> |
              This is the unique identifier you received with your certificate
            </p>
            <div className="input-group">
              <input
                type="text"
                placeholder="e.g., CERT-2024-001 or CERT-JAN-2026"
                value={certificateId}
                onChange={(e) => setCertificateId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
              />
              <button onClick={handleVerify} disabled={loading} className="verify-btn">
                {loading ? '⏳ Verifying...' : '✅ Verify Certificate'}
              </button>
            </div>
          </div>
        ) : (
          <div className="qr-scanner-section">
            <div className="camera-controls">
              <button
                className={`camera-btn ${isCameraActive ? 'active' : ''}`}
                onClick={() => {
                  if (isCameraActive) {
                    stopCamera();
                  } else {
                    initializeCamera();
                  }
                }}
              >
                {isCameraActive ? '🛑 Stop Camera' : '📷 Open Camera'}
              </button>
              {isCameraActive && (
                <button
                  className="capture-btn"
                  onClick={captureAndScan}
                >
                  📸 Capture & Scan
                </button>
              )}
            </div>

            {isCameraActive && (
              <div className="camera-container">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="camera-stream"
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div className="camera-hint">
                  📍 Position the QR code in the center of the frame
                </div>
              </div>
            )}

            <div className="manual-entry-section">
              <h4>Or Manually Paste QR Code Data</h4>
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

            {camerPermissionError && (
              <div className="camera-error">
                ⚠️ {camerPermissionError}
              </div>
            )}
          </div>
        )}
      </div>

      {error && <div className="alert error">❌ {error}</div>}

      {
        verificationResult && (
          <div className={`result-section ${verificationResult.isValid ? 'valid' : 'invalid'}`}>
            <div className="result-header">
              {verificationResult.isValid ? (
                <>
                  <h3>✅ CERTIFICATE FOUND</h3>
                  <p className="verification-time">Verified at: {verificationResult.timestamp}</p>
                </>
              ) : (
                <>
                  <h3>❌ CERTIFICATE NOT FOUND</h3>
                  <p className="status-badge invalid">
                    {verificationResult.error || 'NOT FOUND'}
                  </p>
                </>
              )}
            </div>

            {/* Hash Integrity Verification Section */}
            {hashVerificationResult && (
              <div className={`hash-verification-section ${hashVerificationResult.hashesMatch ? 'integrity-passed' : 'integrity-failed'}`}>
                <div className="hash-verification-container">
                  {/* Main Result Badge */}
                  <div className={`hash-result-badge ${hashVerificationResult.hashesMatch ? 'valid' : 'invalid'}`}>
                    {hashVerificationResult.hashesMatch ? '✅ VALID' : '❌ INVALID'}
                  </div>

                  {/* Hash Values */}
                  <div className="hash-values">
                    <div className="hash-value-item">
                      <label>📊 Computed Hash</label>
                      {hashVerificationResult.computedHash ? (
                        <code className="hash-display">{hashVerificationResult.computedHash}</code>
                      ) : (
                        <code className="hash-display error">Unable to compute hash</code>
                      )}
                    </div>

                    <div className="hash-value-item">
                      <label>🔗 Stored Hash</label>
                      {hashVerificationResult.storedHash ? (
                        <code className="hash-display">{hashVerificationResult.storedHash}</code>
                      ) : (
                        <code className="hash-display error">Unable to retrieve stored hash</code>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                setHashVerificationResult(null);
                setCertificateId('');
                setQrInput('');
              }}
              className="reset-btn"
            >
              🔄 Verify Another
            </button>
          </div>
        )
      }

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
          margin-bottom: 1rem;
          font-size: 1.8rem;
        }

        /* Instructions Section */
        .instructions-section {
          background: linear-gradient(135deg, #e8f4f8 0%, #f0e8f8 100%);
          padding: 1.5rem;
          border-radius: 8px;
          margin-bottom: 2rem;
          border-left: 5px solid #667eea;
        }

        .instructions-section h3 {
          color: #667eea;
          margin-top: 0;
          margin-bottom: 1rem;
        }

        .instruction-steps {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .step {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .step-number {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: #667eea;
          color: white;
          border-radius: 50%;
          font-weight: bold;
          font-size: 1rem;
          flex-shrink: 0;
        }

        .step-text {
          color: #333;
          line-height: 1.4;
        }

        .step-text strong {
          color: #667eea;
          font-weight: 600;
        }

        /* Input Section */
        .input-section {
          padding: 1.5rem;
          background: #f8f9fa;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .input-section label {
          display: block;
          font-weight: 700;
          color: #333;
          margin-bottom: 0.5rem;
          font-size: 1.05rem;
        }

        .input-hint {
          display: block;
          color: #666;
          font-size: 0.9rem;
          margin-bottom: 1rem;
          padding: 0.75rem;
          background: white;
          border-left: 3px solid #667eea;
          padding-left: 1rem;
          border-radius: 4px;
        }

        .input-hint code {
          background: #e8f0ff;
          padding: 0.2rem 0.5rem;
          border-radius: 3px;
          color: #667eea;
          font-weight: 600;
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

        /* Hash Integrity Verification Styles */
        .hash-verification-section {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          border-left: 5px solid;
        }

        .hash-verification-section.integrity-passed {
          border-left-color: #28a745;
        }

        .hash-verification-section.integrity-failed {
          border-left-color: #dc3545;
        }

        .hash-verification-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .hash-result-badge {
          text-align: center;
          padding: 1.5rem;
          border-radius: 12px;
          font-size: 1.8rem;
          font-weight: 700;
          letter-spacing: 1px;
        }

        .hash-result-badge.valid {
          background: #d4edda;
          color: #28a745;
          border: 3px solid #28a745;
        }

        .hash-result-badge.invalid {
          background: #f8d7da;
          color: #dc3545;
          border: 3px solid #dc3545;
        }

        .hash-values {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }

        .hash-value-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .hash-value-item label {
          font-weight: 700;
          color: #333;
          font-size: 1rem;
        }

        .hash-display {
          display: block;
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
          border: 2px solid #dee2e6;
          font-family: 'Courier New', monospace;
          font-size: 0.85rem;
          word-break: break-all;
          color: #667eea;
          line-height: 1.6;
          max-height: 100px;
          overflow-y: auto;
        }

        .hash-display.error {
          background: #fff5f5;
          color: #dc3545;
          border-color: #dc3545;
          font-style: italic;
        }

        .result-explanation {
          display: none;
        }

        .result-explanation.warning {
          display: none;
        }

        .result-explanation strong {
          display: none;
        }

        .source-note {
          display: none;
        }

        /* QR Code Camera Scanner Styles */
        .qr-scanner-section {
          padding: 1.5rem;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .camera-controls {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .camera-btn, .capture-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .camera-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .camera-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .camera-btn.active {
          background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
        }

        .capture-btn {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
        }

        .capture-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
        }

        .camera-container {
          position: relative;
          margin-bottom: 1.5rem;
          border-radius: 8px;
          overflow: hidden;
          background: #000;
        }

        .camera-stream {
          width: 100%;
          max-height: 400px;
          object-fit: cover;
          display: block;
        }

        .camera-hint {
          position: absolute;
          bottom: 15px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(102, 126, 234, 0.9);
          color: white;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .manual-entry-section {
          margin-top: 1.5rem;
          padding: 1rem;
          background: white;
          border-radius: 8px;
          border: 2px solid #ddd;
        }

        .manual-entry-section h4 {
          color: #667eea;
          margin-top: 0;
          margin-bottom: 1rem;
        }

        .manual-entry-section textarea {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #ddd;
          border-radius: 6px;
          font-family: monospace;
          font-size: 0.9rem;
          resize: vertical;
          transition: border-color 0.3s ease;
        }

        .manual-entry-section textarea:focus {
          outline: none;
          border-color: #667eea;
        }

        .camera-error {
          padding: 1rem;
          background: #f8d7da;
          color: #721c24;
          border: 2px solid #f5c6cb;
          border-radius: 8px;
          margin-top: 1rem;
          font-weight: 500;
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

          .integrity-status {
            flex-direction: column;
            align-items: flex-start;
          }

          .hash-code {
            font-size: 0.75rem;
          }

          .camera-controls {
            flex-direction: column;
          }

          .camera-btn, .capture-btn {
            width: 100%;
          }

          .camera-stream {
            max-height: 300px;
          }
        }
      `}</style>
    </div >
  );
}

export default HashVerification;
