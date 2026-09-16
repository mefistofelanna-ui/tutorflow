import type { Payment } from "./payment-data.ts";
import type { Student } from "../students/student-data.ts";
import type { Lesson, LessonStatus } from "../schedule/lesson-data.ts";

export function kopecks(value: number): number {
  const result = Math.round(value * 100);
  if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(result)) throw new Error("Некорректная сумма");
  return result;
}

// Never infer historical charges from today's student price or payment packages.
export function savedLessonPrice(lesson: Pick<Lesson, "earnedAmount" | "lessonPrice">): number | null {
  const value = lesson.earnedAmount ?? lesson.lessonPrice;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? kopecks(value) / 100 : null;
}

export function lessonStatusFields(lesson: Lesson, status: LessonStatus, currentPrice: number) {
  const saved = savedLessonPrice(lesson);
  if (saved === null && (lesson.status === "completed" || lesson.historicalPriceMissing)) {
    return { status, charged: status === "completed", historicalPriceMissing: true };
  }
  if (status === "completed") {
    return { status, charged: true, earnedAmount: saved ?? kopecks(currentPrice) / 100 };
  }
  return { status, charged: false };
}

export function calculateFinance(studentId: string, lessons: Lesson[], payments: Payment[], month?: string) {
  const selected = lessons.filter(item => item.studentId === studentId && (!month || item.date.startsWith(month + "-")));
  const completed = selected.filter(item => item.status === "completed");
  const missingPrice = completed.filter(item => savedLessonPrice(item) === null).length;
  const charged = completed.reduce((sum, item) => sum + kopecks(savedLessonPrice(item) ?? 0), 0);
  const paid = payments.filter(item => item.studentId === studentId && (!month || item.date.startsWith(month + "-"))).reduce((sum, item) => sum + kopecks(item.amount), 0);
  return { completed: completed.length, cancelled: selected.filter(item => item.status === "cancelled").length, charged: charged / 100, paid: paid / 100, balance: (paid - charged) / 100, missingPrice };
}

export const money = (value: number) => value.toLocaleString("ru-RU") + " ₽";
export function financeLabel(finance: { balance: number; missingPrice?: number }, colon = true) {
  if (finance.missingPrice) return "Уточните стоимость занятий";
  return finance.balance === 0 ? "Оплачено" : (finance.balance > 0 ? "Аванс" : "Долг") + (colon ? ": " : " ") + money(Math.abs(finance.balance));
}
export const financeTone = (balance: number) => balance < 0 ? "balance-low" : balance > 0 ? "balance-good" : "balance-warn";

export function planPayment(payment: Payment, previous: Payment | null, students: Student[]) {
  if (!students.some(item => item.id === payment.studentId)) throw new Error("Ученик не найден");
  if (previous && previous.studentId !== payment.studentId) throw new Error("Нельзя изменить ученика у сохранённой оплаты.");
  if (kopecks(payment.amount) <= 0) throw new Error("Введите сумму оплаты больше нуля");
  // Preserve legacy metadata; only explicit edits change the actual amount/date.
  return { payment: previous ? { ...previous, date: payment.date, amount: payment.amount } : { id: payment.id, studentId: payment.studentId, date: payment.date, amount: payment.amount } };
}
