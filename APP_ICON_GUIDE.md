# 📱 모바일 앱 아이콘 교체 가이드

## 🎨 아이콘 준비

먼저 **1024x1024 PNG 파일** (투명 배경 없이) 을 준비하세요.

## 방법 1: 자동 생성 (추천) 🚀

### 1. Capacitor Assets 플러그인 설치

```bash
npm install -g @capacitor/assets
```

### 2. 아이콘 파일 배치

`client/resources/` 폴더에 아이콘 파일을 넣으세요:

```
client/
  resources/
    icon.png (1024x1024, 투명 배경 없음)
```

### 3. 자동 생성

```bash
cd client
npx capacitor-assets generate
```

이 명령어가 자동으로:

- iOS 모든 크기의 아이콘 생성
- Android 모든 크기의 아이콘 생성
- 적절한 위치에 배치

---

## 방법 2: 수동 교체 🔧

### Android 아이콘 교체

다음 폴더에 있는 `ic_launcher.png` 파일들을 교체:

```
client/android/app/src/main/res/
  mipmap-mdpi/ic_launcher.png (48x48)
  mipmap-hdpi/ic_launcher.png (72x72)
  mipmap-xhdpi/ic_launcher.png (96x96)
  mipmap-xxhdpi/ic_launcher.png (144x144)
  mipmap-xxxhdpi/ic_launcher.png (192x192)
```

### iOS 아이콘 교체

1. Xcode에서 프로젝트 열기:

```bash
cd client/ios/App
open App.xcworkspace
```

2. Xcode에서:
   - 왼쪽 프로젝트 네비게이터에서 **Assets.xcassets** 클릭
   - **AppIcon** 클릭
   - 각 크기별로 이미지를 드래그 앤 드롭

또는 수동으로 파일 교체:

```
client/ios/App/App/Assets.xcassets/AppIcon.appiconset/
```

---

## 방법 3: 온라인 도구 사용 🌐

1. https://icon.kitchen/ 또는 https://makeappicon.com/ 접속
2. 1024x1024 PNG 업로드
3. iOS, Android 아이콘 다운로드
4. 생성된 파일들을 해당 위치에 복사

---

## ✅ 적용 확인

아이콘 교체 후:

```bash
# iOS
cd client
npx cap sync ios

# Android
npx cap sync android
```

그 다음 Android Studio나 Xcode에서 다시 빌드하세요.

---

## 💡 팁

- **크기**: 1024x1024 PNG (투명 배경 없이)
- **포맷**: PNG, 24비트 컬러
- **여백**: 아이콘 주위에 약간의 여백 권장
- **모서리**: iOS는 자동으로 둥글게 처리하므로 정사각형으로 준비

**추천 툴**: Figma, Sketch, Canva에서 디자인 후 내보내기
