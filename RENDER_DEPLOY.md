# Render 백엔드 배포 가이드

## 1️⃣ GitHub에 코드 푸시

먼저 코드를 GitHub에 푸시하세요:

```bash
git add .
git commit -m "Add Render deployment config"
git push origin main
```

## 2️⃣ Render 계정 생성 및 서비스 생성

1. https://render.com 접속
2. GitHub 계정으로 회원가입/로그인
3. Dashboard에서 **"New +"** 클릭
4. **"Web Service"** 선택
5. GitHub 저장소 연결 (my-webapp)

## 3️⃣ 서비스 설정

### Build 설정:

- **Name**: `my-webapp-server` (원하는 이름)
- **Region**: `Singapore` (한국과 가까운 지역)
- **Branch**: `main`
- **Root Directory**: `server` ⚠️ 중요!
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Plan**: `Free` 선택

### 환경 변수 설정:

**Environment Variables** 섹션에서 추가:

```
PORT=4000
MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/scripture-app?retryWrites=true&w=majority
```

(MongoDB Atlas 연결 문자열을 실제 값으로 교체)

4. **"Create Web Service"** 클릭

## 4️⃣ 배포 완료 대기

- 빌드 로그를 확인하며 5~10분 대기
- 성공하면 URL 제공됨 (예: `https://my-webapp-server.onrender.com`)

## 5️⃣ 클라이언트 API URL 업데이트

배포된 서버 URL을 클라이언트에서 사용하도록 수정이 필요합니다!

---

## ⚠️ 주의사항

- **무료 플랜**: 15분 비활성 후 슬립 모드
- **첫 요청**: 슬립 해제에 30초~1분 소요
- **제한**: 월 750시간 무료 (충분함)
- **.env 파일**: GitHub에 푸시하지 않도록 .gitignore에 추가됨

배포가 완료되면 서버 URL을 알려주세요. 클라이언트 설정을 업데이트하겠습니다!
