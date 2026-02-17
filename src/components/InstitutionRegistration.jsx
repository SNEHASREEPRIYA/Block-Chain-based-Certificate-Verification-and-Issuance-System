import React, { useState } from 'react';
import { ethers } from 'ethers';
import WalletConnect from './WalletConnect';
import { getProviderWithoutENS } from '../utils/certificateContract';
import CertificateVerificationABI from '../abis/CertificateVerification.json';

const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

function InstitutionRegistration() {
  const [institutionAddress, setInstitutionAddress] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [email, setEmail] = useState('');
  const [accreditationId, setAccreditationId] = useState('');
  const [country, setCountry] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const registerInstitution = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFeedback('');

    try {
      if (!window.ethereum) throw new Error('MetaMask not detected');

      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const provider = getProviderWithoutENS();
      const signer = await provider.getSigner();

      // Create contract with signer
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CertificateVerificationABI.abi || CertificateVerificationABI, signer);

      // Grant ISSUER_ROLE
      const ISSUER_ROLE = ethers.id("ISSUER_ROLE");
      console.log('Granting ISSUER_ROLE to:', institutionAddress);
      const tx = await contract.grantRole(ISSUER_ROLE, institutionAddress);
      await tx.wait();

      // Store institution details in sessionStorage
      const institutionData = {
        address: institutionAddress.toLowerCase(),
        name: institutionName,
        email,
        accreditationId,
        country
      };

      let institutions = JSON.parse(sessionStorage.getItem('institutions')) || [];
      institutions.push(institutionData);
      sessionStorage.setItem('institutions', JSON.stringify(institutions));

      // Remove this address from deletedInstitutions if present (un-delete)
      try {
        const lower = institutionData.address.toLowerCase();
        let deleted = JSON.parse(sessionStorage.getItem('deletedInstitutions')) || [];
        deleted = deleted.filter(d => d !== lower);
        sessionStorage.setItem('deletedInstitutions', JSON.stringify(deleted));
      } catch (e) {
        // ignore sessionStorage errors
      }

      // Notify other components in the same window to refresh their data
      try {
        window.dispatchEvent(new CustomEvent('institutionsUpdated'));
      } catch (e) {
        // ignore if dispatch fails
      }

      setFeedback(`✅ Institution "${institutionName}" registered successfully.`);
      setInstitutionAddress('');
      setInstitutionName('');
      setEmail('');
      setAccreditationId('');
      setCountry('');
    } catch (err) {
      console.error('Registration error:', err);
      // Filter out ENS-related errors
      if (err.message && err.message.includes('ENS')) {
        setError('Network connection issue. Please make sure you are connected to Localhost 31337');
      } else {
        setError(err.message || 'Transaction failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="institution-registration">
      <h2>Register Institution</h2>
      <WalletConnect />

      <form onSubmit={registerInstitution} className="registration-form">
        <div className="form-group">
          <label>Institution Ethereum Address</label>
          <input
            type="text"
            value={institutionAddress}
            onChange={(e) => setInstitutionAddress(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Institution Name</label>
          <input
            type="text"
            value={institutionName}
            onChange={(e) => setInstitutionName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Accreditation ID</label>
          <input
            type="text"
            value={accreditationId}
            onChange={(e) => setAccreditationId(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Country</label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Registering...' : 'Register Institution'}
        </button>
      </form>

      {feedback && <div className="success-message">{feedback}</div>}
      {error && <div className="error-message">{error}</div>}

      <style>
        {`
          .institution-registration {
            padding: 2rem;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 600px;
            margin: auto;
          }

          h2 {
            text-align: center;
            margin-bottom: 1.5rem;
          }

          .form-group {
            margin-bottom: 1rem;
          }

          label {
            font-weight: 500;
            display: block;
            margin-bottom: 0.5rem;
          }

          input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ccc;
            border-radius: 5px;
          }

          .submit-btn {
            width: 100%;
            padding: 1rem;
            background: #2196F3;
            color: #fff;
            border: none;
            border-radius: 5px;
            font-weight: bold;
            cursor: pointer;
          }

          .submit-btn:disabled {
            background: #90caf9;
          }

          .success-message {
            margin-top: 1rem;
            color: green;
            text-align: center;
          }

          .error-message {
            margin-top: 1rem;
            color: red;
            text-align: center;
          }
        `}
      </style>
    </div>
  );
}

export default InstitutionRegistration;






// import React, { useState } from 'react';
// import { ethers } from 'ethers';
// import WalletConnect from './WalletConnect';
// import CertificateVerificationABI from '../abis/CertificateVerification.json';

// const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// function InstitutionRegistration() {
//   const [institutionAddress, setInstitutionAddress] = useState('');
//   const [institutionName, setInstitutionName] = useState('');
//   const [email, setEmail] = useState('');
//   const [accreditationId, setAccreditationId] = useState('');
//   const [country, setCountry] = useState('');
//   const [feedback, setFeedback] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');

//   const registerInstitution = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setError('');
//     setFeedback('');

//     try {
//       if (!window.ethereum) throw new Error('MetaMask not detected');

//       await window.ethereum.request({ method: 'eth_requestAccounts' });

//       const provider = new ethers.BrowserProvider(window.ethereum);
//       const signer = await provider.getSigner();
//       const contract = new ethers.Contract(CONTRACT_ADDRESS, CertificateVerificationABI, signer);

//       const ISSUER_ROLE = ethers.id("ISSUER_ROLE");
//       const tx = await contract.grantRole(ISSUER_ROLE, institutionAddress);
//       await tx.wait();

//       setFeedback(`✅ Institution "${institutionName}" registered successfully.`);
//       setInstitutionAddress('');
//       setInstitutionName('');
//       setEmail('');
//       setAccreditationId('');
//       setCountry('');
//     } catch (err) {
//       setError(err.message || 'Transaction failed.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="institution-registration">
//       <h2>Register Institution</h2>
//       <WalletConnect />

//       <form onSubmit={registerInstitution} className="registration-form">
//         <div className="form-group">
//           <label>Institution Ethereum Address</label>
//           <input
//             type="text"
//             value={institutionAddress}
//             onChange={(e) => setInstitutionAddress(e.target.value)}
//             required
//           />
//         </div>

//         <div className="form-group">
//           <label>Institution Name</label>
//           <input
//             type="text"
//             value={institutionName}
//             onChange={(e) => setInstitutionName(e.target.value)}
//             required
//           />
//         </div>

//         <div className="form-group">
//           <label>Email</label>
//           <input
//             type="email"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             required
//           />
//         </div>

//         <div className="form-group">
//           <label>Accreditation ID</label>
//           <input
//             type="text"
//             value={accreditationId}
//             onChange={(e) => setAccreditationId(e.target.value)}
//             required
//           />
//         </div>

//         <div className="form-group">
//           <label>Country</label>
//           <input
//             type="text"
//             value={country}
//             onChange={(e) => setCountry(e.target.value)}
//             required
//           />
//         </div>

//         <button type="submit" className="submit-btn" disabled={loading}>
//           {loading ? 'Registering...' : 'Register Institution'}
//         </button>
//       </form>

//       {feedback && <div className="success-message">{feedback}</div>}
//       {error && <div className="error-message">{error}</div>}

//       <style>
//         {`
//           .institution-registration {
//             padding: 2rem;
//             background: #fff;
//             border-radius: 12px;
//             box-shadow: 0 2px 10px rgba(0,0,0,0.1);
//             max-width: 600px;
//             margin: auto;
//           }

//           h2 {
//             text-align: center;
//             margin-bottom: 1.5rem;
//           }

//           .form-group {
//             margin-bottom: 1rem;
//           }

//           label {
//             font-weight: 500;
//             display: block;
//             margin-bottom: 0.5rem;
//           }

//           input {
//             width: 100%;
//             padding: 0.75rem;
//             border: 1px solid #ccc;
//             border-radius: 5px;
//           }

//           .submit-btn {
//             width: 100%;
//             padding: 1rem;
//             background: #2196F3;
//             color: #fff;
//             border: none;
//             border-radius: 5px;
//             font-weight: bold;
//             cursor: pointer;
//           }

//           .submit-btn:disabled {
//             background: #90caf9;
//           }

//           .success-message {
//             margin-top: 1rem;
//             color: green;
//             text-align: center;
//           }

//           .error-message {
//             margin-top: 1rem;
//             color: red;
//             text-align: center;
//           }
//         `}
//       </style>
//     </div>
//   );
// }

// export default InstitutionRegistration;













