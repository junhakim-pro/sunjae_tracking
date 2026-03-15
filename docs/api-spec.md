# API 초안

## `GET /api/summary`

오늘 대시보드에 필요한 아기 프로필과 요약 데이터를 반환한다.

### 응답 예시

```json
{
  "baby": {
    "id": "baby_sunjae",
    "name": "선재"
  },
  "summary": {
    "formulaMl": 420,
    "solidFoodG": 255
  }
}
```

## `GET /api/logs`

오늘 타임라인을 반환한다.

## `POST /api/logs`

웹에서 직접 로그를 추가할 때 사용한다.

### 요청 예시

```json
{
  "type": "intake",
  "occurredAt": "2026-03-15T18:30:00+09:00",
  "intakeType": "formula",
  "amountMl": 180,
  "createdBy": "dad"
}
```

## `POST /api/telegram/webhook`

텔레그램 webhook 엔드포인트.

### 처리 규칙

- 텍스트 입력이면 구조화 파서 호출
- 사진 입력이면 일일 이미지 제한 검증 후 OCR/비전 파서 호출
- 신뢰도 낮으면 follow-up question 반환
- 응답 메시지에는 저장 결과와 달성률을 포함

## 추후 추가 API

- `POST /api/auth/invite`
- `GET /api/stats/weekly`
- `POST /api/growth`
- `PATCH /api/logs/:id`
- `DELETE /api/logs/:id`
