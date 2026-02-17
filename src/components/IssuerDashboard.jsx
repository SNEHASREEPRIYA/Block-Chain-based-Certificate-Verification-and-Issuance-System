import React, { useState } from 'react';
import { ethers } from 'ethers';
import { issueCertificateWithRecord, revokeCertificate } from '../utils/certificateContract';

const IssuerDashboard = () => {
    const [certificateData, setCertificateData] = useState({
        studentAddress: '',
        certificateId: '',
        ipfsHash: '',
        metadata: '',
        institutionName: '',
        courseName: '',
        grade: '',
        expiryDate: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCertificateData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const resetMessages = () => {
        setError('');
        setSuccess('');
    };

    const handleIssueCertificate = async (e) => {
        e.preventDefault();
        resetMessages();
        setLoading(true);

        try {
            if (!ethers.isAddress(certificateData.studentAddress)) {
                throw new Error('Invalid student address');
            }

            // Convert date to timestamp
            const expiryTimestamp = Math.floor(new Date(certificateData.expiryDate).getTime() / 1000);

            await issueCertificateWithRecord({
                ...certificateData,
                expiryDate: expiryTimestamp
            });

            setSuccess('Certificate issued successfully!');
            setCertificateData({
                studentAddress: '',
                certificateId: '',
                ipfsHash: '',
                metadata: '',
                institutionName: '',
                courseName: '',
                grade: '',
                expiryDate: ''
            });
        } catch (err) {
            setError(err.message || 'Failed to issue certificate');
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeCertificate = async (certificateId) => {
        resetMessages();
        setLoading(true);

        try {
            await revokeCertificate(certificateId);
            setSuccess(`Certificate ${certificateId} has been revoked`);
        } catch (err) {
            setError(err.message || 'Failed to revoke certificate');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="issuer-dashboard">
            <h2>Issue New Certificate</h2>
            
            <form onSubmit={handleIssueCertificate}>
                <div className="form-group">
                    <input
                        type="text"
                        name="certificateId"
                        value={certificateData.certificateId}
                        onChange={handleInputChange}
                        placeholder="Certificate ID"
                        required
                        disabled={loading}
                    />
                </div>

                <div className="form-group">
                    <input
                        type="text"
                        name="studentAddress"
                        value={certificateData.studentAddress}
                        onChange={handleInputChange}
                        placeholder="Student Address (0x...)"
                        required
                        disabled={loading}
                    />
                </div>

                <div className="form-group">
                    <input
                        type="text"
                        name="institutionName"
                        value={certificateData.institutionName}
                        onChange={handleInputChange}
                        placeholder="Institution Name"
                        required
                        disabled={loading}
                    />
                </div>

                <div className="form-group">
                    <input
                        type="text"
                        name="courseName"
                        value={certificateData.courseName}
                        onChange={handleInputChange}
                        placeholder="Course Name"
                        required
                        disabled={loading}
                    />
                </div>

                <div className="form-group">
                    <input
                        type="text"
                        name="grade"
                        value={certificateData.grade}
                        onChange={handleInputChange}
                        placeholder="Grade"
                        required
                        disabled={loading}
                    />
                </div>

                <div className="form-group">
                    <input
                        type="datetime-local"
                        name="expiryDate"
                        value={certificateData.expiryDate}
                        onChange={handleInputChange}
                        placeholder="Expiry Date"
                        required
                        disabled={loading}
                    />
                </div>

                <div className="form-group">
                    <input
                        type="text"
                        name="ipfsHash"
                        value={certificateData.ipfsHash}
                        onChange={handleInputChange}
                        placeholder="IPFS Hash"
                        required
                        disabled={loading}
                    />
                </div>

                <div className="form-group">
                    <textarea
                        name="metadata"
                        value={certificateData.metadata}
                        onChange={handleInputChange}
                        placeholder="Additional Metadata (JSON format)"
                        required
                        disabled={loading}
                    />
                </div>

                <button type="submit" className="submit-button" disabled={loading}>
                    {loading ? 'Processing...' : 'Issue Certificate'}
                </button>
            </form>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <style jsx>{`
                .issuer-dashboard {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }

                .form-group {
                    margin-bottom: 15px;
                }

                input, textarea {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 16px;
                }

                textarea {
                    height: 100px;
                    resize: vertical;
                }

                .submit-button {
                    background: #4CAF50;
                    color: white;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 16px;
                    width: 100%;
                }

                .submit-button:disabled {
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
};

export default IssuerDashboard;