// Simple API client
// FIXME: This client has no error response parsing - when API returns { error: "..." },
// we should extract and throw that message instead of generic "API request failed"

// TODO: Add authentication token to requests ✅ DONE
// Hint: Include credentials: 'include' for cookie-based auth, or
// add Authorization header for token-based auth

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4291';

export async function api<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    credentials: 'include', // Include cookies for authentication
    ...options,
  });
  if (!res.ok) throw new Error('API request failed');
  return res.json();
}

// Campaigns
export const getCampaigns = (cookieHeader?: string | null) =>
  api<any[]>('/api/campaigns', cookieHeader ? {
    headers: { Cookie: cookieHeader }
  } : undefined); // No need to pass sponsorId - backend filters by authenticated user
export const getCampaign = (id: string) => api<any>(`/api/campaigns/${id}`);
export const createCampaign = (data: any) =>
  api('/api/campaigns', { method: 'POST', body: JSON.stringify(data) });
// TODO: Add updateCampaign and deleteCampaign functions

// Ad Slots
export const getAdSlots = (publisherId?: string) =>
  api<any[]>(publisherId ? `/api/ad-slots?publisherId=${publisherId}` : '/api/ad-slots');
export const getAdSlot = (id: string) => api<any>(`/api/ad-slots/${id}`);
export const createAdSlot = (data: any) =>
  api('/api/ad-slots', { method: 'POST', body: JSON.stringify(data) });
// TODO: Add updateAdSlot, deleteAdSlot functions

// Placements
export const getPlacements = () => api<any[]>('/api/placements');
export const createPlacement = (data: any) =>
  api('/api/placements', { method: 'POST', body: JSON.stringify(data) });

// Dashboard
export const getStats = () => api<any>('/api/dashboard/stats');
