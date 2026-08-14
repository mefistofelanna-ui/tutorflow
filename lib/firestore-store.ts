import { collection, deleteDoc, doc, getDocs, onSnapshot, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
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
  const snapshots=await Promise.all(names.map(name=>getDocs(collection(db,name))));
  if(snapshots.some(snapshot=>!snapshot.empty))return false;
  const batch=writeBatch(db);
  for(const name of names)for(const item of seed[name])batch.set(doc(db,name,item.id),{...item,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  await batch.commit();return true;
}

export function startFirestoreSync(onReady:()=>void,onError:(message:string)=>void){
  const ready=new Set<CollectionName>();
  return names.map(name=>onSnapshot(collection(db,name),snapshot=>{cache[name]=snapshot.docs.map(item=>({id:item.id,...item.data()}));ready.add(name);emit();if(ready.size===names.length)onReady()},()=>onError("Не удалось загрузить данные. Проверьте подключение к интернету.")));
}

export async function removeDocument(name:CollectionName,id:string){await deleteDoc(doc(db,name,id))}
export async function saveDocument<T extends {id:string}>(name:CollectionName,item:T){await setDoc(doc(db,name,item.id),{...item,updatedAt:serverTimestamp()},{merge:true})}
