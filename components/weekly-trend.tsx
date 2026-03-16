import { WeeklyTrendPoint } from "@/lib/types";

function maxValue(points: WeeklyTrendPoint[], key: keyof WeeklyTrendPoint) {
  return Math.max(
    ...points.map((point) => (typeof point[key] === "number" ? (point[key] as number) : 0)),
    1
  );
}

function average(points: WeeklyTrendPoint[], key: keyof WeeklyTrendPoint) {
  const total = points.reduce(
    (sum, point) => sum + (typeof point[key] === "number" ? (point[key] as number) : 0),
    0
  );

  return Math.round((total / Math.max(points.length, 1)) * 10) / 10;
}

export function WeeklyTrend({ points }: { points: WeeklyTrendPoint[] }) {
  const maxFormula = maxValue(points, "formulaMl");
  const maxSolid = maxValue(points, "solidFoodG");
  const maxSleep = maxValue(points, "sleepHours");

  return (
    <div className="trend-stack">
      <div className="trend-overview-grid">
        <article className="trend-overview-card formula">
          <span>분유 평균</span>
          <strong>{average(points, "formulaMl")}ml</strong>
          <small>최근 7일 중 최대 {maxFormula}ml</small>
        </article>
        <article className="trend-overview-card solid">
          <span>이유식 평균</span>
          <strong>{average(points, "solidFoodG")}g</strong>
          <small>최근 7일 중 최대 {maxSolid}g</small>
        </article>
        <article className="trend-overview-card sleep">
          <span>수면 평균</span>
          <strong>{average(points, "sleepHours")}시간</strong>
          <small>최근 7일 중 최대 {maxSleep}시간</small>
        </article>
      </div>

      <div className="trend-daily-grid">
        {points.map((point) => (
          <article className="trend-day-card" key={point.dateLabel}>
            <div className="trend-day-head">
              <strong>{point.dateLabel}</strong>
              <span>메모 {point.noteCount}건</span>
            </div>

            <div className="trend-metric-list">
              <div className="trend-metric-row">
                <div className="trend-metric-label">
                  <span className="trend-dot formula" />
                  <span>분유</span>
                </div>
                <strong>{point.formulaMl}ml</strong>
              </div>
              <div className="trend-meter">
                <div
                  className="trend-meter-fill formula"
                  style={{ width: `${Math.min((point.formulaMl / maxFormula) * 100, 100)}%` }}
                />
              </div>

              <div className="trend-metric-row">
                <div className="trend-metric-label">
                  <span className="trend-dot solid" />
                  <span>이유식</span>
                </div>
                <strong>{point.solidFoodG}g</strong>
              </div>
              <div className="trend-meter">
                <div
                  className="trend-meter-fill solid"
                  style={{ width: `${Math.min((point.solidFoodG / maxSolid) * 100, 100)}%` }}
                />
              </div>

              <div className="trend-metric-row">
                <div className="trend-metric-label">
                  <span className="trend-dot sleep" />
                  <span>수면</span>
                </div>
                <strong>{point.sleepHours}시간</strong>
              </div>
              <div className="trend-meter">
                <div
                  className="trend-meter-fill sleep"
                  style={{ width: `${Math.min((point.sleepHours / maxSleep) * 100, 100)}%` }}
                />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
