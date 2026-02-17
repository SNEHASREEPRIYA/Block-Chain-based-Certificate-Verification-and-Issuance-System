import { ethers } from 'ethers';
import CertificateVerificationABI from '../artifacts/contracts/CertificateVerification.sol/CertificateVerification.json';

// Get contract address from environment variable
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

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
        await tx.wait();
        return true;
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
            certificate: {
                certificateId: certificate.certificateId,
                studentAddress: certificate.studentAddress,
                issuer: certificate.issuer,
                institutionName: certificate.institutionName,
                courseName: certificate.courseName,
                grade: certificate.grade,
                issueDate: certificate.issueDate ? new Date(Number(certificate.issueDate) * 1000).toLocaleString() : 'N/A',
                expiryDate: certificate.expiryDate ? new Date(Number(certificate.expiryDate) * 1000).toLocaleString() : 'N/A',
                isRevoked: certificate.isRevoked,
                ipfsHash: certificate.ipfsHash,
                metadata: certificate.metadata
            }
        };
    } catch (error) {
        console.error('Error verifying certificate:', error);
        if (error.message.includes('BAD_DATA')) {
            throw new Error('Invalid certificate ID format');
        }
        if (error.message.includes('Certificate not found')) {
            throw new Error('Certificate not found on blockchain. Please check the Certificate ID.');
        }
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