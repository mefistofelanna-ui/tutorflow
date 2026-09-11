"use client";

import { FormEvent, useRef, useState } from "react";
import type { Student } from "../students/student-data";
import { currentLessonPrice } from "../students/student-price";
import type { Payment } from "./payment-data";
import { calculatePayment, reversePayment } from "./payment-calculation";

const money = (value: number) => `${value.toLocaleString("ru-RU")} ₽`;
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
  const [amount, setAmount] = useState(String(initial?.amount ?? (first ? currentLessonPrice(first) * 8 : 0)));
  const [date, setDate] = useState(initial?.date ?? today());
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const paymentId = useRef(initial?.id);
  const student = students.find(item => item.id === studentId);
  const price = initial?.studentId === studentId ? initial.lessonPrice : student ? currentLessonPrice(student) : 0;
  const credit = student ? initial?.studentId === studentId ? reversePayment(student, initial, true).moneyCredit ?? 0 : student.moneyCredit ?? 0 : 0;
  let preview: ReturnType<typeof calculatePayment> | undefined;
  try {
    preview = initial?.studentId === studentId && initial.amount === Number(amount)
      ? { lessonCount: initial.lessonCount, moneyCreditBefore: initial.moneyCreditBefore ?? 0, moneyCreditAfter: initial.moneyCreditAfter ?? 0 }
      : calculatePayment(Number(amount), price, credit);
  } catch { /* An empty amount or a missing price is not a valid payment yet. */ }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!student || !preview || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    paymentId.current ??= `payment-${crypto.randomUUID()}`;
    try {
      await onSave({ id: paymentId.current, studentId, date, amount: Number(amount), lessonPrice: price, ...preview });
    } finally { submitting.current = false; setSaving(false); }
  };

  return <div className="student-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && !saving && onCancel()}>
    <section className="payment-modal"><header><h2>{initial ? "Редактировать оплату" : "Добавить оплату"}</h2><button disabled={saving} onClick={onCancel}>×</button></header>
      <form onSubmit={submit}>
        <label>Ученик<select disabled={saving} value={studentId} onChange={event => setStudentId(event.target.value)}>{students.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <div className="price-readonly"><span>Стоимость занятия</span><strong>{money(price)}</strong></div>
        <div className="price-readonly"><span>Денежный остаток</span><strong>{money(credit)}</strong></div>
        <label>Сумма оплаты<input required disabled={saving} min="0.01" step="0.01" type="number" value={amount} onChange={event => setAmount(event.target.value)}/></label>
        <label>Дата оплаты<input required disabled={saving} type="date" value={date} onChange={event => setDate(event.target.value)}/></label>
        <div className="payment-total" aria-live="polite"><strong>{student?.name}</strong>{preview ? <><span>Будет зачислено: {preview.lessonCount} занятий</span><b>Остаток: {money(preview.moneyCreditAfter)}</b></> : <span>{price > 0 ? "Введите сумму оплаты больше нуля" : "Укажите стоимость занятия в карточке ученика"}</span>}</div>
        <div className="modal-actions"><button type="button" disabled={saving} onClick={onCancel}>Отмена</button><button className="form-save" disabled={saving || !preview || !student}>{saving ? "Сохраняем…" : "Сохранить оплату"}</button></div>
      </form>
    </section>
  </div>;
}
