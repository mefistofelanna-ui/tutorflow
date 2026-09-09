import { initialStudents } from "../students/student-data";
import { cached,replaceCollection } from "../../lib/firestore-store";

export type LessonStatus = "scheduled" | "completed" | "cancelled" | "rescheduled";
export type Lesson = {
  id: string;
  studentId: string;
  date: string;
  time: string;
  duration: 30 | 40 | 45 | 60 | 90;
  status: LessonStatus;
  paid: boolean;
  note: string;
  charged: boolean;
  earnedAmount?: number;
  seriesId?: string;
  seriesOverride?: boolean;
};

export const lessonStorageKey = "tutorflow-lessons-v1";

function relativeDate(days:number){const date=new Date();date.setHours(12,0,0,0);date.setDate(date.getDate()+days);const year=date.getFullYear(),month=String(date.getMonth()+1).padStart(2,"0"),day=String(date.getDate()).padStart(2,"0");return `${year}-${month}-${day}`}
export const demoToday=relativeDate(0);
export const initialLessons: Lesson[] = [
  { id:"lesson-masha-13", studentId:"masha-ivanova", date:relativeDate(0), time:"15:00", duration:60, status:"scheduled", paid:true, note:"", charged:false },
  { id:"lesson-artem-13", studentId:"artem-smirnov", date:relativeDate(0), time:"16:00", duration:60, status:"scheduled", paid:true, note:"", charged:false },
  { id:"lesson-sonya-13", studentId:"sonya-volkova", date:relativeDate(0), time:"17:30", duration:60, status:"scheduled", paid:true, note:"", charged:false },
  { id:"lesson-denis-13", studentId:"denis-kotov", date:relativeDate(0), time:"19:00", duration:60, status:"scheduled", paid:false, note:"", charged:false },
  { id:"lesson-masha-11", studentId:"masha-ivanova", date:relativeDate(-2), time:"15:00", duration:60, status:"cancelled", paid:true, note:"", charged:false },
  { id:"lesson-masha-06", studentId:"masha-ivanova", date:relativeDate(-7), time:"15:00", duration:60, status:"completed", paid:true, note:"Спросить про контрольную.", charged:true, earnedAmount:1000 },
  { id:"lesson-artem-12", studentId:"artem-smirnov", date:relativeDate(-1), time:"16:00", duration:45, status:"completed", paid:true, note:"Повторить Present Simple.", charged:true, earnedAmount:1200 },
  { id:"lesson-sonya-15", studentId:"sonya-volkova", date:relativeDate(2), time:"17:30", duration:60, status:"scheduled", paid:true, note:"", charged:false },
];

export function readLessons(): Lesson[] {
  return cached<Lesson>("lessons");
}

export function writeLessons(lessons: Lesson[]) {
  return replaceCollection("lessons",lessons).catch(error=>{window.dispatchEvent(new CustomEvent("tutorflow-error",{detail:"Не удалось сохранить расписание."}));throw error});
}

export function studentName(id:string){return initialStudents.find(student=>student.id===id)?.name??"Ученик"}
