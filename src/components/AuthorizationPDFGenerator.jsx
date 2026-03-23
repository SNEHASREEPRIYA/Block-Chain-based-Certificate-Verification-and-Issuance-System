import React from 'react';
import { jsPDF } from 'jspdf';

function AuthorizationPDFGenerator() {
    const generateSampleAuthPDF = () => {
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Title
        pdf.setFontSize(20);
        pdf.setTextColor(102, 126, 234);
        pdf.text('CERTIFICATE ACCESS AUTHORIZATION', 105, 30, { align: 'center' });

        // Required content for validation
        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.text('AUTHORIZED BY INSTITUTION', 105, 50, { align: 'center' });

        pdf.setFontSize(12);
        pdf.text('PERMISSION GRANTED', 105, 70, { align: 'center' });
        pdf.text('STUDENT CERTIFICATE ACCESS', 105, 85, { align: 'center' });

        // Student Information Section (to be filled by student)
        pdf.setFontSize(16);
        pdf.setTextColor(102, 126, 234);
        pdf.text('Student Information:', 20, 110);

        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Student Name: ', 20, 125);
        pdf.text('Student ID: ', 20, 135);
        pdf.text('Blockchain Address: ', 20, 145);
        pdf.text('(Address must match certificate records)', 25, 152);

        // Institution details
        pdf.setFontSize(16);
        pdf.setTextColor(102, 126, 234);
        pdf.text('Institution Information:', 20, 170);

        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Institution Name: ', 20, 185);
        pdf.text('Authorization Date: ', 20, 195);
        pdf.text('Authorization ID: ', 20, 205);

        // Signature section
        pdf.setFontSize(14);
        pdf.setTextColor(0, 128, 0); // Green color
        pdf.text('AUTHORIZED SIGNATURE', 105, 230, { align: 'center' });
        pdf.text('DIGITAL SIGNATURE VERIFIED', 105, 240, { align: 'center' });
        pdf.text('Institution Seal Applied', 105, 250, { align: 'center' });

        // Instructions
        pdf.setFontSize(10);
        pdf.setTextColor(128, 128, 128);
        pdf.text('Instructions:', 20, 270);
        pdf.text('1. Fill in your personal information above', 20, 277);
        pdf.text('2. Have your institution authorize this document', 20, 284);
        pdf.text('3. Upload this PDF to access your certificates', 20, 291);

        pdf.save('Authorization-Form-Template.pdf');
    };

    return (
        <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px', margin: '20px 0' }}>
            <h3>📄 Generate Authorization PDF Template</h3>
            <p style={{ color: '#6c757d', marginBottom: '15px' }}>
                Download this template PDF, fill in your student information, and have your institution
                authorize it. Then upload the completed PDF to access your certificates.
            </p>
            <button
                onClick={generateSampleAuthPDF}
                style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                }}
            >
                📥 Download Authorization Template
            </button>
        </div>
    );
}

export default AuthorizationPDFGenerator;