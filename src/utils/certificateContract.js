import { ethers } from 'ethers';
import CertificateVerificationABI from '../artifacts/contracts/CertificateVerification.sol/CertificateVerification.json';

// Get contract address from environment variable
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

/**
 * Computes Keccak256 hash of certificate data
 * @param {string} certificateId The certificate ID
 * @param {string} studentAddress The student's Ethereum address
 * @param {string} institutionName The institution name
 * @param {string} courseName The course name
 * @param {string} grade The grade achieved
 * @param {number} expiryDate The expiry date as timestamp
 * @returns {string} The Keccak256 hash as hex string
 */
export const computeKeccak256Hash = (
    certificateId,
    studentAddress,
    institutionName,
    courseName,
    grade,
    expiryDate
) => {
    try {
        // Convert expiryDate to BigInt for proper encoding
        const expiryDateBigInt = BigInt(expiryDate || 0);

        // Use ethers.solidityPacked to encode exactly like Solidity's abi.encodePacked
        const packed = ethers.solidityPacked(
            ['string', 'address', 'string', 'string', 'string', 'uint256'],
            [certificateId, studentAddress, institutionName, courseName, grade, expiryDateBigInt]
        );

        // Compute Keccak256 hash
        const hash = ethers.keccak256(packed);
        return hash;
    } catch (error) {
        console.error('Error computing Keccak256 hash:', error);
        throw error;
    }
};

/**
 * Computes Keccak256 hash of a simple certificate (basic version)
 * @param {string} certificateId The certificate ID
 * @param {string} studentAddress The student's Ethereum address
 * @returns {string} The Keccak256 hash as hex string
 */
export const computeSimpleKeccak256Hash = (certificateId, studentAddress) => {
    try {
        const packed = ethers.solidityPacked(
            ['string', 'address'],
            [certificateId, studentAddress]
        );
        const hash = ethers.keccak256(packed);
        return hash;
    } catch (error) {
        console.error('Error computing simple Keccak256 hash:', error);
        throw error;
    }
};

/**
 * Hashes certificate data for integrity verification
 * @param {Object} certificateData The certificate data object
 * @returns {string} The Keccak256 hash
 */
export const hashCertificateData = (certificateData) => {
    try {
        return computeKeccak256Hash(
            certificateData.certificateId,
            certificateData.studentAddress,
            certificateData.institutionName || '',
            certificateData.courseName || '',
            certificateData.grade || '',
            certificateData.expiryDate || 0
        );
    } catch (error) {
        console.error('Error hashing certificate data:', error);
        throw error;
    }
};

// Create provider with ENS disabled completely
export const getProviderWithoutENS = () => {
    if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);

    // Override getNetwork to return a custom network config without ENS
    const originalGetNetwork = provider.getNetwork.bind(provider);
    provider.getNetwork = async () => {
        try {
            const network = await originalGetNetwork();
            return {
                name: network.name,
                chainId: network.chainId,
                // Explicitly set no ENS
                ensAddress: null
            };
        } catch (error) {
            // Return a fallback network config
            console.log('Using fallback network config');
            return {
                name: 'localhost',
                chainId: 31337,
                ensAddress: null
            };
        }
    };

    return provider;
};

export const getContract = async (withSigner = false) => {
    try {
        const provider = getProviderWithoutENS();

        const contract = new ethers.Contract(
            CONTRACT_ADDRESS,
            CertificateVerificationABI.abi,
            provider
        );

        if (withSigner) {
            const signer = await provider.getSigner();
            return contract.connect(signer);
        }

        return contract;
    } catch (error) {
        console.error('Error getting contract:', error);
        throw error;
    }
};

export const issueCertificateWithRecord = async (certificateData) => {
    try {
        // Compute the Keccak256 hash of the certificate data for verification
        const certificateHash = hashCertificateData(certificateData);
        console.log('Certificate Hash (Keccak256):', certificateHash);

        const contract = await getContract(true);
        const tx = await contract.issueCertificateWithRecord(
            certificateData.certificateId,
            certificateData.studentAddress,
            certificateData.ipfsHash,
            certificateData.metadata,
            certificateData.institutionName,
            certificateData.courseName,
            certificateData.grade,
            certificateData.expiryDate
        );

        const receipt = await tx.wait();

        // Return both transaction receipt and the computed hash for reference
        return {
            success: true,
            hash: receipt.hash,
            certificateHash: certificateHash
        };
    } catch (error) {
        console.error('Error issuing certificate:', error);
        throw error;
    }
};

