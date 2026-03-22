import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

function QRScanner({ onResult, onError }) {
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
        setError('');
        if (onResult) onResult(data);
        scanner.clear();
      },
      (err) => {
        // html5-qrcode calls error callback frequently while scanning until a valid QR is found.
        // Ignore the expected "NotFoundException" for each non-detected frame so UI stays clean.
        const errMsg =
          typeof err === 'string'
            ? err
            : err?.message
              ? err.message
              : JSON.stringify(err || 'Unknown scan error');

        if (errMsg.includes('NotFoundException') || errMsg.includes('No MultiFormat Readers were able to detect')) {
          console.debug('QR scanning frame no code found (expected):', errMsg);
          return;
        }

        const message = 'Error scanning QR code: ' + errMsg;
        setError(message);
        if (onError) onError(message);
      }
    );

    return () => {
      scanner.clear();
    };
  }, []);

  return (
    <div className="qr-scanner">
      {!result && <h2>QR Code Scanner</h2>}
      <div id="reader" className="scanner-container"></div>
      {result && (
        <>
          <h3>Scanned result <small>(QR gives the unique certificate ID)</small></h3>
          <div className="result">
            <pre>{String(result).trim()}</pre>
          </div>
        </>
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
          max-height: 180px;
          overflow: auto;
          word-break: break-all;
        }

        .result pre {
          margin:0;
          white-space: pre-wrap;
          word-wrap: break-word;
          font-size: 0.9rem;
          line-height: 1.3;
          color: #23395d;
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