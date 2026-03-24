import React from 'react';
import { jsPDF } from 'jspdf';

function AuthorizationPDFGenerator() {
    const generateSampleAuthPDF = () => {
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Draw border around the entire page
        pdf.setDrawColor(0, 0, 0);   // Border color (black)
        pdf.setLineWidth(1);         // Border thickness
        pdf.rect(10, 10, 190, 277);

        // Title
        pdf.setFontSize(20);
        pdf.setTextColor(102, 126, 234);
        pdf.text('CERTIFICATE ACCESS AUTHORIZATION', 105, 30, { align: 'center' });

        // Required content for validation
        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.text('AUTHORIZED BY INSTITUTION', 105, 45, { align: 'center' });

        pdf.setFontSize(12);
        pdf.text('PERMISSION GRANTED', 105, 55, { align: 'center' });
        pdf.text('STUDENT CERTIFICATE ACCESS', 105, 65, { align: 'center' });

        // Student Information Section (to be filled by student)
        pdf.setFontSize(16);
        pdf.setTextColor(102, 126, 234);
        pdf.text('Student Information:', 20, 90);

        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);

        pdf.text('Student Name: ', 20, 100);
        pdf.setDrawColor(0, 0, 0);   // Line color (black)
        pdf.setLineWidth(0.3);       // Thickness in mm (try 0.5, 1, 2 etc.)
        pdf.line(50, 100, 180, 100);

        pdf.text('Student ID: ', 20, 110);
        pdf.setDrawColor(0, 0, 0);   // Line color (black)
        pdf.setLineWidth(0.3);       // Thickness in mm (try 0.5, 1, 2 etc.)
        pdf.line(43, 110, 180, 110);

        pdf.text('Blockchain Address: ', 20, 120);
        pdf.setDrawColor(0, 0, 0);   // Line color (black)
        pdf.setLineWidth(0.3);       // Thickness in mm (try 0.5, 1, 2 etc.)
        pdf.line(60, 120, 180, 120);

        pdf.text('(Address must match certificate records)', 25, 126);

        // Institution details
        pdf.setFontSize(16);
        pdf.setTextColor(102, 126, 234);
        pdf.text('Institution Information:', 20, 140);

        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        // pdf.text('Institution Name: ', 20, 150);

        pdf.text('Institution Name: ', 20, 150);
        pdf.setDrawColor(0, 0, 0);   // Line color (black)
        pdf.setLineWidth(0.3);       // Thickness in mm (try 0.5, 1, 2 etc.)
        pdf.line(53, 150, 180, 150);

        pdf.text('Authorization Date: ', 20, 160);
        pdf.setDrawColor(0, 0, 0);   // Line color (black)
        pdf.setLineWidth(0.3);       // Thickness in mm (try 0.5, 1, 2 etc.)
        pdf.line(57, 160, 180, 160);

        pdf.text('Authorization ID: ', 20, 170);
        pdf.setDrawColor(0, 0, 0);   // Line color (black)
        pdf.setLineWidth(0.3);       // Thickness in mm (try 0.5, 1, 2 etc.)
        pdf.line(53, 170, 180, 170);

        // // Example: Empty box with text under it
        // pdf.setDrawColor(0,0,0);   // Border color
        // pdf.setLineWidth(0.5);       // Border thickness
        // pdf.rect(50, 185, 110, 15);   // x, y, width, height (box position)

        pdf.setDrawColor(0, 0, 0);   // Line color (black)
        pdf.setLineWidth(0.3);       // Thickness in mm (try 0.5, 1, 2 etc.)
        pdf.line(35, 195, 180, 195); // Horizontal line for signature

        // Text under the box
        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Status Of Authorization', 105, 205, { align: 'center' });


        // Signature section
        pdf.setFontSize(12);
        pdf.setTextColor(0, 128, 0); // Green color
        pdf.text('AUTHORIZED SIGNATURE', 105, 222, { align: 'center' });
        pdf.text('DIGITAL SIGNATURE VERIFIED', 105, 232, { align: 'center' });
        pdf.text('Institution Seal Applied', 105, 242, { align: 'center' });

        // Instructions
        pdf.setFontSize(10);
        pdf.setTextColor(128, 128, 128);
        pdf.text('Instructions:', 20, 260);
        pdf.text('1. Fill in your personal information above', 20, 265);
        pdf.text('2. Have your institution authorize this document', 20, 270);
        pdf.text('3. Upload this PDF to access your certificates', 20, 275);

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