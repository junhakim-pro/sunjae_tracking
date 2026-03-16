import { UnlockForm } from "@/app/unlock/unlock-form";

export default async function UnlockPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") ? params.next : "/";

  return (
    <main className="unlock-shell">
      <section className="unlock-card">
        <span className="eyebrow">Family Access</span>
        <h1>가족용 비밀번호를 입력해 주세요</h1>
        <p>
          선재 기록은 가족만 볼 수 있게 잠가두었습니다. 한 번만 비밀번호를 입력하면 이 브라우저에서는
          계속 바로 열립니다.
        </p>
        <UnlockForm next={next} />
      </section>
    </main>
  );
}

