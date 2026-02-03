# 환경 변수 보안 설정 완료

## ✅ 변경 사항

### 1. API URL 환경 변수화

- **문제**: API URL이 코드에 하드코딩되어 GitHub에 노출
- **해결**: 환경 변수로 변경하여 민감한 정보 보호

### 2. .gitignore 설정

```
.env
.env.local
.env.development
.env.production
```

→ 실제 API 키가 담긴 파일은 Git에 올라가지 않음

### 3. 파일 구조 및 로딩 순서

Vite는 **빌드 명령어**와 **모드**에 따라 자동으로 .env 파일을 선택합니다.

#### 📂 파일별 용도

- `.env` - 모든 환경의 기본값 (Git 제외 ✅)
- `.env.local` - 로컬 개발자만의 설정 (Git 제외, 선택사항)
- `.env.development` - 개발 환경용 (Git 제외 ✅)
- `.env.production` - 프로덕션용 (Git 제외 ✅)
- `.env.example` - 템플릿만, 실제 값 없음 (Git 포함 ✅)

#### 🔄 로딩 우선순위 (높음 → 낮음)

```
1. .env.[mode].local   (최우선, 예: .env.production.local)
2. .env.[mode]         (모드별, 예: .env.production)
3. .env.local          (로컬 전용)
4. .env                (기본값)
```

**중복 변수**: 위쪽 파일의 값이 아래쪽을 덮어씁니다.

#### 🚀 명령어별 동작

```bash
# 개발 서버 실행 → development 모드
npm run dev
→ .env.development.local (있으면)
→ .env.development ✅
→ .env.local (있으면)
→ .env ✅

# 프로덕션 빌드 → production 모드
npm run build
→ .env.production.local (있으면)
→ .env.production ✅
→ .env.local (있으면)
→ .env ✅

# 수동 모드 지정
vite build --mode staging
→ .env.staging 사용
```

## 📦 배포 방법

### Vercel/Netlify 배포 시

**로컬 .env 파일은 무시됩니다!** 대신 플랫폼의 환경 변수를 사용합니다.

1. 배포 플랫폼 대시보드 → Environment Variables 메뉴
2. 다음 변수 추가:
   ```
   VITE_API_URL=https://my-webapp-2nai.onrender.com/api
   VITE_GOOGLE_SHEET_URL=https://script.google.com/macros/s/...
   ```
3. 배포 시 자동으로 환경 변수가 주입됨 ✅

**중요**: Vercel/Netlify는 `.env` 파일을 사용하지 않고, 플랫폼 설정의 환경 변수만 사용합니다!

### GitHub Actions 배포 시

1. Repository Settings → Secrets and variables → Actions
2. Repository secrets 추가 (위와 동일)
3. workflow 파일에서 secrets 사용

## 🔒 보안 체크리스트

- ✅ API URL이 코드에서 제거됨
- ✅ .env 파일들이 .gitignore에 추가됨
- ✅ .env.example로 템플릿 제공
- ✅ 배포 환경에서 환경 변수 설정 가능

## 💡 팀 협업 시나리오

### 새 팀원이 프로젝트 받을 때:

1. Git clone
2. `.env.example` 복사 → `.env` 생성
3. 실제 API 키 입력 (팀장에게 받음)
4. `npm run dev` 실행

### 배포 담당자:

1. Vercel/Netlify 대시보드에 환경 변수 추가
2. Git push → 자동 배포 ✅
3. **.env 파일은 Git에 안 올라가므로 안전!**

**결론**: 이제 안전하게 GitHub에 푸시해도 API 키가 노출되지 않습니다! 🎉
