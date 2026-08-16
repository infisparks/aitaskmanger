import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc,
  serverTimestamp 
} from "firebase/firestore";
import { getDatabase, ref, set, get, onValue } from "firebase/database";
import { StaffContact, TaskItem } from "@/types";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyC5SjEU2tEH85gKrXrX79yAu1cCeZugOi4",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "mkspam-c824d.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://mkspam-c824d-default-rtdb.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mkspam-c824d",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "mkspam-c824d.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "640689755066",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:640689755066:web:9ad4b790ba104667e70383",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-QBDQW01MBP"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

// Staff Directory Services
export const STAFF_COLLECTION = "staff_contacts";
export const TASKS_COLLECTION = "assigned_tasks";

export async function addStaffMember(staff: Omit<StaffContact, "id" | "createdAt">): Promise<StaffContact> {
  const staffRef = doc(collection(db, STAFF_COLLECTION));
  const newStaff: StaffContact = {
    ...staff,
    id: staffRef.id,
    createdAt: Date.now(),
  };
  await setDoc(staffRef, newStaff);

  // Also sync to Realtime Database for realtime availability
  try {
    const rtdbRef = ref(rtdb, `staff/${newStaff.id}`);
    await set(rtdbRef, newStaff);
  } catch (e) {
    console.warn("RTDB sync error (fallback to firestore):", e);
  }

  return newStaff;
}

export async function updateStaffMember(id: string, updates: Partial<StaffContact>): Promise<void> {
  const staffRef = doc(db, STAFF_COLLECTION, id);
  await updateDoc(staffRef, updates);
  try {
    const rtdbRef = ref(rtdb, `staff/${id}`);
    await set(rtdbRef, { ...updates, id });
  } catch (e) {
    console.warn("RTDB update error:", e);
  }
}

export async function deleteStaffMember(id: string): Promise<void> {
  await deleteDoc(doc(db, STAFF_COLLECTION, id));
  try {
    const rtdbRef = ref(rtdb, `staff/${id}`);
    await set(rtdbRef, null);
  } catch (e) {
    console.warn("RTDB delete error:", e);
  }
}

export function subscribeToStaff(callback: (staff: StaffContact[]) => void): () => void {
  const staffQuery = query(collection(db, STAFF_COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(staffQuery, (snapshot) => {
    const items: StaffContact[] = [];
    snapshot.forEach((docSnap) => {
      items.push({ id: docSnap.id, ...(docSnap.data() as any) });
    });
    callback(items);
  }, (err) => {
    console.error("Staff snapshot error:", err);
  });
}

// Tasks Services
export async function createTask(task: Omit<TaskItem, "id" | "createdAt" | "updatedAt">): Promise<TaskItem> {
  const taskRef = doc(collection(db, TASKS_COLLECTION));
  const newTask: TaskItem = {
    ...task,
    id: taskRef.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await setDoc(taskRef, newTask);
  return newTask;
}

export async function createBatchTasks(tasks: Array<Omit<TaskItem, "id" | "createdAt" | "updatedAt">>): Promise<TaskItem[]> {
  const created: TaskItem[] = [];
  for (const t of tasks) {
    const newTask = await createTask(t);
    created.push(newTask);
  }
  return created;
}

export async function updateTask(id: string, updates: Partial<TaskItem>): Promise<void> {
  const taskRef = doc(db, TASKS_COLLECTION, id);
  await updateDoc(taskRef, {
    ...updates,
    updatedAt: Date.now(),
  });
}

export async function deleteTask(id: string): Promise<void> {
  await deleteDoc(doc(db, TASKS_COLLECTION, id));
}

export function subscribeToTasks(callback: (tasks: TaskItem[]) => void): () => void {
  const tasksQuery = query(collection(db, TASKS_COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(tasksQuery, (snapshot) => {
    const items: TaskItem[] = [];
    snapshot.forEach((docSnap) => {
      items.push({ id: docSnap.id, ...(docSnap.data() as any) });
    });
    callback(items);
  }, (err) => {
    console.error("Tasks snapshot error:", err);
  });
}
