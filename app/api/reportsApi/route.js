// lib/reportsApi.js
import { db } from "@/_utils/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export async function getReport(id) {
  const snap = await getDoc(doc(db, "reports", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateReport(id, patch) {
  await updateDoc(doc(db, "reports", id), patch);
}
