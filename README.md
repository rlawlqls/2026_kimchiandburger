# 장보기 Jangbogi — Traditional Market Menu Coach

아무 분식집 메뉴판이든 사진으로 찍으면, 인식된 메뉴 이름이 사진 위에 **탭 가능한 링크로 하이라이트**되고, 탭하면 영어 뜻·로마자 발음·주문 문장(TTS)을 보여주는 외국인 관광객용 주문 코치 앱.

## 아키텍처

```
사진 촬영/업로드
  → [1] OCR (Google Cloud Vision via /api/ocr proxy · 실패 시 Tesseract.js 자동 폴백)
  → [2] 픽셀 bbox → 0~1 정규화 (utils/normalize.ts)
  → [3] 40종 분식 사전과 퍼지 매칭 — 오독 교정 + 노이즈 필터 (utils/match.ts + data/menuDb.ts)
  → [4] 사진 위 탭 가능한 오버레이 렌더 (BoardView)
```

위치는 OCR이, 의미는 사전이 담당한다. API 키는 Vercel 서버리스 함수(`api/ocr.js`)의
환경변수로만 보관되어 프론트 번들에 절대 노출되지 않는다.

## 로컬 개발

```bash
npm install
npm run dev        # Vision 프록시 없음 → Tesseract 폴백으로 전체 파이프라인 동작
npm test           # 퍼지 매칭 단위 테스트
```

Vision 경로까지 로컬에서 테스트하려면:

```bash
npm i -g vercel
cp .env.example .env   # GCP_VISION_KEY 입력
vercel dev             # 프론트 + api/ocr 함수 동시 실행
```

## Vercel 배포

1. GitHub에 push 후 Vercel에서 Import (Framework Preset: **Vite** 자동 감지)
2. Project Settings → Environment Variables에 `GCP_VISION_KEY` 추가
   - Google Cloud Console → Cloud Vision API 활성화 → API Key 발급 (월 1,000장 무료)
3. Deploy — 정적 프론트(`dist/`)와 서버리스 함수(`api/ocr.js`)가 함께 배포됨

`GCP_VISION_KEY`가 없어도 앱은 동작한다(Tesseract.js 클라이언트 OCR로 자동 강등).
시연장 네트워크가 불안정해도 데모가 죽지 않는 이중화 설계.

## 파일 구조

```
api/ocr.js               Vercel 서버리스 — Vision API 프록시 (키 보안)
src/
  App.tsx                전역 상태 + scan/board/detail 뷰 스위칭
  data/menuDb.ts         분식 표준 메뉴 40종 사전 (교정·콘텐츠 원천)
  components/
    ScanView.tsx         카메라/업로드/샘플 + 로딩·에러 UI
    BoardView.tsx        사진 위 하이라이트 오버레이 (시그니처 화면)
    DetailView.tsx       음식 상세 + 주문 문장 + TTS
    PhraseCard.tsx       주문 문장 카드 (🔊)
  utils/
    ocr.ts               runOcr: Vision → Tesseract 폴백
    match.ts             퍼지 매칭 (레벤슈타인 ≤1, 부분 포함)
    normalize.ts         픽셀 bbox → 0~1 정규화
    price.ts             같은 행 오른쪽 숫자 = 가격 휴리스틱
    speak.ts             Web Speech API 래퍼 (ko-KR)
    detect.ts            [2]+[3] 파이프라인 결합
public/sample-menu.jpg   "Try a sample"용 메뉴판 (진짜 OCR을 태움)
```

로마자·영어 표기는 한국관광공사·국립국어원 「음식명 외국어 표기 사전」 준거.
