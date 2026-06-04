"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Dumbbell,
  Home,
  MoonStar,
  Pen,
  Plus,
  Shield,
  Smile,
  Smartphone,
  Soup,
  Sparkles,
  Target,
  Trophy,
  User,
} from "lucide-react";
import { AuthButton } from "./auth-button";
import { loadDailyRecords } from "../lib/records-store";

const navItems = [
  { id: "home", label: "首页", Icon: Home },
  { id: "record", label: "记录", Icon: Pen },
  { id: "calendar", label: "日历", Icon: CalendarDays },
  { id: "status", label: "我的", Icon: User },
];

function safeParseJson(value, fallback) {
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

function formatMonthDay(dateKey) {
  if (!dateKey) {
    return "今天";
  }

  const date = parseDateKey(dateKey);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
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

function normalizeStatusList(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      return item?.name || item?.label || "";
    })
    .filter(Boolean);
}

function estimateScore(record) {
  if (record?.statusScore !== undefined || record?.score !== undefined) {
    return Number(record.statusScore ?? record.score) || 0;
  }

  let score = 42;
  const sleepHours = Number(record?.sleepHours);
  const workoutMinutes = Number(record?.workoutMinutes);
  const nutritionScore = Number(record?.nutritionScore);
  const phoneHours = Number(record?.phoneHours);
  const completedActions = Number(record?.completedActions);

  if (Number.isFinite(sleepHours)) {
    score += sleepHours >= 7 ? 18 : sleepHours >= 6 ? 10 : 0;
  }

  if (Number.isFinite(workoutMinutes)) {
    score += workoutMinutes >= 45 ? 18 : workoutMinutes >= 20 ? 10 : 0;
  }

  if (Number.isFinite(nutritionScore)) {
    score += Math.min(nutritionScore * 2, 16);
  }

  if (Number.isFinite(phoneHours)) {
    score += phoneHours <= 3 ? 14 : phoneHours <= 5 ? 7 : -6;
  }

  if (Number.isFinite(completedActions)) {
    score += completedActions >= 3 ? 12 : completedActions > 0 ? 6 : 0;
  }

  return Math.max(0, Math.min(Math.round(score), 100));
}

function normalizeRecord(record) {
  if (!record?.date) {
    return null;
  }

  return {
    ...record,
    date: record.date,
    statusScore: estimateScore(record),
    xpGained: Number(record.xpGained ?? record.xp ?? record.xpEarned) || 0,
    title:
      record.title ||
      record.dailyTitle ||
      record.levelTitle ||
      "成长状态已记录",
    summary:
      record.summary ||
      record.reviewText ||
      "这一天已经留下了成长存档。",
    buffs: normalizeStatusList(record.buffs),
    debuffs: normalizeStatusList(record.debuffs),
  };
}

