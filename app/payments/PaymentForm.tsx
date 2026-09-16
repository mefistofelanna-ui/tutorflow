"use client";

import { FormEvent, useRef, useState } from "react";
import type { Student } from "../students/student-data";
import type { Payment } from "./payment-data";
import { kopecks, money } from "./payment-calculation";

const today = () => new Date().toLocaleDateString("en-CA");

export default function PaymentForm({ students, initialStudentId, initial, onSave, onCancel }: {
  students: Student[];
  initialStudentId?: string;
  initial?: Payment;
  onSave: (payment: Payment) => Promise<void>;
  onCancel: () => void;
}) {
  const first = students.find(item => item.id === (initial?.studentId ?? initialStudentId)) ?? students[0];
  const [studentId, setStudentId] = useState(first?.id ?? "");
  const [amount, setAmount] = useState(String(initial?.amount ?? ""));
  const [date, setDate] = useState(initial?.date ?? today());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const paymentId = useRef(initial?.id);
  const student = students.find(item => item.id === studentId);
  let valid = false;
  try { valid = kopecks(Number(amount)) > 0; } catch { /* Invalid input stays in the form. */ }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!student || !valid || submitting.current) return;
    setError("");
    submitting.current = true;
    setSaving(true);
    paymentId.current ??= `payment-${crypto.randomUUID()}`;
    try {
      await onSave({ id: paymentId.current, studentId, date, amount: Number(amount) });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось сохранить оплату. Попробуйте ещё раз.");
    } finally { submitting.current = false; setSaving(false); }
  };

  return <div className="student-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && !saving && onCancel()}>
    <section className="payment-modal" role="dialog" aria-modal="true" aria-label={initial ? "Редактировать оплату" : "Добавить оплату"}><header><h2>{initial ? "Редактировать оплату" : "Добавить оплату"}</h2><button aria-label="Закрыть" disabled={saving} onClick={onCancel}>×</button></header>
      <form onSubmit={submit}>
        <label>Ученик<select disabled={saving || !!initial} value={studentId} onChange={event => setStudentId(event.target.value)}>{students.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label>Сумма оплаты<input required disabled={saving} min="0.01" step="0.01" type="number" value={amount} onChange={event => setAmount(event.target.value)}/></label>
        <label>Дата оплаты<input required disabled={saving} type="date" value={date} onChange={event => setDate(event.target.value)}/></label>
        <div className="payment-total" aria-live="polite"><strong>{student?.name}</strong><span>{valid ? "Фактическая оплата: " + money(Number(amount)) : "Введите сумму оплаты больше нуля"}</span></div>
        {error && <p role="alert">{error}</p>}
        <div className="modal-actions"><button type="button" disabled={saving} onClick={onCancel}>Отмена</button><button className="form-save" disabled={saving || !valid || !student}>{saving ? "Сохраняем…" : initial ? "Сохранить изменения" : "Сохранить оплату"}</button></div>
      </form>
    </section>
  </div>;
}
