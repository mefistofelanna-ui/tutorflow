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

test("builds different times and durations for different weekdays",()=>{
  const lessons=buildSeriesLessons({id:"weekly",studentId:"student",slots:[{weekday:3,time:"15:00",duration:60},{weekday:5,time:"17:30",duration:45}],startDate:"2026-08-19",endDate:"2026-08-21"});
  assert.deepEqual(lessons.map(({date,time,duration})=>({date,time,duration})),[
    {date:"2026-08-19",time:"15:00",duration:60},
    {date:"2026-08-21",time:"17:30",duration:45},
  ]);
});

test("keeps legacy weekdays and shared time compatible",()=>{
  const lessons=buildSeriesLessons({id:"legacy",studentId:"student",weekdays:[3,5],time:"15:00",duration:60,startDate:"2026-08-19",endDate:"2026-08-21"});
  assert.deepEqual(lessons.map(({date,time})=>({date,time})),[{date:"2026-08-19",time:"15:00"},{date:"2026-08-21",time:"15:00"}]);
});

test("reports a conflict only for the occupied weekday slot",()=>{
  const generated=buildSeriesLessons({id:"weekly",studentId:"student",slots:[{weekday:3,time:"15:00",duration:60},{weekday:5,time:"17:30",duration:45}],startDate:"2026-08-19",endDate:"2026-08-21"});
  const occupied=[lesson({id:"other",studentId:"other",date:"2026-08-21",time:"18:00",duration:60})];
  assert.deepEqual(generated.filter(item=>conflictsFor(item,occupied).length).map(item=>item.date),["2026-08-21"]);
});

test("detects interval overlap but ignores cancelled lessons",()=>{
  assert.equal(conflictsFor(lesson({time:"15:30"}),[lesson()]).length,1);
  assert.equal(conflictsFor(lesson({time:"16:00"}),[lesson()]).length,0);
  assert.equal(conflictsFor(lesson({time:"15:30"}),[lesson({status:"cancelled"})]).length,0);
});
