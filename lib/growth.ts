const DEFAULT_BIRTHDATE = "2025-05-31";

export function resolveBirthDate(input?: Date | string | null) {
  if (!input) {
    return new Date(`${DEFAULT_BIRTHDATE}T00:00:00+09:00`);
  }

  const date = new Date(input);
  const iso = date.toISOString().slice(0, 10);

  // Replace earlier sample seed date with the real one provided by the user.
  if (iso === "2025-05-02") {
    return new Date(`${DEFAULT_BIRTHDATE}T00:00:00+09:00`);
  }

  return date;
}

export function formatMonthAgeLabel(birthDateInput?: Date | string | null, now = new Date()) {
  const birthDate = resolveBirthDate(birthDateInput);
  let months =
    (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth());

  if (now.getDate() < birthDate.getDate()) {
    months -= 1;
  }

  const anchor = new Date(birthDate);
  anchor.setMonth(anchor.getMonth() + months);
  const diffDays = Math.max(0, Math.floor((now.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24)));
  const weeks = Math.floor(diffDays / 7);

  if (weeks > 0) {
    return `${months}개월 ${weeks}주`;
  }

  return `${months}개월`;
}

export function parseGrowthText(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const weightMatch = normalized.match(/(?:몸무게|체중)\s*(\d{1,2}(?:\.\d)?)\s*(?:kg|킬로)/i);
  const heightMatch = normalized.match(/(?:키|신장)\s*(\d{2,3}(?:\.\d)?)\s*(?:cm|센치|센티)/i);
  const dateMatch = normalized.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);

  if (!weightMatch && !heightMatch) {
    return null;
  }

  const measuredAt = dateMatch
    ? new Date(
        `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}T10:00:00+09:00`
      ).toISOString()
    : new Date().toISOString();

  return {
    measuredAt,
    weightKg: weightMatch ? Number(weightMatch[1]) : undefined,
    heightCm: heightMatch ? Number(heightMatch[1]) : undefined
  };
}

