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
      const rawValue = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      try {
        const match = rawValue.match(/\{[\s\S]*\}/);
        if (match) {
          serviceAccount = JSON.parse(match[0]);
          console.log('✅ Firebase initialized from Environment Variable (Regex Match).');
        } else {
          throw new Error('No JSON object found in variable');
        }
      } catch (e: any) {
        console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
      }
    } 
    // 2. Try to load from file (Local Development)
    else {
      console.log('🔍 Checking for service account file at:', absolutePath);
      if (fs.existsSync(absolutePath)) {
        serviceAccount = JSON.parse(fs.readFileSync(absolutePath, 'utf8').trim());
        console.log('✅ Firebase initialized from Service Account file.');
      }
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
