# Pet Profiles API Documentation

## Overview

This document provides complete API documentation for the **Pet Profiles** feature in the Snifr backend. This is an MVP feature that allows users to create and manage pet profiles after authentication.

**Key Security Feature**: Each user can only see, update, and delete their own pets. The backend enforces ownership validation on all operations.

---

## Base URL

```
Development: http://localhost:5000/api
Production: [Your production URL]/api
```

---

## Authentication

All Pet Profile endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## Pet Profile Fields

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `name` | String | Yes | Pet's name | Max 100 characters |
| `breed` | String | Yes | Pet breed (e.g., "German Shepherd", "Persian", or "Other") | Max 100 characters |
| `otherBreed` | String | No | Custom breed name (required if breed is "Other") | Max 100 characters |
| `age` | Number | Yes | Pet age in years | 0-50 |
| `gender` | String | Yes | Pet gender | "Male" or "Female" |
| `species` | String | No | Pet type | "Dog" (default) or "Cat" |
| `temperament` | String | No | Pet personality traits | Max 255 characters |
| `energyLevel` | String | No | Activity level | "Low", "Medium", or "High" |
| `weight` | Number | No | Pet weight in kg | 0-200 kg |
| `color` | String | No | Pet color/coat pattern | Max 50 characters |
| `bio` | String | No | Description about the pet | Text |
| `photoUrl` | String | No | **Single** pet photo URL (Cloudinary) | Max 500 characters |
| `photoPublicId` | String | No | Cloudinary public ID for deletion | Max 255 characters |
| `vaccinationStatus` | Boolean | No | Vaccination status | true/false |

**Note on Breed Field**: 
- Use predefined breed names (e.g., "Golden Retriever", "Persian", "German Shepherd")
- If the breed is not in the predefined list, use `"breed": "Other"` and provide the custom breed name in the `otherBreed` field
- Example: `{ "breed": "Other", "otherBreed": "American Bully" }`

**Note on Photo**: 
- **Each pet can have ONLY 1 photo**
- Upload photo first using `/api/pets/upload`, then use the returned `url` and `publicId`

---

## API Endpoints

### 1. Create Pet Profile

**POST** `/api/pets`

Create a new pet profile for the authenticated user.

#### Request Body
```json
{
  "name": "Buddy",
  "breed": "Golden Retriever",
  "age": 3,
  "gender": "Male",
  "species": "Dog",
  "temperament": "Friendly, playful, energetic",
  "energyLevel": "High",
  "weight": 30.5,
  "color": "Golden",
  "bio": "Loves playing fetch and meeting new friends at the park!",
  "photoUrl": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/snifr/pets/abc123.jpg",
  "photoPublicId": "snifr/pets/abc123",
  "vaccinationStatus": true
}
```

#### Using "Other" for Custom Breed
```json
{
  "name": "Rocky",
  "breed": "Other",
  "otherBreed": "American Bully",
  "age": 2,
  "gender": "Male",
  "species": "Dog",
  "energyLevel": "Medium"
}
```

#### Required Fields Only (Minimum)
```json
{
  "name": "Buddy",
  "breed": "Golden Retriever",
  "age": 3,
  "gender": "Male"
}
```

#### Success Response (201 Created)
```json
{
  "success": true,
  "message": "Pet profile created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Buddy",
    "breed": "Golden Retriever",
    "age": 3,
    "gender": "Male",
    "species": "Dog",
    "temperament": "Friendly, playful, energetic",
    "energyLevel": "High",
    "weight": 30.5,
    "color": "Golden",
    "bio": "Loves playing fetch and meeting new friends at the park!",
    "photos": ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"],
    "isVerified": false,
    "vaccinationStatus": true,
    "compatibilityScore": 50,
    "isActive": true,
    "createdAt": "2026-03-27T10:00:00.000Z",
    "updatedAt": "2026-03-27T10:00:00.000Z"
  }
}
```

#### Error Responses
```json
// 400 Bad Request - Validation Error
{
  "success": false,
  "message": "Name, breed, age, and gender are required",
  "error": "VALIDATION_ERROR"
}

// 401 Unauthorized
{
  "success": false,
  "message": "Not authorized to access this route",
  "error": "NO_TOKEN"
}
```

---

### 2. Get All User Pets

**GET** `/api/pets`

Retrieve all pet profiles for the authenticated user.

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `includeInactive` | Boolean | false | Include deleted/inactive pets |

