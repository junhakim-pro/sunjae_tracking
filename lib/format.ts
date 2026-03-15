export function formatPercent(current: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((current / total) * 100);
}

export function formatDateTimeLabel(input: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(input));
}

export function formatTimeLabel(input: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(input));
}
