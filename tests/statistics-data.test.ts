import assert from "node:assert/strict";
import test from "node:test";
import { calculateStatistics, localMonth } from "../app/statistics/statistics-data.ts";
import type { StatisticsSource } from "../app/statistics/statistics-data.ts";

const source = (): StatisticsSource => ({
  students: [600, 800, 1000].map((price, index) => ({ id: String(index), name: `Ученик ${index}`, price: 9000, lessonPrice: 9000, balance: 0, grade: "", days: "", comment: "", archived: index === 2 })),
  lessons: [600, 800, 1000].map((earnedAmount, index) => ({ id: String(index), studentId: String(index), date: `2026-09-${index === 0 ? "01" : index === 1 ? "07" : "30"}`, time: "12:00", duration: index === 1 ? 45 : 60, status: "completed", earnedAmount, paid: true, charged: true, note: "" })),
  payments: [{ id: "p", studentId: "0", date: "2026-09-30", amount: 5000, lessonPrice: 600, lessonCount: 99 }], series: [],
});

test("counts actual completed durations and historical 600/800/1000 prices, separately from payments", () => {
  const data = calculateStatistics(source(), 2026, 8);
  assert.equal(data.completed, 3); assert.equal(data.minutes, 165); assert.equal(data.earned, 2400);
  assert.equal(data.received, 5000); assert.equal(data.averageEarned, 800);
  assert.equal(data.students.find(item => item.id === "2")?.archived, true);
  assert.equal(data.students.find(item => item.id === "2")?.earned, 1000);
});

test("cancelled and scheduled lessons do not earn money, cancellations use all planned lessons", () => {
  const input = source();
  input.lessons.push({ ...input.lessons[0], id: "cancel", status: "cancelled" }, { ...input.lessons[0], id: "scheduled", status: "scheduled" }, { ...input.lessons[0], id: "move", status: "rescheduled" });
  const data = calculateStatistics(input, 2026, 8);
  assert.equal(data.completed, 3); assert.equal(data.cancelled, 1); assert.equal(data.earned, 2400);
  assert.equal(data.planned, 6); assert.ok(Math.abs(data.cancellationRate - 100 / 6) < 1e-10);
  assert.equal(data.mostCancelled[0].id, "0");
});

test("calendar weeks are clipped to the selected month and sum to monthly totals", () => {
  const data = calculateStatistics(source(), 2026, 8);
  assert.deepEqual(data.weeks.map(({ start, end }) => [start, end]), [[1, 6], [7, 13], [14, 20], [21, 27], [28, 30]]);
  assert.deepEqual(data.weeks.map(item => item.completed), [1, 1, 0, 0, 1]);
  assert.equal(data.weeks.reduce((sum, item) => sum + item.earned, 0), data.earned);
  assert.equal(calculateStatistics(source(), 2026, 7).weeks.length, 6);
  assert.equal(calculateStatistics(source(), 2028, 1).days, 29);
  assert.equal(data.weeklyLessons, 3 / (30 / 7));
});

test("local dates at month boundaries never shift to another month", () => {
  assert.deepEqual(localMonth(new Date(2026, 8, 1, 0, 1)), { year: 2026, month: 8 });
  assert.deepEqual(localMonth(new Date(2026, 8, 30, 23, 59)), { year: 2026, month: 8 });
  const input = source(); input.lessons.push({ ...input.lessons[0], id: "old", date: "2026-08-31" }, { ...input.lessons[0], id: "future", date: "2026-10-01" });
  input.payments.push({ ...input.payments[0], id: "old-payment", date: "2026-08-31", amount: 600 });
  assert.equal(calculateStatistics(input, 2026, 8).completed, 3);
  assert.equal(calculateStatistics(input, 2026, 7).completed, 1);
  assert.equal(calculateStatistics(input, 2026, 7).received, 600);
});

test("missing historical prices are disclosed instead of using current student prices; zero is valid", () => {
  const input = source(); delete input.lessons[0].earnedAmount; input.lessons[1].earnedAmount = 0;
  const data = calculateStatistics(input, 2026, 8);
  assert.equal(data.earned, 1000); assert.equal(data.missingPrice, 1); assert.equal(data.averageEarned, null);
  input.lessons[0].lessonPrice = 600;
  assert.equal(calculateStatistics(input, 2026, 8).earned, 1600);
});

test("series are not double counted, archived historical activity and removed pupils remain visible", () => {
  const input = source(); input.series.push({ id: "series", studentId: "0", startDate: "2026-09-01", endDate: "2026-09-30" });
  input.lessons.push({ ...input.lessons[0], id: "extra" }, { ...input.lessons[0], id: "removed", studentId: "removed" });
  const data = calculateStatistics(input, 2026, 8);
  assert.equal(data.completed, 5); assert.equal(data.students[0].id, "0");
  assert.equal(data.students.find(item => item.id === "removed")?.name, "Удалённый ученик");
  assert.equal(calculateStatistics(input, 2026, 9).students.length, 0);
});

test("empty months collapse to an empty state, payment-only months still have data", () => {
  const input = source(); input.lessons = [];
  assert.equal(calculateStatistics(input, 2026, 8).empty, false);
  input.payments = []; assert.equal(calculateStatistics(input, 2026, 8).empty, true);
  assert.deepEqual(calculateStatistics(input, 2026, 8).mostCancelled, []);
});

test("recalculation reflects changes from the realtime cache without mutating source records", () => {
  const input = source(); const before = JSON.stringify(input);
  calculateStatistics(input, 2026, 8); assert.equal(JSON.stringify(input), before);
  input.lessons[0] = { ...input.lessons[0], status: "cancelled" };
  input.payments = [...input.payments, { ...input.payments[0], id: "new", amount: 600 }];
  const data = calculateStatistics(input, 2026, 8);
  assert.equal(data.completed, 2); assert.equal(data.cancelled, 1); assert.equal(data.received, 5600);
});