#### Example
```
GET /api/pets
GET /api/pets?includeInactive=true
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Pets retrieved successfully",
  "data": {
    "pets": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Buddy",
        "breed": "Golden Retriever",
        "age": 3,
        "gender": "Male",
        "species": "Dog",
        "temperament": "Friendly, playful",
        "energyLevel": "High",
        "weight": 30.5,
        "color": "Golden",
        "bio": "Loves playing fetch",
        "photos": ["https://example.com/photo1.jpg"],
        "isVerified": false,
        "vaccinationStatus": true,
        "compatibilityScore": 50,
        "isActive": true,
        "createdAt": "2026-03-27T10:00:00.000Z",
        "updatedAt": "2026-03-27T10:00:00.000Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "name": "Luna",
        "breed": "Persian",
        "age": 2,
        "gender": "Female",
        "species": "Cat",
        "temperament": "Calm, affectionate",
        "energyLevel": "Low",
        "weight": 4.5,
        "color": "White",
        "bio": "Loves sunny spots",
        "photos": [],
        "isVerified": false,
        "vaccinationStatus": false,
        "compatibilityScore": 50,
        "isActive": true,
        "createdAt": "2026-03-26T08:00:00.000Z",
        "updatedAt": "2026-03-26T08:00:00.000Z"
      }
    ],
    "count": 2
  }
}
```

---

### 3. Get Single Pet Profile

**GET** `/api/pets/:id`

Retrieve a specific pet profile by ID. **Only returns the pet if it belongs to the authenticated user.**

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Pet profile ID |

#### Example
```
GET /api/pets/550e8400-e29b-41d4-a716-446655440001
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Pet retrieved successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Buddy",
    "breed": "Golden Retriever",
    "age": 3,
    "gender": "Male",
    "species": "Dog",
    "temperament": "Friendly, playful",
    "energyLevel": "High",
    "weight": 30.5,
    "color": "Golden",
    "bio": "Loves playing fetch",
    "photos": ["https://example.com/photo1.jpg"],
    "isVerified": false,
    "vaccinationStatus": true,
    "compatibilityScore": 50,
    "isActive": true,
    "createdAt": "2026-03-27T10:00:00.000Z",
    "updatedAt": "2026-03-27T10:00:00.000Z"
  }
}
```

#### Error Responses
```json
// 404 Not Found
{
  "success": false,
  "message": "Pet not found",
  "error": "PET_NOT_FOUND"
}

// 401 Unauthorized - Pet belongs to another user
{
  "success": false,
  "message": "Pet not found",
  "error": "PET_NOT_FOUND"
}
```

---

### 4. Update Pet Profile

**PUT** `/api/pets/:id`

Update an existing pet profile. **Only updates if the pet belongs to the authenticated user.**

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Pet profile ID |

#### Request Body (All fields optional)
```json
{
  "name": "Buddy Updated",
  "breed": "Golden Retriever",
  "age": 4,
  "temperament": "Friendly, playful, well-trained",
  "energyLevel": "High",
  "weight": 32.0,
  "bio": "Updated bio - Loves playing fetch and swimming!",
  "photos": ["https://example.com/new-photo1.jpg", "https://example.com/new-photo2.jpg"],
  "vaccinationStatus": true
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Pet profile updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Buddy Updated",
    "breed": "Golden Retriever",
    "age": 4,
    "gender": "Male",
    "species": "Dog",
    "temperament": "Friendly, playful, well-trained",
    "energyLevel": "High",
    "weight": 32.0,
    "color": "Golden",
    "bio": "Updated bio - Loves playing fetch and swimming!",
    "photos": ["https://example.com/new-photo1.jpg", "https://example.com/new-photo2.jpg"],
    "isVerified": false,
    "vaccinationStatus": true,
    "compatibilityScore": 50,
    "isActive": true,
    "createdAt": "2026-03-27T10:00:00.000Z",
    "updatedAt": "2026-03-27T11:00:00.000Z"
  }
}
```

#### Error Responses
```json
// 404 Not Found - Pet doesn't belong to user
{
  "success": false,
  "message": "Pet not found or you are not authorized to update this pet",
  "error": "PET_NOT_FOUND"
}

// 400 Bad Request - Validation Error
{
  "success": false,
  "message": "Age must be between 0 and 50",
  "error": "VALIDATION_ERROR"
}
```

---

### 5. Delete Pet Profile (Soft Delete)

**DELETE** `/api/pets/:id`

Soft delete a pet profile (sets `isActive` to false). **Only deletes if the pet belongs to the authenticated user.**

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Pet profile ID |

