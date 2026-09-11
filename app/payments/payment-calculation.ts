import type { Payment } from "./payment-data.ts";
import type { Student } from "../students/student-data.ts";

// Calculate in kopecks so decimal amounts do not lose money to float rounding.
function kopecks(value: number): number {
  const result = Math.round(value * 100);
  if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(result)) throw new Error("Invalid money amount");
  return result;
}

export function calculatePayment(amount: number, lessonPrice: number, moneyCredit = 0) {
  const paid = kopecks(amount), price = kopecks(lessonPrice), credit = kopecks(moneyCredit);
  if (paid <= 0 || price <= 0 || !Number.isSafeInteger(paid + credit)) throw new Error("Payment and lesson price must be positive");
  return {
    lessonCount: Math.floor((paid + credit) / price),
    moneyCreditBefore: credit / 100,
    moneyCreditAfter: ((paid + credit) % price) / 100,
  };
}

export type PaymentBalance = { balance: number; moneyCredit?: number };

export function reversePayment(student: PaymentBalance, payment: Payment, editing = false): PaymentBalance {
  let balance = student.balance - payment.lessonCount;
  if (payment.moneyCreditAfter === undefined || payment.moneyCreditBefore === undefined) {
    return { balance: editing ? balance : Math.max(0, balance), moneyCredit: student.moneyCredit ?? 0 };
  }
  let credit = kopecks(student.moneyCredit ?? 0) - kopecks(payment.moneyCreditAfter) + kopecks(payment.moneyCreditBefore);
  // A later payment may already have converted this payment's remainder to a lesson.
  if (credit < 0) {
    const price = kopecks(payment.lessonPrice);
    if (price <= 0) throw new Error("Invalid lesson price");
    const borrowedLessons = Math.ceil(-credit / price);
    balance -= borrowedLessons;
    credit += borrowedLessons * price;
  }
  return { balance: editing ? balance : Math.max(0, balance), moneyCredit: credit / 100 };
}

export function planPayment(payment: Payment, previous: Payment | null, students: Student[]) {
  const student = students.find(item => item.id === payment.studentId);
  if (!student) throw new Error("Student not found");
  // Opening/saving an existing record or changing only its date never recalculates it.
  if (previous && previous.studentId === payment.studentId && previous.amount === payment.amount &&
      (previous.moneyCreditAfter !== undefined || previous.lessonCount === payment.lessonCount && previous.lessonPrice === payment.lessonPrice)) {
    return { payment: { ...previous, date: payment.date }, updates: [] };
  }
  const updates = new Map<string, PaymentBalance>();
  if (previous) {
    const oldStudent = students.find(item => item.id === previous.studentId);
    if (!oldStudent) throw new Error("Student not found");
    updates.set(oldStudent.id, reversePayment(oldStudent, previous, oldStudent.id === student.id));
  }
  const base = updates.get(student.id) ?? student;
  // Historical payments retain their original editing rules; no automatic migration.
  const legacy = previous && previous.moneyCreditAfter === undefined;
  const lessonPrice = previous?.studentId === student.id ? previous.lessonPrice : Number(student.lessonPrice ?? student.price ?? 0);
  const saved = legacy ? payment : { ...payment, lessonPrice, ...calculatePayment(payment.amount, lessonPrice, base.moneyCredit ?? 0) };
  updates.set(student.id, {
    balance: Math.max(0, base.balance + saved.lessonCount),
    moneyCredit: saved.moneyCreditAfter ?? base.moneyCredit ?? 0,
  });
  return { payment: saved, updates: [...updates].map(([id, values]) => ({ id, ...values })) };
}
