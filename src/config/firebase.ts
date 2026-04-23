import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json';
const absolutePath = path.resolve(process.cwd(), serviceAccountPath);

if (!admin.apps.length) {
  try {
    let serviceAccount;
    
    // 1. Try to load from JSON string in environment variable (Render/Production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      console.log('✅ Firebase initialized from Environment Variable.');
    } 
    // 2. Try to load from file (Local Development)
    else if (fs.existsSync(absolutePath)) {
      serviceAccount = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
      console.log('✅ Firebase initialized from Service Account file.');
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      console.warn('⚠️ No Firebase credentials found. Database will not be available.');
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error);
  }
}

export const db = admin.apps.length ? admin.firestore() : null;
export const auth = admin.apps.length ? admin.auth() : null;
export { admin };
