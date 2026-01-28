import { Router } from 'express';
import type { Request, Response } from 'express';
import ScriptureProgress from '../models/ScriptureProgress.js';
import mongoose from 'mongoose';

const router = Router();

// 진행상황 조회
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: '잘못된 사용자 ID입니다' });
    }

    const progress = await ScriptureProgress.find({
      userId: new mongoose.Types.ObjectId(userId),
    });

    // { bookName: [chapters] } 형태로 변환
    const progressMap: Record<string, number[]> = {};
    progress.forEach((p) => {
      progressMap[p.bookName] = p.readChapters;
    });

    res.json(progressMap);
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ message: '진행상황 조회 중 오류가 발생했습니다' });
  }
});

// 진행상황 저장/업데이트
router.post('/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const { bookName, readChapters } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: '잘못된 사용자 ID입니다' });
    }

    if (!bookName || !Array.isArray(readChapters)) {
      return res.status(400).json({ message: '잘못된 요청 데이터입니다' });
    }

    // upsert: 있으면 업데이트, 없으면 생성
    const progress = await ScriptureProgress.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        bookName,
      },
      {
        readChapters,
        updatedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
      },
    );

    res.json(progress);
  } catch (error) {
    console.error('Save progress error:', error);
    res.status(500).json({ message: '진행상황 저장 중 오류가 발생했습니다' });
  }
});

export default router;
