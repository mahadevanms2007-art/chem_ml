// ============================================================
// CellGuard — IndexedDB Persistence Layer
// ============================================================
import { openDB, type IDBPDatabase } from 'idb';
import type { SessionRecord, InspectionRecord, BatteryProfile, AppAlert } from '../types';

const DB_NAME = 'cellguard-db';
const DB_VERSION = 1;

let _db: IDBPDatabase | null = null;

export async function getDB() {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('sessions')) {
        const s = db.createObjectStore('sessions', { keyPath: 'id' });
        s.createIndex('startedAt', 'startedAt');
      }
      if (!db.objectStoreNames.contains('inspections')) {
        const i = db.createObjectStore('inspections', { keyPath: 'id' });
        i.createIndex('batteryId', 'batteryId');
        i.createIndex('timestamp', 'timestamp');
      }
      if (!db.objectStoreNames.contains('batteries')) {
        db.createObjectStore('batteries', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('alerts')) {
        const a = db.createObjectStore('alerts', { keyPath: 'id' });
        a.createIndex('timestamp', 'timestamp');
      }
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'id' });
      }
    },
  });
  return _db;
}

// Sessions
export async function saveSession(session: SessionRecord) {
  const db = await getDB();
  await db.put('sessions', session);
}
export async function getSessions(): Promise<SessionRecord[]> {
  const db = await getDB();
  const all = await db.getAll('sessions');
  return all.sort((a, b) => b.startedAt - a.startedAt);
}
export async function deleteSession(id: string) {
  const db = await getDB();
  await db.delete('sessions', id);
}

// Inspections
export async function saveInspection(rec: InspectionRecord) {
  const db = await getDB();
  await db.put('inspections', rec);
}
export async function getInspections(): Promise<InspectionRecord[]> {
  const db = await getDB();
  const all = await db.getAll('inspections');
  return all.sort((a, b) => b.timestamp - a.timestamp);
}
export async function deleteInspection(id: string) {
  const db = await getDB();
  await db.delete('inspections', id);
}

// Batteries
export async function saveBattery(battery: BatteryProfile) {
  const db = await getDB();
  await db.put('batteries', battery);
}
export async function getBatteries(): Promise<BatteryProfile[]> {
  const db = await getDB();
  return db.getAll('batteries');
}
export async function deleteBattery(id: string) {
  const db = await getDB();
  await db.delete('batteries', id);
}

// Alerts
export async function saveAlert(alert: AppAlert) {
  const db = await getDB();
  await db.put('alerts', alert);
}
export async function getAlerts(): Promise<AppAlert[]> {
  const db = await getDB();
  const all = await db.getAll('alerts');
  return all.sort((a, b) => b.timestamp - a.timestamp);
}

// Images (base64 data URLs)
export async function saveImage(id: string, dataUrl: string) {
  const db = await getDB();
  await db.put('images', { id, dataUrl, savedAt: Date.now() });
}
export async function getImage(id: string): Promise<string | null> {
  const db = await getDB();
  const rec = await db.get('images', id);
  return rec?.dataUrl ?? null;
}
export async function deleteImage(id: string) {
  const db = await getDB();
  await db.delete('images', id);
}

// Export all data as JSON
export async function exportAllData() {
  const db = await getDB();
  const [sessions, inspections, batteries, alerts] = await Promise.all([
    db.getAll('sessions'),
    db.getAll('inspections'),
    db.getAll('batteries'),
    db.getAll('alerts'),
  ]);
  return { sessions, inspections, batteries, alerts, exportedAt: Date.now() };
}

// Clear all data
export async function clearAllData() {
  const db = await getDB();
  await Promise.all([
    db.clear('sessions'),
    db.clear('inspections'),
    db.clear('batteries'),
    db.clear('alerts'),
    db.clear('images'),
  ]);
}
