import { getEnv } from './env';
import jwt, { SignOptions } from 'jsonwebtoken';

const env = getEnv();

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AccessTokenPayload extends TokenPayload {
  type: 'access';
}

export interface RefreshTokenPayload extends TokenPayload {
  type: 'refresh';
}

const accessTokenOptions: SignOptions = {
  expiresIn: env.JWT_ACCESS_EXPIRY as SignOptions['expiresIn'],
};

const refreshTokenOptions: SignOptions = {
  expiresIn: env.JWT_REFRESH_EXPIRY as SignOptions['expiresIn'],
};

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(
    { ...payload, type: 'access' },
    env.JWT_ACCESS_SECRET,
    accessTokenOptions
  );
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    env.JWT_REFRESH_SECRET,
    refreshTokenOptions
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch {
    return null;
  }
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch {
    return null;
  }
}