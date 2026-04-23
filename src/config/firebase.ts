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

      // Recherche via scan de dossier (cas où le nom est légèrement différent)
      if (!filePath && fs.existsSync('/etc/secrets')) {
        const files = fs.readdirSync('/etc/secrets');
        const jsonFile = files.find(f => !f.startsWith('.') && f.endsWith('.json'));
        if (jsonFile) {
          filePath = path.join('/etc/secrets', jsonFile);
          console.log('✨ Auto-detected secret file at:', filePath);
        }
      }

      if (filePath) {
        console.log('✅ Found service account file at:', filePath);
        let content = fs.readFileSync(filePath, 'utf8').trim();
        try {
          serviceAccount = JSON.parse(content);
        } catch (e: any) {
          console.warn('⚠️ Standard JSON parse failed, attempting repair...');
          // Réparation courante : remplacer les \n mal échappés
          try {
            // On essaie de corriger les \n et autres problèmes fréquents
            const repaired = content
              .replace(/\\n/g, '\n') // convertir les \n littéraux
              .replace(/\n/g, '\\n') // puis s'assurer que dans le JSON c'est bien échappé
              .replace(/\\"/g, '"'); // etc.
            // Si c'est trop complexe, on utilise une approche plus simple :
            // Juste extraire la clé privée via Regex si le reste échoue
            const privateKeyMatch = content.match(/"private_key":\s*"([\s\S]*?)"/);
            const clientEmailMatch = content.match(/"client_email":\s*"([\s\S]*?)"/);
            const projectIdMatch = content.match(/"project_id":\s*"([\s\S]*?)"/);
            
            if (privateKeyMatch && clientEmailMatch && projectIdMatch) {
              // Nettoyage agressif de la clé privée
              let pk = privateKeyMatch[1]
                .replace(/\\n/g, '\n') // convertir les \n de texte en vrais sauts de ligne
                .replace(/\n\n+/g, '\n') // supprimer les doubles sauts de ligne
                .trim();
              
              // S'assurer que les en-têtes sont corrects
              if (!pk.includes('-----BEGIN PRIVATE KEY-----')) pk = '-----BEGIN PRIVATE KEY-----\n' + pk;
              if (!pk.includes('-----END PRIVATE KEY-----')) pk = pk + '\n-----END PRIVATE KEY-----';
              
              serviceAccount = {
                private_key: pk,
                client_email: clientEmailMatch[1],
                project_id: projectIdMatch[1]
              };
              console.log('✅ Successfully repaired and PEM-formatted credentials!');
            } else {
              throw new Error('Repair failed: essential fields not found');
            }
          } catch (repairErr: any) {
            console.error('❌ Repair failed:', repairErr.message);
          }
        }
      } else {
        console.warn('⚠️ Service account file NOT found in standard locations.');
        try {
          console.log('📁 Project Root files:', fs.readdirSync(process.cwd()));
          if (fs.existsSync('/etc/secrets')) {
            console.log('📁 Render Secrets files (Full):', fs.readdirSync('/etc/secrets'));
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
