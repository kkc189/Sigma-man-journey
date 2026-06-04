"use client";

import { useEffect, useRef, useState } from "react";
import {
  Angry,
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Copy,
  Dumbbell,
  Frown,
  Home,
  Laugh,
  Meh,
  Minus,
  MoonStar,
  Pen,
  Plus,
  Shield,
  Smile,
  Sparkles,
  Smartphone,
  Target,
  Trash2,
  User,
  UtensilsCrossed,
} from "lucide-react";
import {
  loadDailyRecord,
  saveDailyRecord,
  updateUserStats,
} from "../lib/records-store";
import {
  createSharedRunSession,
  joinSharedRunSession,
  loadSharedRunState,
  publishSharedRunLocation,
  subscribeSharedRunSession,
} from "../lib/shared-run-store";

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
  nutritionItems: [],
  nutritionNotes: "",
  phoneHours: 3.2,
  mood: "开心满满",
  completedActions: 3,
  executionItems: [],
  executionTask: "",
  executionMinutes: 0,
  abstinenceDays: 0,
};
const ACTIVE_WORKOUT_TRACKING_KEY = "activeWorkoutTrackingDraft";

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

function normalizeExecutionItems(input) {
  const rawItems = Array.isArray(input?.executionItems)
    ? input.executionItems
    : [];
  const normalizedItems = rawItems
    .map((item) => {
      const title = String(item?.title || item?.task || item?.name || "").trim();
      const minutes = Math.round(
        clampNumber(
          Number(item?.minutes ?? item?.durationMinutes ?? item?.executionMinutes) || 0,
          0,
          1440,
        ),
      );

      return { title, minutes };
    })
    .filter((item) => item.title || item.minutes > 0);
  const legacyTitle = String(input?.executionTask || "").trim();
  const legacyMinutes = Math.round(
    clampNumber(Number(input?.executionMinutes) || 0, 0, 1440),
  );

  if (normalizedItems.length === 0 && (legacyTitle || legacyMinutes > 0)) {
    return [{ title: legacyTitle, minutes: legacyMinutes }];
  }

  return normalizedItems;
}

function getExecutionTotalMinutes(items) {
  return items.reduce((total, item) => total + (Number(item.minutes) || 0), 0);
}

function getExecutionSummary(input) {
  const items = normalizeExecutionItems(input);

  if (items.length === 0) {
    return "";
  }

  if (items.length === 1) {
    return [
      items[0].title,
      items[0].minutes > 0 ? `${items[0].minutes} 分钟` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  const totalMinutes = getExecutionTotalMinutes(items);

  return [
    `${items.length} 件`,
    totalMinutes > 0 ? `${totalMinutes} 分钟` : "",
    items[0].title,
  ]
    .filter(Boolean)
    .join(" · ");
}

function createDraftExecutionItem(item = {}, index = 0) {
  return {
    id: item.id || `execution-${index}-${String(item.title || "item")}`,
    title: item.title || "",
    minutes: item.minutes || "",
  };
}

function createEmptyDraftExecutionItem() {
  return {
    id: `execution-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: "",
    minutes: "",
  };
}

function getDraftExecutionItems(input) {
  const items = normalizeExecutionItems(input);
  const sourceItems = items.length > 0 ? items : [{ title: "", minutes: "" }];

  return sourceItems.map(createDraftExecutionItem);
}

function normalizeNutritionItems(input) {
  const rawItems = Array.isArray(input?.nutritionItems)
    ? input.nutritionItems
    : [];
  const normalizedItems = rawItems
    .map((item) => String(item?.name || item?.title || item?.food || item || "").trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((name) => ({ name }));

  if (normalizedItems.length > 0) {
    return normalizedItems;
  }

  return String(input?.nutritionNotes || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((name) => ({ name }));
}

function getNutritionNotesFromItems(items) {
  return items
    .map((item) => String(item?.name || "").trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, 400);
}

function createDraftNutritionItem(item = {}, index = 0) {
  return {
    id: item.id || `nutrition-${index}-${String(item.name || "item")}`,
    name: item.name || "",
  };
}

function createEmptyDraftNutritionItem() {
  return {
    id: `nutrition-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "",
  };
}

function getDraftNutritionItems(input) {
  const items = normalizeNutritionItems(input);
  const sourceItems = items.length > 0 ? items : [{ name: "" }];

  return sourceItems.map(createDraftNutritionItem);
}

function normalizeNutritionNotes(value) {
  return getNutritionNotesFromItems(normalizeNutritionItems(value ? { nutritionNotes: value } : {}));
}

function getNutritionPreview(input) {
  const preview = getNutritionNotesFromItems(normalizeNutritionItems(input)).replace(
    /\n+/g,
    " · ",
  );

  if (!preview) {
    return "";
  }

  return preview.length > 34 ? `${preview.slice(0, 34)}...` : preview;
}

function safeParseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function loadActiveWorkoutTrackingDraft() {
  if (typeof window === "undefined") {
    return null;
  }

  const draft = safeParseJson(
    window.localStorage.getItem(ACTIVE_WORKOUT_TRACKING_KEY),
    null,
  );

  if (!draft?.workout?.workoutRouteStartedAt) {
    return null;
  }

  return draft;
}

function saveActiveWorkoutTrackingDraft(workout, startedAt, elapsedSeconds) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    ACTIVE_WORKOUT_TRACKING_KEY,
    JSON.stringify({
      workout,
      startedAt,
      elapsedSeconds,
      savedAt: new Date().toISOString(),
    }),
  );
}

function clearActiveWorkoutTrackingDraft() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACTIVE_WORKOUT_TRACKING_KEY);
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

function getTimestampMs(value) {
  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : null;
}

function getRouteDurationSecondsFromPoints(points) {
  if (!Array.isArray(points) || points.length < 2) {
    return 0;
  }

  const startedAt = getTimestampMs(points[0]?.timestamp);
  const endedAt = getTimestampMs(points[points.length - 1]?.timestamp);

  if (startedAt === null || endedAt === null || endedAt <= startedAt) {
    return 0;
  }

  return Math.floor((endedAt - startedAt) / 1000);
}

function getWorkoutRouteDurationSeconds(workout, fallbackSeconds = 0) {
  const startedAt = getTimestampMs(workout?.workoutRouteStartedAt);
  const endedAt = getTimestampMs(workout?.workoutRouteEndedAt);

  if (startedAt !== null && endedAt !== null && endedAt > startedAt) {
    return Math.floor((endedAt - startedAt) / 1000);
  }

  return getRouteDurationSecondsFromPoints(workout?.workoutRoutePoints) || fallbackSeconds;
}

function getWorkoutRouteMinutes(workout, fallbackSeconds = 0) {
  const durationSeconds = getWorkoutRouteDurationSeconds(workout, fallbackSeconds);

  return durationSeconds > 0 ? Math.max(1, Math.round(durationSeconds / 60)) : 0;
}

const MAP_TILE_SIZE = 256;
const MAP_WIDTH = 320;
const MAP_HEIGHT = 220;
const MIN_ROUTE_MAP_ZOOM = 11;
const MAX_ROUTE_MAP_ZOOM = 19;

function isValidRoutePoint(point) {
  return (
    point &&
    Number.isFinite(Number(point.lat)) &&
    Number.isFinite(Number(point.lng))
  );
}

function clampLatitude(lat) {
  return clampNumber(Number(lat) || 0, -85.05112878, 85.05112878);
}

function projectPointToWorld(point, zoom) {
  const lat = clampLatitude(point.lat);
  const lng = Number(point.lng) || 0;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const scale = MAP_TILE_SIZE * 2 ** zoom;

  return {
    x: ((lng + 180) / 360) * scale,
    y:
      (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) *
      scale,
  };
}

function getRouteBounds(points) {
  return points.reduce(
    (bounds, point) => ({
      minLat: Math.min(bounds.minLat, Number(point.lat)),
      maxLat: Math.max(bounds.maxLat, Number(point.lat)),
      minLng: Math.min(bounds.minLng, Number(point.lng)),
      maxLng: Math.max(bounds.maxLng, Number(point.lng)),
    }),
    {
      minLat: Number(points[0].lat),
      maxLat: Number(points[0].lat),
      minLng: Number(points[0].lng),
      maxLng: Number(points[0].lng),
    },
  );
}

function chooseRouteMapZoom(points) {
  if (points.length < 2) {
    return 16;
  }

  const bounds = getRouteBounds(points);

  for (let zoom = 17; zoom >= MIN_ROUTE_MAP_ZOOM; zoom -= 1) {
    const topLeft = projectPointToWorld(
      { lat: bounds.maxLat, lng: bounds.minLng },
      zoom,
    );
    const bottomRight = projectPointToWorld(
      { lat: bounds.minLat, lng: bounds.maxLng },
      zoom,
    );

    if (
      Math.abs(bottomRight.x - topLeft.x) <= MAP_WIDTH - 56 &&
      Math.abs(bottomRight.y - topLeft.y) <= MAP_HEIGHT - 56
    ) {
      return zoom;
    }
  }

  return MIN_ROUTE_MAP_ZOOM;
}

