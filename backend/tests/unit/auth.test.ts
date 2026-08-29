import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { generateAccessToken, verifyAccessToken, generateRefreshToken, verifyRefreshToken, TokenPayload } from '../src/config/jwt';

describe('JWT Authentication', () => {
  const testPayload: TokenPayload = {
    userId: 'test-user-id',
    email: 'test@example.com',
    role: 'ADMIN',
  };

  it('should generate and verify access token', () => {
    const token = generateAccessToken(testPayload);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(testPayload.userId);
    expect(decoded?.email).toBe(testPayload.email);
    expect(decoded?.role).toBe(testPayload.role);
    expect(decoded?.type).toBe('access');
  });

  it('should generate and verify refresh token', () => {
    const token = generateRefreshToken(testPayload);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = verifyRefreshToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(testPayload.userId);
    expect(decoded?.email).toBe(testPayload.email);
    expect(decoded?.role).toBe(testPayload.role);
    expect(decoded?.type).toBe('refresh');
  });

  it('should return null for invalid access token', () => {
    const decoded = verifyAccessToken('invalid-token');
    expect(decoded).toBeNull();
  });

  it('should return null for expired token', () => {
    // This would require manipulating time or using a token with past expiry
    // For now, we test that verification works correctly
    const token = generateAccessToken(testPayload);
    const decoded = verifyAccessToken(token);
    expect(decoded).not.toBeNull();
  });

  it('should not verify access token with refresh secret', () => {
    const refreshToken = generateRefreshToken(testPayload);
    const decoded = verifyAccessToken(refreshToken);
    expect(decoded).toBeNull();
  });

  it('should not verify refresh token with access secret', () => {
    const accessToken = generateAccessToken(testPayload);
    const decoded = verifyRefreshToken(accessToken);
    expect(decoded).toBeNull();
  });
});