import { ethers } from 'ethers';

export const storeCertificateInMetaMask = async (certificateData) => {
  try {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    // Create a message to sign that contains the certificate data
    const message = JSON.stringify({
      type: 'CERTIFICATE',
      data: certificateData,
      timestamp: Date.now()
    });

    // Sign the message using MetaMask
    const signature = await signer.signMessage(message);

    // Store the signature and message in local storage
    const storage = {
      message,
      signature,
      address: await signer.getAddress()
    };

    localStorage.setItem(`certificate_${certificateData.certificateId}`, JSON.stringify(storage));

    return {
      success: true,
      signature,
      message
    };
  } catch (error) {
    console.error('Error storing certificate:', error);
    throw error;
  }
};

export const verifyCertificateFromMetaMask = async (certificateId) => {
  try {
    // Retrieve the stored certificate data
    const storedData = localStorage.getItem(`certificate_${certificateId}`);
    if (!storedData) {
      throw new Error('Certificate not found');
    }

    const { message, signature, address } = JSON.parse(storedData);

    // Verify the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);

    // Check if the recovered address matches the stored address
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      throw new Error('Invalid certificate signature');
    }

    return {
      success: true,
      data: JSON.parse(message).data,
      issuer: address
    };
  } catch (error) {
    console.error('Error verifying certificate:', error);
    throw error;
  }
};