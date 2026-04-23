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
    // 2. Try to load from file
    else {
      const PROJECT_PATH = path.resolve(process.cwd(), './serviceAccountKey.json');
      const RENDER_SECRETS_PATH = '/etc/secrets/serviceAccountKey.json';
      const customPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ? path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH) : null;
      
      let filePath = null;
      if (customPath && fs.existsSync(customPath)) filePath = customPath;
      else if (fs.existsSync(PROJECT_PATH)) filePath = PROJECT_PATH;
      else if (fs.existsSync(RENDER_SECRETS_PATH)) filePath = RENDER_SECRETS_PATH;

      if (filePath) {
        console.log('✅ Found service account file at:', filePath);
        serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8').trim());
      } else {
        console.warn('⚠️ Service account file NOT found in standard locations.');
        try {
          console.log('📁 Project Root files:', fs.readdirSync(process.cwd()));
          if (fs.existsSync('/etc/secrets')) {
            console.log('📁 Render Secrets files:', fs.readdirSync('/etc/secrets'));
          }
        } catch (e) {}
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
