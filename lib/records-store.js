import { getSupabaseClient } from "./supabase-client";

const DAILY_RECORDS_KEY = "dailyRecords";
const USER_STATS_KEY = "userStats";

export function safeParseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateKey(dateKey) {
  return new Date(`${dateKey}T00:00:00`);
}

function normalizeRecordMap(savedValue) {
  if (Array.isArray(savedValue)) {
    return savedValue.reduce((records, record) => {
      if (record?.date) {
        records[record.date] = record;
      }

      return records;
    }, {});
  }

  return savedValue && typeof savedValue === "object" ? savedValue : {};
}

function getRecordTimestamp(record) {
  const timestamp = record?.updatedAt || record?.createdAt || "";
  const value = timestamp ? new Date(timestamp).getTime() : 0;
  return Number.isFinite(value) ? value : 0;
}

function mergeRecords(localRecords, cloudRecords) {
  const nextRecords = { ...localRecords };

  Object.entries(cloudRecords).forEach(([date, cloudRecord]) => {
    const localRecord = nextRecords[date];

    if (!localRecord || getRecordTimestamp(cloudRecord) >= getRecordTimestamp(localRecord)) {
      nextRecords[date] = cloudRecord;
    }
  });

  return nextRecords;
}

export function loadLocalRecords() {
  if (typeof window === "undefined") {
    return {};
  }

  const currentRecords = normalizeRecordMap(
    safeParseJson(localStorage.getItem(DAILY_RECORDS_KEY), {}),
  );
  const legacyRecords = normalizeRecordMap(
    safeParseJson(localStorage.getItem("life-growth-daily-records"), []),
  );

  return {
    ...legacyRecords,
    ...currentRecords,
  };
}

export function saveLocalRecords(records, { notify = true } = {}) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(DAILY_RECORDS_KEY, JSON.stringify(records));
  updateUserStats(records);

  if (notify) {
    window.dispatchEvent(new CustomEvent("daily-records-updated"));
  }
}

export function updateUserStats(records) {
  if (typeof window === "undefined") {
    return;
  }

  const todayKey = getDateKey(new Date());
  const totalXp = Math.max(
    0,
    Object.values(records).reduce(
      (sum, record) => sum + (Number(record?.xpGained ?? record?.xp) || 0),
      0,
    ),
  );
  let streakDays = 0;
  const cursor = parseDateKey(todayKey);

  while (records[getDateKey(cursor)]) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  localStorage.setItem(
    USER_STATS_KEY,
    JSON.stringify({
      totalXp,
      level: Math.max(1, Math.floor(totalXp / 1000) + 1),
      streakDays,
      updatedAt: new Date().toISOString(),
    }),
  );
}

async function getCurrentUser() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

async function loadCloudRecords(userId) {
  const supabase = getSupabaseClient();

  if (!supabase || !userId) {
    return {};
  }

  const { data, error } = await supabase
    .from("daily_records")
    .select("date, record, updated_at")
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).reduce((records, row) => {
    const record = row.record || {};
    const date = String(row.date);

    records[date] = {
      ...record,
      date,
      updatedAt: record.updatedAt || row.updated_at,
    };

    return records;
  }, {});
}

async function upsertCloudRecords(records, userId) {
  const supabase = getSupabaseClient();
  const rows = Object.values(records)
    .filter((record) => record?.date)
    .map((record) => ({
      user_id: userId,
      date: record.date,
      record,
      updated_at: record.updatedAt || new Date().toISOString(),
    }));

  if (!supabase || !userId || rows.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("daily_records")
    .upsert(rows, { onConflict: "user_id,date" });

  if (error) {
    throw error;
  }
}

export async function loadDailyRecords() {
  const localRecords = loadLocalRecords();
  const user = await getCurrentUser();

  if (!user) {
    return localRecords;
  }

  try {
    const cloudRecords = await loadCloudRecords(user.id);
    const mergedRecords = mergeRecords(localRecords, cloudRecords);

    saveLocalRecords(mergedRecords, { notify: false });
    return mergedRecords;
  } catch (error) {
    console.warn("Failed to load cloud daily records", error);
    return localRecords;
  }
}

export async function loadDailyRecord(date) {
  const records = await loadDailyRecords();
  return records[date] || null;
}

export async function saveDailyRecords(records) {
  saveLocalRecords(records);

  const user = await getCurrentUser();

  if (!user) {
    return records;
  }

  try {
    await upsertCloudRecords(records, user.id);
  } catch (error) {
    console.warn("Failed to save cloud daily records", error);
  }

  return records;
}

export async function saveDailyRecord(record) {
  const records = loadLocalRecords();
  const nextRecord = {
    ...record,
    updatedAt: record.updatedAt || new Date().toISOString(),
  };
  const nextRecords = {
    ...records,
    [nextRecord.date]: nextRecord,
  };

  return saveDailyRecords(nextRecords);
}

export async function deleteDailyRecord(date) {
  const records = loadLocalRecords();
  const nextRecords = { ...records };

  delete nextRecords[date];
  saveLocalRecords(nextRecords);

  const user = await getCurrentUser();
  const supabase = getSupabaseClient();

  if (user && supabase) {
    const { error } = await supabase
      .from("daily_records")
      .delete()
      .eq("user_id", user.id)
      .eq("date", date);

    if (error) {
      console.warn("Failed to delete cloud daily record", error);
    }
  }

  return nextRecords;
}

export async function clearDailyRecords() {
  const nextRecords = {};

  saveLocalRecords(nextRecords);

  const user = await getCurrentUser();
  const supabase = getSupabaseClient();

  if (user && supabase) {
    const { error } = await supabase
      .from("daily_records")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      console.warn("Failed to clear cloud daily records", error);
    }
  }

  return nextRecords;
}

export async function syncLocalRecordsToCloud() {
  const user = await getCurrentUser();

  if (!user) {
    return loadLocalRecords();
  }

  const localRecords = loadLocalRecords();

  try {
    await upsertCloudRecords(localRecords, user.id);
    const cloudRecords = await loadCloudRecords(user.id);
    const mergedRecords = mergeRecords(localRecords, cloudRecords);
    await upsertCloudRecords(mergedRecords, user.id);
    saveLocalRecords(mergedRecords);
    return mergedRecords;
  } catch (error) {
    console.warn("Failed to sync daily records", error);
    return localRecords;
  }
}
