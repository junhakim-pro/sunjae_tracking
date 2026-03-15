# Sunjae Care Log

선재의 분유, 이유식, 수면, 메모, 성장 기록을 가족이 함께 남기기 위한 MVP 초안입니다.

컴퓨터가 익숙하지 않다면 먼저 [docs/beginner-guide.md](/Users/macmini/Documents/New%20project/%E1%84%80%E1%85%B5%E1%86%B7%E1%84%89%E1%85%A5%E1%86%AB%E1%84%8C%E1%85%A2%E1%84%87%E1%85%AE%E1%86%AB%E1%84%8B%E1%85%B2%E1%84%8B%E1%85%B5%E1%84%8B%E1%85%B2%E1%84%89%E1%85%B5%E1%86%A8%E1%84%80%E1%85%B5%E1%84%85%E1%85%A9%E1%86%A8/docs/beginner-guide.md)를 보면 된다.

## 포함된 내용

- Next.js 기반 대시보드 목업
- 텔레그램 webhook + 실제 답장 전송 구조
- DeepSeek / Qwen / OpenAI 교체형 구조화 파싱 연결
- Prisma + SQLite 기반 DB 연결
- 제품 및 아키텍처 문서

## 시작하기

```bash
npm install
npm run db:generate
npm run db:init
npm run db:seed
npm run dev
```

브라우저에서 `http://localhost:3000`을 열면 됩니다.

`.env.example`을 참고해 텔레그램, DeepSeek 또는 Qwen, DB 환경변수를 채우면 실제 연동 단계로 넘어갈 수 있습니다.

텔레그램 webhook에서는 `TELEGRAM_WEBHOOK_SECRET` 검증을 지원하고, 사진 업로드는 하루 2회 제한을 적용합니다.

현재 로컬 환경에서는 Prisma `db push`가 엔진 이슈로 실패할 수 있어, 초기 테이블 생성은 `db:init`으로 우회했습니다.

## 다음 연결 포인트

- `/app/api/telegram/webhook/route.ts`
- `/lib/parsing.ts`
- `/prisma/schema.prisma`
- `/docs/telegram-ai-setup.md`
- `/docs/deploy-guide.md`
