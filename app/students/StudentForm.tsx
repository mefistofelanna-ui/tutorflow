"use client";
import { FormEvent, useState } from "react";
import type { Student } from "./student-data";

export default function StudentForm({ initial, title, onSave, onCancel }:{initial?:Student;title:string;onSave:(s:Student)=>void;onCancel:()=>void}){
 const [form,setForm]=useState<Student>(initial??{id:"",name:"",grade:"",price:0,balance:0,comment:""});
 const change=(key:keyof Student,value:string)=>setForm({...form,[key]:key==="price"||key==="balance"?Number(value):value});
 const submit=(e:FormEvent)=>{e.preventDefault();onSave({...form,id:form.id||`student-${Date.now()}`})};
 return <div className="student-modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onCancel()}><div className="student-modal" role="dialog" aria-modal="true" aria-labelledby="student-form-title"><h2 id="student-form-title">{title}</h2><form className="student-form" onSubmit={submit}>
  <label className="full">Имя *<input required autoFocus value={form.name} onChange={e=>change("name",e.target.value)}/></label>
  <label>Класс<input value={form.grade} onChange={e=>change("grade",e.target.value)}/></label>
  <label>Стоимость занятия<input type="number" min="0" value={form.price||""} onChange={e=>change("price",e.target.value)}/></label>
  <label>Остаток оплаченных занятий<input type="number" min="0" value={form.balance} onChange={e=>change("balance",e.target.value)}/></label>
  <label className="full">Комментарий<textarea value={form.comment} onChange={e=>change("comment",e.target.value)}/></label>
  <div className="form-actions"><button type="button" className="form-cancel" onClick={onCancel}>Отмена</button><button className="form-save">Сохранить</button></div>
 </form></div></div>
}

