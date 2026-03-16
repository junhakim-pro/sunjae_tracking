"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { TimelineEntry } from "@/lib/types";
import { formatDateTimeLabel } from "@/lib/format";

function toLocalInputValue(input: string) {
  const date = new Date(input);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export function TimelineManager({ items }: { items: TimelineEntry[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  async function deleteItem(item: TimelineEntry) {
    setStatus("");
    const response = await fetch(`/api/logs/${item.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: item.kind })
    });

    if (!response.ok) {
      setStatus("삭제 중 문제가 생겼어요.");
      return;
    }

    setStatus("기록을 삭제했어요.");
    setMenuOpenId(null);
    startTransition(() => router.refresh());
  }

  async function saveItem(event: React.FormEvent<HTMLFormElement>, item: TimelineEntry) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    let payload: Record<string, unknown>;

    if (item.kind === "intake") {
      payload = {
        kind: "intake",
        occurredAt: new Date(String(formData.get("occurredAt"))).toISOString(),
        createdBy: formData.get("createdBy"),
        intakeType: formData.get("intakeType"),
        amountMl: formData.get("amountMl") ? Number(formData.get("amountMl")) : undefined,
        amountG: formData.get("amountG") ? Number(formData.get("amountG")) : undefined,
        foodName: formData.get("foodName") || undefined,
        notes: formData.get("notes") || undefined
      };
    } else if (item.kind === "sleep") {
      payload = {
        kind: "sleep",
        startedAt: new Date(String(formData.get("startedAt"))).toISOString(),
        endedAt: new Date(String(formData.get("endedAt"))).toISOString(),
        createdBy: formData.get("createdBy")
      };
    } else {
      payload = {
        kind: "note",
        occurredAt: new Date(String(formData.get("occurredAt"))).toISOString(),
        createdBy: formData.get("createdBy"),
        noteCategory: formData.get("noteCategory"),
        note: formData.get("note")
      };
    }

    const response = await fetch(`/api/logs/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      setStatus("수정 중 문제가 생겼어요.");
      return;
    }

    setStatus("기록을 수정했어요.");
    setEditingId(null);
    setMenuOpenId(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="timeline-list">
      {items.map((item) => {
        const isEditing = editingId === item.id;

        return (
          <div className="timeline-item" key={item.id}>
            <div className="timeline-head">
              <div className="timeline-head-main">
                <strong>{item.title}</strong>
                <span className="timeline-type">{item.badge}</span>
              </div>

              {!isEditing ? (
                <div className="timeline-actions-menu">
                  <button
                    aria-expanded={menuOpenId === item.id}
                    className="icon-button"
                    onClick={() => setMenuOpenId((current) => (current === item.id ? null : item.id))}
                    type="button"
                  >
                    ⋯
                  </button>

                  {menuOpenId === item.id ? (
                    <div className="timeline-menu-popover">
                      <button
                        className="menu-action"
                        onClick={() => {
                          setEditingId(item.id);
                          setMenuOpenId(null);
                        }}
                        type="button"
                      >
                        수정
                      </button>
                      <button className="menu-action danger" onClick={() => deleteItem(item)} type="button">
                        삭제
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {!isEditing ? (
              <>
                <p>{item.description}</p>
                <div className="timeline-meta">
                  <span>{formatDateTimeLabel(item.happenedAt)}</span>
                  <span>입력자 {item.createdBy}</span>
                  {item.note ? <span>{item.note}</span> : null}
                </div>
              </>
            ) : (
              <form className="inline-form" onSubmit={(event) => saveItem(event, item)}>
                <label className="field">
                  <span>입력자</span>
                  <input defaultValue={item.createdBy} name="createdBy" />
                </label>

                {item.kind === "intake" ? (
                  <>
                    <label className="field">
                      <span>시각</span>
                      <input defaultValue={toLocalInputValue(item.happenedAt)} name="occurredAt" type="datetime-local" />
                    </label>
                    <label className="field">
                      <span>종류</span>
                      <select defaultValue={item.intakeType} name="intakeType">
                        <option value="formula">분유</option>
                        <option value="solid_food">이유식</option>
                        <option value="water">물</option>
                        <option value="snack">간식</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>ml</span>
                      <input defaultValue={item.amountMl ?? ""} name="amountMl" />
                    </label>
                    <label className="field">
                      <span>g</span>
                      <input defaultValue={item.amountG ?? ""} name="amountG" />
                    </label>
                    <label className="field field-full">
                      <span>음식 이름</span>
                      <input defaultValue={item.foodName ?? ""} name="foodName" />
                    </label>
                    <label className="field field-full">
                      <span>메모</span>
                      <textarea defaultValue={item.description} name="notes" rows={3} />
                    </label>
                  </>
                ) : null}

                {item.kind === "sleep" ? (
                  <>
                    <label className="field">
                      <span>잠든 시각</span>
                      <input defaultValue={toLocalInputValue(item.sleepStartAt ?? item.happenedAt)} name="startedAt" type="datetime-local" />
                    </label>
                    <label className="field">
                      <span>깬 시각</span>
                      <input defaultValue={toLocalInputValue(item.sleepEndAt ?? item.happenedAt)} name="endedAt" type="datetime-local" />
                    </label>
                  </>
                ) : null}

                {item.kind === "note" ? (
                  <>
                    <label className="field">
                      <span>시각</span>
                      <input defaultValue={toLocalInputValue(item.happenedAt)} name="occurredAt" type="datetime-local" />
                    </label>
                    <label className="field">
                      <span>종류</span>
                      <select defaultValue={item.noteCategory} name="noteCategory">
                        <option value="general">일반</option>
                        <option value="condition">컨디션</option>
                        <option value="symptom">증상</option>
                      </select>
                    </label>
                    <label className="field field-full">
                      <span>메모</span>
                      <textarea defaultValue={item.description} name="note" rows={4} />
                    </label>
                  </>
                ) : null}

                <div className="row-actions">
                  <button className="button-primary" type="submit">
                    저장
                  </button>
                  <button className="button-secondary" onClick={() => setEditingId(null)} type="button">
                    취소
                  </button>
                </div>
              </form>
            )}
          </div>
        );
      })}
      {status ? <div className="form-status">{status}</div> : null}
    </div>
  );
}
