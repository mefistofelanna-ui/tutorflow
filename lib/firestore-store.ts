import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, where, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

export type CollectionName="students"|"lessons"|"payments"|"lessonSeries";
const names:CollectionName[]=["students","lessons","payments","lessonSeries"];
const cache:Record<CollectionName,Record<string,unknown>[]>={students:[],lessons:[],payments:[],lessonSeries:[]};
const emit=()=>window.dispatchEvent(new Event("tutorflow-data-change"));
export const cached=<T>(name:CollectionName)=>cache[name] as T[];

export async function replaceCollection<T extends {id:string}>(name:CollectionName,items:T[]){
  const batch=writeBatch(db),nextIds=new Set(items.map(item=>item.id)),currentIds=new Set((cache[name] as T[]).map(item=>item.id));
  for(const current of cache[name] as T[])if(!nextIds.has(current.id))batch.delete(doc(db,name,current.id));
  for(const item of items)batch.set(doc(db,name,item.id),{...item,...(!currentIds.has(item.id)?{createdAt:serverTimestamp()}:{}),updatedAt:serverTimestamp()},{merge:true});
  await batch.commit();
}

export async function seedFirestore(seed:Record<CollectionName,{id:string}[]>){
  const marker=doc(db,"appMeta","initialSeed");
  if((await getDoc(marker)).exists())return false;
  const snapshots=await Promise.all(names.map(name=>getDocs(collection(db,name))));
  if(snapshots.some(snapshot=>!snapshot.empty)){await setDoc(marker,{completed:true,updatedAt:serverTimestamp()});return false}
  const batch=writeBatch(db);
  for(const name of names)for(const item of seed[name])batch.set(doc(db,name,item.id),{...item,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  batch.set(marker,{completed:true,updatedAt:serverTimestamp()});
  await batch.commit();return true;
}

export function startFirestoreSync(onReady:()=>void,onError:(message:string)=>void){
  const ready=new Set<CollectionName>();
  return names.map(name=>onSnapshot(collection(db,name),snapshot=>{cache[name]=snapshot.docs.map(item=>({id:item.id,...item.data()}));ready.add(name);emit();if(ready.size===names.length)onReady()},()=>onError("Не удалось загрузить данные. Проверьте подключение к интернету.")));
}

export async function removeDocument(name:CollectionName,id:string){await deleteDoc(doc(db,name,id))}
export async function saveDocument<T extends {id:string}>(name:CollectionName,item:T){await setDoc(doc(db,name,item.id),{...item,updatedAt:serverTimestamp()},{merge:true})}

export async function deleteStudentData(studentId:string){
  const relatedNames:CollectionName[]=["lessons","payments","lessonSeries"];
  const snapshots=await Promise.all(relatedNames.map(name=>getDocs(query(collection(db,name),where("studentId","==",studentId)))));
  const references=[doc(db,"students",studentId),...snapshots.flatMap(snapshot=>snapshot.docs.map(item=>item.ref))];
  for(let offset=0;offset<references.length;offset+=500){
    const batch=writeBatch(db);
    references.slice(offset,offset+500).forEach(reference=>batch.delete(reference));
    await batch.commit();
  }
}

export async function archiveStudentData(studentId:string,today:string){
  const lessons=await getDocs(query(collection(db,"lessons"),where("studentId","==",studentId)));
  const updates=lessons.docs.filter(item=>{const value=item.data();return value.date>=today&&(value.status==="scheduled"||value.status==="rescheduled")});
  const references=[doc(db,"students",studentId),...updates.map(item=>item.ref)];
  for(let offset=0;offset<references.length;offset+=500){
    const batch=writeBatch(db);
    if(offset===0)batch.set(references[0],{archived:true,updatedAt:serverTimestamp()},{merge:true});
    const lessonStart=offset===0?1:offset;
    references.slice(lessonStart,offset+500).forEach(reference=>batch.set(reference,{status:"cancelled",seriesOverride:true,updatedAt:serverTimestamp()},{merge:true}));
    await batch.commit();
  }
}
