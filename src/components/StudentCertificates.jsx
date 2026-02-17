import React, { useState } from 'react';
import { getContract } from '../utils/certificateContract';

function StudentCertificates() {
    const [studentAddress, setStudentAddress] = useState('');
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searched, setSearched] = useState(false);

    const handleSearch = async () => {
        if (!studentAddress.trim()) {
            setError('Please enter a student address');
            return;
        }

        setLoading(true);
        setError('');
        setCertificates([]);
        setSearched(true);

        try {
            const contract = await getContract();

            // Get all CertificateIssued events - use the indexed student parameter
            const issueFilter = contract.filters.CertificateIssued(null, studentAddress);
            const issueEvents = await contract.queryFilter(issueFilter);

            console.log('Found events:', issueEvents.length);

            // Fetch certificate details for each event
            const studentCerts = [];
            for (const event of issueEvents) {
                try {
                    const certificateId = event.args[0]; // certificateId is the first argument
                    console.log('Processing certificate:', certificateId);

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
                            isRevoked: certData.certificate.isRevoked
                        });
                    }
                } catch (err) {
                    console.error('Error fetching certificate:', err);
                }
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

    return (
        <div className="student-certificates-container">
            <h2 className="title">🎓 Student Certificates</h2>

            <div className="search-section">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Enter Student Blockchain Address (0x...)"
                        value={studentAddress}
                        onChange={(e) => setStudentAddress(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button onClick={handleSearch} disabled={loading} className="search-btn">
                        {loading ? '🔄 Searching...' : '🔍 Search Certificates'}
                    </button>
                </div>
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
