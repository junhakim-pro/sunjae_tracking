# 배포 가이드

## 추천 방식

초보자 기준으로는 `GitHub + Vercel` 조합이 가장 쉽다.

이유:

- Next.js 배포가 쉬움
- 환경변수 넣기 쉬움
- HTTPS 주소가 바로 생김
- 텔레그램 webhook 연결이 편함

## 1. GitHub에 올리기

### 가장 쉬운 방법

1. GitHub에서 새 저장소를 만든다
2. 이 프로젝트 폴더를 GitHub Desktop 또는 VS Code Source Control로 올린다

터미널에 익숙하지 않다면 GitHub Desktop을 쓰는 게 가장 쉽다.

## 2. Vercel에 연결하기

1. [Vercel](https://vercel.com/) 로그인
2. `Add New Project`
3. GitHub 저장소 선택
4. Framework는 Next.js로 자동 인식됨
5. Deploy

## 3. Vercel 환경변수 넣기

Vercel 프로젝트 설정에서 아래 값을 넣는다.

### 필수

- `DATABASE_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`

### AI 선택지 1: DeepSeek + Qwen 추천

- `AI_TEXT_PROVIDER=deepseek`
- `AI_VISION_PROVIDER=qwen`
- `DEEPSEEK_API_KEY=...`
- `QWEN_API_KEY=...`

### AI 선택지 2: OpenAI

- `AI_TEXT_PROVIDER=openai`
- `AI_VISION_PROVIDER=openai`
- `OPENAI_API_KEY=...`

### 보호자 이름 자동 매핑

- `TELEGRAM_CAREGIVER_MAP_JSON={"123456789":"할머니","987654321":"엄마"}`

## 4. DB 관련

현재는 SQLite 파일 기반이다.

즉, MVP 실험용으로는 충분하지만 장기적으로는 배포 서버 환경에서 DB를 Postgres 같은 외부 DB로 옮기는 게 좋다.

그래도 MVP 초기 테스트 단계에서는 지금 구조로도 충분히 화면/로직 검증은 가능하다.

## 5. 텔레그램 webhook 연결

배포 주소가 `https://your-app.vercel.app` 라면 다음 URL을 webhook으로 연결한다.

```text
https://your-app.vercel.app/api/telegram/webhook
```

예시:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.vercel.app/api/telegram/webhook",
    "secret_token": "'"$TELEGRAM_WEBHOOK_SECRET"'"
  }'
```

## 6. 실제 테스트 순서

1. 웹 페이지 접속 확인
2. 웹에서 직접 기록 저장 테스트
3. 텔레그램에서 텍스트 기록 테스트
4. 텔레그램에서 사진 기록 테스트
5. 하루 2회 사진 제한 테스트

## 7. 다음 단계 추천

배포 후에는 아래 순서가 좋다.

1. 외부 DB(Postgres) 전환
2. 보호자 초대 링크
3. 기록 수정/삭제
4. 성장 퍼센타일 자동 계산
5. 카카오 확장 검토
