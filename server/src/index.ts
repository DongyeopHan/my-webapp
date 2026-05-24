import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/database.js';
import authRoutes from './routes/auth.js';
// import scriptureRoutes from './routes/scripture.js';
// import stockRoutes from './routes/stocks.js';
// import todoRoutes from './routes/todo.js';

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
// 비사용 기능(성경통독/주식/Todo) 라우트는 성능 및 표면적 최소화를 위해 비활성화
// app.use('/api/scripture', scriptureRoutes);
// app.use('/api/stocks', stockRoutes);
// app.use('/api/todo', todoRoutes);

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
