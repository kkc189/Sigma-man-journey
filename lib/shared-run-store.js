import { getSupabaseClient } from "./supabase-client";

const RUN_COLORS = ["#1677FF", "#13B866", "#F59E0B", "#E22323", "#8B5CF6"];

function getRandomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let index = 0; index < 6; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

function getDisplayName(user) {
  const email = user?.email || "";

  return email.split("@")[0] || "跑友";
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

function getSpeedKmh(previousPoint, point) {
  if (!previousPoint?.timestamp || !point?.timestamp) {
    return 0;
  }

  const previousTime = Date.parse(previousPoint.timestamp);
  const nextTime = Date.parse(point.timestamp);

  if (!Number.isFinite(previousTime) || !Number.isFinite(nextTime) || nextTime <= previousTime) {
    return 0;
  }

  const earthRadiusKm = 6371;
  const latDiff = ((point.lat - previousPoint.lat) * Math.PI) / 180;
  const lngDiff = ((point.lng - previousPoint.lng) * Math.PI) / 180;
  const startLat = (previousPoint.lat * Math.PI) / 180;
  const endLat = (point.lat * Math.PI) / 180;
  const haversine =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(lngDiff / 2) ** 2;
  const distanceKm =
    earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  const seconds = (nextTime - previousTime) / 1000;

  return seconds > 0 ? Number(((distanceKm / seconds) * 3600).toFixed(2)) : 0;
}

export async function createSharedRunSession() {
  const supabase = getSupabaseClient();
  const user = await getCurrentUser();

  if (!supabase || !user) {
    throw new Error("请先登录，再创建同跑房间。");
  }

  const code = getRandomCode();
  const now = new Date().toISOString();
  const { data: session, error: sessionError } = await supabase
    .from("run_sessions")
    .insert({
      code,
      owner_id: user.id,
      status: "active",
      started_at: now,
    })
    .select("*")
    .single();

  if (sessionError) {
    throw sessionError;
  }

  const participant = {
    session_id: session.id,
    user_id: user.id,
    display_name: getDisplayName(user),
    color: RUN_COLORS[0],
    joined_at: now,
    last_seen_at: now,
  };

  const { error: participantError } = await supabase
    .from("run_participants")
    .upsert(participant, { onConflict: "session_id,user_id" });

  if (participantError) {
    throw participantError;
  }

  return { session, participant, user };
}

export async function joinSharedRunSession(code) {
  const supabase = getSupabaseClient();
  const user = await getCurrentUser();
  const normalizedCode = String(code || "").trim().toUpperCase();

  if (!supabase || !user) {
    throw new Error("请先登录，再加入同跑房间。");
  }

  if (!normalizedCode) {
    throw new Error("请输入同跑码。");
  }

  const { data: session, error: sessionError } = await supabase
    .from("run_sessions")
    .select("*")
    .eq("code", normalizedCode)
    .eq("status", "active")
    .single();

  if (sessionError) {
    throw new Error("没有找到这个同跑房间，确认同跑码是否正确。");
  }

  const { data: currentParticipants } = await supabase
    .from("run_participants")
    .select("user_id")
    .eq("session_id", session.id);
  const color = RUN_COLORS[(currentParticipants || []).length % RUN_COLORS.length];
  const now = new Date().toISOString();
  const participant = {
    session_id: session.id,
    user_id: user.id,
    display_name: getDisplayName(user),
    color,
    joined_at: now,
    last_seen_at: now,
  };

  const { error: participantError } = await supabase
    .from("run_participants")
    .upsert(participant, { onConflict: "session_id,user_id" });

  if (participantError) {
    throw participantError;
  }

  return { session, participant, user };
}

export async function loadSharedRunState(sessionId) {
  const supabase = getSupabaseClient();

  if (!supabase || !sessionId) {
    return { participants: [], locations: [] };
  }

  const [{ data: participants }, { data: locations }] = await Promise.all([
    supabase
      .from("run_participants")
      .select("*")
      .eq("session_id", sessionId)
      .order("joined_at", { ascending: true }),
    supabase
      .from("run_locations")
      .select("*")
      .eq("session_id", sessionId)
      .order("recorded_at", { ascending: false })
      .limit(80),
  ]);

  return {
    participants: participants || [],
    locations: locations || [],
  };
}

export async function publishSharedRunLocation({ sessionId, point, routePoints, distanceKm }) {
  const supabase = getSupabaseClient();
  const user = await getCurrentUser();

  if (!supabase || !user || !sessionId || !point) {
    return;
  }

  const previousPoint = Array.isArray(routePoints) && routePoints.length >= 2
    ? routePoints[routePoints.length - 2]
    : null;
  const speedKmh = getSpeedKmh(previousPoint, point);
  const now = new Date().toISOString();

  await supabase.from("run_locations").insert({
    session_id: sessionId,
    user_id: user.id,
    lat: point.lat,
    lng: point.lng,
    accuracy: point.accuracy || 0,
    speed_kmh: speedKmh,
    distance_km: Number(distanceKm) || 0,
    recorded_at: point.timestamp || now,
  });

  await supabase
    .from("run_participants")
    .update({ last_seen_at: now })
    .eq("session_id", sessionId)
    .eq("user_id", user.id);
}

export function subscribeSharedRunSession(sessionId, onUpdate) {
  const supabase = getSupabaseClient();

  if (!supabase || !sessionId) {
    return () => {};
  }

  const channel = supabase
    .channel(`shared-run-${sessionId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "run_locations",
        filter: `session_id=eq.${sessionId}`,
      },
      () => onUpdate?.(),
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "run_participants",
        filter: `session_id=eq.${sessionId}`,
      },
      () => onUpdate?.(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
