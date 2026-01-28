import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database.js';
import authRoutes from './routes/auth.js';
import scriptureRoutes from './routes/scripture.js';

dotenv.config();

const app = express();

// 미들웨어
app.use(cors());
app.use(express.json());

// 라우트
app.use('/api/auth', authRoutes);
app.use('/api/scripture', scriptureRoutes);

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

// MongoDB 연결 후 서버 시작
const PORT = process.env.PORT || 4000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
