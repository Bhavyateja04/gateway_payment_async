import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './config/database.js';
import routes from './routes/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());
app.use(routes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});


app.get('/__routes', (req, res) => {
  const routes = [];

  app._router.stack.forEach(mw => {
    if (mw.route) {
      const methods = Object.keys(mw.route.methods).map(m => m.toUpperCase());
      routes.push({ methods, path: mw.route.path });
    } else if (mw.name === 'router' && mw.handle.stack) {
      mw.handle.stack.forEach(handler => {
        if (handler.route) {
          const methods = Object.keys(handler.route.methods).map(m => m.toUpperCase());
          routes.push({ methods, path: handler.route.path });
        }
      });
    }
  });

  res.json(routes);
});

const startServer = async () => {
  try {
    await initDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

import { paymentQueue } from './queues/index.js';
console.log('✅ Redis queues initialized:', paymentQueue.name);

startServer();