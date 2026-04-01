import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import pool from './config/db';
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

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
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
