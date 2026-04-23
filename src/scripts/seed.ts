import { db } from '../config/firebase.js';

const categories = [
  { id: 'nouvelle-collection', name: 'Nouvelle Collection', description: 'Les dernières créations de maroquinerie Maison Zuri.', image: '/29.png' },
  { id: 'sacs-a-main', name: 'Sacs à Main', description: 'L\'élégance au bout des doigts pour votre quotidien.', image: '/28.jpg' },
  { id: 'pochettes', name: 'Pochettes & Soirée', description: 'L\'accessoire idéal pour vos moments d\'exception.', image: '/17.jpg' },
  { id: 'sacs-bandouliere', name: 'Sacs Bandoulière', description: 'Liberté de mouvement et style affirmé.', image: '/10.jpg' },
  { id: 'cabas-voyage', name: 'Cabas & Voyage', description: 'De l\'espace sans compromis sur le raffinement.', image: '/34.jpg' },
  { id: 'best-sellers', name: 'Best-Sellers', description: 'Les icônes plébiscitées par notre communauté.', image: '/21.jpg' },
];

const products = [
  { name: 'Sac Iconique "Zuri" Noir', price: 320000, description: 'Le fleuron de notre collection. Un cuir d\'exception pour une allure intemporelle.', category: 'best-sellers', image: '/29.png', gallery: ['/29.png', '/30.jpg'] },
  { name: 'Saffiano "Atelier" Camel', price: 285000, description: 'Structure rigide et finitions dorées pour ce sac à main sophistiqué.', category: 'sacs-a-main', image: '/28.jpg', gallery: ['/28.jpg', '/27.jpg'] },
  { name: 'Pochette "Belle de Nuit"', price: 95000, description: 'Une touche d\'éclat pour vos soirées les plus mémorables.', category: 'pochettes', image: '/17.jpg', gallery: ['/17.jpg'] },
  { name: 'Besace "Nomade" Olive', price: 175000, description: 'Le compagnon parfait pour une journée active tout en restant chic.', category: 'sacs-bandouliere', image: '/10.jpg', gallery: ['/10.jpg'] },
  { name: 'Grand Cabas "Horizon"', price: 245000, description: 'Volume généreux et cuir souple pour vos escapades ou vos journées chargées.', category: 'cabas-voyage', image: '/34.jpg', gallery: ['/34.jpg'] },
  { name: 'Sac Seau "Tradition"', price: 215000, description: 'Un design classique revisité avec la modernité Maison Zuri.', category: 'sacs-a-main', image: '/21.jpg', gallery: ['/21.jpg'] },
  { name: 'Mini Sac "Bijou"', price: 125000, description: 'Petit par la taille, immense par son caractère.', category: 'nouvelle-collection', image: '/23.jpg', gallery: ['/23.jpg'] },
  { name: 'Pochette "Enveloppe" Cuir', price: 85000, description: 'Épure et minimalisme pour cette pochette en cuir grainé.', category: 'pochettes', image: '/15.jpg', gallery: ['/15.jpg'] },
];

async function seed() {
  if (!db) {
    console.error('❌ Cannot seed: Database not initialized. check your Service Account key.');
    return;
  }

  console.log('🌱 Starting database seeding...');

  try {
    // 1. Clear existing collections
    console.log('🗑️ Clearing existing products and categories...');
    const productDocs = await db.collection('products').get();
    const catDocs = await db.collection('categories').get();
    
    const batch = db.batch();
    productDocs.forEach(doc => batch.delete(doc.ref));
    catDocs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    // 2. Add categories
    console.log('📂 Adding categories...');
    for (const cat of categories) {
      const { id, ...data } = cat;
      await db.collection('categories').doc(id).set(data);
    }

    // 3. Add products
    console.log('🛍️ Adding products...');
    for (const prod of products) {
      await db.collection('products').add(prod);
    }

    console.log('✅ Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during seeding:', err);
    process.exit(1);
  }
}

seed();
