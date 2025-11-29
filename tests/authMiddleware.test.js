import { describe, it, expect, vi } from 'vitest';
import { requireAuth, optionalAuth, getUserId } from '../middleware/auth.js';

describe('Auth Middleware', () => {
  describe('requireAuth', () => {
    it('should call next() when user is authenticated', () => {
      const req = {
        isAuthenticated: vi.fn().mockReturnValue(true),
        user: { claims: { sub: 'user-123' } },
        path: '/api/test',
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', () => {
      const req = {
        isAuthenticated: vi.fn().mockReturnValue(false),
        user: null,
        path: '/api/test',
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      requireAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        message: 'Please log in to access this resource',
      });
    });

    it('should return 401 when isAuthenticated is not defined', () => {
      const req = {
        user: null,
        path: '/api/test',
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      requireAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 when user object is missing', () => {
      const req = {
        isAuthenticated: vi.fn().mockReturnValue(true),
        user: null,
        path: '/api/test',
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      requireAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('optionalAuth', () => {
    it('should always call next()', () => {
      const req = {};
      const res = {};
      const next = vi.fn();

      optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('getUserId', () => {
    it('should return user ID when authenticated', () => {
      const req = {
        isAuthenticated: vi.fn().mockReturnValue(true),
        user: { claims: { sub: 'user-123' } },
      };

      const userId = getUserId(req);

      expect(userId).toBe('user-123');
    });

    it('should return null when not authenticated', () => {
      const req = {
        isAuthenticated: vi.fn().mockReturnValue(false),
        user: null,
      };

      const userId = getUserId(req);

      expect(userId).toBe(null);
    });

    it('should return null when isAuthenticated is not defined', () => {
      const req = {
        user: { claims: { sub: 'user-123' } },
      };

      const userId = getUserId(req);

      expect(userId).toBe(null);
    });

    it('should return null when user claims are missing', () => {
      const req = {
        isAuthenticated: vi.fn().mockReturnValue(true),
        user: {},
      };

      const userId = getUserId(req);

      expect(userId).toBe(null);
    });
  });
});
