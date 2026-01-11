import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, API_URL } from '../api';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('API Client', () => {
  const mockRouter = {
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('GET requests', () => {
    it('should make GET request with authorization header', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      });

      const result = await api.get('/test-endpoint', { token: 'test-token' });

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_URL}/test-endpoint`,
        expect.objectContaining({
          method: 'GET',
          headers: {
            Authorization: 'Bearer test-token',
          },
        })
      );
      expect(result).toEqual({ data: 'test' });
    });

    it('should return null on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await api.get('/test', { token: 'test-token' });

      expect(result).toBeNull();
    });

    it('should handle 401 unauthorized and redirect to login', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({}),
      });

      const result = await api.get('/protected', { 
        token: 'expired-token',
        router: mockRouter as any,
      });

      expect(result).toBeNull();
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
  });

  describe('POST requests', () => {
    it('should make POST request with JSON body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: '123', name: 'Created' }),
      });

      const requestBody = { name: 'Test Category', description: 'Test description' };
      const result = await api.post('/categories', requestBody, { token: 'test-token' });

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_URL}/categories`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        })
      );
      expect(result).toEqual({ id: '123', name: 'Created' });
    });
  });

  describe('DELETE requests', () => {
    it('should make DELETE request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      const result = await api.delete('/items/123', { token: 'test-token' });

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_URL}/items/123`,
        expect.objectContaining({
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer test-token',
          },
        })
      );
      expect(result).toEqual({ success: true });
    });

    it('should make DELETE request with body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ deleted: 3 }),
      });

      const requestBody = { emailIds: ['1', '2', '3'] };
      const result = await api.deleteWithBody('/emails/bulk', requestBody, { token: 'test-token' });

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_URL}/emails/bulk`,
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
        })
      );
      expect(result).toEqual({ deleted: 3 });
    });
  });

  describe('Error handling', () => {
    it('should return null on 404', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({}),
      });

      const result = await api.get('/not-found', { token: 'test-token' });

      expect(result).toBeNull();
    });

    it('should return null on 500', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      const result = await api.get('/server-error', { token: 'test-token' });

      expect(result).toBeNull();
    });
  });
});
