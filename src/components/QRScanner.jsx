import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

function QRScanner() {
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', {
      qrbox: {
        width: 250,
        height: 250,
      },
      fps: 5,
    });

    scanner.render(
      (data) => {
        setResult(data);
        scanner.clear();
      },
      (err) => {
        setError('Error scanning QR code: ' + err);
      }
    );

    return () => {
      scanner.clear();
    };
  }, []);

  return (
    <div className="qr-scanner">
      <h2>QR Code Scanner</h2>
      <div id="reader" className="scanner-container"></div>
      {result && (
        <div className="result">
          <h3>Scanned Result:</h3>
          <p>{result}</p>
        </div>
      )}
      {error && <div className="error">{error}</div>}

      <style jsx>{`
        .qr-scanner {
          max-width: 500px;
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
        }

        .scanner-container {
          margin-bottom: 2rem;
        }

        .result {
          padding: 1rem;
          background: #e8f5e9;
          border-radius: 8px;
        }

        .error {
          padding: 1rem;
          background: #ffebee;
          border-radius: 8px;
          color: #c62828;
        }

        h3 {
          margin-bottom: 0.5rem;
        }
      `}</style>
    </div>
  );
}

export default QRScanner;