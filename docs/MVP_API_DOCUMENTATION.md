# Snifr MVP Features API Documentation

## Overview

This document covers the complete API for the **Snifr** app MVP features:
1. ✅ **Pet Profiles** (Already implemented)
2. ✅ **Swipe Matching** (Newly implemented)
3. ✅ **Playdate Requests** (Newly implemented)

---

## Base URL

```
Development: http://localhost:5000/api
Production: https://api.snifr.com/api
```

---

## Authentication

All endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## Table of Contents

1. [Pet Profiles API](#1-pet-profiles-api)
2. [Swipe Matching API](#2-swipe-matching-api)
3. [Playdate Requests API](#3-playdate-requests-api)

---

## 1. Pet Profiles API

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/pets` | Create pet profile |
| GET | `/pets` | Get user's pets |
| GET | `/pets/:id` | Get single pet |
| PUT | `/pets/:id` | Update pet |
| DELETE | `/pets/:id` | Delete pet (soft) |
| POST | `/pets/upload` | Upload pet photo |

**Full Documentation:** See `PET_PROFILES_API.md`

---

## 2. Swipe Matching API

### 2.1 Get Discover Pets

Get pets available for swiping (not owned by user, not already swiped).

**Endpoint:** `GET /matches/discover`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `species` | String | No | Filter by species: "Dog" or "Cat" |
| `limit` | Number | No | Number of pets to return (1-100, default: 20) |

**Example:**
```bash
GET /matches/discover?species=Dog&limit=10
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Pets retrieved successfully",
  "data": {
    "pets": [
      {
        "id": "uuid",
        "name": "Buddy",
        "breed": "Golden Retriever",
        "age": 3,
        "gender": "Male",
        "species": "Dog",
        "temperament": "Friendly, playful",
        "energyLevel": "High",
        "photoUrl": "https://...",
        "isVerified": true,
        "ownerName": "John Doe",
        "ownerAvatar": "https://..."
      }
    ],
    "count": 1
  }
}
```

---

### 2.2 Swipe on a Pet

Like or dislike a pet. If both pets like each other, it's a match!

**Endpoint:** `POST /matches/swipe`

**Request Body:**
```json
{
  "targetPetId": "uuid",
  "liked": true
}
```

**Validation:**
- `targetPetId`: Valid UUID, required
- `liked`: Boolean, required

**Success Response (200 OK):**

**Case 1: It's a Match!**
```json
{
  "success": true,
  "message": "It's a match! You and this pet both liked each other.",
  "data": {
    "swipe": {
      "id": "uuid",
      "liked": true,
      "createdAt": "2026-03-30T10:00:00.000Z"
    },
    "isMatch": true,
    "match": {
      "id": "uuid",
      "matchedPetId": "uuid",
      "matchedPetName": "Buddy",
      "matchedPetBreed": "Golden Retriever",
      "matchedPetAge": 3,
      "matchedPetSpecies": "Dog",
      "matchedPetPhoto": "https://...",
      "ownerName": "John Doe",
      "matchedAt": "2026-03-30T10:00:00.000Z"
    }
  }
}
```

**Case 2: No Match (Yet)**
```json
{
  "success": true,
  "message": "Swipe recorded!",
  "data": {
    "swipe": {
      "id": "uuid",
      "liked": true,
      "createdAt": "2026-03-30T10:00:00.000Z"
    },
    "isMatch": false
  }
}
```

---

### 2.3 Get User Matches

Get all matches for the logged-in user.

**Endpoint:** `GET /matches`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | Number | No | Number of matches to return (1-100, default: 50) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Matches retrieved successfully",
  "data": {
    "matches": [
      {
        "id": "uuid",
        "matchedPetId": "uuid",
        "matchedPetName": "Buddy",
        "matchedPetBreed": "Golden Retriever",
        "matchedPetAge": 3,
        "matchedPetSpecies": "Dog",
        "matchedPetPhoto": "https://...",
        "matchedPetEnergyLevel": "High",
        "ownerName": "John Doe",
        "ownerAvatar": "https://...",
        "matchedAt": "2026-03-30T10:00:00.000Z"
      }
    ],
    "count": 1
  }
}
```

---

### 2.4 Get Match Statistics

Get swipe and match statistics for the user.

**Endpoint:** `GET /matches/stats`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Stats retrieved successfully",
  "data": {
    "totalMatches": 5,
    "pendingSwipes": 3,
    "totalLikes": 12
  }
}
```

---

### 2.5 Get Match Details

Get detailed information about a specific match.

**Endpoint:** `GET /matches/:id`

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Match ID |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Match retrieved successfully",
  "data": {
    "id": "uuid",
    "status": "matched",
    "matchedAt": "2026-03-30T10:00:00.000Z",
    "pet1": {
      "id": "uuid",
      "name": "Buddy",
      "breed": "Golden Retriever",
      "age": 3,
      "species": "Dog",
      "photo": "https://...",
      "energyLevel": "High",
      "temperament": "Friendly",
      "ownerName": "John Doe"
    },
    "pet2": {
      "id": "uuid",
      "name": "Luna",
      "breed": "Labrador",
      "age": 2,
      "species": "Dog",
      "photo": "https://...",
      "energyLevel": "Medium",
      "temperament": "Calm",
      "ownerName": "Jane Smith"
    }
  }
}
```

---

### 2.6 Unmatch

Remove a match connection.

**Endpoint:** `DELETE /matches/:id`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Match removed successfully",
  "data": null
}
```

---

## 3. Playdate Requests API

### 3.1 Create Playdate Request

Send a playdate request to a match.

**Endpoint:** `POST /playdates`

**Request Body:**
```json
{
  "matchId": "uuid",
  "invitedPetId": "uuid",
  "title": "Fun Playdate at F9 Park",
  "locationName": "F9 Park",
  "locationAddress": "F-9 Markaz, Islamabad",
  "latitude": 33.7294,
  "longitude": 73.0386,
  "scheduledDate": "2026-04-05",
  "scheduledTime": "16:00",
  "durationMinutes": 60,
  "message": "Looking forward to meeting you!"
}
```

**Validation:**
- `matchId`: UUID, required
- `invitedPetId`: UUID, required
- `title`: String, required (max 150 chars)
- `locationName`: String, required (max 200 chars)
- `scheduledDate`: String, required (YYYY-MM-DD format)
- `scheduledTime`: String, required (HH:MM format)
- `durationMinutes`: Number, optional (15-480, default: 60)
- `message`: String, optional (max 500 chars)

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Playdate request sent successfully",
  "data": {
    "id": "uuid",
    "matchId": "uuid",
    "petId": "uuid",
    "invitedPetId": "uuid",
    "title": "Fun Playdate at F9 Park",
    "locationName": "F9 Park",
    "locationAddress": "F-9 Markaz, Islamabad",
    "latitude": 33.7294,
    "longitude": 73.0386,
    "scheduledDate": "2026-04-05",
    "scheduledTime": "16:00",
    "durationMinutes": 60,
    "status": "pending",
    "message": "Looking forward to meeting you!",
    "invitedAt": "2026-03-30T10:00:00.000Z"
  }
}
```

