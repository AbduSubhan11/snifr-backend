import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes';
import petRoutes from './routes/pet.routes';
import uploadRoutes from './routes/upload.routes';
import matchRoutes from './routes/match.routes';
import playdateRoutes from './routes/playdate.routes';
import locationRoutes from './routes/location.routes';

const app = express();

// CORS Configuration for React Native
app.use(cors({
  origin: '*', // Configure this to your specific origins in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate Limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/', (req, res) => {
  res.json({ success: true, message: '🚀 Snifr API is running!' });
});

// Health endpoint for monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes - Apply rate limiter only to specific auth endpoints that need it
app.use('/api/auth', authRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/pets/upload', uploadRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/playdates', playdateRoutes);
app.use('/api/location', locationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.originalUrl} not found`,
    error: 'NOT_FOUND'
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: 'INTERNAL_ERROR'
  });
});

export default app;
