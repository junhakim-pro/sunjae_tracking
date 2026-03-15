import { WeeklyTrendPoint } from "@/lib/types";

function maxValue(points: WeeklyTrendPoint[], key: keyof WeeklyTrendPoint) {
  return Math.max(...points.map((point) => (typeof point[key] === "number" ? (point[key] as number) : 0)), 1);
}

export function WeeklyTrend({ points }: { points: WeeklyTrendPoint[] }) {
  const maxFormula = maxValue(points, "formulaMl");
  const maxSolid = maxValue(points, "solidFoodG");
  const maxSleep = maxValue(points, "sleepHours");

  return (
    <div className="trend-stack">
      <div className="trend-group">
        <div className="trend-header">
          <strong>최근 7일 분유</strong>
          <span>최대 {maxFormula}ml</span>
        </div>
        <div className="trend-bars">
          {points.map((point) => (
            <div className="trend-bar-card" key={`formula-${point.dateLabel}`}>
              <div className="trend-bar formula" style={{ height: `${(point.formulaMl / maxFormula) * 100}%` }} />
              <strong>{point.formulaMl}</strong>
              <span>{point.dateLabel}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="trend-group">
        <div className="trend-header">
          <strong>최근 7일 이유식</strong>
          <span>최대 {maxSolid}g</span>
        </div>
        <div className="trend-bars">
          {points.map((point) => (
            <div className="trend-bar-card" key={`solid-${point.dateLabel}`}>
              <div className="trend-bar solid" style={{ height: `${(point.solidFoodG / maxSolid) * 100}%` }} />
              <strong>{point.solidFoodG}</strong>
              <span>{point.dateLabel}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="trend-summary-grid">
        {points.map((point) => (
          <article className="trend-summary-card" key={`summary-${point.dateLabel}`}>
            <strong>{point.dateLabel}</strong>
            <span>분유 {point.formulaMl}ml</span>
            <span>이유식 {point.solidFoodG}g</span>
            <span>수면 {point.sleepHours}시간</span>
            <span>메모 {point.noteCount}건</span>
            <div className="mini-meter-row">
              <div className="mini-meter">
                <div
                  className="mini-meter-fill formula"
                  style={{ width: `${Math.min((point.formulaMl / maxFormula) * 100, 100)}%` }}
                />
              </div>
              <div className="mini-meter">
                <div
                  className="mini-meter-fill solid"
                  style={{ width: `${Math.min((point.solidFoodG / maxSolid) * 100, 100)}%` }}
                />
              </div>
              <div className="mini-meter">
                <div
                  className="mini-meter-fill sleep"
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
