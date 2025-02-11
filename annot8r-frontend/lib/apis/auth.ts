// lib/apis/auth.ts
import { cookies } from 'next/headers'
import { AuthResponse, LoginCredentials, UserInfo } from '../types/auth'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api'

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })

    // Log the raw response for debugging
    console.log('Status:', res.status);
    const rawText = await res.text();
    console.log('Raw response:', rawText);

    // Try to parse the response
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      throw new Error('Invalid response format from server');
    }

    if (!res.ok) {
      throw new Error(data.error || 'Failed to login');
    }

    return data as AuthResponse;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export async function getCurrentUser(): Promise<UserInfo | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) return null

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store'
    })

    if (!res.ok) {
      const rawText = await res.text();
      console.error('Error response from /auth/me:', {
        status: res.status,
        response: rawText
      });
      return null;
    }

    const rawText = await res.text();
    try {
      const data = JSON.parse(rawText);
      return data;
    } catch (parseError) {
      console.error('JSON Parse Error in getCurrentUser:', parseError, 'Raw text:', rawText);
      return null;
    }
  } catch (error) {
    console.error('Error fetching user:', error)
    return null
  }
}

export async function verifyAuth(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) return false

  try {
    const res = await fetch(`${API_BASE}/auth/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceInfo: {
          platform: navigator.platform,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      })
    })

    if (!res.ok) return false

    const data = await res.json()
    return data.valid
  } catch {
    return false
  }
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) return

  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  // Cookie will be removed by the server response
}