#### Example
```
DELETE /api/pets/550e8400-e29b-41d4-a716-446655440001
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Pet profile deleted successfully",
  "data": null
}
```

#### Error Responses
```json
// 404 Not Found - Pet doesn't belong to user
{
  "success": false,
  "message": "Pet not found or you are not authorized to delete this pet",
  "error": "PET_NOT_FOUND"
}
```

---

### 6. Verify Pet Profile

**PATCH** `/api/pets/:id/verify`

Mark a pet profile as verified (for vaccination proof). **Only updates if the pet belongs to the authenticated user.**

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Pet profile ID |

#### Request Body
```json
{
  "isVerified": true
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Pet profile verified successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Buddy",
    "breed": "Golden Retriever",
    "age": 3,
    "gender": "Male",
    "species": "Dog",
    "temperament": "Friendly, playful",
    "energyLevel": "High",
    "weight": 30.5,
    "color": "Golden",
    "bio": "Loves playing fetch",
    "photos": ["https://example.com/photo1.jpg"],
    "isVerified": true,
    "vaccinationStatus": true,
    "compatibilityScore": 50,
    "isActive": true,
    "createdAt": "2026-03-27T10:00:00.000Z",
    "updatedAt": "2026-03-27T11:00:00.000Z"
  }
}
```

---

## React Native Example Usage

