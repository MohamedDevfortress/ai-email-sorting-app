import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface ApiOptions extends RequestInit {
  token?: string;
  router?: AppRouterInstance;
}

class ApiClient {
  /**
   * Make an API request with automatic auth and error handling
   */
  async request<T = any>(
    endpoint: string,
    options: ApiOptions = {}
  ): Promise<T | null> {
    const { token, router, ...fetchOptions } = options;

    try {
      const headers: Record<string, string> = {
        ...(fetchOptions.headers as Record<string, string> || {}),
      };

      // Add auth header if token provided
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Add content-type for JSON bodies
      if (fetchOptions.body && typeof fetchOptions.body === 'string') {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        ...fetchOptions,
        headers,
      });

      // Handle 401 Unauthorized - token expired
      if (response.status === 401) {
        console.log('Token expired, logging out...');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        if (router) {
          router.push('/');
        }
        return null;
      }

      // Handle other error responses
      if (!response.ok) {
        console.error(`API Error: ${response.status} ${response.statusText}`);
        return null;
      }

      // Parse JSON response
      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error('API request failed:', error);
      return null;
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T | null> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    body: any,
    options: ApiOptions = {}
  ): Promise<T | null> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    endpoint: string,
    body: any,
    options: ApiOptions = {}
  ): Promise<T | null> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T | null> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * DELETE request with body
   */
  async deleteWithBody<T = any>(
    endpoint: string,
    body: any,
    options: ApiOptions = {}
  ): Promise<T | null> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
      body: JSON.stringify(body),
    });
  }
}

// Export singleton instance
export const api = new ApiClient();

// Export API_URL for direct use if needed
export { API_URL };
