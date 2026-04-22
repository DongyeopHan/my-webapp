import { Router } from 'express';
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { signAccessToken } from '../config/auth.js';

const router = Router();

const MIN_LOGIN_ID_LENGTH = 3;
const MIN_PASSWORD_LENGTH = 8;

const isBcryptHash = (value: string): boolean => value.startsWith('$2');

const buildAuthResponse = (user: {
  _id: unknown;
  loginId: string;
  name: string;
}) => {
  const userId = String(user._id);
  return {
    userId,
    loginId: user.loginId,
    name: user.name,
    accessToken: signAccessToken({
      userId,
      loginId: user.loginId,
      name: user.name,
    }),
  };
};

// 로그인 (간단한 인증)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res
        .status(400)
        .json({ message: '아이디와 비밀번호를 입력해주세요' });
    }

    // 사용자 찾기
    const user = await User.findOne({ loginId });

    // 사용자가 없으면 로그인 거부
    if (!user) {
      return res
        .status(401)
        .json({ message: '아이디 또는 비밀번호가 일치하지 않습니다' });
    }

    const storedPassword = user.password;
    const isPasswordValid = isBcryptHash(storedPassword)
      ? await bcrypt.compare(password, storedPassword)
      : storedPassword === password;

    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ message: '아이디 또는 비밀번호가 일치하지 않습니다' });
    }

    if (!isBcryptHash(storedPassword)) {
      user.password = await bcrypt.hash(password, 10);
      await user.save();
    }

    res.json(buildAuthResponse(user));
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: '로그인 중 오류가 발생했습니다' });
  }
});

// 회원가입
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { loginId, password, name } = req.body;

    if (!loginId || !password || !name) {
      return res
        .status(400)
        .json({ message: '아이디, 비밀번호, 이름을 모두 입력해주세요' });
    }

    if (loginId.trim().length < MIN_LOGIN_ID_LENGTH) {
      return res
        .status(400)
        .json({ message: '아이디는 3자 이상이어야 합니다' });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res
        .status(400)
        .json({ message: '비밀번호는 8자 이상이어야 합니다' });
    }

    // 이미 존재하는 사용자 확인
    const normalizedLoginId = loginId.trim();
    const normalizedName = name.trim();

    const existingUser = await User.findOne({ loginId: normalizedLoginId });
    if (existingUser) {
      return res
        .status(409)
        .json({
          message: '이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요.',
        });
    }

    // 새 사용자 생성
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      loginId: normalizedLoginId,
      password: hashedPassword,
      name: normalizedName,
    });
    await user.save();

    res.status(201).json(buildAuthResponse(user));
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: '회원가입 중 오류가 발생했습니다' });
  }
});

export default router;
