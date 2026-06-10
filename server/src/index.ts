import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/database.js';
import authRoutes from './routes/auth.js';
import shoppingRoutes from './routes/shopping.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Always load server/.env regardless of the shell working directory.
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();

// 미들웨어
app.use(cors());
app.use(express.json());

// 라우트
app.use('/api/auth', authRoutes);
app.use('/api/shopping', shoppingRoutes);

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