function getMetersPerPixel(lat, zoom) {
  return (
    (156543.03392 * Math.cos((clampLatitude(lat) * Math.PI) / 180)) /
    2 ** zoom
  );
}

function getSpeedHeatColor(speedKmh) {
  const ratio = clampNumber(Number(speedKmh) || 0, 0, 12) / 12;
  const hue = Math.round(130 - ratio * 126);

  return `hsl(${hue}, 86%, 48%)`;
}

function getRankLabel(rank) {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";

  return `${rank}th`;
}

function getRouteSpeedSegments(points, projectedPoints) {
  const segments = [];

  for (let index = 1; index < points.length; index += 1) {
    const previousPoint = points[index - 1];
    const nextPoint = points[index];
    const previousProjectedPoint = projectedPoints[index - 1];
    const nextProjectedPoint = projectedPoints[index];
    const previousTimestamp = getTimestampMs(previousPoint.timestamp);
    const nextTimestamp = getTimestampMs(nextPoint.timestamp);
    const seconds =
      previousTimestamp !== null &&
      nextTimestamp !== null &&
      nextTimestamp > previousTimestamp
        ? (nextTimestamp - previousTimestamp) / 1000
        : 0;
    const distanceKm = getDistanceBetweenPoints(previousPoint, nextPoint);
    const speedKmh = seconds > 0 ? (distanceKm / seconds) * 3600 : 0;

    segments.push({
      key: `${index}-${previousPoint.timestamp || ""}-${nextPoint.timestamp || ""}`,
      color: getSpeedHeatColor(speedKmh),
      distanceKm,
      speedKmh,
      x1: previousProjectedPoint.x,
      y1: previousProjectedPoint.y,
      x2: nextProjectedPoint.x,
      y2: nextProjectedPoint.y,
    });
  }

  return segments;
}

function buildRouteMapData(routePoints, participantLocations = [], zoomOffset = 0) {
  const points = Array.isArray(routePoints)
    ? routePoints.filter(isValidRoutePoint)
    : [];
  const markers = Array.isArray(participantLocations)
    ? participantLocations.filter(isValidRoutePoint)
    : [];
  const boundsPoints = [...points, ...markers];

  if (boundsPoints.length === 0) {
    return null;
  }

  const bounds = getRouteBounds(boundsPoints);
  const center = {
    lat: (bounds.minLat + bounds.maxLat) / 2,
    lng: (bounds.minLng + bounds.maxLng) / 2,
  };
  const baseZoom = chooseRouteMapZoom(boundsPoints);
  const zoom = clampNumber(
    baseZoom + Number(zoomOffset || 0),
    MIN_ROUTE_MAP_ZOOM,
    MAX_ROUTE_MAP_ZOOM,
  );
  const centerWorld = projectPointToWorld(center, zoom);
  const worldSize = MAP_TILE_SIZE * 2 ** zoom;
  const minTileX = Math.floor((centerWorld.x - MAP_WIDTH / 2) / MAP_TILE_SIZE) - 1;
  const maxTileX = Math.floor((centerWorld.x + MAP_WIDTH / 2) / MAP_TILE_SIZE) + 1;
  const minTileY = Math.floor((centerWorld.y - MAP_HEIGHT / 2) / MAP_TILE_SIZE) - 1;
  const maxTileY = Math.floor((centerWorld.y + MAP_HEIGHT / 2) / MAP_TILE_SIZE) + 1;
  const tileCount = 2 ** zoom;
  const tiles = [];

  for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
    for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
      if (tileY < 0 || tileY >= tileCount) {
        continue;
      }

      const wrappedTileX = ((tileX % tileCount) + tileCount) % tileCount;

      tiles.push({
        key: `${zoom}-${tileX}-${tileY}`,
        src: `https://tile.openstreetmap.org/${zoom}/${wrappedTileX}/${tileY}.png`,
        left: MAP_WIDTH / 2 + tileX * MAP_TILE_SIZE - centerWorld.x,
        top: MAP_HEIGHT / 2 + tileY * MAP_TILE_SIZE - centerWorld.y,
      });
    }
  }

  const projectedPoints = points.map((point) => {
    const worldPoint = projectPointToWorld(point, zoom);
    let offsetX = worldPoint.x - centerWorld.x;

    if (Math.abs(offsetX) > worldSize / 2) {
      offsetX += offsetX > 0 ? -worldSize : worldSize;
    }

    return {
      x: MAP_WIDTH / 2 + offsetX,
      y: MAP_HEIGHT / 2 + worldPoint.y - centerWorld.y,
      accuracy: Number(point.accuracy) || 0,
      lat: Number(point.lat),
      lng: Number(point.lng),
      timestamp: point.timestamp || "",
    };
  });

  const speedSegments = getRouteSpeedSegments(points, projectedPoints);
  const totalSegmentDistanceKm = speedSegments.reduce(
    (total, segment) => total + segment.distanceKm,
    0,
  );
  const durationSeconds = getRouteDurationSecondsFromPoints(points);
  const averageSpeedKmh =
    durationSeconds > 0 ? (totalSegmentDistanceKm / durationSeconds) * 3600 : 0;
  const topSpeedKmh = speedSegments.reduce(
    (topSpeed, segment) => Math.max(topSpeed, segment.speedKmh),
    0,
  );
  const participantMarkers = markers.map((marker) => {
    const worldPoint = projectPointToWorld(marker, zoom);
    let offsetX = worldPoint.x - centerWorld.x;

    if (Math.abs(offsetX) > worldSize / 2) {
      offsetX += offsetX > 0 ? -worldSize : worldSize;
    }

    return {
      ...marker,
      x: MAP_WIDTH / 2 + offsetX,
      y: MAP_HEIGHT / 2 + worldPoint.y - centerWorld.y,
      speedKmh: Number(marker.speedKmh) || 0,
      distanceKm: Number(marker.distanceKm) || 0,
    };
  });
  const currentPoint = projectedPoints[projectedPoints.length - 1];
  const accuracyRadius =
    currentPoint?.accuracy > 0
      ? clampNumber(
          currentPoint.accuracy /
            Math.max(getMetersPerPixel(currentPoint.lat, zoom), 0.1),
          8,
          58,
        )
      : 0;

  return {
    zoom,
    tiles,
    projectedPoints,
    currentPoint,
    startPoint: projectedPoints[0],
    accuracyRadius,
    speedSegments,
    averageSpeedKmh,
    topSpeedKmh,
    participantMarkers,
  };
}

function getLatestSharedRunMarkers(participants, locations) {
  const latestByUserId = new Map();

  (locations || []).forEach((location) => {
    const userId = location.user_id;
    const current = latestByUserId.get(userId);
    const currentTime = current ? Date.parse(current.recorded_at) : 0;
    const nextTime = Date.parse(location.recorded_at);

    if (!current || (Number.isFinite(nextTime) && nextTime >= currentTime)) {
      latestByUserId.set(userId, location);
    }
  });

  const markers = (participants || [])
    .map((participant) => {
      const location = latestByUserId.get(participant.user_id);

      if (!location) {
        return null;
      }

      return {
        lat: Number(location.lat),
        lng: Number(location.lng),
        accuracy: Number(location.accuracy) || 0,
        speedKmh: Number(location.speed_kmh) || 0,
        distanceKm: Number(location.distance_km) || 0,
        displayName: participant.display_name || "跑友",
        color: participant.color || "#1677FF",
        userId: participant.user_id,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.speedKmh - a.speedKmh || b.distanceKm - a.distanceKm);

  return markers.map((marker, index) => ({
    ...marker,
    rank: index + 1,
    rankLabel: getRankLabel(index + 1),
    isLeader: index === 0,
  }));
}

function getSharedRunTimeline(locations) {
  return [...(locations || [])]
    .filter((location) => Number.isFinite(Date.parse(location.recorded_at)))
    .sort((a, b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at));
}

function getSharedRunReplayLocations(locations, frameIndex) {
  const timeline = getSharedRunTimeline(locations);

  if (timeline.length === 0) {
    return [];
  }

  return timeline.slice(0, clampNumber(frameIndex, 0, timeline.length - 1) + 1);
}

function formatReplayTime(value) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "--:--";
  }

  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
}

