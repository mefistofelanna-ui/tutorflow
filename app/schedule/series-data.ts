import type { Lesson } from "./lesson-data";
import {cached,replaceCollection} from "../../lib/firestore-store";
export {buildSeriesLessons,conflictsFor,toMinutes} from "./series-utils";

export type LessonSeries={id:string;studentId:string;weekdays:number[];time:string;duration:Lesson["duration"];startDate:string;endDate:string};
export const seriesStorageKey="tutorflow-lesson-series-v1";
export function readSeries():LessonSeries[]{return cached<LessonSeries>("lessonSeries")}
export function writeSeries(series:LessonSeries[]){void replaceCollection("lessonSeries",series).catch(()=>window.dispatchEvent(new CustomEvent("tutorflow-error",{detail:"Не удалось сохранить серии занятий."})))}
