# Chat Feature Setup

## 1. Database Migration

Run this script to create the messages table in your Neon PostgreSQL database:

```bash
cd snifr-backend
node scripts/create-messages-table.js
```

This will create:
- `messages` table with support for text and image messages
- Indexes for performance optimization
- Foreign key constraints to matches and users tables

## 2. Install Dependencies

Backend dependencies (already installed):
```bash
cd snifr-backend
npm install socket.io @types/socket.io
```

Frontend dependencies (already installed):
```bash
cd snifr-app
npm install socket.io-client
```

## 3. Start the Backend

```bash
cd snifr-backend
npm run dev
```

You should see: `🔌 Socket.io enabled`

## 4. Test the Chat Feature

1. Open the app on two different devices or emulators
2. Login with two different user accounts
3. Create pet profiles for both users
4. Swipe and match pets (both users need to like each other's pets)
5. Once matched, go to the Matches tab
6. Click the "Chat" button on any match
7. Send text messages and images in real-time

## Features Implemented

### Backend
- ✅ Messages table with text and image support
- ✅ Socket.io real-time communication
- ✅ JWT authentication for WebSocket
- ✅ REST API for message history
- ✅ Image upload to Cloudinary
- ✅ Match participant verification
- ✅ Typing indicators
- ✅ Message read receipts

### Frontend
- ✅ Real-time chat screen
- ✅ Socket.io client integration
- ✅ Image picker (camera & gallery)
- ✅ Typing indicator display
- ✅ Optimistic message rendering
- ✅ Auto-scroll to latest message
- ✅ Keyboard handling
- ✅ Chat entry point in Matches screen

## API Endpoints

### REST API
- `GET /api/messages/:matchId` - Fetch message history
- `POST /api/messages/:matchId/upload` - Upload chat image

### Socket.io Events

**Client → Server:**
- `join_match` - Join a match room
- `leave_match` - Leave a match room
- `send_message` - Send a message
- `typing` - Typing indicator
- `message_read` - Mark messages as read

**Server → Client:**
- `receive_message` - New message received
- `message_sent` - Message sent confirmation
- `user_typing` - Other user is typing
- `message_error` - Error occurred

## Database Schema

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_text TEXT,
  image_url VARCHAR(500),
  image_public_id VARCHAR(255),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT message_content_check CHECK (
    (message_text IS NOT NULL AND message_text != '') 
    OR (image_url IS NOT NULL AND image_url != '')
  )
);
```

## Notes

- Messages are per match (not per pet), so users can discuss all their pets in one chat
- Both users in a match can see all messages
- Images are uploaded to Cloudinary in the `snifr/chat` folder
- Typing indicators reset after 2 seconds of inactivity
- Messages support soft delete (is_deleted flag)
- Auto-reconnection on network issues (up to 5 attempts)
