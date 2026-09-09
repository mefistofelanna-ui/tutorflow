import type { Lesson } from "./lesson-data";
import {cached,replaceCollection} from "../../lib/firestore-store";
export {buildSeriesLessons,conflictsFor,formatSeriesSchedule,seriesSlots,toMinutes} from "./series-utils";
import type {ScheduleSlot} from "./series-utils";

export type LessonSeries={id:string;studentId:string;slots?:ScheduleSlot[];weekdays?:number[];time?:string;duration?:Lesson["duration"];startDate:string;endDate:string};
export const seriesStorageKey="tutorflow-lesson-series-v1";
export function readSeries():LessonSeries[]{return cached<LessonSeries>("lessonSeries")}
export function writeSeries(series:LessonSeries[]){return replaceCollection("lessonSeries",series).catch(error=>{window.dispatchEvent(new CustomEvent("tutorflow-error",{detail:"Не удалось сохранить серии занятий."}));throw error})}
