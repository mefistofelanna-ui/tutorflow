export type Student = {
  id: string;
  name: string;
  grade: string;
  price: number;
  balance: number;
  comment: string;
};

export const initialStudents: Student[] = [
  { id: "masha-ivanova", name: "Маша Иванова", grade: "3 класс", price: 1000, balance: 4, comment: "Любит творческие задания и чтение вслух." },
  { id: "artem-smirnov", name: "Артём Смирнов", grade: "4 класс", price: 1200, balance: 8, comment: "Повторить таблицу умножения перед контрольной." },
  { id: "sonya-volkova", name: "Соня Волкова", grade: "6 класс", price: 1000, balance: 1, comment: "Хорошо работает с визуальными материалами." },
  { id: "denis-kotov", name: "Денис Котов", grade: "5 класс", price: 1100, balance: 0, comment: "Нужно напомнить об оплате следующего занятия." },
];

export const storageKey = "tutorflow-students";

export function readStudents(): Student[] {
  if (typeof window === "undefined") return initialStudents;
  const saved = window.localStorage.getItem(storageKey);
  if (!saved) return initialStudents;
  try { return JSON.parse(saved) as Student[]; } catch { return initialStudents; }
}

export function writeStudents(students: Student[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(students));
}

