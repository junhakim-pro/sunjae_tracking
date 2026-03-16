import Link from "next/link";
import { LogEntryForm } from "@/components/log-entry-form";
import { TimelineManager } from "@/components/timeline-manager";
import { WeeklyTrend } from "@/components/weekly-trend";
import { chatExamples } from "@/lib/mock-data";
import { getCaregivers, getDashboardSnapshot, getWeeklyTrend } from "@/lib/data";
import { formatDateTimeLabel, formatTimeLabel, formatPercent } from "@/lib/format";

const documentCards = [
  {
    title: "아키텍처",
    description: "텔레그램 챗봇, 웹 대시보드, AI 파서, DB까지 한 번에 이어지는 구조입니다.",
    path: "/docs/architecture.md"
  },
  {
    title: "API 명세",
    description: "챗봇 webhook과 로그 조회/생성 엔드포인트 형태를 문서화했습니다.",
    path: "/docs/api-spec.md"
  },
  {
    title: "DB 스키마",
    description: "아기, 보호자, 섭취 기록, 수면, 메모, 성장 측정 테이블 초안입니다.",
    path: "/docs/schema.sql"
  }
];

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ baby, summary, timeline }, weeklyTrend, caregivers] = await Promise.all([
    getDashboardSnapshot(),
    getWeeklyTrend(),
    getCaregivers()
  ]);
  const metricCards = [
    {
      label: "오늘 분유",
      value: `${summary.formulaMl}ml`,
      note: `목표 ${summary.formulaGoalMl}ml 중 ${formatPercent(
        summary.formulaMl,
        summary.formulaGoalMl
      )}%`
    },
    {
      label: "오늘 이유식",
      value: `${summary.solidFoodG}g`,
      note: `목표 ${summary.solidFoodGoalG}g 중 ${formatPercent(
        summary.solidFoodG,
        summary.solidFoodGoalG
      )}%`
    },
    {
      label: "오늘 수면",
      value: `${summary.sleepHours}시간`,
      note: "낮잠과 밤잠을 같은 타임라인에서 추적"
    },
    {
      label: "다음 식사 추천",
      value: formatTimeLabel(summary.suggestedNextFeedAt),
      note: `${summary.suggestedWindowHours}시간 간격 기준`
    }
  ];

  return (
    <main className="page-shell">
      <section className="hero">
        <span className="eyebrow">Sunjae Care Log</span>
        <div className="hero-grid">
          <div className="hero-copy">
            <h1>가족 대화를 아이 성장 로그로 바꾸는 MVP</h1>
            <p>
              텔레그램에 자연스럽게 남긴 말과 사진을 AI가 읽고, 분유·이유식·수면·메모를 하루 흐름으로
              정리합니다. 목표 대비 달성률과 다음 식사 추천까지 바로 보여주는 방향으로 설계했습니다.
            </p>
            <div className="hero-actions">
              <a className="button-primary" href="#dashboard">
                대시보드 보기
              </a>
              <a className="button-secondary" href="#docs">
                설계 문서 보기
              </a>
            </div>
            <div className="pill-row" style={{ marginTop: 20 }}>
              <span className="pill">텔레그램 MVP 우선</span>
              <span className="pill">OCR 하루 {summary.imageDailyLimit}회 제한</span>
              <span className="pill">성장 퍼센타일 추적</span>
            </div>

            <div className="hero-stat-grid">
              <article className="hero-stat-card">
                <span>오늘 분유</span>
                <strong>{summary.formulaMl}ml</strong>
                <small>목표 대비 {formatPercent(summary.formulaMl, summary.formulaGoalMl)}%</small>
              </article>
              <article className="hero-stat-card">
                <span>오늘 수면</span>
                <strong>{summary.sleepHours}시간</strong>
                <small>낮잠과 밤잠 흐름 포함</small>
              </article>
              <article className="hero-stat-card">
                <span>다음 식사</span>
                <strong>{formatTimeLabel(summary.suggestedNextFeedAt)}</strong>
                <small>{summary.suggestedWindowHours}시간 간격 기준</small>
              </article>
            </div>
          </div>

          <div className="panel hero-profile">
            <h2>선재 프로필</h2>
            <div className="summary-stack">
              <div className="summary-item">
                <span>현재 월령</span>
                <strong>{baby.monthAgeLabel}</strong>
              </div>
              <div className="summary-item">
                <span>최근 측정</span>
                <strong>{baby.measuredAt}</strong>
              </div>
              <div className="summary-item">
                <span>몸무게 / 키</span>
                <strong>
                  {baby.latestWeightKg}kg / {baby.latestHeightCm}cm
                </strong>
              </div>
              <div className="summary-item">
                <span>퍼센타일</span>
                <strong>
                  체중 {baby.weightPercentile} / 키 {baby.heightPercentile}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-heading-block">
        <span className="section-kicker">Overview</span>
        <div className="section-heading-row">
          <div>
            <h2>오늘 흐름을 한눈에 보는 대시보드</h2>
            <p>숫자는 빠르게, 맥락은 자연스럽게 읽히도록 핵심 카드부터 타임라인까지 한 화면에 모았습니다.</p>
          </div>
          <div className="section-chip">실시간 갱신</div>
        </div>
      </section>

      <section id="dashboard" className="dashboard-grid dashboard-grid--metrics">
        {metricCards.map((card) => (
          <article className="metric-card" key={card.label}>
            <div className="metric-label">{card.label}</div>
            <div className="metric-value">{card.value}</div>
            <div className="metric-note">{card.note}</div>
          </article>
        ))}
      </section>

      <section className="detail-grid">
        <article className="timeline-card">
          <h3>오늘 타임라인</h3>
          <p>누가 입력했는지, AI가 어떻게 구조화했는지, 잘못 적은 내용은 바로 수정/삭제까지 할 수 있습니다.</p>
          <TimelineManager items={timeline} />
        </article>

        <article className="chat-card">
          <h3>챗봇 응답 예시</h3>
          <p>메신저에서는 자유 입력을 받아 요약, 달성률, 다음 식사 추천을 함께 답합니다.</p>
          <div className="chatbot-grid">
            {chatExamples.map((example, index) => (
              <div className={`chat-bubble ${example.role}`} key={`${example.role}-${index}`}>
                <p>{example.message}</p>
                {example.meta ? <div className="chat-meta">{example.meta}</div> : null}
              </div>
            ))}
          </div>
          <div className="panel" style={{ marginTop: 16, padding: 16 }}>
            <strong>오늘 이미지 사용량</strong>
            <div className="metric-note">
              {summary.imageUsesToday} / {summary.imageDailyLimit}회
            </div>
          </div>
        </article>
      </section>

      <section className="detail-grid">
        <article className="timeline-card">
          <h3>최근 7일 추세</h3>
          <p>하루 총량이 쌓일수록 먹는 양과 수면 흐름이 어떻게 바뀌는지 빠르게 확인할 수 있습니다.</p>
          <div style={{ marginTop: 18 }}>
            <WeeklyTrend points={weeklyTrend} />
          </div>
        </article>

        <article className="chat-card">
          <h3>추세 읽기 힌트</h3>
          <div className="check-list">
            <div className="doc-list-item">
              <strong>분유량이 갑자기 줄면</strong>
              <span>같은 날 메모나 증상 기록과 같이 보면 원인을 파악하기 쉽습니다.</span>
            </div>
            <div className="doc-list-item">
              <strong>이유식량이 흔들리면</strong>
              <span>먹은 음식 이름과 남긴 양 메모를 남길수록 패턴이 또렷해집니다.</span>
            </div>
            <div className="doc-list-item">
              <strong>수면이 짧은 날</strong>
              <span>다음 식사 추천이나 저녁 컨디션과 연결해보기 좋습니다.</span>
            </div>
          </div>
        </article>
      </section>

      <section className="detail-grid">
        <article className="timeline-card">
          <h3>함께 기록하는 가족</h3>
          <div className="check-list">
            {caregivers.map((caregiver) => (
              <div className="doc-list-item" key={caregiver.id}>
                <strong>{caregiver.name}</strong>
                <span>
                  역할 {caregiver.role} · 입력 채널 {caregiver.messengerPlatform}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="chat-card">
          <h3>기록 관리</h3>
          <div className="check-list">
            <div className="doc-list-item">
              <strong>수정</strong>
              <span>시간, 양, 메모, 입력자를 카드에서 바로 고칠 수 있습니다.</span>
            </div>
            <div className="doc-list-item">
              <strong>삭제</strong>
              <span>중복 기록이나 잘못 저장된 기록을 바로 지울 수 있습니다.</span>
            </div>
            <div className="doc-list-item">
              <strong>공유</strong>
              <span>누가 남긴 기록인지 타임라인과 보호자 목록에서 함께 보입니다.</span>
            </div>
          </div>
        </article>
      </section>

      <section className="detail-grid">
        <article className="chat-card">
          <h3>직접 기록 입력</h3>
          <p>가족이 웹에서도 바로 기록할 수 있게 했습니다. 저장하면 타임라인과 요약이 즉시 갱신됩니다.</p>
          <div style={{ marginTop: 16 }}>
            <LogEntryForm />
          </div>
        </article>

        <article className="timeline-card">
          <h3>입력 가이드</h3>
          <div className="check-list">
            <div className="doc-list-item">
              <strong>분유 / 물</strong>
              <span>ml 단위로 저장됩니다.</span>
            </div>
            <div className="doc-list-item">
              <strong>이유식 / 간식</strong>
              <span>g 단위와 음식 이름을 함께 남길 수 있습니다.</span>
            </div>
            <div className="doc-list-item">
              <strong>수면</strong>
              <span>잠든 시각과 깬 시각을 넣으면 수면 시간이 자동 계산됩니다.</span>
            </div>
            <div className="doc-list-item">
              <strong>메모</strong>
              <span>감기, 콧물, 입맛 저하 같은 배경 정보를 남길 수 있습니다.</span>
            </div>
          </div>
        </article>
      </section>

      <section id="docs" className="docs-grid">
        {documentCards.map((card) => (
          <article className="doc-card" key={card.title}>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
            <Link href={card.path} className="button-secondary" style={{ marginTop: 14 }}>
              문서 열기
            </Link>
            <code>{card.path}</code>
          </article>
        ))}
      </section>

      <p className="footer-note">
        이 화면은 실제 DB를 읽는 MVP이며, 텔레그램과 AI는 현재 안전한 목업 경계로 연결되어 있습니다.
      </p>
    </main>
  );
}
