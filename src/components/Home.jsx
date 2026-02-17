import React, { useState, useEffect } from 'react';
import { getContract, removeInstitution } from '../utils/certificateContract';

function Home() {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchRegisteredInstitutions();
    // listen for registration/removal events from other components in same window
    const onUpdate = () => fetchRegisteredInstitutions();
    window.addEventListener('institutionsUpdated', onUpdate);

    return () => {
      window.removeEventListener('institutionsUpdated', onUpdate);
    };
  }, []);

  const handleDeleteInstitution = async (institutionAddress, institutionName) => {
    if (!window.confirm(`Are you sure you want to delete "${institutionName}"? This will revoke their issuing permissions.`)) {
      return;
    }

    setDeletingId(institutionAddress);
    try {
      await removeInstitution(institutionAddress);
      setError('');
      await fetchRegisteredInstitutions();
      alert(`✅ Institution "${institutionName}" has been deleted successfully!`);
    } catch (err) {
      console.error('Error deleting institution:', err);
      setError(`Failed to delete institution: ${err.message}`);
      setDeletingId(null);
    }
  };

  const fetchRegisteredInstitutions = async () => {
    try {
      setLoading(true);
      const institutionMap = new Map();

      // Load deleted institutions to hide them from UI
      const deletedList = JSON.parse(sessionStorage.getItem('deletedInstitutions')) || [];

      // 1. Get institutions from sessionStorage (newly registered in this session)
      const sessionInstitutions = JSON.parse(sessionStorage.getItem('institutions')) || [];
      sessionInstitutions.forEach(inst => {
        const lower = inst.address.toLowerCase();
        if (deletedList.includes(lower)) return; // skip deleted

        institutionMap.set(lower, {
          name: inst.name,
          email: inst.email,
          accreditationId: inst.accreditationId,
          country: inst.country,
          address: inst.address,
          certificateCount: 0,
          source: 'registered'
        });
      });

      // Immediately show session-stored institutions so UI is responsive
      let institutionList = Array.from(institutionMap.values());
      setInstitutions(institutionList);

      // 2. Try to get CertificateIssued events from blockchain to augment certificate counts
      try {
        const contract = await getContract();
        const filter = contract.filters ? contract.filters.CertificateIssued() : null;
        const events = filter ? await contract.queryFilter(filter) : [];

        events.forEach(event => {
          const issuerAddress = (event.args.issuer || '').toLowerCase();
          const institutionName = event.args.institutionName || 'Unknown';

          if (deletedList.includes(issuerAddress)) return; // skip deleted institutions

          if (institutionMap.has(issuerAddress)) {
            // Update certificate count if already in map
            institutionMap.get(issuerAddress).certificateCount += 1;
          } else {
            // Add new institution from blockchain events
            institutionMap.set(issuerAddress, {
              name: institutionName,
              email: 'N/A',
              accreditationId: 'N/A',
              country: 'N/A',
              address: event.args.issuer,
              certificateCount: 1,
              source: 'blockchain'
            });
          }
        });

        institutionList = Array.from(institutionMap.values());
        setInstitutions(institutionList);
      } catch (chainErr) {
        console.warn('Could not fetch blockchain events, showing session institutions only:', chainErr);
        // keep session institutions already displayed
      }
      setError('');
    } catch (err) {
      console.error('Error fetching institutions:', err);
      setError('Could not fetch institutions');
      setInstitutions([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-container">
      <div className="welcome-section">
        <div className="hero-content">
          <img src="/certificate-check.png" alt="Certificate" className="hero-icon" />
          <h1>🎓 Blockchain Certificate Verification System</h1>
          <p>Secure, Verifiable, and Immutable Digital Certificates on the Blockchain</p>
          <button className="refresh-btn" onClick={fetchRegisteredInstitutions}>
            🔄 Refresh Institutions
          </button>
        </div>
      </div>

      <div className="institutions-section">
        <h2>📚 Registered Institutions</h2>

        {loading && <p className="loading">Loading institutions...</p>}
        {error && <p className="error">⚠️ {error}</p>}

        {!loading && institutions.length === 0 && (
          <p className="no-data">No institutions registered yet</p>
        )}

        {!loading && institutions.length > 0 && (
          <div className="institutions-grid">
            {institutions.map((inst, idx) => (
              <div key={idx} className="institution-card">
                <h3>{inst.name}</h3>
                <div className="details">
                  <p><strong>📧 Email:</strong> {inst.email}</p>
                  <p><strong>🏛️ Accreditation ID:</strong> {inst.accreditationId}</p>
                  <p><strong>🌍 Country:</strong> {inst.country}</p>
                  <p><strong>🔗 Address:</strong> <code>{inst.address.slice(0, 10)}...{inst.address.slice(-8)}</code></p>
                  <p><strong>📜 Certificates Issued:</strong> {inst.certificateCount}</p>
                  <p><strong>✅ Status:</strong> <span className="status-badge">{inst.source === 'registered' ? '🟢 Registered' : '🟣 Active'}</span></p>
                </div>
                <button
                  className="delete-btn"
                  onClick={() => handleDeleteInstitution(inst.address, inst.name)}
                  disabled={deletingId === inst.address}
                  title="Delete this institution and revoke issuer permissions"
                >
                  {deletingId === inst.address ? '🗑️ Deleting...' : '🗑️ Delete'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .home-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem;
        }

        .welcome-section {
          min-height: 50vh;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 3rem;
        }

        .hero-content {
          text-align: center;
          color: white;
        }

        .hero-icon {
          width: 120px;
          height: 120px;
          margin-bottom: 2rem;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
        }

        h1 {
          font-size: 3rem;
          margin-bottom: 1rem;
          font-weight: bold;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        h1 + p {
          font-size: 1.25rem;
          opacity: 0.95;
          margin-bottom: 2rem;
        }

        .refresh-btn {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 25px;
          font-size: 1rem;
          cursor: pointer;
          font-weight: bold;
          transition: transform 0.3s ease;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .refresh-btn:hover {
          transform: scale(1.05);
        }

        .institutions-section {
          background: white;
          border-radius: 15px;
          padding: 3rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }

        .institutions-section h2 {
          color: #667eea;
          font-size: 2rem;
          margin-bottom: 2rem;
          text-align: center;
        }

        .loading, .error, .no-data {
          text-align: center;
          font-size: 1.1rem;
          padding: 2rem;
        }

        .loading {
          color: #667eea;
        }

        .error {
          color: #e74c3c;
          background: #fadbd8;
          padding: 1rem;
          border-radius: 8px;
        }

        .no-data {
          color: #95a5a6;
        }

        .institutions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 2rem;
        }

        .institution-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease;
        }

        .institution-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .institution-card h3 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
          border-bottom: 2px solid rgba(255, 255, 255, 0.3);
          padding-bottom: 0.5rem;
        }

        .details {
          font-size: 0.9rem;
          line-height: 1.8;
        }

        .details p {
          margin: 0.5rem 0;
        }

        .details code {
          background: rgba(255, 255, 255, 0.2);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.85rem;
          word-break: break-all;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.2);
          font-weight: bold;
          font-size: 0.9rem;
        }

        .delete-btn {
          width: 100%;
          margin-top: 1rem;
          padding: 10px;
          background: rgba(229, 57, 53, 0.9);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          font-size: 0.95rem;
          transition: all 0.3s ease;
        }

        .delete-btn:hover:not(:disabled) {
          background: #e53935;
          transform: scale(1.02);
        }

        .delete-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          h1 {
            font-size: 2rem;
          }

          .institutions-grid {
            grid-template-columns: 1fr;
          }

          .institutions-section {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}

export default Home;