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
      if (!db) return { totalRevenue: 0, ordersCount: 0, productsCount: 0, salesChart: [] };
      
      const ordersSnapshot = await db.collection('orders').get();
      const productsSnapshot = await db.collection('products').get();
      
      let totalRevenue = 0;
      const ordersCount = ordersSnapshot.size;
      const productsCount = productsSnapshot.size;
      
      // Calculate revenue from completed or pending orders
      ordersSnapshot.forEach(doc => {
        totalRevenue += (doc.data().total || 0);
      });

      // Mock sales chart data for now based on recent orders
      const salesChart = [
        { date: 'Jan', amount: totalRevenue * 0.1 },
        { date: 'Feb', amount: totalRevenue * 0.15 },
        { date: 'Mar', amount: totalRevenue * 0.25 },
        { date: 'Apr', amount: totalRevenue * 0.5 },
      ];

      return {
        totalRevenue,
        ordersCount,
        productsCount,
        salesChart
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
