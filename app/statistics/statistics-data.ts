import type { Student } from "../students/student-data";
import type { Lesson } from "../schedule/lesson-data";
import type { Payment } from "../payments/payment-data";
import type { LessonSeries } from "../schedule/series-data";

export type StatisticsSource = { students: Student[]; lessons: (Lesson & { lessonPrice?: number })[]; payments: Payment[]; series: LessonSeries[] };
export const localMonth = (date = new Date()) => ({ year: date.getFullYear(), month: date.getMonth() });
export const monthKey = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, "0")}`;
export const formatMinutes = (minutes: number) => {
  const value = Math.round(minutes);
  return `${Math.floor(value / 60)} ч${value % 60 ? ` ${value % 60} мин` : ""}`;
};
const totals = () => ({ completed: 0, cancelled: 0, minutes: 0, earned: 0, missingPrice: 0 });

export function calculateStatistics(source: StatisticsSource, year: number, month: number) {
  const key = monthKey(year, month), days = new Date(year, month + 1, 0, 12).getDate();
  const inMonth = (date: string) => typeof date === "string" && new RegExp(`^${key}-\\d{2}$`).test(date) && Number(date.slice(8)) >= 1 && Number(date.slice(8)) <= days;
  const lessons = source.lessons.filter(item => inMonth(item.date));
  const payments = source.payments.filter(item => inMonth(item.date));
  const weeks: ({ start: number; end: number } & ReturnType<typeof totals>)[] = [];
  for (let start = 1; start <= days;) {
    const weekday = (new Date(year, month, start, 12).getDay() + 6) % 7;
    const end = Math.min(days, start + 6 - weekday);
    weeks.push({ start, end, ...totals() });
    start = end + 1;
  }
  const byStudent = new Map<string, ReturnType<typeof totals>>();
  const ensureStudent = (id: string) => {
    if (!byStudent.has(id)) byStudent.set(id, totals());
    return byStudent.get(id)!;
  };
  const total = totals();
  for (const lesson of lessons) {
    const row = ensureStudent(lesson.studentId);
    const week = weeks.find(item => Number(lesson.date.slice(8)) >= item.start && Number(lesson.date.slice(8)) <= item.end)!;
    if (lesson.status === "cancelled") { total.cancelled++; row.cancelled++; week.cancelled++; }
    if (lesson.status !== "completed") continue;
    const savedPrice = lesson.earnedAmount ?? lesson.lessonPrice;
    const hasPrice = typeof savedPrice === "number" && Number.isFinite(savedPrice) && savedPrice >= 0;
    const minutes = Number.isFinite(lesson.duration) && lesson.duration > 0 ? lesson.duration : 0;
    for (const target of [total, row, week]) {
      target.completed++;
      target.minutes += minutes;
      target.earned += hasPrice ? Math.round(savedPrice * 100) : 0;
      if (!hasPrice) target.missingPrice++;
    }
  }
  payments.forEach(item => ensureStudent(item.studentId));
  // Series determine participation only; their materialized lessons are counted once.
  for (const series of source.series) {
    if (series.startDate <= `${key}-${String(days).padStart(2, "0")}` && series.endDate >= `${key}-01` && source.students.some(item => item.id === series.studentId && !item.archived)) ensureStudent(series.studentId);
  }
  const students = [...byStudent].map(([id, values]) => {
    const student = source.students.find(item => item.id === id);
    return { id, name: student?.name ?? "Удалённый ученик", archived: student?.archived ?? false, ...values, earned: values.earned / 100 };
  }).sort((a, b) => b.completed - a.completed || a.name.localeCompare(b.name, "ru"));
  const mostCancelled = students.filter(item => item.cancelled > 0).sort((a, b) => b.cancelled - a.cancelled || a.name.localeCompare(b.name, "ru"));
  const received = payments.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? Math.round(item.amount * 100) : 0), 0) / 100;
  return {
    ...total, earned: total.earned / 100, received, students,
    weeks: weeks.map(item => ({ ...item, earned: item.earned / 100 })),
    empty: !lessons.length && !payments.length, planned: lessons.length,
    cancellationRate: lessons.length ? total.cancelled / lessons.length * 100 : 0,
    mostCancelled: mostCancelled.filter(item => item.cancelled === mostCancelled[0]?.cancelled),
    weeklyLessons: total.completed / (days / 7), weeklyMinutes: total.minutes / (days / 7),
    averageEarned: total.completed && !total.missingPrice ? total.earned / 100 / total.completed : null,
    days,
  };
}