### Using Axios

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance with auth token
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Create Pet Profile
export const createPet = async (petData) => {
  try {
    const response = await api.post('/pets', petData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get All User Pets
export const getUserPets = async (includeInactive = false) => {
  try {
    const response = await api.get('/pets', {
      params: { includeInactive }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get Single Pet
export const getPetById = async (petId) => {
  try {
    const response = await api.get(`/pets/${petId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Update Pet Profile
export const updatePet = async (petId, petData) => {
  try {
    const response = await api.put(`/pets/${petId}`, petData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Delete Pet Profile
export const deletePet = async (petId) => {
  try {
    const response = await api.delete(`/pets/${petId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Verify Pet Profile
export const verifyPet = async (petId) => {
  try {
    const response = await api.patch(`/pets/${petId}/verify`, { isVerified: true });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};
```

### Usage Example in React Native Component

```javascript
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, Alert } from 'react-native';
import { getUserPets, deletePet } from './api/pets';

const PetList = () => {
  const [pets, setPets] = useState([]);

  useEffect(() => {
    loadPets();
  }, []);

  const loadPets = async () => {
    try {
      const response = await getUserPets();
      setPets(response.data.pets);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDelete = async (petId) => {
    Alert.alert(
      'Delete Pet',
      'Are you sure you want to delete this pet profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePet(petId);
              Alert.alert('Success', 'Pet profile deleted');
              loadPets(); // Reload list
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const renderPet = ({ item }) => (
    <View style={{ padding: 16, borderBottomWidth: 1 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{item.name}</Text>
      <Text>{item.breed} - {item.age} years old</Text>
      <Text>{item.gender} | {item.species}</Text>
      {item.energyLevel && <Text>Energy: {item.energyLevel}</Text>}
      <Button title="Delete" onPress={() => handleDelete(item.id)} />
    </View>
  );

  return (
    <FlatList
      data={pets}
      keyExtractor={(item) => item.id}
      renderItem={renderPet}
    />
  );
};

export default PetList;
```

---

## Database Setup

Run the following SQL to create the pets table:

```bash
# Using the provided SQL file
psql -d snifr_db -f database/pets.sql
```

Or manually execute the SQL from `database/pets.sql`.

---

## Photo Upload Endpoints (Cloudinary)

The backend supports **direct file upload** to Cloudinary. **Each pet can have ONLY 1 photo.**

### Upload Single Photo

**POST** `/api/pets/upload`

Upload a single pet photo to Cloudinary.

#### Request Type
`multipart/form-data`

#### Form Data
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `photo` | File | Yes | Image file (jpg, jpeg, png, gif, webp) |

#### File Limits
- Max file size: 5MB
- Allowed formats: JPEG, JPG, PNG, GIF, WEBP

#### Example (React Native)
```javascript
const uploadPhoto = async (imageUri) => {
  const formData = new FormData();
  
  formData.append('photo', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'photo.jpg',
  });

  const response = await fetch('http://localhost:5000/api/pets/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
    body: formData,
  });

  const data = await response.json();
  return data.data.url; // Get the Cloudinary URL
};
```

#### Success Response (201 Created)
```json
{
  "success": true,
  "message": "Photo uploaded successfully",
  "data": {
    "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/snifr/pets/abc123.jpg",
    "publicId": "snifr/pets/abc123",
    "width": 1920,
    "height": 1080,
    "format": "jpg"
  }
}
```

---

### Upload Multiple Photos (Removed)

**Note**: The multiple upload endpoint has been removed. Each pet can now have only **1 photo**.

If you need to change a pet's photo, simply upload a new photo and update the pet profile with the new `photoUrl` and `photoPublicId`.

---

### Delete Photo

**DELETE** `/api/pets/upload/:publicId`

Delete a photo from Cloudinary by public ID.

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `publicId` | String | Cloudinary public ID (e.g., "snifr/pets/abc123") |

#### Example
```javascript
const deletePhoto = async (publicId) => {
  const response = await fetch(`http://localhost:5000/api/pets/upload/${publicId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return await response.json();
};
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Photo deleted successfully",
  "data": null
}
```

---

## Complete Pet Creation Flow with Photo

### Step 1: Upload Photo
```javascript
const uploadPhoto = async (imageUri) => {
  const formData = new FormData();
  
  formData.append('photo', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'photo.jpg',
  });

  const response = await fetch('http://localhost:5000/api/pets/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
    body: formData,
  });

  const data = await response.json();
  return {
    url: data.data.url,
    publicId: data.data.publicId
  };
};

// Upload the photo
const photo = await uploadPhoto(imageUri);
```

### Step 2: Create Pet Profile with Photo
```javascript
const createPetWithPhoto = async () => {
  const response = await fetch('http://localhost:5000/api/pets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Buddy',
      breed: 'Golden Retriever',
      age: 3,
      gender: 'Male',
      species: 'Dog',
      energyLevel: 'High',
      photoUrl: photo.url,      // Use uploaded URL
      photoPublicId: photo.publicId  // Store public ID for deletion
    }),
  });

  return await response.json();
};
```

### Step 3: Update Pet Photo (If Needed)
```javascript
const updatePetPhoto = async (petId, newPhoto) => {
  const response = await fetch(`http://localhost:5000/api/pets/${petId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      photoUrl: newPhoto.url,
      photoPublicId: newPhoto.publicId
    }),
  });

  return await response.json();
};
```

---

## Error Responses

### Upload Errors
```json
// No file uploaded
{
  "success": false,
  "message": "No file uploaded",
  "error": "NO_FILE"
}

// Invalid file type
{
  "success": false,
  "message": "Only image files are allowed (jpeg, jpg, png, gif, webp)",
  "error": "VALIDATION_ERROR"
}

// File too large (>5MB)
{
  "success": false,
  "message": "File too large",
  "error": "FILE_TOO_LARGE"
}
```

---

## Testing with cURL

### Create Pet
```bash
curl -X POST http://localhost:5000/api/pets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Buddy",
    "breed": "Golden Retriever",
    "age": 3,
    "gender": "Male",
    "species": "Dog",
    "energyLevel": "High"
  }'
```

### Get All Pets
```bash
curl -X GET http://localhost:5000/api/pets \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Single Pet
```bash
curl -X GET http://localhost:5000/api/pets/PET_UUID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Pet
```bash
curl -X PUT http://localhost:5000/api/pets/PET_UUID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Buddy Updated",
    "age": 4
  }'
```

### Delete Pet
```bash
curl -X DELETE http://localhost:5000/api/pets/PET_UUID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Security Notes

1. **User Isolation**: Each user can only access their own pets. The backend validates ownership on every operation.
2. **Authentication Required**: All endpoints require a valid JWT token.
3. **Soft Delete**: Deleted pets are marked as inactive, not permanently removed from the database.
4. **Input Validation**: All inputs are validated for type, range, and allowed values.
5. **SQL Injection Protection**: Uses parameterized queries via PostgreSQL driver.

---

## Error Handling

All API responses follow a consistent format:

### Success
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... }
}
```

### Error
```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE"
}
```

Common error codes:
- `NO_TOKEN`: No authentication token provided
- `INVALID_TOKEN`: Token is invalid or expired
- `PET_NOT_FOUND`: Pet doesn't exist or doesn't belong to user
- `VALIDATION_ERROR`: Request validation failed

---

## Next Steps (Future Features)

These endpoints will be added in future iterations:
- Pet discovery (browse other users' pets)
- Swipe matching system
- Playdate requests
- Pet compatibility scoring
- Photo upload to cloud storage

---

## Support

For questions or issues, contact the backend team or refer to the main API documentation at `API_DOCUMENTATION.md`.