---

### 3.2 Get User Playdates

Get all playdates for the logged-in user.

**Endpoint:** `GET /playdates`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | String | No | Filter by status: pending, accepted, declined, completed, cancelled |
| `limit` | Number | No | Number of playdates to return (1-100, default: 50) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Playdates retrieved successfully",
  "data": {
    "playdates": [
      {
        "id": "uuid",
        "matchId": "uuid",
        "title": "Fun Playdate at F9 Park",
        "locationName": "F9 Park",
        "scheduledDate": "2026-04-05",
        "scheduledTime": "16:00",
        "durationMinutes": 60,
        "status": "pending",
        "invitedPetName": "Buddy",
        "invitedPetBreed": "Golden Retriever",
        "invitedOwnerName": "John Doe",
        "senderPetName": "Luna",
        "senderPetBreed": "Labrador",
        "senderOwnerName": "Jane Smith"
      }
    ],
    "count": 1
  }
}
```

---

### 3.3 Get Playdate Details

Get detailed information about a specific playdate.

**Endpoint:** `GET /playdates/:id`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Playdate retrieved successfully",
  "data": {
    "id": "uuid",
    "title": "Fun Playdate at F9 Park",
    "locationName": "F9 Park",
    "locationAddress": "F-9 Markaz, Islamabad",
    "scheduledDate": "2026-04-05",
    "scheduledTime": "16:00",
    "durationMinutes": 60,
    "status": "pending",
    "message": "Looking forward to meeting you!",
    "invitedPetName": "Buddy",
    "invitedPetBreed": "Golden Retriever",
    "invitedPetAge": 3,
    "invitedPetSpecies": "Dog",
    "invitedPetPhoto": "https://...",
    "invitedPetEnergyLevel": "High",
    "invitedOwnerName": "John Doe",
    "senderPetName": "Luna",
    "senderPetBreed": "Labrador",
    "senderPetAge": 2,
    "senderPetSpecies": "Dog",
    "senderPetPhoto": "https://...",
    "senderOwnerName": "Jane Smith"
  }
}
```

