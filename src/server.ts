import dotenv from 'dotenv';
dotenv.config();

import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import pool from './config/db';
import { initializeSocket } from './config/socket';
import os from 'os';

const PORT = process.env.PORT || 5000;

// Get local network IP address
function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const ifaceList = interfaces[name];
    if (ifaceList) {
      for (const iface of ifaceList) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  }
  return 'localhost';
}

const startServer = async () => {
  try {
    // Test the database connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful');

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize Socket.io
    const io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    // Initialize Socket.io handlers
    initializeSocket(io);

    // Start listening
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔌 Socket.io enabled`);
      console.log(`\n📍 API URLs for Expo/React Native:`);
      console.log(`   Local:    http://localhost:${PORT}`);
      console.log(`   Network:  http://${getLocalIP()}:${PORT}`);
      console.log(`\n💡 Use the Network URL in your Expo app config\n`);
    });
  } catch (error: any) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
