import { Router } from 'express';
import type { Request, Response } from 'express';
import User from '../models/User.js';

const router = Router();

// 로그인 (간단한 인증)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: '아이디와 비밀번호를 입력해주세요' });
    }

    // 사용자 찾기
    const user = await User.findOne({ username });

    // 사용자가 없으면 로그인 거부
    if (!user) {
      return res
        .status(401)
        .json({ message: '아이디 또는 비밀번호가 일치하지 않습니다' });
    }

    // 비밀번호 확인
    if (user.password !== password) {
      return res
        .status(401)
        .json({ message: '아이디 또는 비밀번호가 일치하지 않습니다' });
    }

    res.json({
      userId: user._id,
      username: user.username,
      name: user.name,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: '로그인 중 오류가 발생했습니다' });
  }
});

// 회원가입
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { username, password, name } = req.body;

    if (!username || !password || !name) {
      return res
        .status(400)
        .json({ message: '아이디, 비밀번호, 이름을 모두 입력해주세요' });
    }

    // 이미 존재하는 사용자 확인
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: '이미 존재하는 아이디입니다' });
    }

    // 새 사용자 생성
    const user = new User({
      username,
      password, // 실제 프로덕션에서는 해시화 필요
      name,
    });
    await user.save();

    res.json({
      userId: user._id,
      username: user.username,
      name: user.name,
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: '회원가입 중 오류가 발생했습니다' });
  }
});

export default router;
