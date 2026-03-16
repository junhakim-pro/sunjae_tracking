"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function UnlockForm({ next }: { next: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setIsSubmitting(true);

    const response = await fetch("/api/unlock", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        password,
        next
      })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setStatus(data?.error ?? "잠금 해제 중 문제가 생겼어요.");
      setIsSubmitting(false);
      return;
    }

    router.replace(data?.next || "/");
    router.refresh();
  }

  return (
    <form className="unlock-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>비밀번호</span>
        <input
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="가족용 비밀번호"
          type="password"
          value={password}
        />
      </label>

      <div className="form-actions">
        <button className="button-primary" disabled={isSubmitting || !password.trim()} type="submit">
          {isSubmitting ? "확인 중..." : "잠금 해제"}
        </button>
        {status ? <span className="form-status">{status}</span> : null}
      </div>
    </form>
  );
}