export const verifyCertificate = async (certificateId) => {
    try {
        if (!certificateId || certificateId.trim() === '') {
            throw new Error('Certificate ID is required');
        }

        // Try blockchain first
        try {
            const contract = await getContract();
            const result = await contract.verifyCertificate(certificateId);

            console.log('Contract verify result:', result);

            // The contract returns (bool isValid, CertificateRecord memory certificate)
            // ethers.js v6 returns this as an array [isValid, certificate]
            let isValid, certificate;

            if (Array.isArray(result)) {
                [isValid, certificate] = result;
            } else if (result.isValid !== undefined) {
                // Alternative: result might be an object with named keys
                isValid = result.isValid;
                certificate = result.certificate;
            } else {
                throw new Error('Unexpected response format from contract');
            }

            // Check if certificate exists (issueDate > 0 means it was issued)
            if (!certificate || certificate.issueDate === 0 || !certificate.certificateId) {
                throw new Error('Certificate not found on blockchain');
            }

            // Validate certificate data
            if (!certificate.studentAddress || certificate.studentAddress === '0x0000000000000000000000000000000000000000') {
                throw new Error('Invalid certificate data');
            }

            return {
                isValid,
                source: 'blockchain',
                certificate: {
                    certificateId: certificate.certificateId,
                    studentAddress: certificate.studentAddress,
                    issuer: certificate.issuer,
                    institutionName: certificate.institutionName,
                    courseName: certificate.courseName,
                    grade: certificate.grade,
                    issueDate: certificate.issueDate ? new Date(Number(certificate.issueDate) * 1000).toLocaleString() : 'N/A',
                    issueDate_raw: Number(certificate.issueDate) || 0,
                    expiryDate: certificate.expiryDate ? new Date(Number(certificate.expiryDate) * 1000).toLocaleString() : 'N/A',
                    expiryDate_raw: Number(certificate.expiryDate) || 0,
                    isRevoked: certificate.isRevoked,
                    ipfsHash: certificate.ipfsHash,
                    metadata: certificate.metadata,
                    certificateHash: certificate.certificateHash  // Include the hash
                }
            };
        } catch (blockchainError) {
            console.warn('Blockchain lookup failed, trying sessionStorage fallback:', blockchainError.message);

            // Fallback to sessionStorage with case-insensitive lookup
            const sessionData = sessionStorage.getItem(certificateId);
            if (sessionData) {
                const certData = JSON.parse(sessionData);
                console.log('Certificate found in sessionStorage:', certData);

                return {
                    isValid: true,
                    source: 'sessionStorage',
                    certificate: {
                        certificateId: certData.certificateId,
                        studentAddress: certData.studentAddress,
                        issuer: certData.issuer,
                        institutionName: certData.institutionName || 'Institution',
                        courseName: certData.courseProgram,
                        grade: certData.grade,
                        issueDate: certData.issueDate ? new Date(certData.issueDate).toLocaleString() : 'N/A',
                        issueDate_raw: 0,
                        expiryDate: (typeof certData.expiryDate === 'number') ? new Date(certData.expiryDate * 1000).toLocaleString() : new Date(certData.expiryDate).toLocaleString(),
                        expiryDate_raw: typeof certData.expiryDate === 'number' ? certData.expiryDate : Math.floor(new Date(certData.expiryDate).getTime() / 1000),
                        isRevoked: false,
                        ipfsHash: certData.ipfsHash || '',
                        metadata: certData.metadata || '',
                        certificateHash: certData.certificateHash || ''
                    }
                };
            }

            // If not in sessionStorage, throw the original blockchain error
            throw blockchainError;
        }
    } catch (error) {
        console.error('Error verifying certificate:', error);
        if (error.message.includes('BAD_DATA')) {
            throw new Error('Invalid certificate ID format');
        }
        if (error.message.includes('Certificate not found')) {
            throw new Error('Certificate not found on blockchain or in local storage. Please check the Certificate ID.');
        }
        throw error;
    }
};

/**
 * Enhanced certificate integrity verification with sessionStorage fallback
 * @param {string} certificateId The certificate ID
 * @param {Object} certificateData The certificate data to verify
 * @returns {Object} Hash verification result with both hashes
 */
export const verifyCertificateIntegrityEnhanced = async (certificateId, certificateData) => {
    try {
        // Compute the hash locally
        const computedHash = hashCertificateData(certificateData);
        console.log('✓ Computed Hash:', computedHash);

        let storedHash = null;
        let hashSource = 'unknown';

        // Try to get the hash from blockchain first
        try {
            storedHash = await getCertificateHashFromContract(certificateId);
            hashSource = 'blockchain';
            console.log('✓ Retrieved stored hash from blockchain:', storedHash);
        } catch (blockchainErr) {
            console.warn('⚠ Could not get hash from blockchain, trying sessionStorage:', blockchainErr.message);
            // Try sessionStorage fallback
            const sessionData = sessionStorage.getItem(certificateId);
            if (sessionData) {
                const certData = JSON.parse(sessionData);
                storedHash = certData.certificateHash || '';
                hashSource = 'sessionStorage';
                console.log('✓ Retrieved stored hash from sessionStorage:', storedHash);
            }
        }

        // Check if hashes match
        const isValid = storedHash && computedHash.toLowerCase() === storedHash.toLowerCase();

        console.log('🔐 Hash Verification Result:', {
            computedHash,
            storedHash,
            isValid,
            hashSource
        });

        return {
            isValid,
            computedHash,
            storedHash,
            hashSource,
            hashesMatch: isValid
        };
    } catch (error) {
        console.error('Error verifying certificate integrity:', error);
        return {
            isValid: false,
            computedHash: null,
            storedHash: null,
            hashSource: 'error',
            hashesMatch: false,
            error: error.message
        };
    }
};

