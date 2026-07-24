# Market Mate AI — Traditional Market Menu Coach

분식집 메뉴판을 카메라로 겨냥하거나 사진으로 올리면, 인식된 메뉴가 **탭 가능한 칩 목록**으로
나오고, 탭하면 영어 뜻·로마자 발음·알레르기 경고·주문 문장(TTS)을 보여주는 외국인 관광객용
주문 코치 앱.

## 아키텍처

```
카메라 겨냥 / 사진 업로드 / 내장 샘플
  → [1] 파인더의 박스 영역만 크롭 (utils/crop.ts)      ※ 샘플은 사진 전체를 읽음
  → [2] OCR (Gemma vision via /api/ocr proxy · 실패 시 Tesseract.js 자동 폴백)
  → [3] 픽셀 bbox → 0~1 정규화 (utils/normalize.ts)
  → [4] 41종 분식 사전과 퍼지 매칭 — 오독 교정 + 노이즈 필터 (utils/match.ts + data/menuDb.ts)
  → [5] 인식 결과를 칩 목록으로 렌더 → 탭 시 상세 시트 (ScanView + DetailSheet)
```

**설계 노트 — 왜 "사진 위 하이라이트 오버레이"가 아닌가**
초기 구상은 사진 위에 하이라이트를 겹치는 방식이었으나, 실제 시장 메뉴판은 글자가 빽빽하고
휴대폰 화면이 좁아 하이라이트가 서로 겹쳐 탭이 어려웠다. 현재는 **"읽을 영역을 박스로 지정 →
결과를 칩 목록으로"** 가 공식 설계다. bbox는 여전히 정규화해 보관하며(중복 제거·행 정렬에 사용)
가격 휴리스틱의 입력으로 쓰인다.

위치는 OCR이, 의미는 사전이 담당한다. API 키는 Vercel 서버리스 함수(`api/ocr.js`)의
환경변수로만 보관되어 프론트 번들에 절대 노출되지 않는다.

## 로컬 개발

```bash
npm install
npm run dev        # dev-api-plugin이 api/ 함수를 함께 띄운다
npm test           # 퍼지 매칭 · 주문 문장 · 프로필 단위 테스트
```

`.env`에 키가 없으면 `/api/ocr`가 503을 반환하고 앱은 브라우저 내장 Tesseract로 자동 강등된다.
클라우드 OCR 경로까지 확인하려면:

```bash
cp .env.example .env   # GEMINI_API_KEY 입력 (https://aistudio.google.com/apikey)
npm run dev
```

## Vercel 배포

1. GitHub에 push 후 Vercel에서 Import (Framework Preset: **Vite** 자동 감지)
2. Project Settings → Environment Variables에 **`GEMINI_API_KEY`** 추가
   - Google AI Studio에서 발급. 무료 티어는 Gemma 계열 모델을 커버한다
     (`api/ocr.js`의 `MODEL = "gemma-4-26b-a4b-it"`).
   - ⚠️ Cloud Vision 키(`GCP_VISION_KEY`)는 **더 이상 쓰이지 않는다.**
3. (선택) `ALLOWED_ORIGINS`에 배포 도메인을 콤마로 구분해 추가 — 설정하면 `/api/ocr`가
   그 오리진에서 온 요청만 받는다. 미설정 시 오리진 제한 없이 동작한다.
4. Deploy — 정적 프론트(`dist/`)와 서버리스 함수(`api/ocr.js`)가 함께 배포됨

`GEMINI_API_KEY`가 없어도 앱은 동작한다(Tesseract.js 클라이언트 OCR로 자동 강등).
시연장 네트워크가 불안정해도 데모가 죽지 않는 이중화 설계.

## 파일 구조

```
api/ocr.js               Vercel 서버리스 — Gemma vision OCR 프록시 (키 보안 + 레이트리밋)
src/
  App.tsx                전역 상태 + scan/orders/guide/profile 탭 스위칭
  data/menuDb.ts         분식 표준 메뉴 41종 사전 (교정·콘텐츠 원천)
  data/allergens.ts      알레르기 12종 메타데이터 (라벨·한국어·재료 키워드)
  components/
    ScanView.tsx         카메라/업로드/샘플 + 크롭 박스 + 결과 칩 목록
    DetailSheet.tsx      음식 상세 + 주문 문장 + TTS (바텀 시트)
    ListenSheet.tsx      벤더 답변 듣기/되묻기
    GuideView.tsx        사전 전체 둘러보기
  utils/
    crop.ts              파인더 박스 → 원본 픽셀 크롭 (object-cover 역변환)
    ocr.ts               runOcr: 클라우드 → Tesseract 폴백
    match.ts             퍼지 매칭 (레벤슈타인 ≤1, 부분 포함)
    normalize.ts         픽셀 bbox → 0~1 정규화
    price.ts             같은 행 오른쪽 숫자 = 가격 휴리스틱
    speak.ts             Web Speech API 래퍼 (ko-KR)
    detect.ts            [3]+[4] 파이프라인 결합
public/sample-menu.jpg   "Try a sample menu"용 메뉴판 (진짜 OCR을 태움)
```

로마자·영어 표기는 한국관광공사·국립국어원 「음식명 외국어 표기 사전」 준거.
