import React, { useState } from 'react';

function RetrieveInstitution() {
  const [retrievalAddress, setRetrievalAddress] = useState('');
  const [retrievedInstitution, setRetrievedInstitution] = useState(null);
  const [error, setError] = useState('');

  const retrieveInstitution = () => {
    // Get institutions from sessionStorage
    let institutions = JSON.parse(sessionStorage.getItem('institutions')) || [];

    // Normalize and search for the institution by Ethereum address (case-insensitive)
    const target = retrievalAddress.trim().toLowerCase();
    const institution = institutions.find(inst => (inst.address || '').toLowerCase() === target);

    if (institution) {
      setRetrievedInstitution(institution);
      setError('');
    } else {
      setError('Address not recognized.');
      setRetrievedInstitution(null);
    }
  };

  return (
    <div className="retrieve-institution">
      <h2>Retrieve Institution</h2>

      <div className="form-group">
        <label>Enter Institution Ethereum Address</label>
        <input
          type="text"
          value={retrievalAddress}
          onChange={(e) => setRetrievalAddress(e.target.value)}
          required
        />
      </div>

      <button type="button" onClick={retrieveInstitution} className="submit-btn">
        Retrieve Institution
      </button>

      {retrievedInstitution && (
        <div className="institution-info">
          <h3>Institution Details</h3>
          <p><strong>Name:</strong> {retrievedInstitution.name}</p>
          <p><strong>Email:</strong> {retrievedInstitution.email}</p>
          {/* <p><strong>Accreditation ID:</strong> {retrievedInstitution.accreditationId}</p> */}
          <p><strong>Country:</strong> {retrievedInstitution.country}</p>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <style>
        {`
          .retrieve-institution {
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

          .institution-info {
            margin-top: 2rem;
            padding: 1rem;
            background: #f4f4f4;
            border-radius: 8px;
          }

          .institution-info h3 {
            margin-bottom: 1rem;
            color: #333;
          }

          .institution-info p {
            margin: 0.5rem 0;
            color: #333;
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

export default RetrieveInstitution;
