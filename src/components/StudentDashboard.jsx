import React, { useState, useEffect } from 'react';

function StudentDashboard() {
  const [certificates, setCertificates] = useState([]);

  return (
    <div className="dashboard-container">
      <h2>Student Dashboard</h2>
      <div className="certificates-list">
        {certificates.length === 0 ? (
          <p>No certificates found</p>
        ) : (
          certificates.map((cert, index) => (
            <div key={index} className="certificate-card">
              <h3>Certificate ID: {cert.certificateId}</h3>
              <p>Issue Date: {new Date(cert.issueDate * 1000).toLocaleDateString()}</p>
              <p>Status: {cert.isRevoked ? 'Revoked' : 'Valid'}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default StudentDashboard;