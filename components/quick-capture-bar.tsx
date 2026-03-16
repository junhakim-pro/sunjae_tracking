"use client";

import { FormEvent, startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

async function resizeImageIfNeeded(file: File) {
  if (file.size <= 1_200_000) {
    return file;
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });

  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    return file;
  }

  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.82);
  });

  if (!blob) {
    return file;
  }

  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
    type: "image/jpeg"
  });
}

export function QuickCaptureBar() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!image) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(image);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [image]);

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
      const optimizedImage = await resizeImageIfNeeded(image);
      formData.set("image", optimizedImage);
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

      {previewUrl ? (
        <div className="quick-capture-preview">
          <img alt="업로드할 기록 사진 미리보기" className="quick-capture-preview-image" src={previewUrl} />
        </div>
      ) : null}

      {status ? <div className="form-status">{status}</div> : null}
    </section>
  );
}
