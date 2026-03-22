import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode.react';
import QRScanner from './QRScanner';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  verifyCertificate,
  verifyCertificateIntegrityEnhanced,
  getCertificateHashFromContract,
  hashCertificateData
} from '../utils/certificateContract';

// Set worker path for pdfjs-dist using Vite URL import for local resolution
GlobalWorkerOptions.workerSrc = workerSrc;

function HashVerification() {
  const [certificateId, setCertificateId] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [hashVerificationResult, setHashVerificationResult] = useState(null);
  const [pdfParsingResult, setPdfParsingResult] = useState(null);
  const [activeSection, setActiveSection] = useState('id');
  const [uploadedCertificateData, setUploadedCertificateData] = useState(null);
  const [uploadedCertificateVerification, setUploadedCertificateVerification] = useState(null);
  const [pdfUploadError, setPdfUploadError] = useState('');
  const [qrPayloadData, setQrPayloadData] = useState(null);
  const [qrPendingPayload, setQrPendingPayload] = useState(null);
  const [qrComputedHash, setQrComputedHash] = useState('');
  const [qrDataProcessed, setQrDataProcessed] = useState(false);
  const [qrDetailsVisible, setQrDetailsVisible] = useState(false);

  const [chainCertificateData, setChainCertificateData] = useState(null);
  const [chainCertificateHash, setChainCertificateHash] = useState('');
  const [chainComputedHash, setChainComputedHash] = useState('');

  const [manualDetails, setManualDetails] = useState({
    studentAddress: '',
    institutionName: '',
    courseName: '',
    grade: '',
    expiryDate: ''
  });
  const [manualHash, setManualHash] = useState('');
  const [manualHashMatch, setManualHashMatch] = useState(null);
  const [qrHashComparison, setQrHashComparison] = useState({ status: null, message: '' });

  const [pdfVerifyError, setPdfVerifyError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrInput, setQrInput] = useState('');
  // camera state is now handled inside QRScanner component
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [camerPermissionError, setCameraPermissionError] = useState('');
  const [activeModule, setActiveModule] = useState('id');

  const extractCertificatePayloadFromText = (text) => {
    if (!text) return null;

    // Look for the payload signature generated in CertificateIssuance
    const payloadMatch = text.match(/CERT_PAYLOAD:\s*(\{[\s\S]*\})/);
    if (!payloadMatch) return null;

    try {
      return JSON.parse(payloadMatch[1]);
    } catch (err) {
      console.error('Failed to parse certificate payload from PDF text', err);
      return null;
    }
  };

  const formatDateValue = (value, rawSeconds = null) => {
    const tryParseDateString = (input) => {
      if (input === null || input === undefined) return null;

      const candidate = String(input).trim();
      if (!candidate) return null;

      // Native parsing first (ISO forms, full locale-friendly strings)
      const nativeParsed = new Date(candidate);
      if (!isNaN(nativeParsed.getTime())) {
        return nativeParsed;
      }

      // Fallback for DD/MM/YYYY or DD-MM-YYYY with optional time
      const fallbackMatch = candidate.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[ ,]+(\d{1,2}:\d{2}(?::\d{2})?))?$/);
      if (fallbackMatch) {
        const day = Number(fallbackMatch[1]);
        const month = Number(fallbackMatch[2]) - 1;
        const year = Number(fallbackMatch[3]);
        const timePart = fallbackMatch[4] || '00:00:00';
        const [hours, mins, secs] = timePart.split(':').map((v) => Number(v));
        const parsedFallback = new Date(year, month, day, hours || 0, mins || 0, secs || 0);
        if (!isNaN(parsedFallback.getTime())) {
          return parsedFallback;
        }
      }

      // Try splitting with comma space (like "31/03/2026, 05:30:00")
      const commaSplit = candidate.split(',').map((p) => p.trim());
      if (commaSplit.length === 2) {
        const try2 = tryParseDateString(`${commaSplit[0]} ${commaSplit[1]}`);
        if (try2) return try2;
      }

      return null;
    };

    if (rawSeconds && Number(rawSeconds) > 0) {
      return new Date(Number(rawSeconds) * 1000).toLocaleString();
    }

    if (value === null || value === undefined || value === '' || value === 'N/A') {
      return 'N/A';
    }

    const numeric = Number(value);
    if (!isNaN(numeric) && numeric > 0) {
      return new Date(numeric * 1000).toLocaleString();
    }

    const parsed = tryParseDateString(value);
    if (parsed) {
      return parsed.toLocaleString();
    }

    return String(value);
  };

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

    // QR workflow: compare manual hash and chain hash when verify button clicked
    if (activeModule === 'qr') {
      if (!chainCertificateHash) {
        setError('Chain certificate hash not found. Get certificate details first.');
        setLoading(false);
        return;
      }
      if (!manualHash) {
        setError('Please compute present certificate hash first.');
        setLoading(false);
        return;
      }

      const match = manualHash.toLowerCase() === chainCertificateHash.toLowerCase();
      setQrHashComparison({
        status: match ? 'valid' : 'invalid',
        message: match ? '✅ Certificate is valid (hashes match).' : '❌ Certificate is tampered or invalid (hash mismatch).'
      });
      setLoading(false);
      return;
    }

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

  const handleQRScan = async (qrData) => {
    try {
      setError('');
      let parsed = null;
      const trimmed = String(qrData || '').trim();

      console.log('QR scanner raw payload:', trimmed);

      if (!trimmed) {
        throw new Error('Empty QR payload');
      }

      // QR could be plain certificateId or JSON object with certificateId.
      let certificateIdFromQr = '';

      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const data = JSON.parse(trimmed);
        certificateIdFromQr = data.certificateId || data.certificate || '';
      } else if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const data = JSON.parse(trimmed);
        if (Array.isArray(data) && data.length > 0) {
          certificateIdFromQr = data[0]?.certificateId || data[0]?.certificate || '';
        }
      } else {
        certificateIdFromQr = trimmed;
      }

      if (!certificateIdFromQr) {
        throw new Error('QR payload missing certificateId');
      }

      // Fetch on-chain validity by certificateId.
      const bc = await verifyCertificate(certificateIdFromQr);
      if (!bc?.isValid || !bc?.certificate) {
        throw new Error('Certificate not found for ID in QR');
      }

      parsed = {
        certificateId: certificateIdFromQr,
        studentAddress: bc.certificate.studentAddress || '',
        institutionName: bc.certificate.institutionName || '',
        courseName: bc.certificate.courseName || '',
        grade: bc.certificate.grade || '',
        expiryDate: bc.certificate.expiryDate_raw || 0,
        issuerAddress: bc.certificate.issuer || '',
        transactionHash: bc.certificate.transactionHash || '',
        certificateHash: bc.certificate.certificateHash || ''
      };

      setVerificationResult(bc);

      const certificateId = parsed.certificateId || parsed.certificate || parsed.id;
      if (!certificateId) {
        throw new Error('QR payload must contain certificateId only');
      }

      const chainResult = await verifyCertificate(certificateId);
      if (!chainResult?.isValid || !chainResult?.certificate) {
        throw new Error('Certificate not found on blockchain for ID: ' + certificateId);
      }

      const chainCert = chainResult.certificate;
      const chainHash = chainCert.certificateHash || '';
      const computedChainHash = hashCertificateData({
        certificateId: chainCert.certificateId,
        studentAddress: chainCert.studentAddress,
        institutionName: chainCert.institutionName,
        courseName: chainCert.courseName,
        grade: chainCert.grade,
        expiryDate: chainCert.expiryDate_raw || 0
      });

      setChainCertificateData({
        ...chainCert,
        issueDate: chainCert.issueDate || (chainCert.issueDate_raw ? new Date(chainCert.issueDate_raw * 1000).toLocaleString() : 'N/A'),
        expiryDate: chainCert.expiryDate || (chainCert.expiryDate_raw ? new Date(chainCert.expiryDate_raw * 1000).toLocaleString() : 'N/A')
      });
      setChainCertificateHash(chainHash);
      setChainComputedHash(computedChainHash);

      setQrPendingPayload({ certificateId });
      setQrPayloadData(null);
      setQrComputedHash(computedChainHash);
      setCertificateId(certificateId);
      setQrDataProcessed(true);
      setQrDetailsVisible(false);
      setShowQRScanner(false);
      setCameraPermissionError('');
      setError('');
    } catch (err) {
      console.error('QR scan parse error:', err);
      setQrPendingPayload(null);
      setQrPayloadData(null);
      setQrComputedHash('');
      setQrDataProcessed(false);
      setQrDetailsVisible(false);
      setChainCertificateData(null);
      setChainCertificateHash('');
      setChainComputedHash('');
      setManualDetails({ studentAddress: '', institutionName: '', courseName: '', grade: '', expiryDate: '' });
      setManualHash('');
      setManualHashMatch(null);
      setError('Invalid QR content. Use JSON payload or existing Certificate ID (' + (err.message || '') + ')');
    }
  };

  const processQRData = async () => {
    if (!qrInput.trim()) {
      setError('Please enter QR code data before clicking Process QR Data.');
      return;
    }

    await handleQRScan(qrInput);
  };

  const revealCertificateDetails = () => {
    if (!qrPendingPayload || !chainCertificateData) {
      setError('No parsed QR data available yet. Scan or paste QR and click Process QR Data first.');
      return;
    }

    setQrPayloadData(qrPendingPayload);
    setQrComputedHash(chainComputedHash);
    setQrDetailsVisible(true);
  };

  const computeManualHash = () => {
    if (!chainCertificateData) {
      setError('Please get certificate details from blockchain first.');
      return;
    }

    const requiredFields = [
      manualDetails.studentAddress,
      manualDetails.institutionName,
      manualDetails.courseName,
      manualDetails.grade,
      manualDetails.expiryDate
    ];

    if (requiredFields.some((field) => !field || !field.trim())) {
      setError('Please enter all manual certificate details before hashing.');
      return;
    }

    const expirySec = manualDetails.expiryDate
      ? Math.floor(new Date(manualDetails.expiryDate).getTime() / 1000)
      : 0;

    const manualPayload = {
      certificateId: chainCertificateData.certificateId,
      studentAddress: manualDetails.studentAddress.trim(),
      institutionName: manualDetails.institutionName.trim(),
      courseName: manualDetails.courseName.trim(),
      grade: manualDetails.grade.trim(),
      expiryDate: expirySec
    };

    try {
      const computedManual = hashCertificateData(manualPayload);
      setManualHash(computedManual);
      setManualHashMatch(computedManual.toLowerCase() === (chainCertificateHash || '').toLowerCase());
      setError('');
    } catch (e) {
      setManualHash('');
      setManualHashMatch(false);
      setError('Failed to compute hash from manual details: ' + e.message);
    }
  };

  const handlePDFUpload = async (event) => {
    const file = event.target.files?.[0];
    setPdfUploadError('');
    setPdfParsingResult(null);
    setUploadedCertificateData(null);

    if (!file) {
      return;
    }

    if (file.type !== 'application/pdf') {
      setPdfUploadError('Please upload a PDF file.');
      return;
    }

    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      // Disable worker to avoid worker script loading issues in some environments
      const loadingTask = getDocument({ data: buffer, disableWorker: true });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const content = await page.getTextContent();
      const text = content.items.map(w => w.str).join(' ');

      const payload = extractCertificatePayloadFromText(text);
      if (!payload) {
        throw new Error('CERT_PAYLOAD entry not found in PDF. Please use the certificate PDF downloaded from this app.');
      }

      setUploadedCertificateData(payload);

      // PDF upload parsed successfully; do not verify automatically
      setUploadedCertificateData(payload);
      setPdfParsingResult({
        status: 'parsed',
        certificateId: payload.certificateId,
        extractedData: payload,
        verifyResult: null,
        integrityResult: null,
        isValid: null
      });

      setCertificateId(payload.certificateId);
    } catch (err) {
      setPdfUploadError(err.message || 'Failed to parse PDF certificate');
      console.error('PDF upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  const verifyUploadedPDF = async () => {
    if (!uploadedCertificateData) {
      setPdfUploadError('Please upload a certificate PDF first.');
      return;
    }

    setLoading(true);
    setPdfVerifyError('');
    setUploadedCertificateVerification(null);

    try {
      // Step 1: confirm certificate exists on chain
      const verifyResult = await verifyCertificate(uploadedCertificateData.certificateId);

      // Step 2: get stored chain hash (explicit call)
      let chainStoredHash = null;
      try {
        chainStoredHash = await getCertificateHashFromContract(uploadedCertificateData.certificateId);
      } catch (chainErr) {
        console.warn('Chain hash fetch failed:', chainErr.message);
        // Try to use verifyCertificate result if available (it includes certificateHash with signed value)
        chainStoredHash = verifyResult?.certificate?.certificateHash || null;
      }

      // Step 3: recompute hash from parsed payload
      const computedHash = hashCertificateData(uploadedCertificateData);

      // Step 4: compute integrity using enhanced helper (for logging + fallback checks)
      const integrityResult = await verifyCertificateIntegrityEnhanced(uploadedCertificateData.certificateId, uploadedCertificateData);

      // If explicit getCertificateHash call fails, try fallback from verifyResult certificate record
      if (!chainStoredHash && verifyResult?.certificate?.certificateHash) {
        chainStoredHash = verifyResult.certificate.certificateHash;
      }

      const isValid = verifyResult.isValid && Boolean(chainStoredHash) && computedHash.toLowerCase() === String(chainStoredHash).toLowerCase();

      setUploadedCertificateVerification({
        verifyResult,
        computedHash,
        chainStoredHash,
        integrityResult,
        isValid
      });

      setPdfParsingResult((prev) => ({
        ...prev,
        status: 'verified',
        verifyResult,
        integrityResult,
        isValid,
        computedHash,
        chainStoredHash
      }));

      if (!chainStoredHash) {
        setPdfVerifyError('Chain hash not found. Ensure that the certificate was issued on-chain and you are connected to the correct network.');
      } else if (computedHash.toLowerCase() !== String(chainStoredHash).toLowerCase()) {
        setPdfVerifyError('Computed hash does not match stored chain hash. Certificate may be tampered.');
      } else {
        setPdfVerifyError('');
      }
    } catch (err) {
      setPdfUploadError('Verification failed: ' + (err.message || err));
      setUploadedCertificateVerification({
        verifyResult: null,
        integrityResult: null,
        isValid: false,
        error: err.message || err
      });
    } finally {
      setLoading(false);
    }
  };

  const clearQRState = () => {
    setQrInput('');
    setQrPendingPayload(null);
    setQrPayloadData(null);
    setQrComputedHash('');
    setQrDataProcessed(false);
    setQrDetailsVisible(false);
    setChainCertificateData(null);
    setChainCertificateHash('');
    setChainComputedHash('');
    setManualDetails({ studentAddress: '', institutionName: '', courseName: '', grade: '', expiryDate: '' });
    setManualHash('');
    setManualHashMatch(null);
    setQrHashComparison({ status: null, message: '' });
    setVerificationResult(null);
    setCertificateId('');
    setCameraPermissionError('');
    setError('');
  };

  const clearPdfState = () => {
    setUploadedCertificateData(null);
    setUploadedCertificateVerification(null);
    setPdfParsingResult(null);
    setPdfUploadError('');
    setPdfVerifyError('');
  };

  // Switch module and clear all previous results/errors
  const switchModule = (moduleName) => {
    setActiveModule(moduleName);
    setError('');

    if (moduleName !== 'qr') {
      clearQRState();
    }
    if (moduleName !== 'upload') {
      clearPdfState();
    }
    if (moduleName !== 'id') {
      setVerificationResult(null);
      setHashVerificationResult(null);
    }
  };

  // Ensure stale data is cleared whenever module changes (extra safety)
  useEffect(() => {
    if (activeModule !== 'upload') {
      clearPdfState();
    }
    if (activeModule !== 'qr') {
      clearQRState();
    }
    if (activeModule !== 'id') {
      setVerificationResult(null);
      setHashVerificationResult(null);
      setCertificateId('');
      setQrInput('');
    }
  }, [activeModule]);

  return (
    <div className="verification-container">
      <h2 className="title">🔐 Verify Certificate Authenticity & Integrity</h2>

      <div className="module-tabs">
        <button
          className={activeModule === 'id' ? 'active' : ''}
          onClick={() => switchModule('id')}
        >
          🆔 ID Verification
        </button>
        <button
          className={activeModule === 'qr' ? 'active' : ''}
          onClick={() => switchModule('qr')}
        >
          📷 QR Verification
        </button>
        <button
          className={activeModule === 'upload' ? 'active' : ''}
          onClick={() => switchModule('upload')}
        >
          📥 PDF Verification
        </button>
      </div>

      <div className="verification-content">
        {activeModule === 'id' && (
          <div className="input-section">
            <div className="section-title">🆔 Certificate ID Verification</div>
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
        )}

        {activeModule === 'qr' && (
          <div className="qr-scanner-section">
            <div className="section-title">📱 QR Code Verification</div>
            <QRScanner
              onResult={handleQRScan}
              onError={(message) => setError(message)}
            />

            <div className="manual-entry-section">
              <h4>Or Manually Paste QR Code Data</h4>
              <textarea
                placeholder='Paste QR code data or manually enter: {"certificateId":"CERT-001","studentAddress":"0x...","issuerAddress":"0x..."}'
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                rows="5"
              />
              <button
                onClick={processQRData}
                disabled={!qrInput.trim()}
                className="qr-process-btn"
              >
                🔍 Process QR Data
              </button>
            </div>

            {qrDataProcessed && qrPendingPayload && !qrDetailsVisible && (
              <div className="qr-confirm-section">
                <p>✅ QR data parsed successfully. Click below to show certificate details.</p>
                <button onClick={revealCertificateDetails} className="qr-process-btn">
                  🧾 Get Certificate Details
                </button>
              </div>
            )}

            {qrPayloadData && qrDetailsVisible && chainCertificateData && (
              <>
                <div className="qr-parsed-card">
                  <h4>🔍 Certificate Details from Blockchain</h4>
                  <div className="details-grid">
                    <div className="detail-item"><label>Certificate ID:</label><span>{chainCertificateData.certificateId}</span></div>
                    <div className="detail-item"><label>Student Address:</label><span>{chainCertificateData.studentAddress}</span></div>
                    <div className="detail-item"><label>Institution Name:</label><span>{chainCertificateData.institutionName}</span></div>
                    <div className="detail-item"><label>Course Name:</label><span>{chainCertificateData.courseName}</span></div>
                    <div className="detail-item"><label>Grade:</label><span>{chainCertificateData.grade}</span></div>
                    <div className="detail-item"><label>Issued Date:</label><span>{formatDateValue(chainCertificateData.issueDate, chainCertificateData.issueDate_raw)}</span></div>
                    <div className="detail-item"><label>Expiry Date:</label><span>{formatDateValue(chainCertificateData.expiryDate, chainCertificateData.expiryDate_raw)}</span></div>
                    <div className="detail-item"><label>Issuer Address:</label><span>{chainCertificateData.issuer}</span></div>
                  </div>
                  <div className="hash-values" style={{ marginTop: '0.75rem' }}>
                    <div className="hash-value-item">
                      <label>Chain Stored Hash</label>
                      <code className="hash-display">{chainCertificateHash || 'N/A'}</code>
                    </div>
                  </div>
                </div>

                <div className="qr-parsed-card" style={{ marginTop: '1rem' }}>
                  <h4>✍️ Manually Enter Present Certificate Details</h4>
                  <div className="details-grid" style={{ gridTemplateColumns: '1fr' }}>
                    <div className="detail-item"><label>Student Address</label><input type="text" value={manualDetails.studentAddress} onChange={(e) => setManualDetails({ ...manualDetails, studentAddress: e.target.value })} /></div>
                    <div className="detail-item"><label>Institution Name</label><input type="text" value={manualDetails.institutionName} onChange={(e) => setManualDetails({ ...manualDetails, institutionName: e.target.value })} /></div>
                    <div className="detail-item"><label>Course Name</label><input type="text" value={manualDetails.courseName} onChange={(e) => setManualDetails({ ...manualDetails, courseName: e.target.value })} /></div>
                    <div className="detail-item"><label>Grade</label><input type="text" value={manualDetails.grade} onChange={(e) => setManualDetails({ ...manualDetails, grade: e.target.value })} /></div>
                    <div className="detail-item"><label>Expiry Date</label><input type="date" value={manualDetails.expiryDate} onChange={(e) => setManualDetails({ ...manualDetails, expiryDate: e.target.value })} /></div>
                  </div>
                  <button onClick={computeManualHash} className="qr-process-btn" style={{ marginTop: '0.75rem' }}>
                    🧮 Compute Present Certificate Hash
                  </button>
                  {manualHash ? (
                    <div className="hash-values" style={{ marginTop: '0.75rem' }}>
                      <div className="hash-value-item">
                        <label>Present computed hash</label>
                        <code className="hash-display">{manualHash}</code>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="qr-action-card">
                  <button
                    onClick={handleVerify}
                    className="verify-btn"
                  >
                    🔗 Verify Certificate on Chain
                  </button>
                  {qrHashComparison.status && (
                    <div className={`hash-validation-card ${qrHashComparison.status}`} style={{ marginTop: '1rem' }}>
                      <p>{qrHashComparison.message}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeModule === 'upload' && (
          <div className="upload-section">
            <h3>📥 Verify by Uploading Downloaded Certificate PDF</h3>
            <input
              type="file"
              accept="application/pdf"
              onChange={handlePDFUpload}
              disabled={loading}
              className="file-input"
            />

            {uploadedCertificateData && (
              <div className="uploaded-data">
                <h4>Extracted certificate info</h4>
                <p><strong>ID:</strong> {uploadedCertificateData.certificateId}</p>
                <p><strong>Student:</strong> {uploadedCertificateData.studentAddress}</p>
                <p><strong>Institution:</strong> {uploadedCertificateData.institutionName}</p>
                <p><strong>Course:</strong> {uploadedCertificateData.courseName}</p>
                <p><strong>Grade:</strong> {uploadedCertificateData.grade}</p>
                <p><strong>Issued Date:</strong> {formatDateValue(uploadedCertificateData.issueDate, uploadedCertificateData.issueDate_raw)}</p>
                <p><strong>Expiry Date:</strong> {formatDateValue(uploadedCertificateData.expiryDate, uploadedCertificateData.expiryDate_raw)}</p>
                <button onClick={verifyUploadedPDF} disabled={loading} className="verify-btn" style={{ marginTop: '0.75rem' }}>
                  {loading ? '⏳ Verifying PDF...' : '✅ Verify Uploaded PDF'}
                </button>
              </div>
            )}

            {pdfUploadError && <div className="alert error">❌ {pdfUploadError}</div>}
            {pdfVerifyError && <div className="alert error">❌ {pdfVerifyError}</div>}

            {pdfParsingResult?.status === 'parsed' && (
              <div className="info-box">✅ PDF parsed successfully. Click ‘Verify Uploaded PDF’ to confirm chain hash integrity.</div>
            )}

            {pdfParsingResult?.status === 'verified' && (
              <div className={`result-section ${(uploadedCertificateVerification?.isValid ?? false) ? 'valid' : 'invalid'}`}>
                <div className="result-header">
                  <h3>{(uploadedCertificateVerification?.isValid ?? false) ? '✅ PDF MATCH: AUTHENTIC' : '❌ PDF TAMPERED / INVALID'}</h3>
                  <p className="verification-time">Checked at: {new Date().toLocaleString()}</p>
                </div>
                <div className="hash-values">
                  <div className="hash-value-item">
                    <label>📊 Computed Hash (from PDF payload)</label>
                    <code className="hash-display">{uploadedCertificateVerification?.computedHash || 'N/A'}</code>
                  </div>
                  <div className="hash-value-item">
                    <label>🔗 Stored Hash (blockchain)</label>
                    <code className="hash-display">{uploadedCertificateVerification?.chainStoredHash || 'N/A'}</code>
                  </div>
                  <div className="hash-value-item">
                    <label>🔒 Hash Status</label>
                    <code className="hash-display">{uploadedCertificateVerification ? ((uploadedCertificateVerification?.isValid ? 'MATCH' : 'MISMATCH')) : 'N/A'}</code>
                  </div>
                </div>
                <p className={`status-badge ${(uploadedCertificateVerification?.isValid ?? false) ? 'valid' : 'invalid'}`}>
                  {uploadedCertificateVerification?.isValid ? 'The certificate is valid and untampered.' : 'Tampering detected or invalid certificate.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      {error && <div className="alert error">❌ {error}</div>}


      {
        activeModule === 'id' && verificationResult && (
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

            {verificationResult.isValid && activeModule === 'id' && (
              <div className="trusted-message">
                ✅ Certificate found and is issued by trusted institution in the blockchain
              </div>
            )}

            {/* Hash Integrity Verification Section (hidden for ID-only mode) */}
            {activeModule !== 'id' && hashVerificationResult && (
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
                <h4>📄 Certificate & Institution Details</h4>
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
                    <label>🏛️ Institution Name:</label>
                    <span>{verificationResult.certificate.institutionName || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>🏢 Institution Issuer Address:</label>
                    <code>{verificationResult.certificate.issuer || 'N/A'}</code>
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
                    <span>{formatDateValue(verificationResult.certificate.issueDate, verificationResult.certificate.issueDate_raw)}</span>
                  </div>
                  <div className="detail-item">
                    <label>⏰ Expiry Date:</label>
                    <span>{formatDateValue(verificationResult.certificate.expiryDate, verificationResult.certificate.expiryDate_raw)}</span>
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

        .module-tabs {
          display: flex;
          justify-content: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .module-tabs button {
          border: 1px solid #cbd6ee;
          border-radius: 8px;
          padding: 0.5rem 1rem;
          background: #f4f7ff;
          color: #2c3e50;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .module-tabs button:hover,
        .module-tabs button.active {
          background: #667eea;
          color: #ffffff;
          border-color: #5a6fdd;
        }

        .verification-content {
          padding: 1rem;
          border-radius: 10px;
          border: 1px solid #ddd;
          background: #fafbff;
          margin-bottom: 1.5rem;
        }

        .section-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: #333;
          margin-bottom: 1rem;
        }

        .module-tabs {
          display: flex;
          justify-content: center;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
        }

        .module-tabs button {
          background: #f0f4ff;
          color: #2c3e50;
          border: 1px solid #cbd6ee;
          border-radius: 8px;
          padding: 0.55rem 1rem;
          cursor: pointer;
          font-weight: 700;
          transition: all 0.2s ease;
        }

        .module-tabs button:hover {
          background: #e6ecff;
        }

        .module-tabs button.active {
          background: #667eea;
          color: #fff;
          border-color: #5a6fdd;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.35);
        }

        @keyframes expand {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 1024px) {
          .verification-modules {
            grid-template-columns: 1fr;
          }
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

        .trusted-message {
          padding: 0.9rem 1rem;
          margin: 1rem 0;
          border: 1px solid #28a745;
          border-radius: 8px;
          background: #e6f9ec;
          color: #1f7a3e;
          font-weight: 600;
          text-align: center;
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

        .qr-parsed-card {
          margin-top: 1rem;
          padding: 1rem;
          background: #f9fbff;
          border: 1px solid #bfd0f6;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
        }

        .qr-action-card {
          margin-top: 1rem;
          padding: 1rem;
          background: #ffffff;
          border: 1px solid #c7d7f6;
          border-radius: 10px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.06);
        }

        .qr-action-card button {
          width: 100%;
          margin: 0;
        }

        .hash-validation-card {
          border-radius: 10px;
          padding: 0.85rem;
          font-weight: 700;
          text-align: center;
          color: #fff;
          border: 1px solid transparent;
        }

        .hash-validation-card.valid {
          background: #d4edda;
          color: #155724;
          border-color: #c3e6cb;
        }

        .hash-validation-card.invalid {
          background: #f8d7da;
          color: #721c24;
          border-color: #f5c6cb;
        }

        .qr-parsed-card input {
          width: 100%;
          padding: 0.45rem 0.65rem;
          border: 1px solid #cfd7ee;
          border-radius: 6px;
          font-size: 0.92rem;
          margin-top: 0.25rem;
        }

        .qr-parsed-card .detail-item label {
          font-weight: 600;
          margin-bottom: 0.25rem;
          display: block;
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

        @media (max-width: 1024px) {
          .verification-modules {
            flex-direction: column;
          }
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
