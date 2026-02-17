import React from 'react';

function HowItWorks() {
  return (
    <div className="how-it-works">
      <h2>How It Works</h2>
      <div className="content">
        <section className="step">
          <h3>1. Certificate Issuance</h3>
          <p>Authorized institutions can issue digital certificates that are stored securely on the blockchain.</p>
        </section>

        <section className="step">
          <h3>2. Blockchain Storage</h3>
          <p>Each certificate is stored with a unique hash on the blockchain, making it immutable and verifiable.</p>
        </section>

        <section className="step">
          <h3>3. Verification Process</h3>
          <p>Anyone can verify a certificate's authenticity by entering the certificate ID or scanning its QR code.</p>
        </section>
      </div>

      <style jsx>{`
        .how-it-works {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        h2 {
          color: #2c3e50;
          text-align: center;
          margin-bottom: 2rem;
          font-size: 2rem;
        }

        .content {
          display: grid;
          gap: 2rem;
        }

        .step {
          padding: 1.5rem;
          background: #f8f9fa;
          border-radius: 8px;
          transition: transform 0.3s ease;
        }

        .step:hover {
          transform: translateY(-5px);
        }

        h3 {
          color: #2196F3;
          margin-bottom: 1rem;
          font-size: 1.5rem;
        }

        p {
          color: #666;
          line-height: 1.6;
        }

        @media (max-width: 768px) {
          .how-it-works {
            padding: 1rem;
            margin: 1rem;
          }

          h2 {
            font-size: 1.5rem;
          }

          h3 {
            font-size: 1.2rem;
          }
        }
      `}</style>
    </div>
  );
}

export default HowItWorks;