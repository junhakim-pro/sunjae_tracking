"use client";

import { FormEvent, startTransition, useState } from "react";
import { useRouter } from "next/navigation";

type FormType = "intake" | "sleep" | "note";
type IntakeType = "formula" | "solid_food" | "water" | "snack";
type NoteCategory = "condition" | "symptom" | "general";

const nowLocalValue = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
  .toISOString()
  .slice(0, 16);

export function LogEntryForm() {
  const router = useRouter();
  const [formType, setFormType] = useState<FormType>("intake");
  const [createdBy, setCreatedBy] = useState("엄마");
  const [occurredAt, setOccurredAt] = useState(nowLocalValue);
  const [intakeType, setIntakeType] = useState<IntakeType>("formula");
  const [amountMl, setAmountMl] = useState("180");
  const [amountG, setAmountG] = useState("120");
  const [foodName, setFoodName] = useState("소고기브로콜리 이유식");
  const [notes, setNotes] = useState("");
  const [sleepStartedAt, setSleepStartedAt] = useState(nowLocalValue);
  const [sleepEndedAt, setSleepEndedAt] = useState(nowLocalValue);
  const [noteCategory, setNoteCategory] = useState<NoteCategory>("general");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("");

    const payload =
      formType === "intake"
        ? {
            type: "intake",
            occurredAt: new Date(occurredAt).toISOString(),
            intakeType,
            amountMl: intakeType === "formula" || intakeType === "water" ? Number(amountMl) : undefined,
            amountG: intakeType === "solid_food" || intakeType === "snack" ? Number(amountG) : undefined,
            foodName: foodName || undefined,
            notes: notes || undefined,
            createdBy
          }
        : formType === "sleep"
          ? {
              type: "sleep",
              startedAt: new Date(sleepStartedAt).toISOString(),
              endedAt: new Date(sleepEndedAt).toISOString(),
              createdBy
            }
          : {
              type: "note",
              occurredAt: new Date(occurredAt).toISOString(),
              noteCategory,
              note,
              createdBy
            };

    const response = await fetch("/api/logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setStatus(data?.error ?? "저장 중 문제가 생겼어요.");
      setIsSaving(false);
      return;
    }

    setStatus("저장했어요. 타임라인을 새 데이터로 갱신합니다.");
    setIsSaving(false);

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <div className="form-switches">
        {[
          { label: "섭취", value: "intake" },
          { label: "수면", value: "sleep" },
          { label: "메모", value: "note" }
        ].map((item) => (
          <button
            className={`switch-chip ${formType === item.value ? "active" : ""}`}
            key={item.value}
            onClick={() => setFormType(item.value as FormType)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="form-grid">
        <label className="field">
          <span>입력자</span>
          <input value={createdBy} onChange={(event) => setCreatedBy(event.target.value)} />
        </label>

        {formType !== "sleep" ? (
          <label className="field">
            <span>기록 시각</span>
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
            />
          </label>
        ) : null}

        {formType === "intake" ? (
          <>
            <label className="field">
              <span>섭취 종류</span>
              <select
                value={intakeType}
                onChange={(event) => setIntakeType(event.target.value as IntakeType)}
              >
                <option value="formula">분유</option>
                <option value="solid_food">이유식</option>
                <option value="water">물</option>
                <option value="snack">간식</option>
              </select>
            </label>

            {(intakeType === "formula" || intakeType === "water") && (
              <label className="field">
                <span>섭취량(ml)</span>
                <input value={amountMl} onChange={(event) => setAmountMl(event.target.value)} />
              </label>
            )}

            {(intakeType === "solid_food" || intakeType === "snack") && (
              <label className="field">
                <span>섭취량(g)</span>
                <input value={amountG} onChange={(event) => setAmountG(event.target.value)} />
              </label>
            )}

            <label className="field">
              <span>음식 이름</span>
              <input value={foodName} onChange={(event) => setFoodName(event.target.value)} />
            </label>

            <label className="field field-full">
              <span>메모</span>
              <textarea
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="남긴 양, 컨디션, 특이사항"
              />
            </label>
          </>
        ) : null}

        {formType === "sleep" ? (
          <>
            <label className="field">
              <span>잠든 시각</span>
              <input
                type="datetime-local"
                value={sleepStartedAt}
                onChange={(event) => setSleepStartedAt(event.target.value)}
              />
            </label>

            <label className="field">
              <span>깬 시각</span>
              <input
                type="datetime-local"
                value={sleepEndedAt}
                onChange={(event) => setSleepEndedAt(event.target.value)}
              />
            </label>
          </>
        ) : null}

        {formType === "note" ? (
          <>
            <label className="field">
              <span>메모 종류</span>
              <select
                value={noteCategory}
                onChange={(event) => setNoteCategory(event.target.value as NoteCategory)}
              >
                <option value="general">일반</option>
                <option value="condition">컨디션</option>
                <option value="symptom">증상</option>
              </select>
            </label>

            <label className="field field-full">
              <span>메모 내용</span>
              <textarea
                rows={4}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="감기, 콧물, 평소보다 적게 먹음 같은 기록"
              />
            </label>
          </>
        ) : null}
      </div>

      <div className="form-actions">
        <button className="button-primary" disabled={isSaving} type="submit">
          {isSaving ? "저장 중..." : "기록 저장"}
        </button>
        {status ? <span className="form-status">{status}</span> : null}
      </div>
    </form>
  );
}
