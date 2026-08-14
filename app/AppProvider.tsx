"use client";
import { createContext,useContext,useEffect,useState } from "react";
import { onAuthStateChanged,signOut,User } from "firebase/auth";
import { usePathname,useRouter } from "next/navigation";
import { auth,firebaseConfigured } from "../lib/firebase";
import { seedFirestore,startFirestoreSync } from "../lib/firestore-store";
import { initialStudents,storageKey } from "./students/student-data";
import { initialLessons,lessonStorageKey } from "./schedule/lesson-data";
import { paymentStorageKey } from "./payments/payment-data";
import { seriesStorageKey } from "./schedule/series-data";

const AuthContext=createContext<{user:User|null;logout:()=>Promise<void>}>({user:null,logout:async()=>{}});
export const useTutorAuth=()=>useContext(AuthContext);
const local=<T,>(key:string,fallback:T):T=>{try{return JSON.parse(localStorage.getItem(key)??"") as T}catch{return fallback}};

export default function AppProvider({children}:{children:React.ReactNode}){
 const [user,setUser]=useState<User|null>(null),[authReady,setAuthReady]=useState(false),[dataReady,setDataReady]=useState(false),[error,setError]=useState("");const router=useRouter(),pathname=usePathname(),login=pathname==="/login";
 useEffect(()=>onAuthStateChanged(auth,next=>{setUser(next);setAuthReady(true);if(!next){setDataReady(false);if(window.location.pathname!=="/login")router.replace("/login")}else if(window.location.pathname==="/login")router.replace("/")}),[router]);
 useEffect(()=>{if(!user)return;let unsubscribers:(()=>void)[]=[];void seedFirestore({students:local(storageKey,initialStudents),lessons:local(lessonStorageKey,initialLessons),payments:local(paymentStorageKey,[]),lessonSeries:local(seriesStorageKey,[])}).then(()=>{unsubscribers=startFirestoreSync(()=>setDataReady(true),setError)}).catch(()=>setError("Не удалось подготовить данные Firestore."));return()=>unsubscribers.forEach(unsubscribe=>unsubscribe())},[user]);
 useEffect(()=>{const handler=(event:Event)=>setError((event as CustomEvent<string>).detail);window.addEventListener("tutorflow-error",handler);return()=>window.removeEventListener("tutorflow-error",handler)},[]);
 if(!firebaseConfigured)return <div className="app-loading"><strong>Firebase не настроен</strong><span>Добавьте NEXT_PUBLIC_FIREBASE_API_KEY в .env.local</span></div>;
 if(!authReady||(!login&&user&&!dataReady))return <div className="app-loading"><span className="loading-flower">✦</span><strong>Загружаем TutorFlow…</strong></div>;
 if(!login&&!user)return <div className="app-loading"><strong>Переходим ко входу…</strong></div>;
 return <AuthContext.Provider value={{user,logout:()=>signOut(auth)}}>{error&&<div className="firebase-error" role="alert">{error}</div>}{children}</AuthContext.Provider>;
}
