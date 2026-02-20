import { projectId, publicAnonKey } from './supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-372779f7`;

export interface Apartment {
  id: string;
  image: string;
  images?: string[];
  price: string;
  title: string;
  location: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  size: string;
  description?: string;
  features?: string[];
  landlordId: string;
  landlordName: string;
  landlord?: string;
  landlordPhone?: string;
  landlordWhatsApp?: string;
  createdAt: string;
}

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  location?: string;
  userType: 'tenant' | 'landlord';
}

// Helper to get auth header
function getAuthHeaders(accessToken?: string) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken || publicAnonKey}`,
  };
}

// Auth functions
export async function signUp(email: string, password: string, name: string, userType: 'tenant' | 'landlord') {
  const response = await fetch(`${BASE_URL}/signup`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ email, password, name, userType }),
  });

  const data = await response.json();
  if (!response.ok) {
    const err: any = new Error(data.error || 'Signup failed');
    // attach helpful flags for the UI
    err.status = response.status;
    if (data.existing) err.existing = true;
    if (data.userId) err.userId = data.userId;
    if (data.userType) err.userType = data.userType;
    throw err;
  }

  return data;
}

// Profile functions
export async function getProfile(userId: string, accessToken: string) {
  const response = await fetch(`${BASE_URL}/profile/${userId}`, {
    headers: getAuthHeaders(accessToken),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch profile');
  }

  return data.profile;
}

export async function updateProfile(userId: string, updates: Partial<UserProfile>, accessToken: string) {
  const response = await fetch(`${BASE_URL}/profile/${userId}`, {
    method: 'PUT',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(updates),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update profile');
  }

  return data.profile;
}

// Apartment functions
export async function createApartment(apartment: Omit<Apartment, 'id' | 'landlordId' | 'landlordName' | 'createdAt'>, accessToken: string) {
  const response = await fetch(`${BASE_URL}/apartments`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(apartment),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Create apartment error:', data);
    throw new Error(data.error || 'Failed to create apartment');
  }

  return data.apartment;
}

export async function getApartments() {
  const response = await fetch(`${BASE_URL}/apartments`, {
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Get apartments error:', data);
    throw new Error(data.error || 'Failed to fetch apartments');
  }

  return data.apartments;
}

export async function getApartment(id: string, accessToken?: string) {
  const response = await fetch(`${BASE_URL}/apartments/${id}`, {
    headers: getAuthHeaders(accessToken),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch apartment');
  }

  return data.apartment;
}

export async function getLandlordApartments(landlordId: string, accessToken: string) {
  const response = await fetch(`${BASE_URL}/landlord/${landlordId}/apartments`, {
    headers: getAuthHeaders(accessToken),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Get landlord apartments error:', data);
    throw new Error(data.error || 'Failed to fetch landlord apartments');
  }

  return data.apartments;
}

export async function deleteApartment(id: string, accessToken: string) {
  const response = await fetch(`${BASE_URL}/apartments/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(accessToken),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to delete apartment');
  }

  return data;
}

// Saved apartments functions
export async function saveApartment(userId: string, apartmentId: string, accessToken: string) {
  const response = await fetch(`${BASE_URL}/saved-apartments`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ apartmentId }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to save apartment');
  }

  return data.savedApartments;
}

export async function unsaveApartment(userId: string, apartmentId: string, accessToken: string) {
  const response = await fetch(`${BASE_URL}/saved-apartments/${apartmentId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(accessToken),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to remove saved apartment');
  }

  return data.savedApartments;
}

export async function removeSavedApartment(apartmentId: string, accessToken: string) {
  const response = await fetch(`${BASE_URL}/saved-apartments/${apartmentId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(accessToken),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to remove saved apartment');
  }

  return data.savedApartments;
}

export async function getSavedApartments(accessToken: string) {
  const response = await fetch(`${BASE_URL}/saved-apartments`, {
    headers: getAuthHeaders(accessToken),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Get saved apartments error:', data);
    throw new Error(data.error || 'Failed to fetch saved apartments');
  }

  return data.apartments;
}

export async function checkIfSaved(userId: string, apartmentId: string, accessToken: string) {
  const response = await fetch(`${BASE_URL}/saved-apartments/check/${apartmentId}`, {
    headers: getAuthHeaders(accessToken),
  });

  const data = await response.json();
  if (!response.ok) {
    return false;
  }

  return data.saved;
}
