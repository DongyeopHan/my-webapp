import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { verifyAccessToken } from '../config/auth.js';

type AuthenticatedUser = {
  userId: string;
  loginId: string;
  name: string;
};

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

const extractBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ message: '인증이 필요합니다' });
  }

  try {
    const payload = verifyAccessToken(token);

    if (!mongoose.Types.ObjectId.isValid(payload.userId)) {
      return res.status(401).json({ message: '유효하지 않은 인증 정보입니다' });
    }

    (req as AuthenticatedRequest).user = payload;
    next();
  } catch {
    return res
      .status(401)
      .json({ message: '세션이 만료되었거나 유효하지 않습니다' });
  }
};

export const isAuthorizedUserId = (
  req: AuthenticatedRequest,
  userId: string,
): boolean => {
  return req.user.userId === userId;
};
