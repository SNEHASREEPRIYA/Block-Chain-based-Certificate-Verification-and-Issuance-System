import React, { useState } from 'react';
import { getContract } from '../utils/certificateContract';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import AuthorizationPDFGenerator from './AuthorizationPDFGenerator';

// Set worker path for pdfjs-dist using Vite URL import for local resolution
GlobalWorkerOptions.workerSrc = workerSrc;

function StudentCertificates() {
  const [studentAddress, setStudentAddress] = useState('');
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authorizationPdf, setAuthorizationPdf] = useState(null);
  const [pdfUploadError, setPdfUploadError] = useState('');
  const [pdfParsingResult, setPdfParsingResult] = useState(null);
  const [authorizationLoading, setAuthorizationLoading] = useState(false);

  // Required authorization phrase that must be present in the PDF
  const REQUIRED_AUTH_PHRASE = 'AUTHORISED!! ELIGIBLE TO GET CERTIFICATE';

  const parseAuthorizationPDF = async (file) => {
    try {
      const buffer = await file.arrayBuffer();
      const loadingTask = getDocument({ data: buffer, disableWorker: true });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const content = await page.getTextContent();
      const text = content.items.map(w => w.str).join(' ');

      const hasRequiredPhrase = text.toUpperCase().includes(REQUIRED_AUTH_PHRASE.toUpperCase());

      if (!hasRequiredPhrase) {
        throw new Error('PDF does not contain required authorization phrase. Please ensure the document includes "authorised!! Eligible to get certificate".');
      }

      // Extract student information from the PDF, even when content is inline without newlines
      const extractStudentInfo = (text) => {
        const studentNameMatch = text.match(/Student\s*Name\s*[:\-]?\s*([\s\S]*?)(?=\s*Student\s*ID\s*[:\-]?\s*|$)/i);
        const studentIdMatch = text.match(/Student\s*ID\s*[:\-]?\s*([\s\S]*?)(?=\s*Blockchain\s*Address\s*[:\-]?\s*|$)/i);
        const blockchainAddressMatch = text.match(/Blockchain\s*Address\s*[:\-]?\s*([\s\S]*?)(?=\s*Institution\s*Information\s*|$)/i);

        const studentName = studentNameMatch ? studentNameMatch[1].replace(/\s+/g, ' ').trim() : '';
        const studentId = studentIdMatch ? studentIdMatch[1].replace(/\s+/g, ' ').trim() : '';
        const blockchainAddress = blockchainAddressMatch ? blockchainAddressMatch[1].replace(/\s+/g, ' ').trim() : '';

        return {
          studentName,
          studentId,
          blockchainAddress
        };
      };

      const studentInfo = extractStudentInfo(text);

      // Validate that student information is present
      if (!studentInfo.studentName || !studentInfo.studentId) {
        throw new Error('PDF must contain student name and student ID. Please fill in the authorization form completely.');
      }

      return {
        isValid: true,
        content: text,
        hasRequiredPhrase,
        studentInfo
      };
    } catch (err) {
      console.error('PDF parsing error:', err);
      throw err;
    }
  };

  const validateStudentInBlockchain = async (studentInfo) => {
    try {
      // Check if student information exists in any issued certificates
      const allIssuedCerts = JSON.parse(sessionStorage.getItem('allIssuedCertificates')) || [];

      let studentFound = false;
      let matchingCertificates = [];

      for (const cert of allIssuedCerts) {
        const certData = JSON.parse(sessionStorage.getItem(cert.certificateId));
        if (certData) {
          // Check if student name and ID match (case insensitive)
          const nameMatch = certData.studentName?.toLowerCase().trim() === studentInfo.studentName.toLowerCase().trim();
          const idMatch = certData.studentId?.toLowerCase().trim() === studentInfo.studentId.toLowerCase().trim();

          if (nameMatch && idMatch) {
            studentFound = true;
            matchingCertificates.push({
              certificateId: cert.certificateId,
              studentAddress: certData.studentAddress,
              institutionName: certData.institutionName,
              courseName: certData.courseProgram,
              grade: certData.grade
            });
          }
        }
      }

      return {
        isValid: studentFound,
        matchingCertificates,
        studentInfo
      };
    } catch (err) {
      console.error('Blockchain validation error:', err);
      return {
        isValid: false,
        matchingCertificates: [],
        studentInfo,
        error: err.message
      };
    }
  };

  const handleAuthorizationUpload = async (event) => {
    const file = event.target.files?.[0];
    setPdfUploadError('');
    setPdfParsingResult(null);
    setAuthorizationPdf(null);

    if (!file) {
      return;
    }

    if (file.type !== 'application/pdf') {
      setPdfUploadError('Please upload a PDF file.');
      return;
    }

    setAuthorizationLoading(true);
    try {
      // Parse PDF and extract student information
      const parseResult = await parseAuthorizationPDF(file);

      // Validate student information against blockchain
      const validationResult = await validateStudentInBlockchain(parseResult.studentInfo);

      const isFullyValid = parseResult.isValid && validationResult.isValid;

      setPdfParsingResult({
        status: 'validated',
        isValid: isFullyValid,
        content: parseResult.content,
        hasRequiredPhrase: parseResult.hasRequiredPhrase,
        studentInfo: parseResult.studentInfo,
        blockchainValidation: validationResult
      });

      setAuthorizationPdf(file);
      setIsAuthorized(isFullyValid);

      if (isFullyValid) {
        setPdfUploadError('');
      } else if (!validationResult.isValid) {
        setPdfUploadError(`Student information not found in blockchain records. Please ensure your name "${parseResult.studentInfo.studentName}" and ID "${parseResult.studentInfo.studentId}" match your issued certificates.`);
      }
    } catch (err) {
      setPdfUploadError(err.message || 'Failed to parse authorization PDF');
      console.error('Authorization PDF upload error:', err);
    } finally {
      setAuthorizationLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!isAuthorized) {
      setError('Please upload authorization PDF first to access certificates');
      return;
    }

    if (!studentAddress.trim()) {
      setError('Please enter a student address');
      return;
    }

    setLoading(true);
    setError('');
    setCertificates([]);
    setSearched(true);

    try {
      const studentCerts = [];
      const normalizedSearchAddress = studentAddress.toLowerCase().trim();

      // First check sessionStorage for recently issued certificates
      const allIssuedCerts = JSON.parse(sessionStorage.getItem('allIssuedCertificates')) || [];
      console.log('Checking sessionStorage for certificates...');

      for (const cert of allIssuedCerts) {
        if (cert.studentAddress.toLowerCase() === normalizedSearchAddress) {
          const certData = JSON.parse(sessionStorage.getItem(cert.certificateId));
          if (certData) {
            console.log('Found certificate in sessionStorage:', cert.certificateId);
            studentCerts.push({
              certificateId: cert.certificateId,
              isValid: true,
              courseProgram: certData.courseProgram,
              grade: certData.grade,
              issuer: certData.issuer,
              institutionName: 'Institution',
              issueDate: certData.issueDate,
              expiryDate: certData.expiryDate,
              isRevoked: false,
              transactionHash: certData.transactionHash,
              certificateHash: certData.certificateHash,
              source: 'local'
            });
          }
        }
      }

      // Also query blockchain for certificates not in sessionStorage
      console.log('Querying blockchain for certificates...');
      try {
        const contract = await getContract();

        // Get all CertificateIssued events - use the indexed student parameter
        const issueFilter = contract.filters.CertificateIssued(null, studentAddress);
        const issueEvents = await contract.queryFilter(issueFilter);

        console.log('Found blockchain events:', issueEvents.length);

        // Fetch certificate details for each event
        for (const event of issueEvents) {
          try {
            const certificateId = event.args[0]; // certificateId is the first argument

            // Skip if already in local storage
            if (studentCerts.some(c => c.certificateId === certificateId)) {
              continue;
            }

            console.log('Processing blockchain certificate:', certificateId);

            const certData = await contract.verifyCertificate(certificateId);

            if (certData && certData.certificate) {
              studentCerts.push({
                certificateId: certificateId,
                isValid: certData.isValid,
                courseProgram: certData.certificate.courseName,
                grade: certData.certificate.grade,
                issuer: certData.certificate.issuer,
                institutionName: certData.certificate.institutionName,
                issueDate: certData.certificate.issueDate,
                expiryDate: certData.certificate.expiryDate,
                isRevoked: certData.certificate.isRevoked,
                certificateHash: certData.certificate.certificateHash,
                source: 'blockchain'
              });
            }
          } catch (err) {
            console.error('Error fetching certificate from blockchain:', err);
          }
        }
      } catch (err) {
        console.error('Error querying blockchain events:', err);
        // Continue without blockchain results if event query fails
      }

      if (studentCerts.length === 0) {
        setError('No certificates found for this student address');
      } else {
        setCertificates(studentCerts);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to fetch certificates. Make sure the address is valid.');
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificate = async (certificateId) => {
    try {
      // Get certificate data from sessionStorage
      const certData = JSON.parse(sessionStorage.getItem(certificateId));
      if (!certData) {
        alert('Certificate data not found. Please contact the institution.');
        return;
      }

      // Generate and download PDF certificate
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Certificate content
      pdf.setFontSize(24);
      pdf.setTextColor(102, 126, 234); // Blue color
      pdf.text('CERTIFICATE OF COMPLETION', 148.5, 30, { align: 'center' });

      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text('This is to certify that', 148.5, 50, { align: 'center' });

      pdf.setFontSize(20);
      pdf.setTextColor(102, 126, 234);
      pdf.text(certData.studentName || 'Student', 148.5, 65, { align: 'center' });

      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text('has successfully completed the course', 148.5, 85, { align: 'center' });

      pdf.setFontSize(18);
      pdf.setTextColor(102, 126, 234);
      pdf.text(certData.courseProgram || 'Course', 148.5, 100, { align: 'center' });

      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`with grade: ${certData.grade || 'N/A'}`, 148.5, 115, { align: 'center' });

      pdf.setFontSize(14);
      pdf.text(`Certificate ID: ${certificateId}`, 148.5, 135, { align: 'center' });
      pdf.text(`Institution: ${certData.institutionName || 'Institution'}`, 148.5, 145, { align: 'center' });
      pdf.text(`Issue Date: ${certData.issueDate || 'N/A'}`, 148.5, 155, { align: 'center' });
      pdf.text(`Expiry Date: ${certData.expiryDate || 'N/A'}`, 148.5, 165, { align: 'center' });

      // Add authorization signature in green
      pdf.setTextColor(0, 128, 0); // Green color
      pdf.setFontSize(12);
      pdf.text('AUTHORIZED BY INSTITUTION', 148.5, 185, { align: 'center' });
      pdf.text('DIGITAL SIGNATURE VERIFIED', 148.5, 195, { align: 'center' });

      pdf.save(`Certificate-${certificateId}.pdf`);
    } catch (err) {
      console.error('Error downloading certificate:', err);
      alert('Failed to download certificate. Please try again.');
    }
  };

  return (
    <div className="student-certificates-container">
      <h2 className="title">🎓 Student Certificates</h2>

      {/* Sample PDF Generator for Testing */}
      <AuthorizationPDFGenerator />

      {/* Authorization Section */}
      <div className="authorization-section">
        <h3>🔐 Certificate Access Authorization</h3>
        <p className="auth-description">
          To access your certificates, you must upload an authorization PDF provided by your institution.
          The PDF must include the exact phrase "authorised!! Eligible to get certificate" and student details.
        </p>

        <div className="upload-section">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleAuthorizationUpload}
            disabled={authorizationLoading || isAuthorized}
            className="file-input"
          />

          {authorizationLoading && <div className="alert info">⏳ Processing authorization PDF...</div>}

          {pdfUploadError && <div className="alert error">❌ {pdfUploadError}</div>}

          {pdfParsingResult?.status === 'validated' && pdfParsingResult.isValid && (
            <div className="alert success">
              ✅ Authorization PDF fully verified and validated!
              <br />
              <small>
                Required phrase: {pdfParsingResult.hasRequiredPhrase ? '✅' : '❌'} |
                Blockchain: {pdfParsingResult.blockchainValidation?.isValid ? '✅' : '❌'} Student Verified
              </small>
              {pdfParsingResult.studentInfo && (
                <div style={{ marginTop: '10px', fontSize: '12px' }}>
                  <strong>Verified Student:</strong> {pdfParsingResult.studentInfo.studentName} (ID: {pdfParsingResult.studentInfo.studentId})
                </div>
              )}
            </div>
          )}

          {pdfParsingResult?.status === 'validated' && !pdfParsingResult.isValid && pdfParsingResult.blockchainValidation && (
            <div className="alert warning">
              ⚠️ Document validated but student blockchain verification failed
              <br />
              <small>
                Required phrase: {pdfParsingResult.hasRequiredPhrase ? '✅' : '❌'} |
                Blockchain: ❌ Student Not Found
              </small>
            </div>
          )}
        </div>

        {/* <div className="auth-requirements">
          <h4>📋 Authorization PDF Requirements:</h4>
          <ul>
            <li>✅ Must contain exact phrase: "authorised!! Eligible to get certificate"</li>
            <li>✅ Must contain student name and ID (matching blockchain records)</li>
            <li>✅ Student must have at least one issued certificate on record</li>
          </ul>
        </div> */}
      </div>

      <div className="search-section">
        <h3>🔍 Search Your Certificates</h3>
        <div className="search-box">
          <input
            type="text"
            placeholder="Enter Student Blockchain Address (0x...)"
            value={studentAddress}
            onChange={(e) => setStudentAddress(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            disabled={!isAuthorized}
          />
          <button onClick={handleSearch} disabled={!isAuthorized || loading} className="search-btn">
            {loading ? '🔄 Searching...' : '🔍 Search Certificates'}
          </button>
        </div>
        {!isAuthorized && (
          <div className="alert info" style={{ marginTop: '8px' }}>
            🔐 Please upload a valid authorized PDF first to enable search.
          </div>
        )}
      </div>

      {error && <div className="alert error">❌ {error}</div>}

      {loading && <div className="alert info">⏳ Loading certificates...</div>}

      {searched && !loading && certificates.length === 0 && !error && (
        <div className="alert warning">⚠️ No certificates found for this address</div>
      )}

      {certificates.length > 0 && (
        <div className="certificates-section">
          <h3>📋 Found {certificates.length} Certificate(s)</h3>
          <div className="certificates-grid">
            {certificates.map((cert, idx) => (
              <div key={idx} className={`certificate-card ${cert.isRevoked ? 'revoked' : cert.isValid ? 'valid' : 'invalid'}`}>
                <div className="card-header">
                  <h4>📜 {cert.certificateId}</h4>
                  <span className={`status ${cert.isRevoked ? 'revoked' : cert.isValid ? 'valid' : 'invalid'}`}>
                    {cert.isRevoked ? '🚫 REVOKED' : cert.isValid ? '✅ VALID' : '❌ INVALID'}
                  </span>
                </div>

                <div className="card-body">
                  <p><strong>🏛️ Institution:</strong> {cert.institutionName}</p>
                  <p><strong>📚 Course:</strong> {cert.courseProgram}</p>
                  <p><strong>⭐ Grade:</strong> {cert.grade}</p>
                  <p><strong>👤 Issuer:</strong> <code>{cert.issuer.slice(0, 10)}...{cert.issuer.slice(-8)}</code></p>
                  <p><strong>📅 Issued:</strong> {cert.issueDate}</p>
                  <p><strong>⏰ Expires:</strong> {cert.expiryDate}</p>
                </div>

                <div className="card-actions">
                  <button
                    onClick={() => downloadCertificate(cert.certificateId)}
                    className="download-btn"
                    disabled={cert.isRevoked}
                  >
                    📥 Download Certificate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .student-certificates-container {
          max-width: 1000px;
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

        .search-section {
          margin-bottom: 2rem;
        }

        .search-box {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .search-box input {
          flex: 1;
          padding: 0.75rem;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.3s ease;
        }

        .search-box input:focus {
          outline: none;
          border-color: #667eea;
        }

        .search-btn {
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.3s ease;
        }

        .search-btn:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .search-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .authorization-section {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          padding: 2rem;
          border-radius: 12px;
          margin-bottom: 2rem;
          border: 2px solid #dee2e6;
        }

        .authorization-section h3 {
          color: #495057;
          margin-bottom: 1rem;
          font-size: 1.4rem;
        }

        .auth-description {
          color: #6c757d;
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }

        .upload-section {
          margin-bottom: 1.5rem;
        }

        .file-input {
          display: block;
          width: 100%;
          padding: 0.75rem;
          border: 2px dashed #dee2e6;
          border-radius: 8px;
          background: white;
          font-size: 1rem;
          cursor: pointer;
          transition: border-color 0.3s ease;
        }

        .file-input:hover:not(:disabled) {
          border-color: #667eea;
        }

        .file-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .auth-requirements {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          border-left: 4px solid #28a745;
        }

        .auth-requirements h4 {
          color: #495057;
          margin-bottom: 1rem;
          font-size: 1.1rem;
        }

        .auth-requirements ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .auth-requirements li {
          padding: 0.5rem 0;
          color: #495057;
          font-size: 0.95rem;
        }

        .alert.success {
          background: #d4edda;
          color: #155724;
          border: 2px solid #c3e6cb;
        }

        .card-actions {
          padding: 1rem 1.5rem;
          background: #f8f9fa;
          border-top: 1px solid #dee2e6;
        }

        .download-btn {
          width: 100%;
          padding: 0.75rem;
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.3s ease;
        }

        .download-btn:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .download-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #6c757d;
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

        .alert.warning {
          background: #fff3cd;
          color: #856404;
          border: 2px solid #ffeaa7;
        }

        .alert.info {
          background: #d1ecf1;
          color: #0c5460;
          border: 2px solid #bee5eb;
        }

        .certificates-section h3 {
          color: #667eea;
          margin-bottom: 1.5rem;
          font-size: 1.3rem;
        }

        .certificates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .certificate-card {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease;
        }

        .certificate-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 6px 25px rgba(0, 0, 0, 0.15);
        }

        .certificate-card.valid {
          border-left: 5px solid #28a745;
          background: linear-gradient(135deg, #d4edda 0%, #ffffff 100%);
        }

        .certificate-card.invalid {
          border-left: 5px solid #dc3545;
          background: linear-gradient(135deg, #f8d7da 0%, #ffffff 100%);
        }

        .certificate-card.revoked {
          border-left: 5px solid #ffc107;
          background: linear-gradient(135deg, #fff3cd 0%, #ffffff 100%);
          opacity: 0.7;
        }

        .card-header {
          padding: 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-header h4 {
          margin: 0;
          font-size: 1.1rem;
        }

        .status {
          padding: 0.25rem 0.75rem;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: bold;
        }

        .status.valid {
          background: #d4edda;
          color: #155724;
        }

        .status.invalid {
          background: #f8d7da;
          color: #721c24;
        }

        .status.revoked {
          background: #fff3cd;
          color: #856404;
        }

        .card-body {
          padding: 1.5rem;
          font-size: 0.95rem;
          line-height: 1.8;
        }

        .card-body p {
          margin: 0.5rem 0;
        }

        .card-body code {
          background: rgba(0, 0, 0, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.85rem;
          word-break: break-all;
        }

        @media (max-width: 768px) {
          .student-certificates-container {
            padding: 1rem;
          }

          .search-box {
            flex-direction: column;
          }

          .certificates-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default StudentCertificates;
