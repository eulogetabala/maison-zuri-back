import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

const serviceAccount = JSON.parse(fs.readFileSync('/Users/smartvision2/Desktop/2025_Projet/maisonzuri/burger-house-4a1fd-firebase-adminsdk-sp69x-e196726d1b.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testWrite() {
  console.log("✍️ Tentative d'écriture d'un produit de TEST UNIQUE...");
  try {
    const res = await db.collection('products').add({
      name: "PROD_TEST_VERIFICATION_" + Date.now(),
      price: 999,
      description: "Si vous voyez ce produit, la connexion est OK",
      category: "test"
    });
    console.log("✅ Produit de test écrit avec l'ID:", res.id);
    process.exit(0);
  } catch (e) {
    console.error("❌ Erreur d'écriture:", e);
    process.exit(1);
  }
}

testWrite();
