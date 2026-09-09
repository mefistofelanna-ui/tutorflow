export type StudentPrice = {price?:number;lessonPrice?:number};

export function currentLessonPrice(student:StudentPrice):number{
  return Number(student.lessonPrice??student.price??0);
}
