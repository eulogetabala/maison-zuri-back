import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json';
const absolutePath = path.resolve(process.cwd(), serviceAccountPath);

if (!admin.apps.length) {
  try {
    if (fs.existsSync(absolutePath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Firebase Admin initialized successfully.');
    } else {
      console.warn('⚠️ Firebase Service Account file not found at:', absolutePath);
      console.warn('Please provide a service account key to enable database functionality.');
      // Initialize with default or placeholder if needed for local development without DB
      // admin.initializeApp(); 
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error);
  }
}

export const db = admin.apps.length ? admin.firestore() : null;
export const auth = admin.apps.length ? admin.auth() : null;
export { admin };
