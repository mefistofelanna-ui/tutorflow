"use client";
import { useEffect, useState } from "react";
import { readLessons, type Lesson } from "../schedule/lesson-data";
import { readPayments, type Payment } from "./payment-data";
import { calculateFinance } from "./payment-calculation";

export function useFinancialData() {
  const [source, setSource] = useState<{ lessons: Lesson[]; payments: Payment[] }>({ lessons: [], payments: [] });
  useEffect(() => {
    const load = () => setSource({ lessons: readLessons(), payments: readPayments() });
    const timer = window.setTimeout(load, 0);
    window.addEventListener("tutorflow-data-change", load);
    return () => { window.clearTimeout(timer); window.removeEventListener("tutorflow-data-change", load); };
  }, []);
  return { ...source, forStudent: (id: string, month?: string) => calculateFinance(id, source.lessons, source.payments, month) };
}