function getRecordsList(records) {
  return Object.values(records)
    .map(normalizeRecord)
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getTotalXp(recordsList) {
  return Math.max(
    0,
    recordsList.reduce((total, record) => total + record.xpGained, 0),
  );
}

function getLevelInfo(totalXp) {
  const level = Math.max(1, Math.floor(totalXp / 1000) + 1);
  const currentLevelXp = (level - 1) * 1000;
  const xpInLevel = totalXp - currentLevelXp;

  return {
    label: `Lv.${level}`,
    nextLabel: `Lv.${level + 1}`,
    progress: Math.min(100, Math.round((xpInLevel / 1000) * 100)),
    remainingXp: Math.max(0, level * 1000 - totalXp),
  };
}

function getContinuousDays(records) {
  let streak = 0;
  const cursor = new Date();

  while (records[getDateKey(cursor)]) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getMonthCompletion(recordsList) {
  const now = new Date();
  const monthRecords = recordsList.filter((record) => {
    const date = parseDateKey(record.date);
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  });

  return Math.round((monthRecords.length / Math.max(now.getDate(), 1)) * 100);
}

function getAverageScore(recordsList) {
  if (recordsList.length === 0) {
    return 0;
  }

  return Math.round(
    recordsList.reduce((total, record) => total + record.statusScore, 0) /
      recordsList.length,
  );
}

function getHomeStats(records) {
  const recordsList = getRecordsList(records);
  const todayKey = getDateKey(new Date());
  const todayRecord = records[todayKey]
    ? normalizeRecord(records[todayKey])
    : null;
  const latestRecord = todayRecord || recordsList[recordsList.length - 1] || null;
  const totalXp = getTotalXp(recordsList);
  const levelInfo = getLevelInfo(totalXp);

  return {
    todayKey,
    records,
    recordsList,
    latestRecord,
    todayRecord,
    totalXp,
    levelInfo,
    streakDays: getContinuousDays(records),
    monthCompletion: getMonthCompletion(recordsList),
    averageScore: getAverageScore(recordsList),
    recordCount: recordsList.length,
    recentRecords: recordsList.slice(-3).reverse(),
  };
}

function formatValue(value, fallback = "--") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return value;
}

function getNutritionPreview(notes) {
  const items = Array.isArray(notes?.nutritionItems)
    ? notes.nutritionItems
        .map((item) => String(item?.name || item?.title || item || "").trim())
        .filter(Boolean)
    : String(notes?.nutritionNotes || notes || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
  const preview = items.join(" · ");

  if (!preview) {
    return "";
  }

  return preview.length > 26 ? `${preview.slice(0, 26)}...` : preview;
}

function getMetricItems(record) {
  return [
    {
      label: "睡眠",
      value: record ? `${formatValue(record.sleepHours)}小时` : "7-8小时",
      helper: record ? "恢复记录" : "建议目标",
      Icon: MoonStar,
      color: "bg-[#EAF4FF] text-[#1677FF]",
    },
    {
      label: "运动",
      value: record ? `${formatValue(record.workoutMinutes, 0)}分钟` : "30分钟",
      helper: record ? "身体活跃" : "轻量开始",
      Icon: Dumbbell,
      color: "bg-[#ECFDF3] text-[#09A85B]",
    },
    {
      label: "饮食",
      value: record ? `${formatValue(record.nutritionScore)}/10` : "8/10",
      helper: record
        ? getNutritionPreview(record) || "营养评分"
        : "稳定目标",
      Icon: Soup,
      color: "bg-[#FFF5D7] text-[#B77900]",
    },
    {
      label: "手机",
      value: record ? `${formatValue(record.phoneHours)}小时` : "<3小时",
      helper: record ? "专注消耗" : "控制目标",
      Icon: Smartphone,
      color: "bg-[#F4EAFE] text-[#8B3DDF]",
    },
    {
      label: "情绪",
      value: record ? formatValue(record.mood, "一般") : "稳定",
      helper: record ? "主观状态" : "先观察",
      Icon: Smile,
      color: "bg-[#FFEAF1] text-[#D92967]",
    },
    {
      label: "执行",
      value: record ? `${formatValue(record.completedActions, 0)}件` : "3件",
      helper: record ? "完成行动" : "今日目标",
      Icon: ClipboardCheck,
      color: "bg-[#EAFBF8] text-[#0F9F8E]",
    },
  ];
}

function getHeroCopy(stats) {
  if (!stats.todayRecord) {
    return {
      eyebrow: "今日还未记录",
      title: "先留下今天的状态存档",
      description: "记录睡眠、运动、饮食、手机、情绪和执行力，让每天的变化有迹可循。",
      scoreLabel: "待记",
      scoreSuffix: "",
      actionLabel: "开始今日记录",
    };
  }

  return {
    eyebrow: "今日状态",
    title: stats.todayRecord.title,
    description:
      String(stats.todayRecord.summary).split("\n")[0] ||
      "今天的成长状态已经生成。",
    scoreLabel: stats.todayRecord.statusScore,
    scoreSuffix: "分",
    actionLabel: "更新今日记录",
  };
}

function getFocusItems(stats) {
  if (!stats.todayRecord) {
    return [
      { label: "恢复", value: "睡够 7 小时", Icon: MoonStar },
      { label: "身体", value: "运动 30 分钟", Icon: Dumbbell },
      { label: "专注", value: "手机少于 3 小时", Icon: Target },
    ];
  }

  const score = stats.todayRecord.statusScore;

  if (score >= 80) {
    return [
      { label: "保持", value: "延续今天节奏", Icon: Trophy },
      { label: "复盘", value: "写下有效动作", Icon: ClipboardCheck },
      { label: "恢复", value: "别透支明天", Icon: Shield },
    ];
  }

  return [
    { label: "修复", value: "先补睡眠", Icon: MoonStar },
    { label: "减负", value: "只抓一件行动", Icon: Target },
    { label: "收心", value: "压低手机时间", Icon: Smartphone },
  ];
}

export function HomeDashboard({ onNavigate }) {
  const [records, setRecords] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function refreshRecords() {
      const nextRecords = await loadDailyRecords();

      if (!cancelled) {
        setRecords(nextRecords);
      }
    }

    refreshRecords();
    window.addEventListener("focus", refreshRecords);
    window.addEventListener("storage", refreshRecords);
    window.addEventListener("daily-records-updated", refreshRecords);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshRecords);
      window.removeEventListener("storage", refreshRecords);
      window.removeEventListener("daily-records-updated", refreshRecords);
    };
  }, []);

  const stats = useMemo(() => getHomeStats(records), [records]);
  const heroCopy = useMemo(() => getHeroCopy(stats), [stats]);
  const metricItems = useMemo(
    () => getMetricItems(stats.todayRecord || stats.latestRecord),
    [stats.todayRecord, stats.latestRecord],
  );
  const focusItems = useMemo(() => getFocusItems(stats), [stats]);

  return (
    <main className="min-h-screen bg-[#EEF8FF] text-[#0D1B33]">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col overflow-x-hidden rounded-[32px] bg-white px-5 pb-[calc(88px+env(safe-area-inset-bottom))] pt-4 shadow-[0_24px_80px_rgba(10,141,255,0.16)] sm:my-6">
        <HomeHeader
          recordCount={stats.recordCount}
          onOpenStatus={() => onNavigate?.("status")}
        />
        <StatusHeroCard
          copy={heroCopy}
          levelInfo={stats.levelInfo}
          totalXp={stats.totalXp}
          onRecord={() => onNavigate?.("record")}
          onCalendar={() => onNavigate?.("calendar")}
        />
        <ProgressSummary stats={stats} />
        <FeatureGrid items={metricItems} onNavigate={onNavigate} />
        <TodayFocus items={focusItems} onNavigate={onNavigate} />
        <BuffPanel
          record={stats.todayRecord || stats.latestRecord}
          onNavigate={onNavigate}
        />
        <RecentRecords records={stats.recentRecords} onNavigate={onNavigate} />
      </div>

      <HomeBottomTabBar activePage="home" onNavigate={onNavigate} />
    </main>
  );
}

