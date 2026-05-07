import { db, admin } from '../config/firebase.js';
import jwt from 'jsonwebtoken';
import { sendSMS } from '../utils/sms.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Fallback data for local development if Firebase is not connected
const mockProducts = [
  { id: '1', name: 'Sac Iconique Zuri', price: 320000, description: 'Le fleuron de notre collection.', category: 'sacs-a-main', image: '/29.png' },
  { id: '2', name: 'Pochette Belle de Nuit', price: 95000, description: 'L\'accessoire idéal pour vos soirées.', category: 'pochettes', image: '/17.jpg' }
];

export const resolvers = {
  Query: {
    products: async () => {
      if (!db) return mockProducts;
      try {
        const snapshot = await db.collection('products').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (err) {
        console.error('Error fetching products:', err);
        return mockProducts;
      }
    },
    product: async (_: any, { id }: { id: string }) => {
      if (!db) return mockProducts.find(p => p.id === id);
      const doc = await db.collection('products').doc(id).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    },
    categories: async () => {
      if (!db) return [];
      const snapshot = await db.collection('categories').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    category: async (_: any, { id }: { id: string }) => {
      if (!db) return null;
      const doc = await db.collection('categories').doc(id).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    },
    productsByCategory: async (_: any, { categoryId }: { categoryId: string }) => {
      if (!db) return mockProducts.filter(p => p.category === categoryId);
      const snapshot = await db.collection('products').where('category', '==', categoryId).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    orders: async () => {
      if (!db) return [];
      const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString()
      }));
    },
    adminStats: async () => {
      if (!db) return { 
        totalRevenue: 0, 
        ordersCount: 0, 
        productsCount: 0, 
        averageOrderValue: 0,
        salesChart: [], 
        countryStats: [] 
      };
      
      const ordersSnapshot = await db.collection('orders').get();
      const productsSnapshot = await db.collection('products').get();
      
      let totalRevenue = 0;
      const ordersCount = ordersSnapshot.size;
      const productsCount = productsSnapshot.size;
      
      const countryMap = new Map();
      const countries = {
        '225': { name: 'Côte d\'Ivoire', code: 'CI' },
        '221': { name: 'Sénégal', code: 'SN' },
        '223': { name: 'Mali', code: 'ML' },
        '224': { name: 'Guinée', code: 'GN' },
        '228': { name: 'Togo', code: 'TG' },
        '229': { name: 'Bénin', code: 'BJ' },
        '33': { name: 'France', code: 'FR' },
        '233': { name: 'Ghana', code: 'GH' },
        '234': { name: 'Nigeria', code: 'NG' },
      };
      
      ordersSnapshot.forEach(doc => {
        const order = doc.data();
        const amount = order.total || 0;
        totalRevenue += amount;

        // Détection du pays via l'indicatif
        let phone = order.phone || '';
        phone = phone.replace('+', '').replace(/^00/, '');
        
        let foundCountry = 'Autre';
        let foundCode = 'XX';
        
        for (const [prefix, info] of Object.entries(countries)) {
          if (phone.startsWith(prefix)) {
            foundCountry = info.name;
            foundCode = info.code;
            break;
          }
        }
        
        const current = countryMap.get(foundCountry) || { country: foundCountry, count: 0, revenue: 0, code: foundCode };
        countryMap.set(foundCountry, {
          ...current,
          count: current.count + 1,
          revenue: current.revenue + amount
        });
      });

      const averageOrderValue = ordersCount > 0 ? totalRevenue / ordersCount : 0;
      const countryStats = Array.from(countryMap.values())
        .sort((a, b) => b.revenue - a.revenue);

      // Simulation de graphique de ventes plus réaliste
      const salesChart = [
        { date: 'Jan', amount: totalRevenue * 0.12 },
        { date: 'Fév', amount: totalRevenue * 0.18 },
        { date: 'Mar', amount: totalRevenue * 0.22 },
        { date: 'Avr', amount: totalRevenue * 0.28 },
        { date: 'Mai', amount: totalRevenue * 0.20 },
      ];

      return {
        totalRevenue,
        ordersCount,
        productsCount,
        averageOrderValue,
        salesChart,
        countryStats
      };
    },
    me: (_: any, __: any, context: any) => {
      return context.user || null;
    }
  },
  Mutation: {
    loginAdmin: async (_: any, { email, password }: any) => {
      console.log('📨 Login attempt for:', email);
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@maisonzuri.com';
      const adminPass = process.env.ADMIN_PASSWORD || 'admin_zuri_2025';

      if (email === adminEmail && password === adminPass) {
        console.log('✅ Admin credentials verified.');
        const user = { id: 'admin-1', email: adminEmail, displayName: 'Admin Maison Zuri', role: 'ADMIN' };
        try {
          const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
          return { token, user };
        } catch (signError) {
          console.error('❌ Token signing error:', signError);
          throw new Error('Erreur de génération de token');
        }
      }
      console.warn('❌ Invalid admin credentials attempt:', email);
      throw new Error('Identifiants invalides');
    },
    createOrder: async (_: any, { input }: { input: any }) => {
      if (!db) return { id: 'mock-order-' + Date.now(), status: 'PENDING', createdAt: new Date().toISOString() };
      
      const orderData = {
        ...input,
        status: 'PENDING',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const orderRef = await db.collection('orders').add(orderData);
      
      // Envoi SMS de confirmation
      if (input.phone) {
        await sendSMS({
          to: input.phone,
          sender: 'MaisonZuri',
          content: `Maison Zuri: Merci ${input.customerName}, votre commande est confirmee ! Nous vous contacterons bientot pour la livraison.`
        });
      }

      return { id: orderRef.id, ...orderData, createdAt: new Date().toISOString() };
    },
    updateOrderStatus: async (_: any, { id, status }: { id: string, status: string }) => {
      if (!db) return null;
      await db.collection('orders').doc(id).update({ status });
      const doc = await db.collection('orders').doc(id).get();
      const orderData = doc.data();

      // Envoi SMS si la commande est livrée
      if (status === 'DELIVERED' && orderData?.phone) {
        await sendSMS({
          to: orderData.phone,
          sender: 'MaisonZuri',
          content: `Maison Zuri: Votre commande a ete livree. Merci de votre confiance et a bientot !`
        });
      }

      return { id: doc.id, ...orderData };
    },
    createProduct: async (_: any, { input }: { input: any }) => {
      if (!db) return { id: 'mock-prod-' + Date.now(), ...input };
      const productRef = await db.collection('products').add(input);
      return { id: productRef.id, ...input };
    },
    updateProduct: async (_: any, { id, input }: { id: string, input: any }) => {
      if (!db) return { id, ...input };
      await db.collection('products').doc(id).update(input);
      const doc = await db.collection('products').doc(id).get();
      return { id: doc.id, ...doc.data() };
    },
    deleteProduct: async (_: any, { id }: { id: string }) => {
      if (!db) return true;
      await db.collection('products').doc(id).delete();
      return true;
    },
    createCategory: async (_: any, { input }: { input: any }) => {
      if (!db) return { id: 'mock-cat-' + Date.now(), ...input };
      const ref = await db.collection('categories').add(input);
      return { id: ref.id, ...input };
    },
    updateCategory: async (_: any, { id, input }: { id: string, input: any }) => {
      if (!db) return { id, ...input };
      await db.collection('categories').doc(id).update(input);
      const doc = await db.collection('categories').doc(id).get();
      return { id: doc.id, ...doc.data() };
    },
    deleteCategory: async (_: any, { id }: { id: string }) => {
      if (!db) return true;
      await db.collection('categories').doc(id).delete();
      return true;
    }
  }
};
