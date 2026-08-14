import assert from "node:assert/strict";
import test from "node:test";
import type { Lesson } from "../app/schedule/lesson-data.ts";
import { buildSeriesLessons, conflictsFor } from "../app/schedule/series-utils.ts";

const lesson=(overrides:Partial<Lesson>={}):Lesson=>({id:"one",studentId:"student",date:"2026-08-18",time:"15:00",duration:60,status:"scheduled",paid:true,note:"",charged:false,...overrides});

test("builds one shared series on every selected weekday",()=>{
  const lessons=buildSeriesLessons({id:"weekly",studentId:"student",weekdays:[2,4],time:"15:00",duration:60,startDate:"2026-08-18",endDate:"2026-09-01"});
  assert.deepEqual(lessons.map(item=>item.date),["2026-08-18","2026-08-20","2026-08-25","2026-08-27","2026-09-01"]);
  assert.ok(lessons.every(item=>item.seriesId==="weekly"));
});

test("detects interval overlap but ignores cancelled lessons",()=>{
  assert.equal(conflictsFor(lesson({time:"15:30"}),[lesson()]).length,1);
  assert.equal(conflictsFor(lesson({time:"16:00"}),[lesson()]).length,0);
  assert.equal(conflictsFor(lesson({time:"15:30"}),[lesson({status:"cancelled"})]).length,0);
});
