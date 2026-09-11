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
  if (previous) {
    if (previous.studentId !== payment.studentId) throw new Error("Нельзя изменить ученика у сохранённой оплаты.");
    // Only an explicit save recalculates a historical record. Its price and incoming
    // credit belong to that payment, not to the student's present-day account.
    const saved = {
      ...previous, date: payment.date, amount: payment.amount,
      ...calculatePayment(payment.amount, previous.lessonPrice, previous.moneyCreditBefore ?? 0),
    };
    const balance = student.balance + saved.lessonCount - previous.lessonCount;
    const credit = kopecks(student.moneyCredit ?? 0) + kopecks(saved.moneyCreditAfter) - kopecks(previous.moneyCreditAfter ?? 0);
    if (credit < 0) throw new Error("Денежный остаток этой оплаты уже использован. Сначала скорректируйте последующие оплаты.");
    const updates = balance === student.balance && credit === kopecks(student.moneyCredit ?? 0)
      ? [] : [{ id: student.id, balance, moneyCredit: credit / 100 }];
    return { payment: saved, updates };
  }
  const lessonPrice = Number(student.lessonPrice ?? student.price ?? 0);
  const saved = { ...payment, lessonPrice, ...calculatePayment(payment.amount, lessonPrice, student.moneyCredit ?? 0) };
  return { payment: saved, updates: [{ id: student.id, balance: student.balance + saved.lessonCount, moneyCredit: saved.moneyCreditAfter }] };
}
