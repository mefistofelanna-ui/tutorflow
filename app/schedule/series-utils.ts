import type {Lesson} from "./lesson-data.ts";

export type ScheduleSlot={weekday:number;time:string;duration:Lesson["duration"]};
export type SeriesShape={id:string;studentId:string;slots?:ScheduleSlot[];weekdays?:number[];time?:string;duration?:Lesson["duration"];startDate:string;endDate:string};
export function seriesSlots(series:SeriesShape):ScheduleSlot[]{
  if(series.slots?.length)return series.slots;
  return (series.weekdays??[]).map(weekday=>({weekday,time:series.time??"15:00",duration:series.duration??60}));
}
export function formatSeriesSchedule(series:SeriesShape,labels=["Вс","Пн","Вт","Ср","Чт","Пт","Сб"]){return seriesSlots(series).map(slot=>`${labels[slot.weekday]} · ${slot.time}`).join(", ")}
export const toMinutes=(time:string)=>{const [hours,minutes]=time.split(":").map(Number);return hours*60+minutes};
export function conflictsFor(candidate:Pick<Lesson,"date"|"time"|"duration">,lessons:Lesson[],ignoreIds:string[]=[]){const start=toMinutes(candidate.time),end=start+candidate.duration;return lessons.filter(lesson=>lesson.date===candidate.date&&lesson.status!=="cancelled"&&!ignoreIds.includes(lesson.id)).filter(lesson=>{const other=toMinutes(lesson.time);return start<other+lesson.duration&&other<end})}
const localIso=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
export function buildSeriesLessons(series:SeriesShape):Lesson[]{const result:Lesson[]=[],slots=seriesSlots(series),start=new Date(`${series.startDate}T12:00:00`),end=new Date(`${series.endDate}T12:00:00`);for(const date=new Date(start);date<=end;date.setDate(date.getDate()+1)){const slot=slots.find(item=>item.weekday===date.getDay());if(slot){const value=localIso(date);result.push({id:`lesson-${series.id}-${value}`,studentId:series.studentId,date:value,time:slot.time,duration:slot.duration,status:"scheduled",paid:true,note:"",charged:false,seriesId:series.id})}}return result}
