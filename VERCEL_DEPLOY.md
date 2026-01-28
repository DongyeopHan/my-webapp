# Vercel 프론트엔드 배포 가이드

## 1️⃣ Vercel 배포

### 옵션 A: Vercel CLI 사용

```bash
cd client
npm install -g vercel
vercel
```

### 옵션 B: Vercel 웹사이트 사용

1. https://vercel.com 접속
2. GitHub 계정으로 로그인
3. **"Add New Project"** 클릭
4. GitHub 저장소 `my-webapp` 선택
5. **Root Directory**: `client` 설정 ⚠️
6. **Framework Preset**: `Vite` 자동 감지
7. **Environment Variables** 추가:
   ```
   VITE_API_URL=https://my-webapp-2nai.onrender.com/api
   ```
8. **Deploy** 클릭

## 2️⃣ 배포 완료

- 배포가 완료되면 Vercel URL 제공 (예: `https://my-webapp.vercel.app`)
- 이제 완전히 클라우드에서 작동하는 앱 완성!

## 🎯 전체 구조

```
프론트엔드: Vercel (https://your-app.vercel.app)
     ↓
백엔드: Render (https://my-webapp-2nai.onrender.com)
     ↓
데이터베이스: MongoDB Atlas (클라우드)
```

## ⚠️ 주의사항

- Render 무료 플랜은 15분 비활성 후 슬립
- 첫 로그인 시 30초~1분 대기 가능
- 이후 요청은 빠르게 처리됨
