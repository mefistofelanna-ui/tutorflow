import assert from "node:assert/strict";
import test from "node:test";
import { calculatePayment, planPayment, reversePayment } from "../app/payments/payment-calculation.ts";
import type { Payment } from "../app/payments/payment-data.ts";
import type { Student } from "../app/students/student-data.ts";

const student = (overrides: Partial<Student> = {}): Student => ({ id: "student", name: "Test", grade: "", days: "", comment: "", price: 800, balance: 0, ...overrides });
const payment = (overrides: Partial<Payment> = {}): Payment => ({ id: "payment", studentId: "student", date: "2026-09-11", amount: 5000, lessonPrice: 800, lessonCount: 8, ...overrides });

for (const [amount, price, count, remainder] of [[4800, 800, 6, 0], [5000, 800, 6, 200], [8000, 1000, 8, 0]]) {
  test(`${amount} rubles at ${price}: ${count} lessons and ${remainder} credit`, () => {
    const result = planPayment(payment({ amount }), null, [student({ price })]);
    assert.equal(result.payment.amount, amount);
    assert.equal(result.payment.lessonCount, count);
    assert.equal(result.payment.moneyCreditAfter, remainder);
    assert.deepEqual(result.updates, [{ id: "student", balance: count, moneyCredit: remainder }]);
  });
}

test("5000 followed by 600 uses the stored 200 credit exactly once", () => {
  const first = planPayment(payment(), null, [student({ balance: 3 })]);
  const updated = student(first.updates[0]);
  const next = payment({ id: "next", amount: 600 });
  const second = planPayment(next, null, [updated]);
  assert.equal(first.payment.lessonCount, 6);
  assert.equal(second.payment.lessonCount, 1);
  assert.equal(second.payment.amount, 600);
  assert.equal(second.payment.moneyCreditBefore, 200);
  assert.equal(second.payment.moneyCreditAfter, 0);
  assert.deepEqual(second.updates, [{ id: "student", balance: 10, moneyCredit: 0 }]);
  assert.deepEqual(planPayment(next, second.payment, [student(second.updates[0])]).updates, []);
  assert.equal(first.payment.moneyCreditAfter, 200);
});

test("uses current student price and credit instead of client-supplied counts", () => {
  const result = planPayment(payment({ amount: 600, lessonCount: 99, lessonPrice: 1, moneyCreditAfter: 999 }), null, [student({ price: 1000, lessonPrice: 800, moneyCredit: 200 })]);
  assert.equal(result.payment.lessonPrice, 800);
  assert.equal(result.payment.lessonCount, 1);
  assert.equal(result.payment.moneyCreditAfter, 0);
});

test("small payments accumulate without requiring a full lesson", () => {
  assert.deepEqual(calculatePayment(200, 800), { lessonCount: 0, moneyCreditBefore: 0, moneyCreditAfter: 200 });
  assert.deepEqual(calculatePayment(0.2, 0.3, 0.1), { lessonCount: 1, moneyCreditBefore: 0.1, moneyCreditAfter: 0 });
});

test("invalid amounts and missing prices cannot be saved", () => {
  for (const amount of [0, -1, NaN, Infinity]) assert.throws(() => calculatePayment(amount, 800));
  for (const price of [0, -1, NaN, Infinity]) assert.throws(() => calculatePayment(5000, price));
  assert.throws(() => planPayment(payment(), null, []));
});

test("explicitly correcting Seva's legacy payment changes 7 lessons to 5 at the historical price", () => {
  const old = payment();
  const result = planPayment({ ...old, lessonPrice: 1200 }, old, [student({ price: 1200, lessonPrice: 1200, balance: 7 })]);
  assert.equal(result.payment.amount, 5000);
  assert.equal(result.payment.lessonPrice, 800);
  assert.equal(result.payment.lessonCount, 6);
  assert.equal(result.payment.moneyCreditAfter, 200);
  assert.deepEqual(result.updates, [{ id: "student", balance: 5, moneyCredit: 200 }]);
  // Merely calculating a preview must not mutate the original record.
  assert.equal(old.lessonCount, 8);
  assert.equal(old.moneyCreditAfter, undefined);
  assert.deepEqual(planPayment(result.payment, result.payment, [student(result.updates[0])]).updates, []);
  assert.deepEqual(reversePayment({ balance: 8, moneyCredit: 200 }, old), { balance: 0, moneyCredit: 200 });
});

test("manual counts are ignored when correcting a historical payment", () => {
  const old = payment();
  const result = planPayment({ ...old, lessonCount: 9 }, old, [student({ balance: 2, moneyCredit: 200 })]);
  assert.deepEqual(result.updates, [{ id: "student", balance: 0, moneyCredit: 400 }]);
});

test("editing uses the incoming credit snapshot, not credit from later payments", () => {
  const old = payment({ amount: 600, lessonCount: 1, moneyCreditBefore: 200, moneyCreditAfter: 0 });
  const result = planPayment({ ...old, amount: 1600, moneyCreditBefore: 999 }, old, [student({ balance: 7, moneyCredit: 500, price: 1000 })]);
  assert.equal(result.payment.lessonPrice, 800);
  assert.equal(result.payment.moneyCreditBefore, 200);
  assert.equal(result.payment.lessonCount, 2);
  assert.equal(result.payment.moneyCreditAfter, 200);
  assert.deepEqual(result.updates, [{ id: "student", balance: 8, moneyCredit: 700 }]);
});

test("changing only the date on a correct payment leaves current balances alone", () => {
  const old = payment({ lessonCount: 6, moneyCreditBefore: 0, moneyCreditAfter: 200 });
  const result = planPayment({ ...old, date: "2026-09-12" }, old, [student({ balance: 3, moneyCredit: 500 })]);
  assert.equal(result.payment.date, "2026-09-12");
  assert.deepEqual(result.updates, []);
});

test("applies the exact count difference even after most lessons were used", () => {
  const old = payment();
  const result = planPayment(old, old, [student({ balance: 1 })]);
  assert.equal(result.updates[0].balance, -1);
});

test("does not silently discard a remainder reduction that was already spent", () => {
  const old = payment({ lessonCount: 6, moneyCreditBefore: 0, moneyCreditAfter: 200 });
  assert.throws(() => planPayment({ ...old, amount: 4800 }, old, [student({ balance: 7, moneyCredit: 0 })]), /последующие оплаты/);
});

test("editing a new payment adjusts only its contribution after lessons were used", () => {
  const old = planPayment(payment(), null, [student()]).payment;
  const result = planPayment({ ...old, amount: 5600 }, old, [student({ balance: 2, moneyCredit: 200 })]);
  assert.equal(result.payment.lessonCount, 7);
  assert.deepEqual(result.updates, [{ id: "student", balance: 3, moneyCredit: 0 }]);
});

test("deletion restores credit including when a later payment used it", () => {
  const first = planPayment(payment(), null, [student()]);
  const second = planPayment(payment({ id: "second", amount: 600 }), null, [student(first.updates[0])]);
  assert.deepEqual(reversePayment(first.updates[0], first.payment), { balance: 0, moneyCredit: 0 });
  assert.deepEqual(reversePayment(second.updates[0], second.payment), { balance: 6, moneyCredit: 200 });
  assert.deepEqual(reversePayment(second.updates[0], first.payment), { balance: 0, moneyCredit: 600 });
});
