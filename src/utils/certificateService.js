import { collection, addDoc, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import db from './db';

export const saveCertificate = async (certificateData) => {
  try {
    const certificatesRef = collection(db, 'certificates');
    const docRef = await addDoc(certificatesRef, {
      ...certificateData,
      createdAt: new Date().toISOString(),
      status: 'active'
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving certificate:', error);
    throw error;
  }
};

export const getCertificate = async (certificateId) => {
  try {
    const certificatesRef = collection(db, 'certificates');
    const q = query(certificatesRef, where('certificateId', '==', certificateId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('Certificate not found');
    }

    const certificateDoc = querySnapshot.docs[0];
    return { id: certificateDoc.id, ...certificateDoc.data() };
  } catch (error) {
    console.error('Error getting certificate:', error);
    throw error;
  }
};

export const updateCertificateStatus = async (certificateId, status) => {
  try {
    const certificatesRef = collection(db, 'certificates');
    const q = query(certificatesRef, where('certificateId', '==', certificateId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('Certificate not found');
    }

    const certificateDoc = querySnapshot.docs[0];
    const docRef = doc(db, 'certificates', certificateDoc.id);
    await updateDoc(docRef, { status });
  } catch (error) {
    console.error('Error updating certificate status:', error);
    throw error;
  }
};