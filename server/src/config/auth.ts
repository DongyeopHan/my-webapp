import jwt, { type SignOptions } from 'jsonwebtoken';

type JwtPayload = {
  userId: string;
  loginId: string;
  name: string;
};

const NO_EXPIRY_TOKEN_VALUES = new Set(['none', 'off', 'false', '0']);

const getJwtSecret = (): string => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwtSecret;
};

const getJwtExpiresIn = (): NonNullable<SignOptions['expiresIn']> | null => {
  const rawValue = process.env.JWT_EXPIRES_IN?.trim();

  if (!rawValue || NO_EXPIRY_TOKEN_VALUES.has(rawValue.toLowerCase())) {
    return null;
  }

  return rawValue as NonNullable<SignOptions['expiresIn']>;
};

export const signAccessToken = (payload: JwtPayload): string => {
  const expiresIn = getJwtExpiresIn();

  if (!expiresIn) {
    return jwt.sign(payload, getJwtSecret());
  }

  const signOptions: SignOptions = {
    expiresIn,
  };

  return jwt.sign(payload, getJwtSecret(), signOptions);
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
};

export type { JwtPayload };
