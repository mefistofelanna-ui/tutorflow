import type { Lesson } from "./lesson-data";

export type LessonSeries={id:string;studentId:string;weekdays:number[];time:string;duration:Lesson["duration"];startDate:string;endDate:string};
const key="tutorflow-lesson-series-v1";
export function readSeries():LessonSeries[]{if(typeof window==="undefined")return[];try{return JSON.parse(window.localStorage.getItem(key)??"[]") as LessonSeries[]}catch{return[]}}
export function writeSeries(series:LessonSeries[]){window.localStorage.setItem(key,JSON.stringify(series));window.dispatchEvent(new Event("tutorflow-data-change"))}
export const toMinutes=(time:string)=>{const [hours,minutes]=time.split(":").map(Number);return hours*60+minutes};
export function conflictsFor(candidate:Pick<Lesson,"date"|"time"|"duration">,lessons:Lesson[],ignoreIds:string[]=[]){const start=toMinutes(candidate.time),end=start+candidate.duration;return lessons.filter(lesson=>lesson.date===candidate.date&&lesson.status!=="cancelled"&&!ignoreIds.includes(lesson.id)).filter(lesson=>{const other=toMinutes(lesson.time);return start<other+lesson.duration&&other<end})}
const localIso=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
export function buildSeriesLessons(series:LessonSeries):Lesson[]{const result:Lesson[]=[],start=new Date(`${series.startDate}T12:00:00`),end=new Date(`${series.endDate}T12:00:00`);for(const date=new Date(start);date<=end;date.setDate(date.getDate()+1)){if(series.weekdays.includes(date.getDay())){const value=localIso(date);result.push({id:`lesson-${series.id}-${value}`,studentId:series.studentId,date:value,time:series.time,duration:series.duration,status:"scheduled",paid:true,note:"",charged:false,seriesId:series.id})}}return result}
