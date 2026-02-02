import express, { type Application } from 'express';
import routes from './routes/index.js';

const app: Application = express();
const PORT = process.env.BACKEND_PORT || 4291;
import cors from 'cors';

// Middleware
// TODO: Add rate limiting middleware to prevent abuse (e.g., express-rate-limit)
// CORS configured to support credentials for cross-origin requests
app.use(cors({
  origin: ['http://localhost:3847', 'http://localhost:3000'], // Frontend origins
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));
app.use(express.json());

// Mount all API routes
app.use('/api', routes);

// ============================================================================
// SERVER STARTUP
// ============================================================================

app.listen(PORT, () => {
  console.log(`\n🚀 Backend server running at http://localhost:${PORT}\n`);
  console.log('Available API endpoints:');
  console.log('  Auth:');
  console.log('    POST   /api/auth/login');
  console.log('  Sponsors:');
  console.log('    GET    /api/sponsors');
  console.log('    GET    /api/sponsors/:id');
  console.log('    POST   /api/sponsors');
  console.log('  Publishers:');
  console.log('    GET    /api/publishers');
  console.log('    GET    /api/publishers/:id');
  console.log('  Campaigns:');
  console.log('    GET    /api/campaigns');
  console.log('    GET    /api/campaigns/:id');
  console.log('    POST   /api/campaigns');
  console.log('  Ad Slots:');
  console.log('    GET    /api/ad-slots');
  console.log('    GET    /api/ad-slots/:id');
  console.log('    POST   /api/ad-slots');
  console.log('  Placements:');
  console.log('    GET    /api/placements');
  console.log('    POST   /api/placements');
  console.log('  Dashboard:');
  console.log('    GET    /api/dashboard/stats');
  console.log('  Health:');
  console.log('    GET    /api/health');
  console.log('');
});

export default app;
