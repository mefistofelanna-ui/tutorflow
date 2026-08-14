import { initialStudents } from "../students/student-data";

export type LessonStatus = "scheduled" | "completed" | "cancelled" | "rescheduled";
export type Lesson = {
  id: string;
  studentId: string;
  date: string;
  time: string;
  duration: 30 | 45 | 60 | 90;
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
const demoOffsets:Record<string,number>={"lesson-masha-13":0,"lesson-artem-13":0,"lesson-sonya-13":0,"lesson-denis-13":0,"lesson-masha-11":-2,"lesson-masha-06":-7,"lesson-artem-12":-1,"lesson-sonya-15":2};

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
  if (typeof window === "undefined") return initialLessons;
  const saved=window.localStorage.getItem(lessonStorageKey);
  if(!saved) return initialLessons;
  try {
    const parsed=JSON.parse(saved) as Lesson[];
    let migrated=false;
    const lessons=parsed.map(lesson=>{const offset=demoOffsets[lesson.id];if(offset!==undefined&&lesson.date.startsWith("2025-")){migrated=true;return {...lesson,date:relativeDate(offset)}}return lesson});
    if(migrated) writeLessons(lessons);
    return lessons;
  } catch { return initialLessons; }
}

export function writeLessons(lessons: Lesson[]) {
  window.localStorage.setItem(lessonStorageKey,JSON.stringify(lessons));
  window.dispatchEvent(new Event("tutorflow-data-change"));
}

export function studentName(id:string){return initialStudents.find(student=>student.id===id)?.name??"Ученик"}
