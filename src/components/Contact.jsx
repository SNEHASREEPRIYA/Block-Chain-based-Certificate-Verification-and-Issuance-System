import React from 'react';

function Contact() {
  return (
    <div className="contact-container">
      <h2>Contact Us</h2>
      <div className="contact-content">
        <p>If you have any questions or concerns, please feel free to reach out to us.</p>
        {/* Add your contact form or contact information here */}
      </div>

      <style jsx>{`
        .contact-container {
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
        }

        .contact-content {
          text-align: center;
        }
      `}</style>
    </div>
  );
}

export default Contact;