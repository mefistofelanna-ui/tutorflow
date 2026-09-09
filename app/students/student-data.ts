export type Student = {
  id: string;
  name: string;
  grade: string;
  price: number;
  balance: number;
  days: string;
  comment: string;
  archived?: boolean;
};

export const initialStudents: Student[] = [
  { id: "masha-ivanova", name: "Маша Иванова", grade: "3 класс", price: 1000, balance: 4, days: "Вт, Чт", comment: "Любит игровые задания и чтение вслух." },
  { id: "artem-smirnov", name: "Артём Смирнов", grade: "4 класс", price: 1200, balance: 8, days: "Пн, Ср", comment: "Повторить Present Simple." },
  { id: "sonya-volkova", name: "Соня Волкова", grade: "6 класс", price: 1000, balance: 1, days: "Ср, Сб", comment: "Хорошо работает с визуальными материалами." },
  { id: "denis-kotov", name: "Денис Котов", grade: "5 класс", price: 1100, balance: 0, days: "Пт", comment: "Нужно напомнить об оплате следующего занятия." },
];

export const storageKey = "tutorflow-students-v2";

export function readStudents(): Student[] {
  return cached<Student>("students");
}

export function writeStudents(students: Student[]) {
  return replaceCollection("students",students).catch(error=>{window.dispatchEvent(new CustomEvent("tutorflow-error",{detail:"Не удалось сохранить учеников."}));throw error});
}
import { cached,replaceCollection } from "../../lib/firestore-store";
