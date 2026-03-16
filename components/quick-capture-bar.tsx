"use client";

import { FormEvent, startTransition, useState } from "react";
import { useRouter } from "next/navigation";

export function QuickCaptureBar() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!text.trim() && !image) {
      return;
    }

    setStatus("");
    setIsSubmitting(true);

    const formData = new FormData();
    formData.set("text", text);

    if (image) {
      formData.set("image", image);
    }

    const response = await fetch("/api/quick-log", {
      method: "POST",
      body: formData
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setStatus(data?.error ?? "빠른 기록 저장 중 문제가 생겼어요.");
      setIsSubmitting(false);
      return;
    }

    setText("");
    setImage(null);
    setStatus(data?.message ?? "기록했어요.");
    setIsSubmitting(false);
    startTransition(() => router.refresh());
  }

  return (
    <section className="quick-capture-card">
      <div className="quick-capture-head">
        <div>
          <span className="section-kicker">Quick Capture</span>
          <h2>메신저처럼 한 줄로 바로 기록</h2>
        </div>
        <span className="section-chip">웹 빠른 입력</span>
      </div>

      <form className="quick-capture-form" onSubmit={handleSubmit}>
        <input
          className="quick-capture-input"
          onChange={(event) => setText(event.target.value)}
          placeholder="예제: 분유 180미리, 이유식 300g, 낮잠 1시~2시, 배변 1회"
          value={text}
        />
        <label className="quick-capture-upload">
          <input
            accept="image/*"
            className="quick-capture-file"
            onChange={(event) => setImage(event.target.files?.[0] ?? null)}
            type="file"
          />
          {image ? `사진: ${image.name}` : "사진 첨부"}
        </label>
        <button className="button-primary" disabled={isSubmitting || (!text.trim() && !image)} type="submit">
          {isSubmitting ? "저장 중..." : "바로 기록"}
        </button>
      </form>

      {status ? <div className="form-status">{status}</div> : null}
    </section>
  );
}
