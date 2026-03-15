# 텔레그램 + AI 연결 가이드

## 1. 환경변수

`.env`에 아래 값을 채운다.

```env
DATABASE_URL="file:./app.db"
AI_TEXT_PROVIDER="deepseek"
AI_VISION_PROVIDER="qwen"
DEEPSEEK_API_KEY="..."
QWEN_API_KEY="..."
TELEGRAM_BOT_TOKEN="..."
TELEGRAM_WEBHOOK_SECRET="..."
TELEGRAM_CAREGIVER_MAP_JSON='{"123456789":"할머니","987654321":"엄마"}'
```

## 2. 로컬 준비

```bash
npm install
npm run db:generate
npm run db:init
npm run db:seed
```

## 3. 텔레그램 봇 만들기

1. 텔레그램에서 `@BotFather`를 연다.
2. `/newbot`으로 새 봇을 만든다.
3. 받은 토큰을 `TELEGRAM_BOT_TOKEN`에 넣는다.

## 4. webhook 연결

배포된 HTTPS 주소가 있다고 가정하면 webhook URL은 아래 형태다.

```text
https://your-domain.com/api/telegram/webhook
```

텔레그램 webhook 설정 예시:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/api/telegram/webhook",
    "secret_token": "'"$TELEGRAM_WEBHOOK_SECRET"'"
  }'
```

## 5. 현재 구현된 동작

- 텍스트 메시지면 기본적으로 DeepSeek 구조화 파싱 우선
- 사진 메시지면 기본적으로 Qwen 비전 파싱 우선
- 외부 AI 호출 실패 시 휴리스틱 파서로 자동 폴백
- 사진 인식은 하루 2회 제한
- 저장 후 텔레그램에 오늘 총량과 다음 식사 추천 응답
- 텔레그램 사용자 id를 보호자 이름으로 자동 매핑 가능

## 6. 다음에 붙이면 좋은 것

- 텔레그램 사용자 id를 DB의 `Caregiver`와 직접 연결
- 사진에서 여러 줄 기록을 한번에 추출하는 배치 파싱
- 성장 퍼센타일 계산 자동화
- 인증과 가족 초대 링크 연결
