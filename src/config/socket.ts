import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { saveMessage, getMatchParticipants } from '../repositories/messageRepository';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export const initializeSocket = (io: Server) => {
  // Middleware for authentication
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { id: string };

      // Verify user exists
      const result = await pool.query('SELECT id, is_active FROM users WHERE id = $1', [decoded.id]);

      if (result.rows.length === 0 || !result.rows[0].is_active) {
        return next(new Error('Authentication error: User not found or inactive'));
      }

      socket.userId = decoded.id;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`✅ User connected: ${socket.userId}`);

    // Join match room
    socket.on('join_match', (matchId: string) => {
      socket.join(`match_${matchId}`);
      console.log(`User ${socket.userId} joined match room: ${matchId}`);
    });

    // Leave match room
    socket.on('leave_match', (matchId: string) => {
      socket.leave(`match_${matchId}`);
      console.log(`User ${socket.userId} left match room: ${matchId}`);
    });

    // Send message
    socket.on('send_message', async (data) => {
      try {
        const { matchId, messageText, imageUrl, imagePublicId } = data;

        if (!matchId) {
          socket.emit('message_error', { message: 'Match ID is required' });
          return;
        }

        if (!socket.userId) {
          socket.emit('message_error', { message: 'User not authenticated' });
          return;
        }

        // Verify user is part of this match
        const participants = await getMatchParticipants(matchId);
        
        if (!participants) {
          socket.emit('message_error', { message: 'Match not found' });
          return;
        }

        const isParticipant = 
          participants.user_1_id === socket.userId || 
          participants.user_2_id === socket.userId;

        if (!isParticipant) {
          socket.emit('message_error', { message: 'You are not part of this match' });
          return;
        }

        // Save message to database
        const savedMessage = await saveMessage(
          matchId,
          socket.userId,
          messageText,
          imageUrl,
          imagePublicId
        );

        // Get sender info
        const senderResult = await pool.query(
          'SELECT id, full_name, avatar_url FROM users WHERE id = $1',
          [socket.userId]
        );
        const sender = senderResult.rows[0];

        // Get sender's pet name
        const petResult = await pool.query(
          'SELECT id, name, photo_url FROM pets WHERE user_id = $1 AND is_active = TRUE LIMIT 1',
          [socket.userId]
        );
        const pet = petResult.rows[0];

        // Broadcast to everyone in the match room except sender
        socket.to(`match_${matchId}`).emit('receive_message', {
          id: savedMessage.id,
          matchId: savedMessage.match_id,
          senderId: savedMessage.sender_id,
          senderName: sender.full_name,
          senderAvatar: sender.avatar_url,
          petId: pet?.id,
          petName: pet?.name,
          petPhoto: pet?.photo_url,
          messageText: savedMessage.message_text,
          imageUrl: savedMessage.image_url,
          imagePublicId: savedMessage.image_public_id,
          createdAt: savedMessage.created_at,
        });

        // Confirm to sender
        socket.emit('message_sent', {
          id: savedMessage.id,
          matchId: savedMessage.match_id,
          messageText: savedMessage.message_text,
          imageUrl: savedMessage.image_url,
          createdAt: savedMessage.created_at,
        });
      } catch (error: any) {
        console.error('Error sending message:', error);
        socket.emit('message_error', { message: error.message || 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing', (data) => {
      socket.to(`match_${data.matchId}`).emit('user_typing', {
        userId: socket.userId,
        matchId: data.matchId,
        isTyping: data.isTyping,
      });
    });

    // Message read receipt
    socket.on('message_read', (data) => {
      socket.to(`match_${data.matchId}`).emit('messages_read', {
        userId: socket.userId,
        matchId: data.matchId,
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.userId}`);
    });
  });

  return io;
};
