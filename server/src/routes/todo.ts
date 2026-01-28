import { Router } from 'express';
import type { Request, Response } from 'express';
import Todo from '../models/Todo.js';
import mongoose from 'mongoose';

const router = Router();

// Todo 목록 조회 (사용자별)
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: '잘못된 사용자 ID입니다' });
    }

    const today = new Date().toISOString().split('T')[0];

    // 날짜가 바뀌면 모든 Todo의 completed를 false로 초기화
    await Todo.updateMany(
      {
        userId: new mongoose.Types.ObjectId(userId),
        lastResetDate: { $ne: today } as any,
        completed: true,
      },
      {
        $set: {
          completed: false,
          lastResetDate: today,
        },
      },
    );

    // lastResetDate를 오늘로 업데이트 (초기화 안 된 항목들)
    await Todo.updateMany(
      {
        userId: new mongoose.Types.ObjectId(userId),
        lastResetDate: { $ne: today } as any,
      },
      {
        $set: {
          lastResetDate: today,
        },
      },
    );

    const todos = await Todo.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ createdAt: -1 }); // 최신순 정렬

    res.json(todos);
  } catch (error) {
    console.error('Get todos error:', error);
    res.status(500).json({ message: 'Todo 목록 조회 중 오류가 발생했습니다' });
  }
});

// Todo 생성
router.post('/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const { title, time, content } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: '잘못된 사용자 ID입니다' });
    }

    if (!title || !time || !content) {
      return res
        .status(400)
        .json({ message: '제목, 시간, 내용을 모두 입력해주세요' });
    }

    const newTodo = new Todo({
      userId: new mongoose.Types.ObjectId(userId),
      title,
      time,
      content,
      completed: false,
    });

    await newTodo.save();
    res.status(201).json(newTodo);
  } catch (error) {
    console.error('Create todo error:', error);
    res.status(500).json({ message: 'Todo 생성 중 오류가 발생했습니다' });
  }
});

// Todo 완료 상태 토글
router.patch('/:todoId/toggle', async (req: Request, res: Response) => {
  try {
    const todoId = req.params.todoId as string;

    if (!todoId || !mongoose.Types.ObjectId.isValid(todoId)) {
      return res.status(400).json({ message: '잘못된 Todo ID입니다' });
    }

    const todo = await Todo.findById(todoId);
    if (!todo) {
      return res.status(404).json({ message: 'Todo를 찾을 수 없습니다' });
    }

    todo.completed = !todo.completed;
    await todo.save();

    res.json(todo);
  } catch (error) {
    console.error('Toggle todo error:', error);
    res.status(500).json({ message: 'Todo 상태 변경 중 오류가 발생했습니다' });
  }
});

// Todo 수정
router.put('/:todoId', async (req: Request, res: Response) => {
  try {
    const todoId = req.params.todoId as string;
    const { title, time, content } = req.body;

    if (!todoId || !mongoose.Types.ObjectId.isValid(todoId)) {
      return res.status(400).json({ message: '잘못된 Todo ID입니다' });
    }

    if (!title || !time || !content) {
      return res
        .status(400)
        .json({ message: '제목, 시간, 내용을 모두 입력해주세요' });
    }

    const todo = await Todo.findByIdAndUpdate(
      todoId,
      { title, time, content },
      { new: true },
    );

    if (!todo) {
      return res.status(404).json({ message: 'Todo를 찾을 수 없습니다' });
    }

    res.json(todo);
  } catch (error) {
    console.error('Update todo error:', error);
    res.status(500).json({ message: 'Todo 수정 중 오류가 발생했습니다' });
  }
});

// Todo 삭제
router.delete('/:todoId', async (req: Request, res: Response) => {
  try {
    const todoId = req.params.todoId as string;

    if (!todoId || !mongoose.Types.ObjectId.isValid(todoId)) {
      return res.status(400).json({ message: '잘못된 Todo ID입니다' });
    }

    const todo = await Todo.findByIdAndDelete(todoId);
    if (!todo) {
      return res.status(404).json({ message: 'Todo를 찾을 수 없습니다' });
    }

    res.json({ message: 'Todo가 삭제되었습니다' });
  } catch (error) {
    console.error('Delete todo error:', error);
    res.status(500).json({ message: 'Todo 삭제 중 오류가 발생했습니다' });
  }
});

export default router;
