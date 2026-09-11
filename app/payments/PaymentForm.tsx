"use client";

import { FormEvent, useRef, useState } from "react";
import type { Student } from "../students/student-data";
import { currentLessonPrice } from "../students/student-price";
import type { Payment } from "./payment-data";
import { calculatePayment, planPayment } from "./payment-calculation";

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
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const paymentId = useRef(initial?.id);
  const student = students.find(item => item.id === studentId);
  const price = initial ? initial.lessonPrice : student ? currentLessonPrice(student) : 0;
  const credit = initial ? initial.moneyCreditBefore ?? 0 : student?.moneyCredit ?? 0;
  let preview: ReturnType<typeof calculatePayment> | undefined;
  let balanceAfter = student?.balance ?? 0;
  let previewError = "";
  try {
    preview = calculatePayment(Number(amount), price, credit);
    if (initial && student) {
      try {
        const result = planPayment({ ...initial, amount: Number(amount), date }, initial, [student]);
        balanceAfter = result.updates[0]?.balance ?? student.balance;
      } catch (error) { previewError = error instanceof Error ? error.message : "Не удалось рассчитать баланс."; }
    }
  } catch { /* An empty amount or a missing price is not a valid payment yet. */ }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!student || !preview || previewError || submitting.current) return;
    setError("");
    submitting.current = true;
    setSaving(true);
    paymentId.current ??= `payment-${crypto.randomUUID()}`;
    try {
      await onSave({ id: paymentId.current, studentId, date, amount: Number(amount), lessonPrice: price, ...preview });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось сохранить оплату. Попробуйте ещё раз.");
    } finally { submitting.current = false; setSaving(false); }
  };

  return <div className="student-modal-backdrop" onMouseDown={event => event.target === event.currentTarget && !saving && onCancel()}>
    <section className="payment-modal" role="dialog" aria-modal="true" aria-label={initial ? "Редактировать оплату" : "Добавить оплату"}><header><h2>{initial ? "Редактировать оплату" : "Добавить оплату"}</h2><button aria-label="Закрыть" disabled={saving} onClick={onCancel}>×</button></header>
      <form onSubmit={submit}>
        <label>Ученик<select disabled={saving || !!initial} value={studentId} onChange={event => setStudentId(event.target.value)}>{students.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <div className="price-readonly"><span>{initial ? "Стоимость занятия на момент оплаты" : "Стоимость занятия"}</span><strong>{money(price)}</strong></div>
        {initial && <>
          <div className="price-readonly"><span>Было зачислено</span><strong>{initial.lessonCount} занятий</strong></div>
          <div className="price-readonly"><span>Остаток после сохранённой оплаты</span><strong>{initial.moneyCreditAfter === undefined ? "Не сохранён" : money(initial.moneyCreditAfter)}</strong></div>
        </>}
        <div className="price-readonly"><span>{initial ? "Денежный остаток до оплаты" : "Денежный остаток"}</span><strong>{money(credit)}</strong></div>
        <label>Сумма оплаты<input required disabled={saving} min="0.01" step="0.01" type="number" value={amount} onChange={event => setAmount(event.target.value)}/></label>
        <label>Дата оплаты<input required disabled={saving} type="date" value={date} onChange={event => setDate(event.target.value)}/></label>
        <div className="payment-total" aria-live="polite"><strong>{student?.name}</strong>{preview ? <><span>Будет зачислено: {preview.lessonCount} занятий</span><b>{initial ? "Денежный остаток" : "Остаток"}: {money(preview.moneyCreditAfter)}</b>{initial && !previewError && <span>Текущий баланс изменится: {student?.balance} → {balanceAfter}</span>}</> : <span>{price > 0 ? "Введите сумму оплаты больше нуля" : initial ? "В этой оплате не сохранена корректная стоимость занятия" : "Укажите стоимость занятия в карточке ученика"}</span>}</div>
        {(previewError || error) && <p role="alert">{previewError || error}</p>}
        <div className="modal-actions"><button type="button" disabled={saving} onClick={onCancel}>Отмена</button><button className="form-save" disabled={saving || !preview || !!previewError || !student}>{saving ? "Сохраняем…" : initial ? "Сохранить изменения" : "Сохранить оплату"}</button></div>
      </form>
    </section>
  </div>;
}
