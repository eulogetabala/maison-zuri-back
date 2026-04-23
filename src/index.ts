import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { typeDefs } from './graphql/typeDefs.js';
import { resolvers } from './graphql/resolvers.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

interface MyContext {
  token?: string;
  user?: any;
}

const app = express();
const httpServer = http.createServer(app);

const server = new ApolloServer<MyContext>({
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  formatError: (formattedError, error) => {
    // Log the error to the console for debugging
    console.error('❌ GraphQL Error:', error);
    return formattedError;
  },
});

await server.start();

app.use(
  '/graphql',
  cors<cors.CorsRequest>(),
  express.json(),
  expressMiddleware(server, {
    context: async ({ req }) => {
      const authHeader = req.headers.authorization || '';
      let token = '';
      let user = null;

      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      } else if (req.headers.token) {
        token = req.headers.token as string;
      }

      if (token && token !== 'undefined' && token !== 'null') {
        try {
          user = jwt.verify(token, JWT_SECRET);
        } catch (err) {
          console.warn('⚠️ Invalid or expired token');
        }
      }

      return { token, user };
    },
  }),
);

const PORT = process.env.PORT || 4000;

await new Promise<void>((resolve) => httpServer.listen({ port: PORT }, resolve));

console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
