"use client";

import { useEffect, useRef, useState } from "react";
import {
  Angry,
  ArrowLeft,
  BatteryFull,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  Frown,
  Home,
  Laugh,
  Meh,
  MoonStar,
  Pen,
  SignalHigh,
  Smile,
  Sparkles,
  Smartphone,
  Target,
  User,
  UtensilsCrossed,
  Wifi,
} from "lucide-react";

const initialRecordInput = {
  sleepStartTime: "00:00",
  sleepEndTime: "08:00",
  sleepHours: 8,
  workoutType: "aerobic",
  workoutName: "跑步",
  customWorkout: "",
  workoutMinutes: 45,
  workoutDistanceKm: 0,
  workoutRoutePoints: [],
  workoutRouteStartedAt: "",
  workoutRouteEndedAt: "",
  nutritionScore: 8,
  phoneHours: 3.2,
  mood: "开心满满",
  completedActions: 3,
};

const moodOptions = ["崩了", "低落", "一般", "开心", "开心满满"];
const workoutTypeLabels = {
  aerobic: "有氧",
  anaerobic: "无氧",
};
const workoutOptions = {
  aerobic: ["跑步", "徒步", "游泳", "骑行", "爬坡", "跳绳"],
  anaerobic: ["三分化训练", "胸", "背", "腿", "肩", "手臂"],
};

const navItems = [
  { id: "home", label: "首页", Icon: Home },
  { id: "record", label: "记录", Icon: Pen },
  { id: "calendar", label: "日历", Icon: CalendarDays },
  { id: "status", label: "我的", Icon: User },
];

function getDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateLabel(dateKey) {
  const [year, month, day] = dateKey.split("-");
  const todayKey = getDateKey(new Date());
  return `${year}年${month}月${day}日${dateKey === todayKey ? " 今天" : ""}`;
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function timeToMinutes(time) {
  const [hours, minutes] = String(time).split(":").map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  const normalizedMinutes = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalizedMinutes / 60);
  const mins = normalizedMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function calculateSleepHoursFromTimes(startTime, endTime) {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (startMinutes === null || endMinutes === null) {
    return null;
  }

  let durationMinutes = endMinutes - startMinutes;

  if (durationMinutes < 0) {
    durationMinutes += 24 * 60;
  }

  return Math.round((durationMinutes / 60) * 10) / 10;
}

function getDefaultSleepEndTime(sleepHours) {
  return minutesToTime((Number(sleepHours) || 8) * 60);
}

function normalizeWorkoutType(type) {
  return workoutTypeLabels[type] ? type : "aerobic";
}

function getWorkoutDisplayName(input) {
  return input.customWorkout?.trim() || input.workoutName || "未选择运动";
}

function getDistanceBetweenPoints(pointA, pointB) {
  const earthRadiusKm = 6371;
  const latDiff = ((pointB.lat - pointA.lat) * Math.PI) / 180;
  const lngDiff = ((pointB.lng - pointA.lng) * Math.PI) / 180;
  const startLat = (pointA.lat * Math.PI) / 180;
  const endLat = (pointB.lat * Math.PI) / 180;
  const haversine =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(lngDiff / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function calculateRouteDistanceKm(points) {
  if (!Array.isArray(points) || points.length < 2) {
    return 0;
  }

  const distance = points.reduce((total, point, index) => {
    if (index === 0) {
      return total;
    }

    return total + getDistanceBetweenPoints(points[index - 1], point);
  }, 0);

  return Math.round(distance * 100) / 100;
}

function formatElapsedTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function normalizeRecordInput(input) {
  const sleepStartTime = input.sleepStartTime || "00:00";
  const sleepEndTime =
    input.sleepEndTime || getDefaultSleepEndTime(input.sleepHours);
  const calculatedSleepHours = calculateSleepHoursFromTimes(
    sleepStartTime,
    sleepEndTime,
  );

  return {
    sleepStartTime,
    sleepEndTime,
    sleepHours: calculatedSleepHours ?? Number(input.sleepHours) ?? 0,
    workoutType: normalizeWorkoutType(input.workoutType),
    workoutName: input.workoutName || "跑步",
    customWorkout: input.customWorkout || "",
    workoutMinutes: Number(input.workoutMinutes) || 0,
    workoutDistanceKm: Number(input.workoutDistanceKm) || 0,
    workoutRoutePoints: Array.isArray(input.workoutRoutePoints)
      ? input.workoutRoutePoints
      : [],
    workoutRouteStartedAt: input.workoutRouteStartedAt || "",
    workoutRouteEndedAt: input.workoutRouteEndedAt || "",
    nutritionScore: clampNumber(Number(input.nutritionScore) || 0, 1, 10),
    phoneHours: Number(input.phoneHours) || 0,
    mood: moodOptions.includes(input.mood) ? input.mood : "一般",
    completedActions: Math.max(0, Number(input.completedActions) || 0),
  };
}

export function calculateStatusScore(recordInput) {
  const input = normalizeRecordInput(recordInput);
  let sleepScore = 0;

  if (input.sleepHours >= 7 && input.sleepHours <= 8.5) {
    sleepScore = 25;
  } else if (input.sleepHours >= 6 && input.sleepHours < 7) {
    sleepScore = 18;
  } else if (input.sleepHours >= 5 && input.sleepHours < 6) {
    sleepScore = 10;
  } else if (input.sleepHours < 5) {
    sleepScore = 5;
  } else {
    sleepScore = 20;
  }

  let workoutScore = 0;

  if (input.workoutMinutes >= 45) {
    workoutScore = 20;
  } else if (input.workoutMinutes >= 30) {
    workoutScore = 15;
  } else if (input.workoutMinutes >= 15) {
    workoutScore = 10;
  } else if (input.workoutMinutes > 0) {
    workoutScore = 5;
  }

  const nutritionScoreConverted = Math.min(input.nutritionScore * 2, 20);
  let phoneScore = 0;

  if (input.phoneHours <= 3) {
    phoneScore = 15;
  } else if (input.phoneHours <= 5) {
    phoneScore = 10;
  } else if (input.phoneHours <= 7) {
    phoneScore = 5;
  }

  const moodScores = {
    开心满满: 10,
    开心: 8,
    一般: 5,
    低落: 3,
    崩了: 1,
  };

  let actionScore = 0;

  if (input.completedActions >= 3) {
    actionScore = 10;
  } else if (input.completedActions === 2) {
    actionScore = 8;
  } else if (input.completedActions === 1) {
    actionScore = 5;
  }

  return sleepScore + workoutScore + nutritionScoreConverted + phoneScore + moodScores[input.mood] + actionScore;
}

export function calculateBuffs(recordInput) {
  const input = normalizeRecordInput(recordInput);
  const buffs = [];

  if (input.sleepHours >= 7) {
    buffs.push("早睡 Buff +20 XP");
  }

  if (input.workoutMinutes >= 30) {
    buffs.push("健身 Buff +30 XP");
  }

  if (input.nutritionScore >= 8) {
    buffs.push("饮食稳定 Buff +20 XP");
  }

  if (input.phoneHours <= 3) {
    buffs.push("专注 Buff +15 XP");
  }

  if (input.completedActions >= 3) {
    buffs.push("执行力 Buff +25 XP");
  }

  return buffs;
}

export function calculateDebuffs(recordInput) {
  const input = normalizeRecordInput(recordInput);
  const debuffs = [];

  if (input.sleepHours < 6) {
    debuffs.push("熬夜 Debuff -20 XP");
  }

  if (input.phoneHours > 6) {
    debuffs.push("手机超时 Debuff -15 XP");
  }

  if (input.nutritionScore <= 4) {
    debuffs.push("饮食崩盘 Debuff -15 XP");
  }

  if (input.mood === "崩了") {
    debuffs.push("情绪内耗 Debuff -10 XP");
  }

  if (input.completedActions === 0) {
    debuffs.push("今日掉线 Debuff -20 XP");
  }

  return debuffs;
}

export function calculateXp(recordInput) {
  const input = normalizeRecordInput(recordInput);
  let buffXp = 0;
  let debuffPenalty = 0;

  if (input.sleepHours >= 7) {
    buffXp += 20;
  }

  if (input.workoutMinutes >= 30) {
    buffXp += 30;
  }

  if (input.nutritionScore >= 8) {
    buffXp += 20;
  }

  if (input.phoneHours <= 3) {
    buffXp += 15;
  }

  if (input.completedActions >= 3) {
    buffXp += 25;
  }

  if (input.sleepHours < 6) {
    debuffPenalty += 20;
  }

  if (input.phoneHours > 6) {
    debuffPenalty += 15;
  }

  if (input.nutritionScore <= 4) {
    debuffPenalty += 15;
  }

  if (input.mood === "崩了") {
    debuffPenalty += 10;
  }

  if (input.completedActions === 0) {
    debuffPenalty += 20;
  }

  return calculateStatusScore(input) * 3 + buffXp - debuffPenalty;
}

export function getDailyTitle(statusScore) {
  if (statusScore >= 90) {
    return "西格玛男神";
  }

  if (statusScore >= 80) {
    return "稳定进化牛马";
  }

  if (statusScore >= 70) {
    return "轻微觉醒牛马";
  }

  if (statusScore >= 60) {
    return "勉强上线选手";
  }

  if (statusScore >= 40) {
    return "摆烂马警告";
  }

  return "男神系统加载失败";
}

export function generateSummary(recordInput, statusScore, buffs, debuffs) {
  const input = normalizeRecordInput(recordInput);
  const lines = [`今日状态评分 ${statusScore} 分，获得称号：${getDailyTitle(statusScore)}。`];

  if (buffs.length > 0) {
    lines.push(`今日触发 ${buffs.length} 个 Buff，现实行为正在推动角色成长。`);
  }

  if (debuffs.length > 0) {
    lines.push(`同时出现 ${debuffs.length} 个 Debuff，明天可以优先修复睡眠、专注或执行节奏。`);
  }

  if (input.completedActions >= 3) {
    lines.push("今日行动完成度不错，执行力正在积累。");
  }

  return lines.join("\n");
}

function safeParseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function loadDailyRecord(date) {
  if (typeof window === "undefined") {
    return null;
  }

  const records = safeParseJson(localStorage.getItem("dailyRecords"), {});
  return records[date] || null;
}

export function saveDailyRecord(record) {
  const records = safeParseJson(localStorage.getItem("dailyRecords"), {});
  const nextRecords = {
    ...records,
    [record.date]: record,
  };

  localStorage.setItem("dailyRecords", JSON.stringify(nextRecords));
  return nextRecords;
}

function calculateStreakDays(records, todayKey) {
  let streakDays = 0;
  const cursor = new Date(`${todayKey}T00:00:00`);

  while (records[getDateKey(cursor)]) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streakDays;
}

function getUserLevel(totalXp) {
  return Math.max(1, Math.floor(totalXp / 1000) + 1);
}

export function RecordPage({ onNavigate }) {
  const todayKey = getDateKey(new Date());
  const locationWatchIdRef = useRef(null);
  const trackingStartedAtRef = useRef(null);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [recordInput, setRecordInput] = useState(initialRecordInput);
  const [activeEditor, setActiveEditor] = useState(null);
  const [draftValue, setDraftValue] = useState("");
  const [draftSleepRange, setDraftSleepRange] = useState({
    sleepStartTime: initialRecordInput.sleepStartTime,
    sleepEndTime: initialRecordInput.sleepEndTime,
  });
  const [draftWorkout, setDraftWorkout] = useState({
    workoutType: initialRecordInput.workoutType,
    workoutName: initialRecordInput.workoutName,
    customWorkout: initialRecordInput.customWorkout,
    workoutMinutes: initialRecordInput.workoutMinutes,
    workoutDistanceKm: initialRecordInput.workoutDistanceKm,
    workoutRoutePoints: initialRecordInput.workoutRoutePoints,
    workoutRouteStartedAt: initialRecordInput.workoutRouteStartedAt,
    workoutRouteEndedAt: initialRecordInput.workoutRouteEndedAt,
  });
  const [isTrackingWorkout, setIsTrackingWorkout] = useState(false);
  const [trackingElapsedSeconds, setTrackingElapsedSeconds] = useState(0);
  const [trackingStatus, setTrackingStatus] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    const source =
      typeof window !== "undefined"
        ? localStorage.getItem("selectedRecordSource")
        : null;
    const storedDate =
      typeof window !== "undefined"
        ? localStorage.getItem("selectedRecordDate")
        : null;
    const nextDateKey =
      source === "calendar" && storedDate ? storedDate : todayKey;
    const savedRecord = loadDailyRecord(nextDateKey);

    setSelectedDateKey(nextDateKey);

    if (savedRecord) {
      setRecordInput({
        sleepStartTime: savedRecord.sleepStartTime || "00:00",
        sleepEndTime:
          savedRecord.sleepEndTime ||
          getDefaultSleepEndTime(savedRecord.sleepHours),
        sleepHours: savedRecord.sleepHours,
        workoutType: normalizeWorkoutType(savedRecord.workoutType),
        workoutName: savedRecord.workoutName || "跑步",
        customWorkout: savedRecord.customWorkout || "",
        workoutMinutes: savedRecord.workoutMinutes,
        workoutDistanceKm: savedRecord.workoutDistanceKm || 0,
        workoutRoutePoints: savedRecord.workoutRoutePoints || [],
        workoutRouteStartedAt: savedRecord.workoutRouteStartedAt || "",
        workoutRouteEndedAt: savedRecord.workoutRouteEndedAt || "",
        nutritionScore: savedRecord.nutritionScore,
        phoneHours: savedRecord.phoneHours,
        mood: savedRecord.mood,
        completedActions: savedRecord.completedActions,
      });
    } else {
      setRecordInput(initialRecordInput);
    }

    if (typeof window !== "undefined" && source === "calendar") {
      localStorage.removeItem("selectedRecordSource");
    }
  }, [todayKey]);

  useEffect(() => {
    if (!isTrackingWorkout) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      if (trackingStartedAtRef.current) {
        setTrackingElapsedSeconds(
          Math.floor((Date.now() - trackingStartedAtRef.current) / 1000),
        );
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isTrackingWorkout]);

  useEffect(() => {
    return () => {
      if (locationWatchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
      }
    };
  }, []);

  function updateField(field, value) {
    setSavedMessage("");
    setRecordInput((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openEditor(config) {
    setActiveEditor(config);

    if (config.type === "sleep") {
      setDraftSleepRange({
        sleepStartTime: recordInput.sleepStartTime || "00:00",
        sleepEndTime:
          recordInput.sleepEndTime ||
          getDefaultSleepEndTime(recordInput.sleepHours),
      });
      setDraftValue("");
      return;
    }

    if (config.type === "workout") {
      setDraftWorkout({
        workoutType: normalizeWorkoutType(recordInput.workoutType),
        workoutName: recordInput.workoutName || "跑步",
        customWorkout: recordInput.customWorkout || "",
        workoutMinutes: recordInput.workoutMinutes || 0,
        workoutDistanceKm: recordInput.workoutDistanceKm || 0,
        workoutRoutePoints: recordInput.workoutRoutePoints || [],
        workoutRouteStartedAt: recordInput.workoutRouteStartedAt || "",
        workoutRouteEndedAt: recordInput.workoutRouteEndedAt || "",
      });
      setDraftValue("");
      setTrackingStatus("");
      setTrackingElapsedSeconds(0);
      return;
    }

    setDraftValue(String(recordInput[config.field]));
  }

  function closeEditor() {
    if (isTrackingWorkout) {
      stopWorkoutTracking({ updateMinutes: true });
    }

    setActiveEditor(null);
    setDraftValue("");
  }

  async function startWorkoutTracking() {
    if (!navigator.geolocation) {
      setTrackingStatus("当前浏览器不支持定位。");
      return;
    }

    if (navigator.permissions?.query) {
      try {
        const permission = await navigator.permissions.query({
          name: "geolocation",
        });

        if (permission.state === "denied") {
          setTrackingStatus(
            "定位权限已被拒绝。请在浏览器地址栏或系统设置里把 localhost 的定位权限改成允许，然后再点开始。",
          );
          return;
        }
      } catch {
        // Some mobile browsers do not expose geolocation permission state.
      }
    }

    const startedAt = new Date();
    trackingStartedAtRef.current = startedAt.getTime();
    setTrackingElapsedSeconds(0);
    setTrackingStatus("正在等待 GPS 定位...");
    setIsTrackingWorkout(true);
    setDraftWorkout((current) => ({
      ...current,
      workoutDistanceKm: 0,
      workoutRoutePoints: [],
      workoutRouteStartedAt: startedAt.toISOString(),
      workoutRouteEndedAt: "",
    }));

    locationWatchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy || 0),
          timestamp: new Date(position.timestamp).toISOString(),
        };

        setDraftWorkout((current) => {
          const nextPoints = [...(current.workoutRoutePoints || []), point];

          return {
            ...current,
            workoutDistanceKm: calculateRouteDistanceKm(nextPoints),
            workoutRoutePoints: nextPoints,
          };
        });
        setTrackingStatus("GPS 记录中，保持页面打开。");
      },
      (error) => {
        const deniedMessage =
          error.code === error.PERMISSION_DENIED
            ? "定位权限被拒绝。请在浏览器地址栏或系统设置里允许定位，然后再点开始。"
            : `定位失败：${error.message}`;

        stopWorkoutTracking({
          updateMinutes: true,
          nextStatus: deniedMessage,
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      },
    );
  }

  function stopWorkoutTracking({
    updateMinutes = true,
    nextStatus = "记录已暂停，可以保存到今天。",
  } = {}) {
    if (locationWatchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
    }

    const elapsedSeconds = trackingStartedAtRef.current
      ? Math.floor((Date.now() - trackingStartedAtRef.current) / 1000)
      : trackingElapsedSeconds;
    const trackedMinutes = elapsedSeconds > 0 ? Math.max(1, Math.round(elapsedSeconds / 60)) : 0;

    setIsTrackingWorkout(false);
    setTrackingElapsedSeconds(elapsedSeconds);
    setTrackingStatus(nextStatus);
    setDraftWorkout((current) => ({
      ...current,
      workoutMinutes: updateMinutes
        ? Math.max(Number(current.workoutMinutes) || 0, trackedMinutes)
        : current.workoutMinutes,
      workoutRouteEndedAt: new Date().toISOString(),
    }));
  }

  function saveEditor() {
    if (!activeEditor) {
      return;
    }

    if (activeEditor.type === "mood") {
      updateField(activeEditor.field, draftValue);
      closeEditor();
      return;
    }

    if (activeEditor.type === "sleep") {
      const sleepHours = calculateSleepHoursFromTimes(
        draftSleepRange.sleepStartTime,
        draftSleepRange.sleepEndTime,
      );

      if (sleepHours === null) {
        window.alert("请选择有效的入睡和起床时间");
        return;
      }

      setSavedMessage("");
      setRecordInput((current) => ({
        ...current,
        sleepStartTime: draftSleepRange.sleepStartTime,
        sleepEndTime: draftSleepRange.sleepEndTime,
        sleepHours,
      }));
      closeEditor();
      return;
    }

    if (activeEditor.type === "workout") {
      const elapsedSeconds = trackingStartedAtRef.current
        ? Math.floor((Date.now() - trackingStartedAtRef.current) / 1000)
        : trackingElapsedSeconds;
      const trackedMinutes =
        isTrackingWorkout && elapsedSeconds > 0
          ? Math.max(1, Math.round(elapsedSeconds / 60))
          : 0;
      const routeEndedAt = isTrackingWorkout
        ? new Date().toISOString()
        : draftWorkout.workoutRouteEndedAt || "";

      if (isTrackingWorkout) {
        stopWorkoutTracking({ updateMinutes: false });
      }

      const workoutMinutes = Math.round(
        clampNumber(
          Math.max(Number(draftWorkout.workoutMinutes) || 0, trackedMinutes),
          0,
          600,
        ),
      );

      setSavedMessage("");
      setRecordInput((current) => ({
        ...current,
        workoutType: normalizeWorkoutType(draftWorkout.workoutType),
        workoutName: draftWorkout.workoutName || "跑步",
        customWorkout: draftWorkout.customWorkout || "",
        workoutMinutes,
        workoutDistanceKm: Number(draftWorkout.workoutDistanceKm) || 0,
        workoutRoutePoints: draftWorkout.workoutRoutePoints || [],
        workoutRouteStartedAt: draftWorkout.workoutRouteStartedAt || "",
        workoutRouteEndedAt: routeEndedAt,
      }));
      closeEditor();
      return;
    }

    const parsedValue = Number(draftValue);

    if (!Number.isFinite(parsedValue)) {
      window.alert("请输入有效数字");
      return;
    }

    const normalizedValue = activeEditor.integer
      ? Math.round(clampNumber(parsedValue, activeEditor.min, activeEditor.max))
      : clampNumber(parsedValue, activeEditor.min, activeEditor.max);

    updateField(activeEditor.field, normalizedValue);
    closeEditor();
  }

  function handleSubmit() {
    const input = normalizeRecordInput(recordInput);
    const existingRecord = loadDailyRecord(selectedDateKey);
    const statusScore = calculateStatusScore(input);
    const buffs = calculateBuffs(input);
    const debuffs = calculateDebuffs(input);
    const xpGained = calculateXp(input);
    const title = getDailyTitle(statusScore);
    const summary = generateSummary(input, statusScore, buffs, debuffs);
    const now = new Date().toISOString();
    const record = {
      date: selectedDateKey,
      ...input,
      statusScore,
      xpGained,
      buffs,
      debuffs,
      title,
      summary,
      createdAt: existingRecord?.createdAt || now,
      updatedAt: now,
    };
    const records = saveDailyRecord(record);
    const totalXp = Math.max(
      0,
      Object.values(records).reduce(
        (sum, dailyRecord) => sum + (Number(dailyRecord?.xpGained) || 0),
        0,
      ),
    );
    const userStats = {
      totalXp,
      level: getUserLevel(totalXp),
      streakDays: calculateStreakDays(records, todayKey),
      updatedAt: now,
    };

    localStorage.setItem("userStats", JSON.stringify(userStats));
    console.log("saved daily record", record);
    console.log("summary url", `/summary?date=${selectedDateKey}`);
    setSavedMessage("今日记录已保存");
  }

  return (
    <main className="min-h-screen bg-[#F5FBFF] text-[#0D1B33]">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col overflow-x-hidden overflow-y-auto rounded-[32px] bg-white px-5 pb-[calc(82px+env(safe-area-inset-bottom))] pt-4 shadow-[0_24px_80px_rgba(10,141,255,0.16)] sm:my-6">
        <RecordHeader
          onBack={() => onNavigate?.("home")}
          onCalendar={() => onNavigate?.("calendar")}
        />
        <RecordHero />
        <DatePill
          dateLabel={formatDateLabel(selectedDateKey)}
          onClick={() => onNavigate?.("calendar")}
        />

        <section className="mt-2.5 space-y-1.5">
          <RecordItemCard
            Icon={MoonStar}
            title="睡眠"
            description="好睡眠，恢复精力"
            value={recordInput.sleepHours}
            unit="小时"
            footer={
              <span className="text-[11px] font-black text-[#1677FF]">
                {recordInput.sleepStartTime} - {recordInput.sleepEndTime}
              </span>
            }
            onClick={() =>
              openEditor({
                field: "sleepHours",
                title: "睡眠时间",
                type: "sleep",
              })
            }
          />
          <RecordItemCard
            Icon={Dumbbell}
            title="健身"
            description="坚持锻炼，强健体魄"
            value={recordInput.workoutMinutes}
            unit="分钟"
            footer={
              <span className="text-[11px] font-black text-[#1677FF]">
                {workoutTypeLabels[normalizeWorkoutType(recordInput.workoutType)]} ·{" "}
                {getWorkoutDisplayName(recordInput)}
                {recordInput.workoutDistanceKm > 0
                  ? ` · ${recordInput.workoutDistanceKm} km`
                  : ""}
              </span>
            }
            onClick={() =>
              openEditor({
                field: "workoutMinutes",
                title: "健身时间",
                type: "workout",
              })
            }
          />
          <RecordItemCard
            Icon={UtensilsCrossed}
            title="饮食评分"
            description="均衡饮食，营养满分"
            value={recordInput.nutritionScore}
            unit="/10"
            footer={<StarRow filled={Math.round(recordInput.nutritionScore / 2)} />}
            onClick={() =>
              openEditor({
                field: "nutritionScore",
                title: "饮食评分",
                unit: "/10",
                min: 1,
                max: 10,
                step: "1",
                integer: true,
              })
            }
          />
          <RecordItemCard
            Icon={Smartphone}
            title="手机使用"
            description="合理使用，掌控时间"
            value={recordInput.phoneHours}
            unit="小时"
            onClick={() =>
              openEditor({
                field: "phoneHours",
                title: "手机使用时间",
                unit: "小时",
                min: 0,
                max: 24,
                step: "0.1",
              })
            }
          />
          <RecordItemCard
            Icon={Smile}
            title="情绪"
            description="关注情绪，保持积极"
            footer={<MoodSelector mood={recordInput.mood} onMoodChange={(mood) => updateField("mood", mood)} />}
            onClick={() =>
              openEditor({
                field: "mood",
                title: "情绪状态",
                type: "mood",
              })
            }
          />
          <RecordItemCard
            Icon={Target}
            title="执行力"
            description="今日行动，今日进步"
            prefix="完成了"
            value={recordInput.completedActions}
            unit="件"
            onClick={() =>
              openEditor({
                field: "completedActions",
                title: "今日完成行动数量",
                unit: "件",
                min: 0,
                max: 99,
                step: "1",
                integer: true,
              })
            }
          />
        </section>

        <SubmitRecordButton onClick={handleSubmit} />
        {savedMessage ? (
          <p className="mt-3 rounded-[18px] border border-[#BDEFD5] bg-[#ECFFF4] px-4 py-3 text-center text-[14px] font-black text-[#08A657]">
            {savedMessage}
          </p>
        ) : null}
      </div>

      <BottomTabBar activePage="record" onNavigate={onNavigate} />

      <RecordEditModal
        editor={activeEditor}
        value={draftValue}
        sleepRange={draftSleepRange}
        workout={draftWorkout}
        isTrackingWorkout={isTrackingWorkout}
        trackingElapsedSeconds={trackingElapsedSeconds}
        trackingStatus={trackingStatus}
        onChange={setDraftValue}
        onSleepRangeChange={setDraftSleepRange}
        onWorkoutChange={setDraftWorkout}
        onStartWorkoutTracking={startWorkoutTracking}
        onStopWorkoutTracking={stopWorkoutTracking}
        onClose={closeEditor}
        onSave={saveEditor}
      />
    </main>
  );
}

export function RecordHeader({ onBack, onCalendar }) {
  return (
    <header className="pt-1">
      <div className="flex items-center justify-between px-1 text-[16px] font-black text-[#0D1B33]">
        <span>9:41</span>

        <div className="flex items-center gap-2 text-[#0D1B33]">
          <SignalHigh className="h-5 w-5" strokeWidth={2.4} />
          <Wifi className="h-5 w-5" strokeWidth={2.4} />
          <BatteryFull className="h-6 w-6" strokeWidth={2.4} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[42px_1fr_42px] items-center">
        <button
          aria-label="返回"
          className="flex h-10 w-10 items-center justify-center rounded-2xl text-[#0D1B33] transition-colors hover:bg-[#EEF6FF]"
          type="button"
          onClick={onBack}
        >
          <ArrowLeft className="h-7 w-7" strokeWidth={2.5} />
        </button>

        <h1 className="text-center text-[27px] font-black tracking-tight text-[#111827]">
          今日记录
        </h1>

        <button
          aria-label="日历"
          className="flex h-10 w-10 items-center justify-center rounded-2xl text-[#0D1B33] transition-colors hover:bg-[#EEF6FF]"
          type="button"
          onClick={onCalendar}
        >
          <CalendarDays className="h-6 w-6" strokeWidth={2.4} />
        </button>
      </div>
    </header>
  );
}

export function RecordHero() {
  return (
    <section className="relative mt-3 min-h-[154px] overflow-visible rounded-[30px]">
      <div className="relative z-10 max-w-[60%] pt-5">
        <h2 className="text-[26px] font-black leading-[1.08] tracking-tight text-[#111827]">
          记录<span className="text-[#1677FF]">今日状态</span>
        </h2>
        <p className="mt-2 text-[13px] font-medium leading-[18px] text-[#60728A]">
          每天进步一点点，男神正在进化！
        </p>
      </div>

      <div className="pointer-events-none absolute right-[-16px] top-[34px] h-[176px] w-[176px] rounded-full bg-[#EAF4FF]" />
      <img
        alt="西格玛牛角色"
        className="pointer-events-none absolute right-[-2px] top-[2px] h-[188px] w-[188px] object-contain object-top drop-shadow-[0_18px_24px_rgba(13,27,51,0.12)]"
        src="/record-cow.png"
      />

      <Sparkles className="pointer-events-none absolute left-[52%] top-[64px] h-4 w-4 text-[#FFC83D]" />
      <Sparkles className="pointer-events-none absolute right-4 top-[80px] h-4 w-4 text-[#FFC83D]" />
    </section>
  );
}

export function DatePill({ dateLabel = "2025年05月20日 今天", onClick }) {
  return (
    <button
      className="relative z-20 mt-[-2px] inline-flex h-9 w-fit items-center gap-2.5 rounded-full border border-[#BFD8FF] bg-[#F0F7FF] px-5 text-[14px] font-bold text-[#1677FF]"
      type="button"
      onClick={onClick}
    >
      <CalendarDays className="h-5 w-5" strokeWidth={2.4} />
      <span>{dateLabel}</span>
    </button>
  );
}

export function RecordItemCard({
  Icon,
  title,
  description,
  value,
  unit,
  prefix,
  footer,
  onClick,
}) {
  const hasValue = value !== null && value !== undefined && value !== "";

  return (
    <button
      className="flex min-h-[72px] w-full items-center gap-3 rounded-[24px] border border-[#EEF3FA] bg-white px-4 py-2 text-left shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-transform hover:-translate-y-0.5"
      type="button"
      onClick={onClick}
    >
      <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-[#E8F2FF] text-[#1677FF]">
        <Icon className="h-[23px] w-[23px]" strokeWidth={2.4} />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-[18px] font-black leading-5 text-[#111827]">{title}</h3>
        <p className="mt-0.5 text-[12px] font-medium leading-4 text-[#60728A]">
          {description}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <div className="flex min-w-[80px] flex-col items-end justify-center">
          <div className="flex items-end gap-1">
            {prefix ? (
              <span className="pb-0.5 text-[14px] font-medium text-[#60728A]">
                {prefix}
              </span>
            ) : null}
            {hasValue ? (
              <span className="text-[30px] font-black leading-none text-[#1677FF]">
                {value}
              </span>
            ) : null}
            {unit ? (
              <span className="pb-0.5 text-[13px] font-medium text-[#60728A]">
                {unit}
              </span>
            ) : null}
          </div>

          {footer ? <div className="mt-1">{footer}</div> : null}
        </div>

        <ChevronRight className="h-5 w-5 text-[#C7CFDB]" strokeWidth={2.2} />
      </div>
    </button>
  );
}

export function StarRow({ filled = 0 }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          className={[
            "text-[15px] leading-none",
            star <= filled ? "text-[#FFC83D]" : "text-[#DCE3EE]",
          ]
            .filter(Boolean)
            .join(" ")}
          key={star}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function MoodSelector({ mood, onMoodChange }) {
  const moodIcons = [Angry, Frown, Meh, Smile, Laugh];
  const activeIndex = Math.max(moodOptions.indexOf(mood), 0);

  return (
    <div className="flex flex-col items-end">
      <div className="flex items-center gap-1">
        {moodIcons.map((MoodIcon, index) => {
          const isActive = index === activeIndex;

          return (
            <span
              role="button"
              tabIndex={0}
              className={[
                "flex h-6 w-6 items-center justify-center rounded-full border text-[#8C95A5] transition-colors",
                isActive
                  ? "border-[#1677FF] bg-[#FFE35A] text-[#111827] shadow-[0_4px_12px_rgba(22,119,255,0.22)]"
                  : "border-transparent bg-[#EEF2F8] text-[#8C95A5]",
              ]
                .filter(Boolean)
                .join(" ")}
              key={MoodIcon.displayName || `mood-${index}`}
              onClick={(event) => {
                event.stopPropagation();
                onMoodChange?.(moodOptions[index]);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  onMoodChange?.(moodOptions[index]);
                }
              }}
            >
              <MoodIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
          );
        })}
      </div>

      <p className="mt-1 text-[12px] font-black text-[#1677FF]">{mood}</p>
    </div>
  );
}

export function SubmitRecordButton({ onClick }) {
  return (
    <button
      className="relative mt-2.5 flex h-[56px] w-full items-center justify-center overflow-hidden rounded-[24px] bg-[linear-gradient(90deg,#1677FF_0%,#006DFF_100%)] pr-20 text-[20px] font-black text-white shadow-[0_18px_34px_rgba(10,141,255,0.32)]"
      type="button"
      onClick={onClick}
    >
      提交我的牛马状态

      <span className="pointer-events-none absolute right-2 bottom-[-4px] h-[68px] w-[68px] overflow-hidden rounded-full">
        <img
          alt="小牛头像"
          className="h-full w-full object-contain object-center"
          src="/record-cow.png"
        />
      </span>
    </button>
  );
}

export function RecordEditModal({
  editor,
  value,
  sleepRange,
  workout,
  isTrackingWorkout,
  trackingElapsedSeconds,
  trackingStatus,
  onChange,
  onSleepRangeChange,
  onWorkoutChange,
  onStartWorkoutTracking,
  onStopWorkoutTracking,
  onClose,
  onSave,
}) {
  if (!editor) {
    return null;
  }

  const isMoodEditor = editor.type === "mood";
  const isSleepEditor = editor.type === "sleep";
  const isWorkoutEditor = editor.type === "workout";
  const calculatedSleepHours = isSleepEditor
    ? calculateSleepHoursFromTimes(
        sleepRange?.sleepStartTime,
        sleepRange?.sleepEndTime,
      )
    : null;
  const selectedWorkoutType = normalizeWorkoutType(workout?.workoutType);
  const canTrackRoute =
    isWorkoutEditor &&
    selectedWorkoutType === "aerobic" &&
    ["跑步", "徒步"].includes(workout?.customWorkout?.trim() || workout?.workoutName);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#0D1B33]/35 px-4 pb-4 backdrop-blur-sm">
      <div className="w-full max-w-[390px] rounded-[28px] border border-[#DCEBFF] bg-white p-5 shadow-[0_24px_64px_rgba(13,27,51,0.22)]">
        <div className="flex items-center justify-between">
          <h2 className="text-[22px] font-black text-[#111827]">{editor.title}</h2>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F0F7FF] text-[18px] font-black text-[#1677FF]"
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {isMoodEditor ? (
          <div className="mt-5 grid grid-cols-5 gap-2">
            {moodOptions.map((mood) => {
              const isActive = value === mood;

              return (
                <button
                  className={[
                    "h-12 rounded-2xl border text-[13px] font-black transition-colors",
                    isActive
                      ? "border-[#1677FF] bg-[#EAF4FF] text-[#1677FF]"
                      : "border-[#E6EDFF] bg-white text-[#60728A]",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={mood}
                  type="button"
                  onClick={() => onChange(mood)}
                >
                  {mood}
                </button>
              );
            })}
          </div>
        ) : isSleepEditor ? (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[13px] font-bold text-[#60728A]">
                  入睡时间
                </span>
                <input
                  className="mt-2 h-14 w-full rounded-[18px] border border-[#DCEBFF] bg-[#F8FBFF] px-3 text-[22px] font-black text-[#1677FF] outline-none focus:border-[#1677FF]"
                  type="time"
                  value={sleepRange?.sleepStartTime || "00:00"}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    onSleepRangeChange?.((current) => ({
                      ...current,
                      sleepStartTime: nextValue,
                    }));
                  }}
                  onInput={(event) => {
                    const nextValue = event.currentTarget.value;
                    onSleepRangeChange?.((current) => ({
                      ...current,
                      sleepStartTime: nextValue,
                    }));
                  }}
                />
              </label>

              <label className="block">
                <span className="text-[13px] font-bold text-[#60728A]">
                  起床时间
                </span>
                <input
                  className="mt-2 h-14 w-full rounded-[18px] border border-[#DCEBFF] bg-[#F8FBFF] px-3 text-[22px] font-black text-[#1677FF] outline-none focus:border-[#1677FF]"
                  type="time"
                  value={sleepRange?.sleepEndTime || "08:00"}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    onSleepRangeChange?.((current) => ({
                      ...current,
                      sleepEndTime: nextValue,
                    }));
                  }}
                  onInput={(event) => {
                    const nextValue = event.currentTarget.value;
                    onSleepRangeChange?.((current) => ({
                      ...current,
                      sleepEndTime: nextValue,
                    }));
                  }}
                />
              </label>
            </div>

            <div className="rounded-[20px] border border-[#DCEBFF] bg-[#F0F7FF] px-4 py-3">
              <p className="text-[13px] font-bold text-[#60728A]">
                自动计算睡眠
              </p>
              <p className="mt-1 text-[26px] font-black text-[#1677FF]">
                {calculatedSleepHours ?? 0}
                <span className="ml-1 text-[14px] text-[#60728A]">小时</span>
              </p>
            </div>
          </div>
        ) : isWorkoutEditor ? (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-[18px] bg-[#F0F7FF] p-1.5">
              {Object.entries(workoutTypeLabels).map(([type, label]) => {
                const isActive = workout?.workoutType === type;

                return (
                  <button
                    className={[
                      "h-11 rounded-[15px] text-[15px] font-black transition-colors",
                      isActive
                        ? "bg-[#1677FF] text-white shadow-[0_10px_22px_rgba(22,119,255,0.24)]"
                        : "text-[#60728A]",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={type}
                    type="button"
                    onClick={() => {
                      const nextWorkoutName = workoutOptions[type][0];
                      onWorkoutChange?.((current) => ({
                        ...current,
                        workoutType: type,
                        workoutName: nextWorkoutName,
                        customWorkout: "",
                      }));
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div>
              <p className="text-[13px] font-bold text-[#60728A]">
                选择运动
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {workoutOptions[normalizeWorkoutType(workout?.workoutType)].map(
                  (option) => {
                    const isActive =
                      !workout?.customWorkout && workout?.workoutName === option;

                    return (
                      <button
                        className={[
                          "min-h-10 rounded-2xl border px-2 text-[13px] font-black transition-colors",
                          isActive
                            ? "border-[#1677FF] bg-[#EAF4FF] text-[#1677FF]"
                            : "border-[#E6EDFF] bg-white text-[#60728A]",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        key={option}
                        type="button"
                        onClick={() =>
                          onWorkoutChange?.((current) => ({
                            ...current,
                            workoutName: option,
                            customWorkout: "",
                          }))
                        }
                      >
                        {option}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            <label className="block">
              <span className="text-[13px] font-bold text-[#60728A]">
                自定义动作
              </span>
              <input
                className="mt-2 h-12 w-full rounded-[18px] border border-[#DCEBFF] bg-[#F8FBFF] px-4 text-[16px] font-black text-[#1677FF] outline-none focus:border-[#1677FF]"
                placeholder="例如：椭圆机、卧推、深蹲"
                type="text"
                value={workout?.customWorkout || ""}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  onWorkoutChange?.((current) => ({
                    ...current,
                    customWorkout: nextValue,
                  }));
                }}
              />
            </label>

            <label className="block">
              <span className="text-[13px] font-bold text-[#60728A]">
                训练时长（分钟）
              </span>
              <input
                className="mt-2 h-14 w-full rounded-[18px] border border-[#DCEBFF] bg-[#F8FBFF] px-4 text-[24px] font-black text-[#1677FF] outline-none focus:border-[#1677FF]"
                inputMode="numeric"
                max={600}
                min={0}
                step={1}
                type="number"
                value={workout?.workoutMinutes ?? 0}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  onWorkoutChange?.((current) => ({
                    ...current,
                    workoutMinutes: nextValue,
                  }));
                }}
              />
            </label>

            {canTrackRoute ? (
              <div className="rounded-[22px] border border-[#DCEBFF] bg-[#F0F7FF] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-black text-[#0D1B33]">
                      跑步 / 徒步轨迹测试
                    </p>
                    <p className="mt-1 text-[12px] font-bold text-[#60728A]">
                      前台 GPS 记录，先适合你们自己试用
                    </p>
                  </div>

                  {isTrackingWorkout ? (
                    <button
                      className="h-10 rounded-full bg-[#FF4D4F] px-4 text-[13px] font-black text-white"
                      type="button"
                      onClick={() => onStopWorkoutTracking?.({ updateMinutes: true })}
                    >
                      结束
                    </button>
                  ) : (
                    <button
                      className="h-10 rounded-full bg-[#1677FF] px-4 text-[13px] font-black text-white"
                      type="button"
                      onClick={onStartWorkoutTracking}
                    >
                      开始
                    </button>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-[16px] bg-white px-2 py-2 text-center">
                    <p className="text-[10px] font-bold text-[#8A95AA]">距离</p>
                    <p className="mt-1 text-[16px] font-black text-[#1677FF]">
                      {Number(workout?.workoutDistanceKm || 0).toFixed(2)}
                      <span className="ml-0.5 text-[10px]">km</span>
                    </p>
                  </div>
                  <div className="rounded-[16px] bg-white px-2 py-2 text-center">
                    <p className="text-[10px] font-bold text-[#8A95AA]">时间</p>
                    <p className="mt-1 text-[16px] font-black text-[#1677FF]">
                      {formatElapsedTime(trackingElapsedSeconds)}
                    </p>
                  </div>
                  <div className="rounded-[16px] bg-white px-2 py-2 text-center">
                    <p className="text-[10px] font-bold text-[#8A95AA]">点位</p>
                    <p className="mt-1 text-[16px] font-black text-[#1677FF]">
                      {workout?.workoutRoutePoints?.length || 0}
                    </p>
                  </div>
                </div>

                {trackingStatus ? (
                  <p className="mt-3 text-[12px] font-bold leading-5 text-[#60728A]">
                    {trackingStatus}
                  </p>
                ) : null}

                <label className="mt-3 block">
                  <span className="text-[12px] font-bold text-[#60728A]">
                    手动距离（km）
                  </span>
                  <input
                    className="mt-2 h-11 w-full rounded-[16px] border border-[#DCEBFF] bg-white px-3 text-[18px] font-black text-[#1677FF] outline-none focus:border-[#1677FF]"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    type="number"
                    value={workout?.workoutDistanceKm ?? 0}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      onWorkoutChange?.((current) => ({
                        ...current,
                        workoutDistanceKm: nextValue,
                      }));
                    }}
                  />
                </label>
              </div>
            ) : null}
          </div>
        ) : (
          <label className="mt-5 block">
            <span className="text-[13px] font-bold text-[#60728A]">
              输入数值 {editor.unit ? `(${editor.unit})` : ""}
            </span>
            <input
              className="mt-2 h-14 w-full rounded-[18px] border border-[#DCEBFF] bg-[#F8FBFF] px-4 text-[24px] font-black text-[#1677FF] outline-none focus:border-[#1677FF]"
              inputMode="decimal"
              max={editor.max}
              min={editor.min}
              step={editor.step}
              type="number"
              value={value}
              onChange={(event) => onChange(event.target.value)}
            />
          </label>
        )}

        <button
          className="mt-5 h-12 w-full rounded-[20px] bg-[linear-gradient(90deg,#1677FF_0%,#006DFF_100%)] text-[17px] font-black text-white shadow-[0_14px_28px_rgba(10,141,255,0.28)]"
          type="button"
          onClick={onSave}
        >
          保存
        </button>
      </div>
    </div>
  );
}

export function BottomTabBar({ activePage, onNavigate }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E6EDFF] bg-white/95 px-5 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 backdrop-blur-xl">
      <div className="mx-auto grid w-full max-w-[430px] grid-cols-4 gap-1">
        {navItems.map(({ id, label, Icon }) => {
          const isActive = id === activePage;

          return (
            <button
              className={[
                "flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-2xl text-[12px] font-bold transition-colors",
                isActive ? "text-[#1677FF]" : "text-[#8A95A3]",
              ]
                .filter(Boolean)
                .join(" ")}
              key={id}
              type="button"
              onClick={() => onNavigate?.(id)}
            >
              <span
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                  isActive
                    ? "bg-[#1677FF] text-white shadow-[0_8px_18px_rgba(22,119,255,0.28)]"
                    : "text-[#8A95A3]",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={2.4} />
              </span>
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