/**
 * Retrieves the Keccak256 hash for a certificate from the smart contract
 * @param {string} certificateId The certificate ID
 * @returns {string} The Keccak256 hash
 */
export const getCertificateHashFromContract = async (certificateId) => {
    try {
        const contract = await getContract();
        const hash = await contract.getCertificateHash(certificateId);
        console.log('Certificate Hash from contract:', hash);
        return hash;
    } catch (error) {
        console.error('Error getting certificate hash:', error);
        throw error;
    }
};

/**
 * Verifies certificate integrity by comparing computed hash with stored hash
 * @param {string} certificateId The certificate ID
 * @param {Object} certificateData The certificate data to verify
 * @returns {boolean} Whether the certificate hash is valid
 */
export const verifyCertificateIntegrity = async (certificateId, certificateData) => {
    try {
        // Compute the hash locally
        const computedHash = hashCertificateData(certificateData);

        // Get the hash from the contract
        const storedHash = await getCertificateHashFromContract(certificateId);

        // Compare hashes
        const isValid = computedHash.toLowerCase() === storedHash.toLowerCase();

        console.log('Computed Hash:', computedHash);
        console.log('Stored Hash:', storedHash);
        console.log('Hash Match:', isValid);

        return isValid;
    } catch (error) {
        console.error('Error verifying certificate integrity:', error);
        throw error;
    }
};

/**
 * Verifies certificate hash using contract's verifyCertificateHash function
 * @param {string} certificateId The certificate ID
 * @param {string} hash The hash to verify
 * @returns {boolean} Whether the hash matches
 */
export const verifyCertificateHashWithContract = async (certificateId, hash) => {
    try {
        const contract = await getContract();
        const result = await contract.verifyCertificateHash(certificateId, hash);
        console.log('Hash verification result:', result);
        return result;
    } catch (error) {
        console.error('Error verifying certificate hash with contract:', error);
        throw error;
    }
};

/**
 * Checks if a certificate hash has been revoked
 * @param {string} hash The certificate hash to check
 * @returns {boolean} Whether the hash has been revoked
 */
export const isHashRevoked = async (hash) => {
    try {
        const contract = await getContract();
        const result = await contract.isHashRevoked(hash);
        console.log('Hash revocation status:', result);
        return result;
    } catch (error) {
        console.error('Error checking hash revocation status:', error);
        throw error;
    }
};

export const revokeCertificate = async (certificateId) => {
    try {
        const contract = await getContract(true);
        const tx = await contract.revokeCertificate(certificateId);
        await tx.wait();
        return true;
    } catch (error) {
        console.error('Error revoking certificate:', error);
        throw error;
    }
};

export const getStudentCertificates = async (studentAddress) => {
    try {
        const contract = await getContract();
        const certificates = await contract.getStudentCertificates(studentAddress);
        return certificates;
    } catch (error) {
        console.error('Error getting student certificates:', error);
        throw error;
    }
};

export const getInstitutionCertificates = async (institutionName) => {
    try {
        const contract = await getContract();
        const certificates = await contract.getInstitutionCertificates(institutionName);
        return certificates;
    } catch (error) {
        console.error('Error getting institution certificates:', error);
        throw error;
    }
};

export const grantIssuerRole = async (address) => {
    try {
        const contract = await getContract(true);
        const ISSUER_ROLE = await contract.ISSUER_ROLE();
        const tx = await contract.grantRole(ISSUER_ROLE, address);
        await tx.wait();
        return true;
    } catch (error) {
        console.error('Error granting issuer role:', error);
        throw error;
    }
};

export const revokeIssuerRole = async (address) => {
    try {
        const contract = await getContract(true);
        const ISSUER_ROLE = await contract.ISSUER_ROLE();
        const tx = await contract.revokeRole(ISSUER_ROLE, address);
        await tx.wait();
        return true;
    } catch (error) {
        console.error('Error revoking issuer role:', error);
        throw error;
    }
};

export const removeInstitution = async (institutionAddress) => {
    try {
        // The smart contract does not implement a removeInstitution function.
        // Instead revoke the ISSUER_ROLE for the institution address (server/admin must be caller).
        await revokeIssuerRole(institutionAddress);

        // Also remove from sessionStorage
        let institutions = JSON.parse(sessionStorage.getItem('institutions')) || [];
        institutions = institutions.filter(inst => inst.address.toLowerCase() !== institutionAddress.toLowerCase());
        sessionStorage.setItem('institutions', JSON.stringify(institutions));

        // Persist deleted institution addresses so UI can hide them even if past events exist
        let deleted = JSON.parse(sessionStorage.getItem('deletedInstitutions')) || [];
        const lowerAddr = institutionAddress.toLowerCase();
        if (!deleted.includes(lowerAddr)) {
            deleted.push(lowerAddr);
            sessionStorage.setItem('deletedInstitutions', JSON.stringify(deleted));
        }

        return true;
    } catch (error) {
        console.error('Error removing institution:', error);
        throw error;
    }
};