function normalizeRecordInput(input) {
  const sleepStartTime = input.sleepStartTime || "00:00";
  const sleepEndTime =
    input.sleepEndTime || getDefaultSleepEndTime(input.sleepHours);
  const calculatedSleepHours = calculateSleepHoursFromTimes(
    sleepStartTime,
    sleepEndTime,
  );
  const executionItems = normalizeExecutionItems(input);
  const executionTotalMinutes = getExecutionTotalMinutes(executionItems);

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
    nutritionItems: normalizeNutritionItems(input),
    nutritionNotes: getNutritionNotesFromItems(normalizeNutritionItems(input)),
    phoneHours: Number(input.phoneHours) || 0,
    mood: moodOptions.includes(input.mood) ? input.mood : "一般",
    completedActions: Math.max(
      0,
      Number(input.completedActions) || 0,
      executionItems.length,
    ),
    executionItems,
    executionTask: input.executionTask?.trim() || executionItems[0]?.title || "",
    executionMinutes: Math.max(
      0,
      Number(input.executionMinutes) || 0,
      executionTotalMinutes,
    ),
    abstinenceDays: Math.max(0, Number(input.abstinenceDays) || 0),
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

  if (input.nutritionItems.length > 0) {
    lines.push(
      `饮食记录：${input.nutritionItems
        .map((item) => item.name)
        .filter(Boolean)
        .join("，")}。`,
    );
  }

  return lines.join("\n");
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
  const endWorkoutPressTimeoutRef = useRef(null);
  const sharedRunRef = useRef(null);
  const wakeLockRef = useRef(null);
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
  const [draftExecution, setDraftExecution] = useState({
    items: getDraftExecutionItems(initialRecordInput),
  });
  const [draftNutrition, setDraftNutrition] = useState({
    nutritionScore: initialRecordInput.nutritionScore,
    items: getDraftNutritionItems(initialRecordInput),
  });
  const [isTrackingWorkout, setIsTrackingWorkout] = useState(false);
  const [trackingElapsedSeconds, setTrackingElapsedSeconds] = useState(0);
  const [trackingStatus, setTrackingStatus] = useState("");
  const [sharedRun, setSharedRun] = useState(null);
  const [sharedRunParticipants, setSharedRunParticipants] = useState([]);
  const [sharedRunLocations, setSharedRunLocations] = useState([]);
  const [sharedRunJoinCode, setSharedRunJoinCode] = useState("");
  const [sharedRunMessage, setSharedRunMessage] = useState("");
  const [isSharedRunBusy, setIsSharedRunBusy] = useState(false);
  const [isRunReplayActive, setIsRunReplayActive] = useState(false);
  const [runReplayFrameIndex, setRunReplayFrameIndex] = useState(0);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
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

    setSelectedDateKey(nextDateKey);

    async function hydrateRecord() {
      const savedRecord = await loadDailyRecord(nextDateKey);

      if (cancelled) {
        return;
      }

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
          nutritionItems: normalizeNutritionItems(savedRecord),
          nutritionNotes: savedRecord.nutritionNotes || "",
          phoneHours: savedRecord.phoneHours,
          mood: savedRecord.mood,
          completedActions: savedRecord.completedActions,
          executionItems: normalizeExecutionItems(savedRecord),
          executionTask: savedRecord.executionTask || "",
          executionMinutes: savedRecord.executionMinutes || 0,
          abstinenceDays: savedRecord.abstinenceDays || 0,
        });
      } else {
        setRecordInput(initialRecordInput);
      }
    }

    hydrateRecord();

    if (typeof window !== "undefined" && source === "calendar") {
      localStorage.removeItem("selectedRecordSource");
    }

    return () => {
      cancelled = true;
    };
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

      if (endWorkoutPressTimeoutRef.current) {
        window.clearTimeout(endWorkoutPressTimeoutRef.current);
      }

      releaseWorkoutWakeLock();
    };
  }, []);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && isTrackingWorkout) {
        requestWorkoutWakeLock();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isTrackingWorkout]);

  useEffect(() => {
    if (!isTrackingWorkout) {
      return;
    }

    saveActiveWorkoutTrackingDraft(
      draftWorkout,
      trackingStartedAtRef.current,
      trackingElapsedSeconds,
    );
  }, [draftWorkout, isTrackingWorkout, trackingElapsedSeconds]);

  useEffect(() => {
    sharedRunRef.current = sharedRun;
  }, [sharedRun]);

  useEffect(() => {
    const sessionId = sharedRun?.session?.id;

    if (!sessionId) {
      return undefined;
    }

    let cancelled = false;

    async function refreshSharedRunState() {
      try {
        const state = await loadSharedRunState(sessionId);

        if (!cancelled) {
          setSharedRunParticipants(state.participants);
          setSharedRunLocations(state.locations);
        }
      } catch (error) {
        if (!cancelled) {
          setSharedRunMessage(`同跑同步失败：${error.message}`);
        }
      }
    }

    refreshSharedRunState();
    const unsubscribe = subscribeSharedRunSession(sessionId, refreshSharedRunState);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [sharedRun?.session?.id]);

  useEffect(() => {
    if (!isRunReplayActive) {
      return undefined;
    }

    const timelineLength = getSharedRunTimeline(sharedRunLocations).length;

    if (timelineLength <= 1) {
      setIsRunReplayActive(false);
      setRunReplayFrameIndex(0);
      return undefined;
    }

    const timer = window.setInterval(() => {
      setRunReplayFrameIndex((current) =>
        current >= timelineLength - 1 ? 0 : current + 1,
      );
    }, 650);

    return () => window.clearInterval(timer);
  }, [isRunReplayActive, sharedRunLocations]);

  function updateField(field, value) {
    setSavedMessage("");
    setRecordInput((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function requestWorkoutWakeLock() {
    if (typeof navigator === "undefined" || !navigator.wakeLock) {
      setTrackingStatus((current) =>
        current ||
        "当前浏览器不支持防锁屏。跑步时请把自动锁屏时间调长，并保持页面在前台。",
      );
      return;
    }

    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      wakeLockRef.current.addEventListener?.("release", () => {
        wakeLockRef.current = null;
      });
    } catch {
      setTrackingStatus((current) =>
        current ||
        "无法保持屏幕常亮。跑步时请把自动锁屏时间调长，并保持页面在前台。",
      );
    }
  }

  async function releaseWorkoutWakeLock() {
    if (!wakeLockRef.current) {
      return;
    }

    try {
      await wakeLockRef.current.release();
    } catch {
      // The browser may have already released it when the page went hidden.
    } finally {
      wakeLockRef.current = null;
    }
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
      const activeWorkoutDraft = loadActiveWorkoutTrackingDraft();
      const sourceWorkout = activeWorkoutDraft?.workout || recordInput;
      const restoredStartedAt = Number(activeWorkoutDraft?.startedAt) || null;
      const restoredElapsedSeconds = restoredStartedAt
        ? Math.floor((Date.now() - restoredStartedAt) / 1000)
        : Number(activeWorkoutDraft?.elapsedSeconds) || 0;

      setDraftWorkout({
        workoutType: normalizeWorkoutType(sourceWorkout.workoutType),
        workoutName: sourceWorkout.workoutName || "跑步",
        customWorkout: sourceWorkout.customWorkout || "",
        workoutMinutes: sourceWorkout.workoutMinutes || 0,
        workoutDistanceKm: sourceWorkout.workoutDistanceKm || 0,
        workoutRoutePoints: sourceWorkout.workoutRoutePoints || [],
        workoutRouteStartedAt: sourceWorkout.workoutRouteStartedAt || "",
        workoutRouteEndedAt: sourceWorkout.workoutRouteEndedAt || "",
      });
      setDraftValue("");
      setTrackingStatus(
        activeWorkoutDraft
          ? "已恢复上次未保存的跑步路线。手机网页锁屏后可能暂停 GPS，继续跑请重新点开始。"
          : "",
      );
      setTrackingElapsedSeconds(restoredElapsedSeconds);
      return;
    }

    if (config.type === "execution") {
      setDraftExecution({
        items: getDraftExecutionItems(recordInput),
      });
      setDraftValue("");
      return;
    }

    if (config.type === "nutrition") {
      setDraftNutrition({
        nutritionScore: recordInput.nutritionScore || 8,
        items: getDraftNutritionItems(recordInput),
      });
      setDraftValue("");
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

  function startEndWorkoutPress() {
    if (!isTrackingWorkout || endWorkoutPressTimeoutRef.current) {
      return;
    }

    setTrackingStatus("继续按住，跑步结束后会生成路线图和速度热力图。");
    endWorkoutPressTimeoutRef.current = window.setTimeout(() => {
      endWorkoutPressTimeoutRef.current = null;
      stopWorkoutTracking({
        updateMinutes: true,
        nextStatus: "跑步已结束，已生成路线图和速度热力图。",
      });
    }, 900);
  }

  function cancelEndWorkoutPress() {
    if (!endWorkoutPressTimeoutRef.current) {
      return;
    }

    window.clearTimeout(endWorkoutPressTimeoutRef.current);
    endWorkoutPressTimeoutRef.current = null;

    if (isTrackingWorkout) {
      setTrackingStatus("GPS 记录中，保持页面打开。");
    }
  }

  async function createSharedRun() {
    setIsSharedRunBusy(true);
    setSharedRunMessage("");

    try {
      const nextSharedRun = await createSharedRunSession();
      setSharedRun(nextSharedRun);
      setSharedRunJoinCode(nextSharedRun.session.code);
      setSharedRunParticipants([nextSharedRun.participant]);
      setSharedRunLocations([]);
      setSharedRunMessage(`同跑房间已创建：${nextSharedRun.session.code}`);
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(nextSharedRun.session.code).catch(() => {});
      }
      window.alert(`同跑码：${nextSharedRun.session.code}\n已生成，发给朋友输入即可加入。`);
    } catch (error) {
      const message = error.message || "创建同跑房间失败。";
      setSharedRunMessage(message);
      window.alert(message);
    } finally {
      setIsSharedRunBusy(false);
    }
  }

  async function joinSharedRun() {
    setIsSharedRunBusy(true);
    setSharedRunMessage("");

    try {
      const nextSharedRun = await joinSharedRunSession(sharedRunJoinCode);
      const state = await loadSharedRunState(nextSharedRun.session.id);

      setSharedRun(nextSharedRun);
      setSharedRunParticipants(state.participants);
      setSharedRunLocations(state.locations);
      setSharedRunJoinCode(nextSharedRun.session.code);
      setSharedRunMessage(`已加入同跑房间：${nextSharedRun.session.code}`);
    } catch (error) {
      const message = error.message || "加入同跑房间失败。";
      setSharedRunMessage(message);
      window.alert(message);
    } finally {
      setIsSharedRunBusy(false);
    }
  }

  function leaveSharedRun() {
    setSharedRun(null);
    setSharedRunParticipants([]);
    setSharedRunLocations([]);
    setIsRunReplayActive(false);
    setRunReplayFrameIndex(0);
    setSharedRunMessage("已退出同跑房间。");
  }

  function toggleRunReplay() {
    const timelineLength = getSharedRunTimeline(sharedRunLocations).length;

    if (timelineLength <= 1) {
      setSharedRunMessage("还没有足够的跑步点位，开始跑一会儿后就能回放。");
      return;
    }

    setRunReplayFrameIndex((current) =>
      current >= timelineLength - 1 ? 0 : current,
    );
    setIsRunReplayActive((current) => !current);
  }

  async function startWorkoutTracking() {
    if (!navigator.geolocation) {
      const message = "当前浏览器不支持定位，请换 Safari 或 Chrome 打开。";
      setTrackingStatus(message);
      window.alert(message);
      return;
    }

    setTrackingStatus("正在请求定位权限，请在弹窗里点允许。");

    if (navigator.permissions?.query) {
      try {
        const permission = await navigator.permissions.query({
          name: "geolocation",
        });

        if (permission.state === "denied") {
          const message =
            "定位权限已被拒绝。请在浏览器地址栏或手机系统设置里，把当前网页的定位权限改成允许，然后再点开始。";
          setTrackingStatus(message);
          window.alert(message);
          return;
        }
      } catch {
        // Some mobile browsers do not expose geolocation permission state.
      }
    }

    await requestWorkoutWakeLock();

    const restoredStartedAtMs =
      !draftWorkout.workoutRouteEndedAt && draftWorkout.workoutRouteStartedAt
        ? Date.parse(draftWorkout.workoutRouteStartedAt)
        : null;
    const startedAt =
      Number.isFinite(restoredStartedAtMs) && restoredStartedAtMs > 0
        ? new Date(restoredStartedAtMs)
        : new Date();
    const shouldContinueRoute =
      Array.isArray(draftWorkout.workoutRoutePoints) &&
      draftWorkout.workoutRoutePoints.length > 0 &&
      !draftWorkout.workoutRouteEndedAt;

    trackingStartedAtRef.current = startedAt.getTime();
    setTrackingElapsedSeconds(
      shouldContinueRoute
        ? Math.floor((Date.now() - startedAt.getTime()) / 1000)
        : 0,
    );
    setTrackingStatus(
      shouldContinueRoute
        ? "已继续上次路线，正在等待 GPS 定位..."
        : "正在等待 GPS 定位...屏幕会尽量保持常亮，请不要手动锁屏。",
    );
    setIsTrackingWorkout(true);
    setDraftWorkout((current) => ({
      ...current,
      workoutDistanceKm: shouldContinueRoute
        ? Number(current.workoutDistanceKm) || calculateRouteDistanceKm(current.workoutRoutePoints)
        : 0,
      workoutRoutePoints: shouldContinueRoute ? current.workoutRoutePoints : [],
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
          const nextDistanceKm = calculateRouteDistanceKm(nextPoints);

          if (sharedRunRef.current?.session?.id) {
            publishSharedRunLocation({
              sessionId: sharedRunRef.current.session.id,
              point,
              routePoints: nextPoints,
              distanceKm: nextDistanceKm,
            }).catch((publishError) => {
              console.warn("Failed to publish shared run location", publishError);
            });
          }

          return {
            ...current,
            workoutDistanceKm: nextDistanceKm,
            workoutRoutePoints: nextPoints,
          };
        });
        setTrackingStatus("GPS 记录中，保持页面打开。");
      },
      (error) => {
        const deniedMessage =
          error.code === error.PERMISSION_DENIED
            ? "定位权限被拒绝。请在浏览器地址栏或系统设置里允许当前网页定位，然后再点开始。"
            : `定位失败：${error.message}`;

        window.alert(deniedMessage);
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

    if (endWorkoutPressTimeoutRef.current) {
      window.clearTimeout(endWorkoutPressTimeoutRef.current);
      endWorkoutPressTimeoutRef.current = null;
    }

    const elapsedSeconds = trackingStartedAtRef.current
      ? Math.floor((Date.now() - trackingStartedAtRef.current) / 1000)
      : trackingElapsedSeconds;
    const trackedMinutes = elapsedSeconds > 0 ? Math.max(1, Math.round(elapsedSeconds / 60)) : 0;
    const endedAt = new Date().toISOString();

    trackingStartedAtRef.current = null;
    setIsTrackingWorkout(false);
    setTrackingElapsedSeconds(elapsedSeconds);
    setTrackingStatus(nextStatus);
    releaseWorkoutWakeLock();
    setDraftWorkout((current) => {
      const nextWorkout = {
        ...current,
        workoutMinutes: updateMinutes ? trackedMinutes : current.workoutMinutes,
        workoutRouteEndedAt: endedAt,
      };

      saveActiveWorkoutTrackingDraft(nextWorkout, null, elapsedSeconds);
      return nextWorkout;
    });
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
      const routeBasedMinutes = getWorkoutRouteMinutes(
        {
          ...draftWorkout,
          workoutRouteEndedAt: routeEndedAt,
        },
        elapsedSeconds,
      );

      if (isTrackingWorkout) {
        stopWorkoutTracking({ updateMinutes: false });
      }

      const workoutMinutes = Math.round(
        clampNumber(
          routeBasedMinutes || trackedMinutes || Number(draftWorkout.workoutMinutes) || 0,
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
      clearActiveWorkoutTrackingDraft();
      closeEditor();
      return;
    }

    if (activeEditor.type === "execution") {
      const executionItems = normalizeExecutionItems({
        executionItems: draftExecution.items,
      });
      const completedActions = executionItems.length;
      const executionMinutes = getExecutionTotalMinutes(executionItems);

      setSavedMessage("");
      setRecordInput((current) => ({
        ...current,
        completedActions,
        executionItems,
        executionTask: executionItems[0]?.title || "",
        executionMinutes,
      }));
      closeEditor();
      return;
    }

    if (activeEditor.type === "nutrition") {
      const nutritionItems = normalizeNutritionItems({
        nutritionItems: draftNutrition.items,
      });

      setSavedMessage("");
      setRecordInput((current) => ({
        ...current,
        nutritionScore: Math.round(
          clampNumber(Number(draftNutrition.nutritionScore) || 0, 1, 10),
        ),
        nutritionItems,
        nutritionNotes: getNutritionNotesFromItems(nutritionItems),
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

  async function handleSubmit() {
    const input = normalizeRecordInput(recordInput);
    const existingRecord = await loadDailyRecord(selectedDateKey);
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
    const records = await saveDailyRecord(record);
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

    updateUserStats(records);
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
            iconSrc="/record-icon-sleep.png"
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
            iconSrc="/record-icon-workout.png"
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
            iconSrc="/record-icon-nutrition.png"
            title="饮食评分"
            description="均衡饮食，营养满分"
            value={recordInput.nutritionScore}
            unit="/10"
            footer={
              <div className="max-w-[118px] text-right">
                <StarRow filled={Math.round(recordInput.nutritionScore / 2)} />
                {recordInput.nutritionItems?.length > 0 || recordInput.nutritionNotes ? (
                  <p className="mt-1 text-[10px] font-bold leading-4 text-[#60728A]">
                    {getNutritionPreview(recordInput)}
                  </p>
                ) : null}
              </div>
            }
            onClick={() =>
              openEditor({
                field: "nutritionScore",
                title: "饮食评分",
                type: "nutrition",
              })
            }
          />
          <RecordItemCard
            Icon={Smartphone}
            iconSrc="/record-icon-phone.png"
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
            iconSrc="/record-icon-mood.png"
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
            iconSrc="/record-icon-execution.png"
            title="执行力"
            description="今日行动，今日进步"
            prefix="完成了"
            value={recordInput.completedActions}
            unit="件"
            footer={
              getExecutionSummary(recordInput) ? (
                <span className="text-[11px] font-black text-[#1677FF]">
                  {getExecutionSummary(recordInput)}
                </span>
              ) : null
            }
            onClick={() =>
              openEditor({
                field: "completedActions",
                title: "今日执行记录",
                type: "execution",
              })
            }
          />
          <RecordItemCard
            Icon={Shield}
            title="正气值"
            description="禁欲天数，稳定心气"
            value={recordInput.abstinenceDays}
            unit="天"
            onClick={() =>
              openEditor({
                field: "abstinenceDays",
                title: "正气值",
                unit: "天",
                min: 0,
                max: 999,
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
        execution={draftExecution}
        nutrition={draftNutrition}
        isTrackingWorkout={isTrackingWorkout}
        trackingElapsedSeconds={trackingElapsedSeconds}
        trackingStatus={trackingStatus}
        sharedRun={sharedRun}
        sharedRunParticipants={sharedRunParticipants}
        sharedRunLocations={sharedRunLocations}
        sharedRunJoinCode={sharedRunJoinCode}
        sharedRunMessage={sharedRunMessage}
        isSharedRunBusy={isSharedRunBusy}
        isRunReplayActive={isRunReplayActive}
        runReplayFrameIndex={runReplayFrameIndex}
        onChange={setDraftValue}
        onSleepRangeChange={setDraftSleepRange}
        onWorkoutChange={setDraftWorkout}
        onExecutionChange={setDraftExecution}
        onNutritionChange={setDraftNutrition}
        onSharedRunJoinCodeChange={setSharedRunJoinCode}
        onCreateSharedRun={createSharedRun}
        onJoinSharedRun={joinSharedRun}
        onLeaveSharedRun={leaveSharedRun}
        onToggleRunReplay={toggleRunReplay}
        onRunReplayFrameChange={setRunReplayFrameIndex}
        onStartWorkoutTracking={startWorkoutTracking}
        onStopWorkoutTracking={stopWorkoutTracking}
        onStartEndWorkoutPress={startEndWorkoutPress}
        onCancelEndWorkoutPress={cancelEndWorkoutPress}
        onClose={closeEditor}
        onSave={saveEditor}
      />
    </main>
  );
}

export function RecordHeader({ onBack, onCalendar }) {
  return (
    <header className="pt-0">
      <div className="grid grid-cols-[42px_1fr_42px] items-center">
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
        className="pointer-events-none absolute right-[-8px] top-[2px] h-[188px] w-[198px] object-contain object-top drop-shadow-[0_18px_24px_rgba(13,27,51,0.12)]"
        src="/record-cow-cutout.png"
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
  iconSrc,
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
      <div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full text-[#1677FF]">
        {iconSrc ? (
          <img
            alt=""
            aria-hidden="true"
            className="h-full w-full object-contain"
            src={iconSrc}
          />
        ) : (
          <span className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-[#E8F2FF]">
            <Icon className="h-[23px] w-[23px]" strokeWidth={2.4} />
          </span>
        )}
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
          src="/record-cow-cutout.png"
        />
      </span>
    </button>
  );
}

export function WorkoutRouteMap({
  points = [],
  isTracking = false,
  participantLocations = [],
}) {
  const [mapZoomOffset, setMapZoomOffset] = useState(0);
  const mapData = buildRouteMapData(points, participantLocations, mapZoomOffset);
  const pathPoints =
    mapData?.projectedPoints
      ?.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
      .join(" ") || "";
  const hasSpeedHeat = (mapData?.speedSegments?.length || 0) > 0;
  const canZoomIn = (mapData?.zoom || 0) < MAX_ROUTE_MAP_ZOOM;
  const canZoomOut = (mapData?.zoom || 0) > MIN_ROUTE_MAP_ZOOM;
  const updateZoomOffset = (direction) => {
    setMapZoomOffset((currentOffset) =>
      clampNumber(currentOffset + direction, -6, 6),
    );
  };

  if (!mapData) {
    return (
      <div className="mt-3 flex h-56 overflow-hidden rounded-[18px] border border-[#D8E9FF] bg-[#DDEEFF]">
        <div className="relative flex flex-1 items-center justify-center bg-[linear-gradient(90deg,rgba(22,119,255,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(22,119,255,0.08)_1px,transparent_1px)] bg-[length:28px_28px]">
          <div className="pointer-events-none absolute inset-0">
            <svg
              aria-hidden="true"
              className="h-full w-full"
              preserveAspectRatio="none"
              viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            >
              <style>
                {`
                  @keyframes previewLeaderPulse {
                    0% { opacity: 0.72; transform: scale(0.85); }
                    70% { opacity: 0.12; transform: scale(1.8); }
                    100% { opacity: 0; transform: scale(2); }
                  }
                  @keyframes previewGhost {
                    0% { opacity: 0.48; transform: translate(0, 0) scale(1); }
                    100% { opacity: 0; transform: translate(-18px, 10px) scale(0.7); }
                  }
                  .preview-leader-pulse {
                    animation: previewLeaderPulse 1.5s ease-out infinite;
                    transform-box: fill-box;
                    transform-origin: center;
                  }
                  .preview-ghost {
                    animation: previewGhost 1.15s ease-out infinite;
                  }
                `}
              </style>
              <path
                d="M42 120 C92 70 126 116 164 80 C198 48 230 72 280 42"
                fill="none"
                stroke="#9CCBFF"
                strokeDasharray="6 7"
                strokeLinecap="round"
                strokeWidth="4"
              />
              {[
                { x: 222, y: 66, rank: "1st", color: "#FFD43B", text: "#0D1B33", name: "你" },
                { x: 156, y: 90, rank: "2nd", color: "#13B866", text: "white", name: "友" },
                { x: 92, y: 112, rank: "3rd", color: "#1677FF", text: "white", name: "跑" },
              ].map((marker, index) => (
                <g key={marker.rank}>
                  {index === 0 ? (
                    <>
                      <circle className="preview-leader-pulse" cx={marker.x} cy={marker.y} fill="#FFD43B" r="15" />
                      <circle className="preview-ghost" cx={marker.x - 9} cy={marker.y + 5} fill="#FFD43B" r="8" />
                    </>
                  ) : null}
                  <rect
                    fill={index === 0 ? "#FFD43B" : "#0D1B33"}
                    height="15"
                    rx="7.5"
                    stroke="white"
                    strokeWidth="1.5"
                    width="28"
                    x={marker.x - 14}
                    y={marker.y - 31}
                  />
                  <text
                    dominantBaseline="central"
                    fill={index === 0 ? "#0D1B33" : "white"}
                    fontSize="8.5"
                    fontWeight="900"
                    textAnchor="middle"
                    x={marker.x}
                    y={marker.y - 23.5}
                  >
                    {marker.rank}
                  </text>
                  <circle cx={marker.x} cy={marker.y} fill={marker.color} r={index === 0 ? "13" : "11"} stroke="white" strokeWidth="3" />
                  <text
                    dominantBaseline="central"
                    fill={marker.text}
                    fontSize="8"
                    fontWeight="900"
                    textAnchor="middle"
                    x={marker.x}
                    y={marker.y}
                  >
                    {marker.name}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          <div className="relative rounded-[18px] border border-white/80 bg-white/90 px-4 py-3 text-center shadow-[0_10px_24px_rgba(13,27,51,0.12)]">
            <Target className="mx-auto h-6 w-6 text-[#1677FF]" strokeWidth={2.5} />
            <p className="mt-2 text-[13px] font-black text-[#0D1B33]">
              {isTracking ? "正在获取当前位置" : "等待 GPS 开始"}
            </p>
            <p className="mt-1 text-[11px] font-bold text-[#60728A]">
              开始后会显示你的位置和路线
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-[18px] border border-[#D8E9FF] bg-[#DDEEFF] shadow-inner">
      <div
        className="relative min-h-56 w-full touch-manipulation overflow-hidden sm:min-h-64"
        style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }}
      >
        {mapData.tiles.map((tile) => (
          <img
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute max-w-none select-none"
            draggable={false}
            key={tile.key}
            src={tile.src}
            style={{
              height: `${(MAP_TILE_SIZE / MAP_HEIGHT) * 100}%`,
              left: `${(tile.left / MAP_WIDTH) * 100}%`,
              top: `${(tile.top / MAP_HEIGHT) * 100}%`,
              width: `${(MAP_TILE_SIZE / MAP_WIDTH) * 100}%`,
            }}
          />
        ))}

        <svg
          aria-label="跑步轨迹地图"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        >
          <defs>
            <style>
              {`
                @keyframes leaderPulse {
                  0% { opacity: 0.74; transform: scale(0.86); }
                  60% { opacity: 0.12; transform: scale(1.92); }
                  100% { opacity: 0; transform: scale(2.18); }
                }
                @keyframes leaderFloat {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-2px); }
                }
                @keyframes leaderGhost {
                  0% { opacity: 0.52; transform: translate(0, 0) scale(1); }
                  100% { opacity: 0; transform: translate(-18px, 10px) scale(0.72); }
                }
                .leader-pulse {
                  animation: leaderPulse 1.5s ease-out infinite;
                  transform-box: fill-box;
                  transform-origin: center;
                }
                .leader-float {
                  animation: leaderFloat 1.2s ease-in-out infinite;
                }
                .leader-ghost-a {
                  animation: leaderGhost 1.2s ease-out infinite;
                }
                .leader-ghost-b {
                  animation: leaderGhost 1.2s ease-out 0.38s infinite;
                }
              `}
            </style>
            <filter id="route-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" floodColor="#0D1B33" floodOpacity="0.2" stdDeviation="2" />
            </filter>
          </defs>

          {mapData.accuracyRadius > 0 ? (
            <circle
              cx={mapData.currentPoint.x}
              cy={mapData.currentPoint.y}
              fill="#1677FF"
              fillOpacity="0.12"
              r={mapData.accuracyRadius}
              stroke="#1677FF"
              strokeDasharray="4 4"
              strokeOpacity="0.28"
              strokeWidth="1.5"
            />
          ) : null}

          {pathPoints ? (
            <>
              <polyline
                fill="none"
                filter="url(#route-shadow)"
                points={pathPoints}
                stroke="white"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="8"
              />
              {hasSpeedHeat ? (
                mapData.speedSegments.map((segment) => (
                  <line
                    key={segment.key}
                    stroke={segment.color}
                    strokeLinecap="round"
                    strokeWidth="5"
                    x1={segment.x1}
                    x2={segment.x2}
                    y1={segment.y1}
                    y2={segment.y2}
                  />
                ))
              ) : (
                <polyline
                  fill="none"
                  points={pathPoints}
                  stroke="#1677FF"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="5"
                />
              )}
            </>
          ) : null}

          {mapData.startPoint ? (
            <circle
              cx={mapData.startPoint.x}
              cy={mapData.startPoint.y}
              fill="#12B866"
              r="4.5"
              stroke="white"
              strokeWidth="2"
            />
          ) : null}

          {mapData.currentPoint ? (
            <g>
              <circle
                cx={mapData.currentPoint.x}
                cy={mapData.currentPoint.y}
                fill="#1677FF"
                r={isTracking ? "8" : "7"}
                stroke="white"
                strokeWidth="3"
              />
              <circle
                cx={mapData.currentPoint.x}
                cy={mapData.currentPoint.y}
                fill="white"
                r="2.5"
              />
            </g>
          ) : null}

          {mapData.participantMarkers.map((marker) => (
            <g
              className={marker.isLeader ? "leader-float" : undefined}
              key={marker.userId || marker.displayName}
            >
              {marker.isLeader ? (
                <>
                  <circle
                    className="leader-pulse"
                    cx={marker.x}
                    cy={marker.y}
                    fill="#FFD43B"
                    r="16"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                  <circle
                    className="leader-ghost-a"
                    cx={marker.x - 7}
                    cy={marker.y + 4}
                    fill={marker.color}
                    fillOpacity="0.42"
                    r="9"
                  />
                  <circle
                    className="leader-ghost-b"
                    cx={marker.x - 12}
                    cy={marker.y + 7}
                    fill="#FFD43B"
                    fillOpacity="0.36"
                    r="7"
                  />
                </>
              ) : null}
              <rect
                fill={marker.isLeader ? "#FFD43B" : "#0D1B33"}
                height="15"
                rx="7.5"
                stroke="white"
                strokeWidth="1.5"
                width="28"
                x={marker.x - 14}
                y={marker.y - 31}
              />
              <text
                dominantBaseline="central"
                fill={marker.isLeader ? "#0D1B33" : "white"}
                fontSize="8.5"
                fontWeight="900"
                textAnchor="middle"
                x={marker.x}
                y={marker.y - 23.5}
              >
                {marker.rankLabel}
              </text>
              <circle
                cx={marker.x}
                cy={marker.y}
                fill={marker.isLeader ? "#FFD43B" : marker.color}
                r={marker.isLeader ? "13" : "11"}
                stroke="white"
                strokeWidth="3"
              />
              {marker.isLeader ? (
                <circle
                  cx={marker.x}
                  cy={marker.y}
                  fill={marker.color}
                  r="9"
                />
              ) : null}
              <text
                dominantBaseline="central"
                fill="white"
                fontSize="8"
                fontWeight="900"
                textAnchor="middle"
                x={marker.x}
                y={marker.y}
              >
                {String(marker.displayName || "跑").slice(0, 1).toUpperCase()}
              </text>
            </g>
          ))}
        </svg>

        <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black text-[#1677FF] shadow-[0_6px_16px_rgba(13,27,51,0.12)]">
          {hasSpeedHeat ? "速度热力图" : isTracking ? "GPS 记录中" : "轨迹预览"}
        </div>
        <div className="absolute right-2 top-2 flex flex-col overflow-hidden rounded-[14px] border border-white/80 bg-white/92 shadow-[0_8px_18px_rgba(13,27,51,0.16)]">
          <button
            aria-label="放大地图"
            className="flex h-9 w-9 items-center justify-center text-[#1677FF] disabled:text-[#AAB7C8]"
            disabled={!canZoomIn}
            title="放大地图"
            type="button"
            onClick={() => updateZoomOffset(1)}
          >
            <Plus className="h-4 w-4" strokeWidth={3} />
          </button>
          <span className="h-px bg-[#DCEBFF]" />
          <button
            aria-label="缩小地图"
            className="flex h-9 w-9 items-center justify-center text-[#1677FF] disabled:text-[#AAB7C8]"
            disabled={!canZoomOut}
            title="缩小地图"
            type="button"
            onClick={() => updateZoomOffset(-1)}
          >
            <Minus className="h-4 w-4" strokeWidth={3} />
          </button>
        </div>
        <div className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black text-[#60728A] shadow-[0_6px_16px_rgba(13,27,51,0.12)]">
          OSM · z{mapData.zoom}
        </div>
      </div>

      {hasSpeedHeat ? (
        <div className="border-t border-[#D8E9FF] bg-white/92 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black text-[#13B866]">慢</span>
            <div className="h-2 flex-1 rounded-full bg-[linear-gradient(90deg,#13B866_0%,#F7C948_50%,#E22323_100%)]" />
            <span className="text-[10px] font-black text-[#E22323]">快</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] font-black text-[#60728A]">
            <span>均速 {mapData.averageSpeedKmh.toFixed(1)} km/h</span>
            <span>最快 {mapData.topSpeedKmh.toFixed(1)} km/h</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SharedRunPanel({
  sharedRun,
  participants = [],
  locations = [],
  replayLocations = [],
  joinCode,
  message,
  isBusy,
  isReplayActive,
  replayFrameIndex,
  onJoinCodeChange,
  onCreate,
  onJoin,
  onLeave,
  onToggleReplay,
  onReplayFrameChange,
}) {
  const markers = getLatestSharedRunMarkers(participants, locations);
  const markerByUserId = new Map(markers.map((marker) => [marker.userId, marker]));
  const replayTimeline = getSharedRunTimeline(replayLocations);
  const currentReplayPoint = replayTimeline[
    clampNumber(replayFrameIndex || 0, 0, Math.max(replayTimeline.length - 1, 0))
  ];
  const canReplay = replayTimeline.length > 1;
  const sortedParticipants = participants
    .map((participant) => ({
      ...participant,
      marker: markerByUserId.get(participant.user_id),
    }))
    .sort((a, b) => (b.marker?.speedKmh || 0) - (a.marker?.speedKmh || 0))
    .map((participant, index) => ({
      ...participant,
      rank: index + 1,
      rankLabel: getRankLabel(index + 1),
    }));

  return (
    <div className="rounded-[18px] border border-[#D8E9FF] bg-white px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-black text-[#0D1B33]">同跑房间</p>
          <p className="mt-1 text-[11px] font-bold leading-4 text-[#60728A]">
            登录后一起跑，地图上会显示你和朋友的位置与速度
          </p>
        </div>
        {sharedRun ? (
          <button
            className="h-8 rounded-full bg-[#FFF1F1] px-3 text-[11px] font-black text-[#D92D20]"
            type="button"
            onClick={onLeave}
          >
            退出
          </button>
        ) : null}
      </div>

      {sharedRun ? (
        <div className="mt-3">
          <div className="flex items-center justify-between rounded-[16px] bg-[#F0F7FF] px-3 py-2">
            <span className="text-[12px] font-bold text-[#60728A]">同跑码</span>
            <div className="flex items-center gap-2">
              <span className="text-[20px] font-black tracking-[0.16em] text-[#1677FF]">
                {sharedRun.session.code}
              </span>
              <button
                aria-label="复制同跑码"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#1677FF] shadow-[0_6px_14px_rgba(22,119,255,0.12)]"
                type="button"
                onClick={() => {
                  if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(sharedRun.session.code).catch(() => {});
                  }
                  window.alert(`同跑码：${sharedRun.session.code}`);
                }}
              >
                <Copy className="h-4 w-4" strokeWidth={2.4} />
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-[16px] border border-[#D8E9FF] bg-[#F8FBFF] px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[12px] font-black text-[#0D1B33]">
                  跑步回放
                </p>
                <p className="mt-0.5 text-[10px] font-bold text-[#60728A]">
                  {canReplay
                    ? `${formatReplayTime(currentReplayPoint?.recorded_at)} · 第 ${Math.min((replayFrameIndex || 0) + 1, replayTimeline.length)} / ${replayTimeline.length} 帧`
                    : "跑一会儿后会自动生成回放"}
                </p>
              </div>
              <button
                className="h-8 rounded-full bg-[#1677FF] px-3 text-[11px] font-black text-white disabled:opacity-50"
                disabled={!canReplay}
                type="button"
                onClick={onToggleReplay}
              >
                {isReplayActive ? "暂停" : "回放"}
              </button>
            </div>

            {canReplay ? (
              <input
                className="mt-2 w-full accent-[#1677FF]"
                max={Math.max(replayTimeline.length - 1, 0)}
                min={0}
                type="range"
                value={clampNumber(replayFrameIndex || 0, 0, replayTimeline.length - 1)}
                onChange={(event) => onReplayFrameChange?.(Number(event.target.value))}
              />
            ) : null}
          </div>

          <div className="mt-3 space-y-2">
            {sortedParticipants.length > 0 ? (
              sortedParticipants.map((participant) => (
                <div
                  className={[
                    "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-[14px] border px-2 py-2",
                    participant.rank === 1
                      ? "border-[#FFE084] bg-[#FFF9D8] shadow-[0_8px_18px_rgba(245,158,11,0.16)]"
                      : "border-[#E8F1FF] bg-[#FBFDFF]",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={participant.user_id}
                >
                  <span
                    className={[
                      "flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-black",
                      participant.rank === 1 ? "text-[#0D1B33]" : "text-white",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{
                      backgroundColor:
                        participant.rank === 1 ? "#FFD43B" : participant.color || "#1677FF",
                    }}
                  >
                    {String(participant.display_name || "跑").slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-black text-[#0D1B33]">
                      {participant.rankLabel}. {participant.display_name || "跑友"}
                    </p>
                    <p className="text-[10px] font-bold text-[#60728A]">
                      {participant.marker
                        ? `${participant.marker.distanceKm.toFixed(2)} km`
                        : "等待定位"}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#F0F7FF] px-2 py-1 text-[11px] font-black text-[#1677FF]">
                    {(participant.marker?.speedKmh || 0).toFixed(1)} km/h
                  </span>
                </div>
              ))
            ) : (
              <p className="rounded-[14px] bg-[#F8FBFF] px-3 py-2 text-[12px] font-bold text-[#60728A]">
                等待你和朋友开始定位。
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <button
            className="h-10 w-full rounded-[16px] bg-[#1677FF] text-[13px] font-black text-white disabled:opacity-60"
            disabled={isBusy}
            type="button"
            onClick={onCreate}
          >
            创建同跑
          </button>
          <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-2">
            <input
              className="h-10 min-w-0 rounded-[16px] border border-[#DCEBFF] bg-[#F8FBFF] px-3 text-[14px] font-black uppercase tracking-[0.08em] text-[#1677FF] outline-none focus:border-[#1677FF]"
              maxLength={6}
              placeholder="输入同跑码"
              value={joinCode}
              onChange={(event) => onJoinCodeChange?.(event.target.value.toUpperCase())}
            />
            <button
              className="h-10 rounded-[16px] border border-[#BFD8FF] bg-[#F0F7FF] text-[13px] font-black text-[#1677FF] disabled:opacity-60"
              disabled={isBusy || !joinCode?.trim()}
              type="button"
              onClick={onJoin}
            >
              加入
            </button>
          </div>
        </div>
      )}

      {message ? (
        <p className="mt-2 rounded-[14px] bg-[#F8FBFF] px-3 py-2 text-[11px] font-bold leading-4 text-[#60728A]">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function RecordEditModal({
  editor,
  value,
  sleepRange,
  workout,
  execution,
  nutrition,
  isTrackingWorkout,
  trackingElapsedSeconds,
  trackingStatus,
  sharedRun,
  sharedRunParticipants,
  sharedRunLocations,
  sharedRunJoinCode,
  sharedRunMessage,
  isSharedRunBusy,
  isRunReplayActive,
  runReplayFrameIndex,
  onChange,
  onSleepRangeChange,
  onWorkoutChange,
  onExecutionChange,
  onNutritionChange,
  onSharedRunJoinCodeChange,
  onCreateSharedRun,
  onJoinSharedRun,
  onLeaveSharedRun,
  onToggleRunReplay,
  onRunReplayFrameChange,
  onStartWorkoutTracking,
  onStopWorkoutTracking,
  onStartEndWorkoutPress,
  onCancelEndWorkoutPress,
  onClose,
  onSave,
}) {
  if (!editor) {
    return null;
  }

  const isMoodEditor = editor.type === "mood";
  const isSleepEditor = editor.type === "sleep";
  const isWorkoutEditor = editor.type === "workout";
  const isExecutionEditor = editor.type === "execution";
  const isNutritionEditor = editor.type === "nutrition";
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
  const displayElapsedSeconds = isTrackingWorkout
    ? trackingElapsedSeconds
    : getWorkoutRouteDurationSeconds(workout, trackingElapsedSeconds);
  const visibleSharedRunLocations = isRunReplayActive
    ? getSharedRunReplayLocations(sharedRunLocations, runReplayFrameIndex)
    : sharedRunLocations;
  const sharedRunMarkers = getLatestSharedRunMarkers(
    sharedRunParticipants,
    visibleSharedRunLocations,
  );
  const executionItems =
    Array.isArray(execution?.items) && execution.items.length > 0
      ? execution.items
      : [createEmptyDraftExecutionItem()];
  const normalizedExecutionItems = normalizeExecutionItems({
    executionItems,
  });
  const executionTotalMinutes = getExecutionTotalMinutes(normalizedExecutionItems);
  const nutritionItems =
    Array.isArray(nutrition?.items) && nutrition.items.length > 0
      ? nutrition.items
      : [createEmptyDraftNutritionItem()];

  return (
      <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#0D1B33]/35 px-4 pb-4 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-24px)] w-full max-w-[390px] overflow-y-auto rounded-[28px] border border-[#DCEBFF] bg-white p-5 shadow-[0_24px_64px_rgba(13,27,51,0.22)]">
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
                      跑步 / 徒步轨迹地图
                    </p>
                    <p className="mt-1 text-[12px] font-bold text-[#60728A]">
                      GPS 开始后会实时画线
                    </p>
                  </div>

                  {isTrackingWorkout ? (
                    <button
                      className="h-10 rounded-full bg-[#FF4D4F] px-4 text-[13px] font-black text-white shadow-[0_10px_22px_rgba(255,77,79,0.24)]"
                      type="button"
                      onContextMenu={(event) => event.preventDefault()}
                      onPointerCancel={onCancelEndWorkoutPress}
                      onPointerDown={onStartEndWorkoutPress}
                      onPointerLeave={onCancelEndWorkoutPress}
                      onPointerUp={onCancelEndWorkoutPress}
                    >
                      长按结束
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

                <div className="mt-3">
                  <SharedRunPanel
                    isBusy={isSharedRunBusy}
                    isReplayActive={isRunReplayActive}
                    joinCode={sharedRunJoinCode}
                    locations={visibleSharedRunLocations}
                    message={sharedRunMessage}
                    participants={sharedRunParticipants}
                    replayFrameIndex={runReplayFrameIndex}
                    replayLocations={sharedRunLocations}
                    sharedRun={sharedRun}
                    onCreate={onCreateSharedRun}
                    onJoin={onJoinSharedRun}
                    onJoinCodeChange={onSharedRunJoinCodeChange}
                    onLeave={onLeaveSharedRun}
                    onReplayFrameChange={onRunReplayFrameChange}
                    onToggleReplay={onToggleRunReplay}
                  />
                </div>

                {trackingStatus ? (
                  <p
                    className={[
                      "mt-3 rounded-[16px] border px-3 py-2 text-[12px] font-black leading-5",
                      trackingStatus.includes("拒绝") ||
                      trackingStatus.includes("失败") ||
                      trackingStatus.includes("不支持")
                        ? "border-[#FFD2D2] bg-[#FFF1F1] text-[#D92D20]"
                        : "border-[#CDE4FF] bg-white text-[#1677FF]",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {trackingStatus}
                  </p>
                ) : null}

                <WorkoutRouteMap
                  isTracking={isTrackingWorkout}
                  participantLocations={sharedRunMarkers}
                  points={workout?.workoutRoutePoints || []}
                />

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
                      {formatElapsedTime(displayElapsedSeconds)}
                    </p>
                  </div>
                  <div className="rounded-[16px] bg-white px-2 py-2 text-center">
                    <p className="text-[10px] font-bold text-[#8A95AA]">点位</p>
                    <p className="mt-1 text-[16px] font-black text-[#1677FF]">
                      {workout?.workoutRoutePoints?.length || 0}
                    </p>
                  </div>
                </div>

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
        ) : isExecutionEditor ? (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[18px] border border-[#DCEBFF] bg-[#F0F7FF] px-3 py-2">
                <p className="text-[11px] font-bold text-[#60728A]">完成事项</p>
                <p className="mt-1 text-[22px] font-black text-[#1677FF]">
                  {normalizedExecutionItems.length}
                  <span className="ml-1 text-[12px] text-[#60728A]">件</span>
                </p>
              </div>
              <div className="rounded-[18px] border border-[#DCEBFF] bg-[#F0F7FF] px-3 py-2">
                <p className="text-[11px] font-bold text-[#60728A]">总时长</p>
                <p className="mt-1 text-[22px] font-black text-[#1677FF]">
                  {executionTotalMinutes}
                  <span className="ml-1 text-[12px] text-[#60728A]">分钟</span>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {executionItems.map((item, index) => (
                <div
                  className="rounded-[20px] border border-[#E3EEFF] bg-[#FBFDFF] p-3"
                  key={item.id}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[13px] font-black text-[#0D1B33]">
                      第 {index + 1} 件事
                    </span>
                    <button
                      aria-label="删除事项"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF1F1] text-[#D92D20]"
                      type="button"
                      onClick={() =>
                        onExecutionChange?.((current) => {
                          const nextItems = (current.items || []).filter(
                            (candidate) => candidate.id !== item.id,
                          );

                          return {
                            ...current,
                            items:
                              nextItems.length > 0
                                ? nextItems
                                : [createEmptyDraftExecutionItem()],
                          };
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2.4} />
                    </button>
                  </div>

                  <label className="block">
                    <span className="text-[12px] font-bold text-[#60728A]">
                      今天做了什么
                    </span>
                    <input
                      className="mt-1.5 h-11 w-full rounded-[16px] border border-[#DCEBFF] bg-white px-3 text-[15px] font-black text-[#1677FF] outline-none focus:border-[#1677FF]"
                      maxLength={50}
                      placeholder="例如：做了 YouTube 视频"
                      type="text"
                      value={item.title || ""}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        onExecutionChange?.((current) => ({
                          ...current,
                          items: (current.items || []).map((candidate) =>
                            candidate.id === item.id
                              ? { ...candidate, title: nextValue }
                              : candidate,
                          ),
                        }));
                      }}
                    />
                  </label>

                  <label className="mt-2 block">
                    <span className="text-[12px] font-bold text-[#60728A]">
                      花了多久（分钟）
                    </span>
                    <input
                      className="mt-1.5 h-11 w-full rounded-[16px] border border-[#DCEBFF] bg-white px-3 text-[18px] font-black text-[#1677FF] outline-none focus:border-[#1677FF]"
                      inputMode="numeric"
                      max={1440}
                      min={0}
                      step={1}
                      type="number"
                      value={item.minutes ?? ""}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        onExecutionChange?.((current) => ({
                          ...current,
                          items: (current.items || []).map((candidate) =>
                            candidate.id === item.id
                              ? { ...candidate, minutes: nextValue }
                              : candidate,
                          ),
                        }));
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>

            <button
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[18px] border border-[#BFD8FF] bg-[#F0F7FF] text-[15px] font-black text-[#1677FF]"
              type="button"
              onClick={() =>
                onExecutionChange?.((current) => ({
                  ...current,
                  items: [...(current.items || []), createEmptyDraftExecutionItem()],
                }))
              }
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
              添加一件事
            </button>
          </div>
        ) : isNutritionEditor ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-[20px] border border-[#DCEBFF] bg-[#F0F7FF] p-4">
              <p className="text-[13px] font-bold text-[#60728A]">
                今天饮食几分
              </p>
              <div className="mt-2 flex items-end gap-2">
                <input
                  className="h-14 w-24 rounded-[18px] border border-[#DCEBFF] bg-white px-4 text-[28px] font-black text-[#1677FF] outline-none focus:border-[#1677FF]"
                  inputMode="numeric"
                  max={10}
                  min={1}
                  step={1}
                  type="number"
                  value={nutrition?.nutritionScore ?? 8}
                  onChange={(event) =>
                    onNutritionChange?.((current) => ({
                      ...current,
                      nutritionScore: event.target.value,
                    }))
                  }
                />
                <span className="pb-1 text-[15px] font-bold text-[#60728A]">/ 10</span>
              </div>
              <div className="mt-3">
                <StarRow
                  filled={Math.round(
                    clampNumber(Number(nutrition?.nutritionScore) || 0, 1, 10) / 2,
                  )}
                />
              </div>
            </div>

            <div className="space-y-3">
              {nutritionItems.map((item, index) => (
                <div
                  className="rounded-[20px] border border-[#E3EEFF] bg-[#FBFDFF] p-3"
                  key={item.id}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[13px] font-black text-[#0D1B33]">
                      第 {index + 1} 样食物
                    </span>
                    <button
                      aria-label="删除食物"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF1F1] text-[#D92D20]"
                      type="button"
                      onClick={() =>
                        onNutritionChange?.((current) => {
                          const nextItems = (current.items || []).filter(
                            (candidate) => candidate.id !== item.id,
                          );

                          return {
                            ...current,
                            items:
                              nextItems.length > 0
                                ? nextItems
                                : [createEmptyDraftNutritionItem()],
                          };
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2.4} />
                    </button>
                  </div>

                  <label className="block">
                    <span className="text-[12px] font-bold text-[#60728A]">
                      吃了什么
                    </span>
                    <input
                      className="mt-1.5 h-11 w-full rounded-[16px] border border-[#DCEBFF] bg-white px-3 text-[15px] font-black text-[#1677FF] outline-none focus:border-[#1677FF]"
                      maxLength={50}
                      placeholder="例如：早上吃了鸡蛋"
                      type="text"
                      value={item.name || ""}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        onNutritionChange?.((current) => ({
                          ...current,
                          items: (current.items || []).map((candidate) =>
                            candidate.id === item.id
                              ? { ...candidate, name: nextValue }
                              : candidate,
                          ),
                        }));
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>

            <button
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[18px] border border-[#BFD8FF] bg-[#F0F7FF] text-[15px] font-black text-[#1677FF]"
              type="button"
              onClick={() =>
                onNutritionChange?.((current) => ({
                  ...current,
                  items: [...(current.items || []), createEmptyDraftNutritionItem()],
                }))
              }
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
              添加一种食物
            </button>

            <p className="rounded-[16px] bg-[#F8FBFF] px-3 py-2 text-[11px] font-bold leading-5 text-[#60728A]">
              可以分开记早餐、午餐、下午加餐，回头看会更清楚。
            </p>
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