---

### 3.4 Accept Playdate

Accept a pending playdate request.

**Endpoint:** `PATCH /playdates/:id/accept`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Playdate accepted successfully",
  "data": {
    "id": "uuid",
    "status": "accepted",
    "respondedAt": "2026-03-30T10:00:00.000Z"
    // ... full playdate object
  }
}
```

---

### 3.5 Decline Playdate

Decline a pending playdate request.

**Endpoint:** `PATCH /playdates/:id/decline`

**Request Body:**
```json
{
  "reason": "Already have other plans"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Playdate declined",
  "data": {
    "id": "uuid",
    "status": "declined",
    "declinedReason": "Already have other plans",
    "respondedAt": "2026-03-30T10:00:00.000Z"
  }
}
```

---

### 3.6 Cancel Playdate

Cancel an accepted or pending playdate.

**Endpoint:** `PATCH /playdates/:id/cancel`

**Request Body:**
```json
{
  "reason": "Pet is not feeling well"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Playdate cancelled",
  "data": {
    "id": "uuid",
    "status": "cancelled",
    "cancelledAt": "2026-03-30T10:00:00.000Z"
  }
}
```

---

### 3.7 Complete Playdate

Mark an accepted playdate as completed.

**Endpoint:** `PATCH /playdates/:id/complete`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Playdate marked as completed",
  "data": {
    "id": "uuid",
    "status": "completed",
    "completedAt": "2026-04-05T18:00:00.000Z"
  }
}
```

---

### 3.8 Get Playdates by Match

Get all playdates for a specific match.

**Endpoint:** `GET /playdates/match/:matchId`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Playdates retrieved successfully",
  "data": {
    "playdates": [...],
    "count": 2
  }
}
```

---

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `NO_TOKEN` | 401 | No authentication token provided |
| `INVALID_TOKEN` | 401 | Token is invalid or expired |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `PET_NOT_FOUND` | 404 | Pet doesn't exist or not authorized |
| `MATCH_NOT_FOUND` | 404 | Match doesn't exist or not authorized |
| `PLAYDATE_NOT_FOUND` | 404 | Playdate doesn't exist or not authorized |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

---

## React Native Usage Examples

### Swipe Matching Example

```javascript
import { getDiscoverPets, swipePet, getUserMatches } from '@/services/matches';

// Load pets for swiping
const pets = await getDiscoverPets('Dog', 20);

// Swipe right (like)
const result = await swipePet(petId, true);
if (result.isMatch) {
  alert("It's a match!");
}

// Get matches
const matches = await getUserMatches();
```

### Playdate Example

```javascript
import { createPlaydate, getUserPlaydates, acceptPlaydate } from '@/services/playdates';

// Create playdate
await createPlaydate({
  matchId: 'uuid',
  invitedPetId: 'uuid',
  title: 'Playdate at F9 Park',
  locationName: 'F9 Park',
  scheduledDate: '2026-04-05',
  scheduledTime: '16:00',
  durationMinutes: 60,
});

// Get pending playdates
const playdates = await getUserPlaydates('pending');

// Accept a playdate
await acceptPlaydate(playdateId);
```

---

## Database Setup

Run the complete schema:

```bash
psql -d snifr_db -f src/db/schema.sql
```

Or use the individual migration files:

```bash
psql -d snifr_db -f database/pets.sql
psql -d snifr_db -f database/matches.sql
psql -d snifr_db -f database/playdates.sql
```

---

## Testing with cURL

### Swipe Example
```bash
curl -X POST http://localhost:5000/api/matches/swipe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"targetPetId":"uuid","liked":true}'
```

### Create Playdate Example
```bash
curl -X POST http://localhost:5000/api/playdates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "matchId":"uuid",
    "invitedPetId":"uuid",
    "title":"F9 Park Playdate",
    "locationName":"F9 Park",
    "scheduledDate":"2026-04-05",
    "scheduledTime":"16:00",
    "durationMinutes":60
  }'
```

---

## Next Steps (Future Features)

- [ ] Real-time chat between matched owners
- [ ] Live pet map showing nearby pets in parks
- [ ] Pet social feed for sharing moments
- [ ] AI-based pet compatibility scoring
- [ ] Pet events and meetups hosting
- [ ] Dog walk tracking with GPS
- [ ] Breeder mode with pedigree verification

---

## Support

For questions or issues, refer to the main documentation or contact the development team.