function HomeHeader({ recordCount, onOpenStatus }) {
  return (
    <header className="mt-1 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[12px] font-black text-[#0A8DFF]">
          已记录 {recordCount} 天
        </p>
        <h1 className="mt-1 text-[27px] font-black tracking-tight text-[#0B2C7E]">
          人生成长记录
        </h1>
      </div>

      <AuthButton />
    </header>
  );
}

function StatusHeroCard({
  copy,
  levelInfo,
  totalXp,
  onRecord,
  onCalendar,
}) {
  return (
    <section className="relative mt-4 min-h-[286px] overflow-hidden rounded-[28px] border border-[#B9D8FF] bg-[linear-gradient(135deg,#F8FCFF_0%,#EDF7FF_58%,#E7F2FF_100%)] px-5 py-4 shadow-[0_18px_44px_rgba(10,141,255,0.12)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_20%,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0)_38%)]" />

      <div className="relative z-10 max-w-[60%]">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-1 text-[12px] font-black text-[#0B2C7E] shadow-[0_8px_20px_rgba(10,141,255,0.08)]">
          <Sparkles className="h-3.5 w-3.5 text-[#D99900]" strokeWidth={2.5} />
          {copy.eyebrow}
        </div>

        <div className="mt-3 flex items-end gap-2">
          <p className="text-[70px] font-black leading-[0.88] tracking-tight text-[#0B2C7E]">
            {copy.scoreLabel}
          </p>
          <p className="pb-2 text-[20px] font-black text-[#0A8DFF]">
            {copy.scoreSuffix}
          </p>
        </div>

        <h2 className="mt-4 text-[21px] font-black leading-[1.12] text-[#0D1B33]">
          {copy.title}
        </h2>
        <p className="mt-2 line-clamp-3 text-[13px] font-semibold leading-[18px] text-[#60728A]">
          {copy.description}
        </p>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-[12px] font-black">
            <span className="text-[#0B2C7E]">{levelInfo.label}</span>
            <span className="text-[#60728A]">{totalXp} XP</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[#C8DDF6]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#09A85B,#0A8DFF,#F5B642)]"
              style={{ width: `${levelInfo.progress}%` }}
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-[16px] bg-[#0A8DFF] px-3 text-[13px] font-black text-white shadow-[0_12px_24px_rgba(10,141,255,0.24)]"
            type="button"
            onClick={onRecord}
          >
            <Plus className="h-4 w-4 shrink-0" strokeWidth={2.5} />
            <span className="truncate">{copy.actionLabel}</span>
          </button>
          <button
            aria-label="打开成长日历"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-[#BFD8FF] bg-white text-[#0A8DFF]"
            type="button"
            onClick={onCalendar}
          >
            <CalendarDays className="h-5 w-5" strokeWidth={2.4} />
          </button>
        </div>
      </div>

      <img
        alt="成长角色"
        className="pointer-events-none absolute bottom-[-5px] right-[-3px] z-0 h-[242px] w-[154px] object-contain object-bottom drop-shadow-[0_20px_28px_rgba(13,27,51,0.14)]"
        src="/home-cow-cutout.png"
      />
    </section>
  );
}

function ProgressSummary({ stats }) {
  const summaryItems = [
    {
      label: "连续记录",
      value: `${stats.streakDays}天`,
      Icon: Shield,
      color: "text-[#09A85B]",
    },
    {
      label: "本月完成",
      value: `${stats.monthCompletion}%`,
      Icon: CalendarDays,
      color: "text-[#0A8DFF]",
    },
    {
      label: "平均状态",
      value: stats.averageScore ? `${stats.averageScore}分` : "--",
      Icon: BarChart3,
      color: "text-[#B77900]",
    },
  ];

  return (
    <section className="mt-3 grid grid-cols-3 gap-2.5">
      {summaryItems.map(({ label, value, Icon, color }) => (
        <div
          className="min-h-[82px] rounded-[20px] border border-[#E4EEFA] bg-[#FBFDFF] px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
          key={label}
        >
          <Icon className={`h-5 w-5 ${color}`} strokeWidth={2.4} />
          <p className="mt-2 text-[17px] font-black leading-5 text-[#0D1B33]">
            {value}
          </p>
          <p className="mt-1 text-[11px] font-bold text-[#60728A]">{label}</p>
        </div>
      ))}
    </section>
  );
}

function FeatureGrid({ items, onNavigate }) {
  return (
    <section className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[18px] font-black text-[#0B2C7E]">今日六维状态</h2>
        <button
          className="inline-flex items-center gap-1 text-[13px] font-black text-[#0A8DFF]"
          type="button"
          onClick={() => onNavigate?.("record")}
        >
          记录
          <ChevronRight className="h-4 w-4" strokeWidth={2.4} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {items.map(({ label, value, helper, Icon, color }) => (
          <button
            className="flex min-h-[86px] items-center gap-3 rounded-[20px] border border-[#E4EEFA] bg-white px-3 py-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition-transform hover:-translate-y-0.5"
            key={label}
            type="button"
            onClick={() => onNavigate?.("record")}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] ${color}`}
            >
              <Icon className="h-5 w-5" strokeWidth={2.35} />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-bold text-[#60728A]">{label}</p>
              <p className="mt-0.5 truncate text-[18px] font-black text-[#0D1B33]">
                {value}
              </p>
              <p className="mt-0.5 text-[11px] font-bold text-[#93A3B8]">
                {helper}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function TodayFocus({ items, onNavigate }) {
  return (
    <section className="mt-4 rounded-[22px] border border-[#E4EEFA] bg-[#FBFDFF] px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[12px] font-black text-[#09A85B]">今日重点</p>
          <h2 className="mt-1 text-[18px] font-black text-[#0B2C7E]">
            只抓三个小动作
          </h2>
        </div>
        <button
          aria-label="去记录今日重点"
          className="flex h-9 w-9 items-center justify-center rounded-[15px] bg-[#ECFDF3] text-[#09A85B]"
          type="button"
          onClick={() => onNavigate?.("record")}
        >
          <Target className="h-5 w-5" strokeWidth={2.4} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {items.map(({ label, value, Icon }) => (
          <div
            className="min-h-[82px] rounded-[18px] bg-white px-2.5 py-3 text-center shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
            key={`${label}-${value}`}
          >
            <Icon
              className="mx-auto h-5 w-5 text-[#0A8DFF]"
              strokeWidth={2.4}
            />
            <p className="mt-2 text-[12px] font-black text-[#0D1B33]">
              {label}
            </p>
            <p className="mt-1 text-[11px] font-bold leading-4 text-[#60728A]">
              {value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BuffPanel({ record, onNavigate }) {
  const buffs = record?.buffs || [];
  const debuffs = record?.debuffs || [];
  const hasStatus = buffs.length > 0 || debuffs.length > 0;

  return (
    <section className="mt-4 rounded-[22px] border border-[#E4EEFA] bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[18px] font-black text-[#0B2C7E]">状态结算</h2>
        <button
          className="inline-flex items-center gap-1 text-[13px] font-black text-[#0A8DFF]"
          type="button"
          onClick={() => onNavigate?.("status")}
        >
          我的
          <ChevronRight className="h-4 w-4" strokeWidth={2.4} />
        </button>
      </div>

      {!hasStatus ? (
        <div className="rounded-[18px] bg-[#F5F9FF] px-4 py-3 text-[13px] font-bold leading-5 text-[#60728A]">
          完成今日记录后，这里会生成 Buff、Debuff 和成长复盘。
        </div>
      ) : (
        <div className="space-y-3">
          <StatusChips
            label="Buff"
            emptyLabel="暂无 Buff"
            items={buffs}
            tone="buff"
          />
          <StatusChips
            label="Debuff"
            emptyLabel="暂无 Debuff"
            items={debuffs}
            tone="debuff"
          />
        </div>
      )}
    </section>
  );
}

function StatusChips({ label, emptyLabel, items, tone }) {
  const className =
    tone === "buff"
      ? "bg-[#E4F8E9] text-[#049B3D]"
      : "bg-[#FFE9E9] text-[#F01818]";

  return (
    <div>
      <p
        className={`text-[15px] font-black ${
          tone === "buff" ? "text-[#11B94A]" : "text-[#FF1F1F]"
        }`}
      >
        {label}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {(items.length > 0 ? items : [emptyLabel]).map((item) => (
          <span
            className={`rounded-xl px-3 py-1.5 text-[12px] font-bold ${className}`}
            key={item}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function RecentRecords({ records, onNavigate }) {
  return (
    <section className="mt-4 rounded-[22px] border border-[#E4EEFA] bg-[#FBFDFF] px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[18px] font-black text-[#0B2C7E]">最近存档</h2>
        <button
          className="inline-flex items-center gap-1 text-[13px] font-black text-[#0A8DFF]"
          type="button"
          onClick={() => onNavigate?.("calendar")}
        >
          日历
          <ChevronRight className="h-4 w-4" strokeWidth={2.4} />
        </button>
      </div>

      {records.length === 0 ? (
        <button
          className="flex min-h-[76px] w-full items-center gap-3 rounded-[18px] bg-white px-3 py-3 text-left shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
          type="button"
          onClick={() => onNavigate?.("record")}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] bg-[#EAF4FF] text-[#0A8DFF]">
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[15px] font-black text-[#0D1B33]">
              还没有人生存档
            </p>
            <p className="mt-1 text-[12px] font-bold text-[#60728A]">
              今天先记录一次，首页就会长出你的数据。
            </p>
          </div>
        </button>
      ) : (
        <div className="space-y-2">
          {records.map((record) => (
            <button
              className="flex min-h-[70px] w-full items-center justify-between gap-3 rounded-[18px] bg-white px-3 py-3 text-left shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
              key={record.date}
              type="button"
              onClick={() => onNavigate?.("calendar")}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] bg-[#F4EAFE] text-[#8B3DDF]">
                  <Trophy className="h-5 w-5" strokeWidth={2.4} />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-[#60728A]">
                    {formatMonthDay(record.date)}
                  </p>
                  <p className="mt-0.5 truncate text-[15px] font-black text-[#0D1B33]">
                    {record.title}
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[15px] font-black text-[#0A8DFF]">
                  {record.statusScore}分
                </p>
                <p className="mt-0.5 text-[11px] font-bold text-[#60728A]">
                  {record.xpGained >= 0 ? "+" : ""}
                  {record.xpGained} XP
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function HomeBottomTabBar({ activePage, onNavigate }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E6EDFF] bg-white/95 px-5 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1 backdrop-blur-xl">
      <div className="mx-auto grid w-full max-w-[430px] grid-cols-4 gap-1">
        {navItems.map(({ id, label, Icon }) => {
          const isActive = id === activePage;

          return (
            <button
              className={[
                "flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold transition-colors",
                isActive ? "text-[#0A8DFF]" : "text-[#8A95A3]",
              ]
                .filter(Boolean)
                .join(" ")}
              key={id}
              type="button"
              onClick={() => onNavigate?.(id)}
            >
              <span
                className={[
                  "flex h-6 w-6 items-center justify-center rounded-full transition-colors",
                  isActive
                    ? "bg-[#0A8DFF] text-white shadow-[0_8px_18px_rgba(10,141,255,0.28)]"
                    : "text-[#8A95A3]",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <Icon className="h-4 w-4" strokeWidth={2.4} />
              </span>
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
