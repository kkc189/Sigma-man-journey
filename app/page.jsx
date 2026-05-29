"use client";

import { useEffect, useState } from "react";
import {
  AppCard,
  BottomNav,
  StatBar,
  StatusBadge,
  XPBar,
} from "../components/ui";
import { HomeDashboard } from "../components/home-dashboard";
import { RecordPage } from "../components/record-page";

const initialForm = {
  sleepHours: "",
  workoutMinutes: "",
  phoneHours: "",
  todayNote: "",
  mood: "",
  noRewardDays: "",
};

function calculateTodayXp(form) {
  const sleepHours = Number(form.sleepHours);
  const workoutMinutes = Number(form.workoutMinutes);
  const phoneHours = Number(form.phoneHours);
  const mood = Number(form.mood);
  let xp = 0;

  if (form.workoutMinutes !== "" && workoutMinutes > 45) {
    xp += 10;
  }

  if (form.sleepHours !== "" && sleepHours > 7) {
    xp += 10;
  }

  if (form.phoneHours !== "" && phoneHours < 4) {
    xp += 10;
  }

  if (form.mood !== "" && mood >= 8) {
    xp += 5;
  }

  if (form.phoneHours !== "" && phoneHours > 6) {
    xp -= 5;
  }

  return xp;
}

function isYesterday(savedDate, today) {
  if (!savedDate) {
    return false;
  }

  const saved = new Date(`${savedDate}T00:00:00`);
  const current = new Date(`${today}T00:00:00`);
  const oneDay = 24 * 60 * 60 * 1000;

  return current - saved === oneDay;
}

function getNextNoWorkoutDays(form, today, currentNoWorkoutDays) {
  const workoutMinutes = Number(form.workoutMinutes);
  const hasWorkout = form.workoutMinutes !== "" && workoutMinutes > 0;
  const savedTracker = localStorage.getItem("life-growth-no-workout-days");
  const tracker = savedTracker ? JSON.parse(savedTracker) : {};
  const previousCount = Number(tracker.count) || currentNoWorkoutDays;

  if (hasWorkout) {
    return 0;
  }

  if (tracker.date === today) {
    return Math.max(1, previousCount);
  }

  if (isYesterday(tracker.date, today)) {
    return previousCount + 1;
  }

  return 1;
}

function getTodayStatuses(form, noWorkoutDays) {
  const sleepHours = Number(form.sleepHours);
  const workoutMinutes = Number(form.workoutMinutes);
  const phoneHours = Number(form.phoneHours);
  const mood = Number(form.mood);
  const streakSource = form.noRewardDays ?? form.streak ?? form.streakDays;
  const streakDays = Number(streakSource);
  const buffs = [];
  const debuffs = [];

  if (form.sleepHours !== "" && sleepHours >= 7) {
    buffs.push({
      name: "🌙 恢复 Buff",
      description: "身体恢复状态不错",
    });
  }

  if (form.workoutMinutes !== "" && workoutMinutes >= 45) {
    buffs.push({
      name: "💪 活跃 Buff",
      description: "身体进入活跃状态",
    });
  }

  if (form.phoneHours !== "" && phoneHours <= 3) {
    buffs.push({
      name: "🎯 专注 Buff",
      description: "今天注意力保持不错",
    });
  }

  if (form.mood !== "" && mood >= 8) {
    buffs.push({
      name: "✨ 情绪 Buff",
      description: "整体情绪状态良好",
    });
  }

  if (form.noRewardDays !== "" && streakDays >= 7) {
    buffs.push({
      name: "🔥 稳定 Buff",
      description: "你最近保持得很稳定",
    });
  }

  if (form.sleepHours !== "" && sleepHours < 5) {
    debuffs.push({
      name: "😵 疲劳状态",
      description: "恢复能力下降",
    });
  }

  if (form.phoneHours !== "" && phoneHours > 6) {
    debuffs.push({
      name: "📱 分心状态",
      description: "注意力被大量消耗",
    });
  }

  if (form.mood !== "" && mood <= 4) {
    debuffs.push({
      name: "🌧️ 低能量状态",
      description: "今天情绪偏低",
    });
  }

  if (noWorkoutDays >= 2) {
    debuffs.push({
      name: "🪫 状态下降",
      description: "身体活跃度下降",
    });
  }

  return { buffs, debuffs };
}

function getStatusSummary(buffCount, debuffCount) {
  if (buffCount > debuffCount) {
    return "今天整体状态正在上升。";
  }

  if (debuffCount > buffCount) {
    return "今天需要更多恢复和专注。";
  }

  return "今天状态正常，继续保持。";
}

function getLevelInfo(totalXp) {
  if (totalXp >= 250) {
    return {
      level: "LV4",
      title: "高级成长体",
      nextLevel: "",
      nextXp: 250,
      avatar: "⚡🧠🔥",
      status: "高级成长状态已经出现，角色进入强执行模式。",
    };
  }

  if (totalXp >= 120) {
    return {
      level: "LV3",
      title: "现实修炼者",
      nextLevel: "LV4",
      nextXp: 250,
      avatar: "🔥😎",
      status: "角色更强壮了，现实训练正在留下痕迹。",
    };
  }

  if (totalXp >= 50) {
    return {
      level: "LV2",
      title: "状态觉醒者",
      nextLevel: "LV3",
      nextXp: 120,
      avatar: "😎",
      status: "最近状态稳定，角色正在成长。",
    };
  }

  return {
    level: "LV1",
    title: "现实新人",
    nextLevel: "LV2",
    nextXp: 50,
    avatar: "🙂",
    status: "普通角色刚开始行动，今天的数据会推动成长。",
  };
}

function getSettlementReview(form) {
  const sleepHours = Number(form.sleepHours);
  const workoutMinutes = Number(form.workoutMinutes);
  const phoneHours = Number(form.phoneHours);
  const mood = Number(form.mood);
  const streakSource = form.noRewardDays ?? form.streak ?? form.streakDays;
  const streakDays = Number(streakSource);
  const reviewLines = [];

  if (form.sleepHours !== "" && sleepHours < 6) {
    reviewLines.push("你今天睡眠偏少，恢复力下降，建议今晚优先补觉。");
  }

  if (form.sleepHours !== "" && sleepHours >= 7) {
    reviewLines.push("你今天睡眠不错，恢复状态提升。");
  }

  if (form.workoutMinutes !== "" && workoutMinutes >= 30) {
    reviewLines.push("你今天完成了运动，身体活跃度上升。");
  }

  if (form.phoneHours !== "" && phoneHours > 6) {
    reviewLines.push("但手机时间偏高，专注力受到影响。");
  }

  if (form.phoneHours !== "" && phoneHours <= 3) {
    reviewLines.push("你今天手机控制得不错，专注状态提升。");
  }

  if (form.mood !== "" && mood <= 2) {
    reviewLines.push("你今天情绪状态偏低，建议降低任务强度，先恢复。");
  }

  if (form.noRewardDays !== "" && streakDays >= 3) {
    reviewLines.push("你已经连续坚持多天，稳定性正在增强。");
  }

  if (reviewLines.length === 0) {
    reviewLines.push("今天的数据比较平稳，继续保持观察和记录。");
  }

  reviewLines.push("建议今晚早点休息，明天继续保持节奏。");

  return reviewLines;
}

function getRecordXp(record) {
  return Number(record.xp ?? record.xpEarned) || 0;
}

function getDateLabel(date) {
  if (!date) {
    return "Day";
  }

  return date.slice(5);
}

function getDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateKey(dateKey) {
  return new Date(`${dateKey}T00:00:00`);
}

function formatMonthYear(dateKey) {
  const date = typeof dateKey === "string" ? parseDateKey(dateKey) : dateKey;
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
}

function formatMonthDay(dateKey) {
  const date = typeof dateKey === "string" ? parseDateKey(dateKey) : dateKey;
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

function getLevelNumber(totalXp) {
  if (totalXp >= 250) {
    return 4;
  }

  if (totalXp >= 120) {
    return 3;
  }

  if (totalXp >= 50) {
    return 2;
  }

  return 1;
}

function normalizeStatusItem(item) {
  if (typeof item === "string") {
    return item;
  }

  return item?.name || item?.label || "";
}

function normalizeStatusList(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map(normalizeStatusItem).filter(Boolean);
}

function normalizeDailyRecord(record) {
  if (!record || !record.date) {
    return null;
  }

  const totalXp = Number(record.totalXp ?? record.xp ?? record.xpEarned) || 0;

  return {
    date: record.date,
    sleepHours: record.sleepHours ?? "",
    workoutMinutes: record.workoutMinutes ?? "",
    phoneHours: record.phoneHours ?? "",
    mood: record.mood ?? "",
    streak: record.streak ?? record.noRewardDays ?? record.streakDays ?? "",
    noRewardDays:
      record.noRewardDays ?? record.streak ?? record.streakDays ?? "",
    actions: record.actions ?? record.todayNote ?? "",
    todayNote: record.todayNote ?? record.actions ?? "",
    xp: getRecordXp(record),
    xpEarned: Number(record.xpEarned ?? record.xp) || 0,
    level: record.level ?? getLevelNumber(totalXp),
    levelLabel: record.levelLabel || getLevelInfo(totalXp).level,
    levelTitle: record.levelTitle || getLevelInfo(totalXp).title,
    totalXp: Number(record.totalXp ?? 0) || 0,
    buffs: normalizeStatusList(record.buffs),
    debuffs: normalizeStatusList(record.debuffs),
    reviewText:
      record.reviewText ||
      (Array.isArray(record.reviewLines)
        ? record.reviewLines.join("\n")
        : ""),
    noWorkoutDays: Number(record.noWorkoutDays) || 0,
  };
}

function getRecordDisplayReview(record) {
  if (!record) {
    return [];
  }

  if (record.reviewText) {
    return String(record.reviewText)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return getSettlementReview(record);
}

function getCumulativeXp(records, dateKey) {
  return records
    .filter((record) => record.date <= dateKey)
    .reduce((sum, record) => sum + getRecordXp(record), 0);
}

function getCalendarCells(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const leadingBlanks = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < leadingBlanks; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function shiftMonth(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function buildSelectedDetail(record, records) {
  if (!record) {
    return null;
  }

  const cumulativeXp = getCumulativeXp(records, record.date);
  const levelInfo = getLevelInfo(cumulativeXp);
  const levelNumber = getLevelNumber(cumulativeXp);
  const reviewLines = getRecordDisplayReview(record);
  const xpToNextLevel = levelInfo.nextLevel
    ? Math.max(levelInfo.nextXp - cumulativeXp, 0)
    : 0;
  const levelProgressPercent = levelInfo.nextLevel
    ? Math.min((cumulativeXp / levelInfo.nextXp) * 100, 100)
    : 100;

  return {
    date: record.date,
    title: `${formatMonthDay(record.date)}状态档案`,
    cumulativeXp,
    levelInfo,
    levelNumber,
    xpToNextLevel,
    levelProgressPercent,
    reviewLines,
  };
}

function XpChart({ records }) {
  const recentRecords = records.slice(-7);
  const maxXp = Math.max(
    ...recentRecords.map((record) => Math.abs(getRecordXp(record))),
    1,
  );

  return (
    <div className="space-y-3">
      {recentRecords.map((record, index) => {
        const xp = getRecordXp(record);
        const barWidth = Math.max((Math.abs(xp) / maxXp) * 100, 6);
        const isNegative = xp < 0;

        return (
          <div className="space-y-1" key={record.date || index}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">
                {getDateLabel(record.date)}
              </span>
              <span className="font-medium text-zinc-200">{xp} XP</span>
            </div>
            <div className="h-3 rounded-full bg-zinc-800">
              <div
                className={`h-3 rounded-full ${
                  isNegative ? "bg-red-500" : "bg-emerald-400"
                }`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeeklySummary({ records }) {
  const weekRecords = records.slice(-7);
  const totalXp = weekRecords.reduce(
    (total, record) => total + getRecordXp(record),
    0,
  );
  const averageXp = Math.round(totalXp / weekRecords.length);
  const bestRecord = weekRecords.reduce((best, record) =>
    getRecordXp(record) > getRecordXp(best) ? record : best,
  );
  const lowestRecord = weekRecords.reduce((lowest, record) =>
    getRecordXp(record) < getRecordXp(lowest) ? record : lowest,
  );

  return (
    <AppCard
      eyebrow="WEEKLY SUMMARY"
      title="本周总结"
      className="mt-5"
      contentClassName="space-y-2 text-sm leading-6 text-zinc-300"
    >
      <p>本周总 XP：{totalXp}</p>
      <p>平均每日 XP：{averageXp}</p>
      <p>
        最佳状态日：{getDateLabel(bestRecord.date)}，{getRecordXp(bestRecord)} XP
      </p>
      <p>
        最低状态日：{getDateLabel(lowestRecord.date)}，{getRecordXp(lowestRecord)} XP
      </p>
    </AppCard>
  );
}

function DailySettlement({ form, xp, totalXp, buffs, debuffs }) {
  const levelInfo = getLevelInfo(totalXp);
  const xpToNextLevel = Math.max(levelInfo.nextXp - totalXp, 0);
  const reviewLines = getSettlementReview(form);

  return (
    <AppCard
      eyebrow="游戏结算面板"
      title="今日结算"
      right={
        <StatusBadge variant={xp >= 0 ? "buff" : "debuff"}>
          {xp >= 0 ? "+" : ""}
          {xp} XP
        </StatusBadge>
      }
      className="mx-auto mb-4 w-full max-w-md"
    >
      <div className="space-y-3">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <p className="text-sm text-zinc-400">今日获得</p>
          <p className="mt-1 text-3xl font-semibold">
            {xp >= 0 ? "+" : ""}
            {xp} XP
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <p className="text-sm font-medium text-zinc-100">
            {levelInfo.level} {levelInfo.title}
          </p>
          <p className="mt-1 text-sm text-zinc-400">当前 XP：{totalXp}</p>
          <XPBar
            className="mt-3"
            current={totalXp}
            max={levelInfo.nextXp}
            label="升级进度"
            valueLabel={
              levelInfo.nextLevel
                ? `距离 ${levelInfo.nextLevel} 还差 ${xpToNextLevel} XP`
                : "已经达到当前最高等级"
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-emerald-200">今日 Buff</p>
              <span className="text-xs text-zinc-500">{buffs.length} 个</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {buffs.length === 0 ? (
                <StatusBadge variant="neutral">暂无 Buff</StatusBadge>
              ) : (
                buffs.map((buff) => (
                  <StatusBadge variant="buff" key={buff.name}>
                    {buff.name}
                  </StatusBadge>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-red-200">今日 Debuff</p>
              <span className="text-xs text-zinc-500">{debuffs.length} 个</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {debuffs.length === 0 ? (
                <StatusBadge variant="neutral">暂无 Debuff，状态稳定</StatusBadge>
              ) : (
                debuffs.map((debuff) => (
                  <StatusBadge variant="debuff" key={debuff.name}>
                    {debuff.name}
                  </StatusBadge>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <p className="text-sm font-medium text-zinc-100">今日复盘</p>
          <div className="mt-2 space-y-2 text-sm leading-6 text-zinc-300">
            {reviewLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      </div>
    </AppCard>
  );
}

function CalendarView({
  viewMonthDate,
  selectedDate,
  todayKey,
  recordsByDate,
  onPreviousMonth,
  onNextMonth,
  onSelectDate,
}) {
  const cells = getCalendarCells(viewMonthDate);
  const weekLabels = ["一", "二", "三", "四", "五", "六", "日"];

  return (
    <div className="rounded-[20px] border border-white/10 bg-black/30 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200"
          type="button"
          onClick={onPreviousMonth}
        >
          上个月
        </button>
        <p className="text-sm font-medium text-zinc-200">
          {formatMonthYear(viewMonthDate)}
        </p>
        <button
          className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200"
          type="button"
          onClick={onNextMonth}
        >
          下个月
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] text-zinc-500">
        {weekLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((dateKey, index) => {
          if (!dateKey) {
            return <div className="aspect-square" key={`empty-${index}`} />;
          }

          const record = recordsByDate[dateKey];
          const day = Number(dateKey.slice(8, 10));
            const isToday = dateKey === todayKey;
            const isSelected = dateKey === selectedDate;
            const xp = record ? getRecordXp(record) : 0;
            const hasRecord = Boolean(record);
            const dotColor =
              xp < 0 ? "bg-red-400" : xp >= 20 ? "bg-emerald-300" : "bg-zinc-400";
            const cellClassName = [
              "relative aspect-square rounded-2xl border px-1 py-1 text-center text-xs transition-colors",
              hasRecord
                ? "border-emerald-900/80 bg-white/[0.04] text-zinc-100"
                : "border-white/10 bg-black/30 text-zinc-500",
              isToday ? "ring-1 ring-white/40" : "",
              isSelected ? "border-white bg-white text-black" : "",
              hasRecord && xp >= 20 ? "shadow-[0_0_12px_rgba(52,211,153,0.12)]" : "",
            ]
              .filter(Boolean)
              .join(" ");

          return (
            <button
              key={dateKey}
              className={cellClassName}
              type="button"
              onClick={() => onSelectDate(dateKey)}
            >
              <div className="flex h-full flex-col items-center justify-between">
                <span className="pt-0.5 text-[11px] font-medium">{day}</span>
                <span
                  className={`mb-0.5 h-1.5 w-1.5 rounded-full ${
                    hasRecord ? dotColor : "bg-transparent"
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DayDetailCard({ selectedDate, record, allRecords }) {
  const detail = buildSelectedDetail(record, allRecords);

  return (
    <AppCard
      eyebrow="人生存档"
      title={selectedDate ? `${formatMonthDay(selectedDate)}状态档案` : "状态档案"}
      className="mx-auto mt-4 w-full max-w-md"
    >
      {!detail ? (
        <p className="rounded-2xl border border-white/10 bg-black/30 px-3 py-4 text-sm leading-6 text-zinc-400">
          这一天还没有状态记录。
          <br />
          完成当天记录后，这里会生成你的人生 RPG 存档。
        </p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="text-sm font-medium text-zinc-100">现实行动</p>
            <div className="mt-3 space-y-2 text-sm leading-6 text-zinc-300">
              <p>睡眠：{detailRecordValue(record.sleepHours, "小时")}</p>
              <p>健身：{detailRecordValue(record.workoutMinutes, "分钟")}</p>
              <p>手机使用：{detailRecordValue(record.phoneHours, "小时")}</p>
              <p>心情：{detailRecordValue(record.mood, "/ 10")}</p>
              <p>Streak：{detailRecordValue(record.streak, "天")}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="text-sm font-medium text-zinc-100">今日行动</p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              {record.actions || "暂无行动记录"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-zinc-100">获得 XP</p>
              <StatusBadge variant={Number(record.xp) >= 0 ? "buff" : "debuff"}>
                {detailRecordSignedXp(record.xp)}
              </StatusBadge>
            </div>
            <XPBar
              className="mt-3"
              current={detail.cumulativeXp}
              max={detail.levelInfo.nextXp}
              label={`${detail.levelInfo.level} ${detail.levelInfo.title}`}
              valueLabel={
                detail.levelInfo.nextLevel
                  ? `距离 ${detail.levelInfo.nextLevel} 还差 ${detail.xpToNextLevel} XP`
                  : "已经达到当前最高等级"
              }
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-emerald-200">状态 Buff</p>
              <span className="text-xs text-zinc-500">{record.buffs.length} 个</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {record.buffs.length === 0 ? (
                <StatusBadge variant="neutral">暂无 Buff</StatusBadge>
              ) : (
                record.buffs.map((buff, index) => (
                  <StatusBadge variant="buff" key={`${buff}-${index}`}>
                    {buff}
                  </StatusBadge>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-red-200">状态 Debuff</p>
              <span className="text-xs text-zinc-500">{record.debuffs.length} 个</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {record.debuffs.length === 0 ? (
                <StatusBadge variant="neutral">暂无 Debuff，状态稳定</StatusBadge>
              ) : (
                record.debuffs.map((debuff, index) => (
                  <StatusBadge variant="debuff" key={`${debuff}-${index}`}>
                    {debuff}
                  </StatusBadge>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="text-sm font-medium text-zinc-100">结算复盘</p>
            <div className="mt-2 space-y-2 text-sm leading-6 text-zinc-300">
              {detail.reviewLines.length === 0 ? (
                <p>暂无复盘内容</p>
              ) : (
                detail.reviewLines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)
              )}
            </div>
          </div>
        </div>
      )}
    </AppCard>
  );
}

function detailRecordValue(value, suffix) {
  if (value === "" || value === null || value === undefined) {
    return "未记录";
  }

  return `${value} ${suffix}`;
}

function detailRecordSignedXp(xp) {
  const number = Number(xp) || 0;
  return `${number >= 0 ? "+" : ""}${number} XP`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getAttributeScores(form, totalXp, buffs, debuffs, noWorkoutDays) {
  const sleepHours = Number(form.sleepHours);
  const workoutMinutes = Number(form.workoutMinutes);
  const phoneHours = Number(form.phoneHours);
  const mood = Number(form.mood);
  const streakDays = Number(form.noRewardDays ?? form.streak ?? form.streakDays);

  const energy = clamp(
    35 +
      (Number.isFinite(sleepHours) ? sleepHours * 5 : 0) +
      (Number.isFinite(workoutMinutes) ? workoutMinutes / 4 : 0) -
      (Number.isFinite(phoneHours) ? phoneHours * 4 : 0),
    8,
    100,
  );

  const focus = clamp(
    42 +
      (Number.isFinite(phoneHours) ? (6 - phoneHours) * 9 : 0) +
      (buffs.some((item) => item.name.includes("专注")) ? 10 : 0) -
      debuffs.length * 5,
    8,
    100,
  );

  const recovery = clamp(
    30 +
      (Number.isFinite(sleepHours) ? sleepHours * 8 : 0) +
      (noWorkoutDays === 0 ? 8 : 0) +
      (buffs.some((item) => item.name.includes("恢复")) ? 12 : 0),
    8,
    100,
  );

  const execution = clamp(
    30 +
      (Number.isFinite(workoutMinutes) ? workoutMinutes * 0.8 : 0) +
      (Number.isFinite(streakDays) ? streakDays * 2 : 0) +
      Math.min(totalXp / 4, 25),
    8,
    100,
  );

  const moodStability = clamp(
    40 +
      (Number.isFinite(mood) ? mood * 6 : 0) -
      debuffs.length * 4 +
      (buffs.some((item) => item.name.includes("情绪")) ? 10 : 0),
    8,
    100,
  );

  return [
    { label: "能量", value: energy, accent: "from-amber-300 to-orange-500" },
    { label: "专注", value: focus, accent: "from-sky-300 to-cyan-400" },
    { label: "恢复", value: recovery, accent: "from-emerald-300 to-lime-400" },
    { label: "执行力", value: execution, accent: "from-fuchsia-300 to-pink-500" },
    { label: "情绪稳定", value: moodStability, accent: "from-violet-300 to-indigo-400" },
  ];
}

const dashboardMockData = {
  statusScore: 78,
  level: "Lv. 8",
  xp: 320,
  nextXp: 500,
  title: "轻微觉醒牛马",
  features: [
    { label: "睡眠", icon: "☾" },
    { label: "健身", icon: "▮▮" },
    { label: "饮食", icon: "◌" },
    { label: "手机", icon: "▯" },
    { label: "情绪", icon: "☺" },
    { label: "执行力", icon: "☑" },
  ],
  buffs: ["早起 +20 XP", "健身达标 +30 XP", "专注时刻 +15 XP"],
  debuffs: ["熬夜 -20 XP", "手机超时 -15 XP"],
};

export default function Home() {
  const [form, setForm] = useState(initialForm);
  const [saved, setSaved] = useState(false);
  const [reviewItems, setReviewItems] = useState([]);
  const [totalXp, setTotalXp] = useState(0);
  const [todayXpEarned, setTodayXpEarned] = useState(null);
  const [noWorkoutDays, setNoWorkoutDays] = useState(0);
  const [dailyRecords, setDailyRecords] = useState([]);
  const [activePage, setActivePage] = useState("home");
  const todayKey = getDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [viewMonthDate, setViewMonthDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const levelInfo = getLevelInfo(totalXp);
  const { buffs, debuffs } = getTodayStatuses(form, noWorkoutDays);
  const statusSummary = getStatusSummary(buffs.length, debuffs.length);
  const attributeScores = getAttributeScores(
    form,
    totalXp,
    buffs,
    debuffs,
    noWorkoutDays,
  );
  const normalizedDailyRecords = dailyRecords
    .map(normalizeDailyRecord)
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
  const recordsByDate = Object.fromEntries(
    normalizedDailyRecords.map((record) => [record.date, record]),
  );
  const selectedRecord = recordsByDate[selectedDate] || null;

  useEffect(() => {
    const savedTotalXp = Number(localStorage.getItem("life-growth-total-xp")) || 0;
    const savedTodayRecord = localStorage.getItem("life-growth-today");
    const savedDailyRecords = localStorage.getItem("life-growth-daily-records");
    const savedNoWorkoutDays = localStorage.getItem("life-growth-no-workout-days");
    const today = getDateKey(new Date());
    let loadedDailyRecords = [];

    setTotalXp(savedTotalXp);

    if (savedDailyRecords) {
      loadedDailyRecords = JSON.parse(savedDailyRecords)
        .map(normalizeDailyRecord)
        .filter(Boolean)
        .sort((a, b) => a.date.localeCompare(b.date));
      setDailyRecords(loadedDailyRecords);
    }

    if (savedNoWorkoutDays) {
      const noWorkoutTracker = JSON.parse(savedNoWorkoutDays);
      setNoWorkoutDays(Number(noWorkoutTracker.count) || 0);
    }

    if (savedTodayRecord) {
      const todayRecord = JSON.parse(savedTodayRecord);
      const normalizedTodayRecord = normalizeDailyRecord(todayRecord);

      if (todayRecord.date === today) {
        setForm({
          sleepHours: normalizedTodayRecord?.sleepHours || "",
          workoutMinutes: normalizedTodayRecord?.workoutMinutes || "",
          phoneHours: normalizedTodayRecord?.phoneHours || "",
          todayNote: normalizedTodayRecord?.actions || normalizedTodayRecord?.todayNote || "",
          mood: normalizedTodayRecord?.mood || "",
          noRewardDays: normalizedTodayRecord?.streak || normalizedTodayRecord?.noRewardDays || "",
        });
        setTodayXpEarned(Number(normalizedTodayRecord?.xpEarned) || 0);
        setNoWorkoutDays(Number(normalizedTodayRecord?.noWorkoutDays) || 0);

        if (loadedDailyRecords.length === 0 && normalizedTodayRecord) {
          const migratedRecord = normalizedTodayRecord;

          localStorage.setItem(
            "life-growth-daily-records",
            JSON.stringify([migratedRecord]),
          );
          setDailyRecords([migratedRecord]);
        }
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function clearPwaArtifacts() {
      if (typeof window === "undefined") {
        return;
      }

      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();

        await Promise.all(registrations.map((registration) => registration.unregister()));
      }

      if ("caches" in window && window.caches) {
        const cacheNames = await window.caches.keys();
        await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
      }

      if (cancelled) {
        return;
      }
    }

    clearPwaArtifacts();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
    setSaved(false);
    setReviewItems([]);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const today = getDateKey(new Date());
    const todayXp = calculateTodayXp(form);
    const savedTodayRecord = localStorage.getItem("life-growth-today");
    let previousTodayXp = 0;
    const nextNoWorkoutDays = getNextNoWorkoutDays(
      form,
      today,
      noWorkoutDays,
    );
    const todayStatuses = getTodayStatuses(form, nextNoWorkoutDays);
    const settlementReviewLines = getSettlementReview(form);

    if (savedTodayRecord) {
      const previousRecord = JSON.parse(savedTodayRecord);

      if (previousRecord.date === today) {
        previousTodayXp = getRecordXp(previousRecord);
      }
    }

    const nextTotalXp = Math.max(0, totalXp - previousTodayXp + todayXp);
    const nextLevelInfo = getLevelInfo(nextTotalXp);
    const storageBuffs = todayStatuses.buffs.map((item) => item.name);
    const storageDebuffs = todayStatuses.debuffs.map((item) => item.name);

    const todayRecord = {
      date: today,
      sleepHours: form.sleepHours,
      workoutMinutes: form.workoutMinutes,
      phoneHours: form.phoneHours,
      mood: form.mood,
      streak: form.noRewardDays,
      noRewardDays: form.noRewardDays,
      actions: form.todayNote,
      todayNote: form.todayNote,
      xp: todayXp,
      xpEarned: todayXp,
      level: getLevelNumber(nextTotalXp),
      levelLabel: nextLevelInfo.level,
      levelTitle: nextLevelInfo.title,
      totalXp: nextTotalXp,
      noWorkoutDays: nextNoWorkoutDays,
      buffs: storageBuffs,
      debuffs: storageDebuffs,
      reviewText: settlementReviewLines.join("\n"),
    };

    const savedDailyRecords = localStorage.getItem("life-growth-daily-records");
    const currentDailyRecords = savedDailyRecords
      ? JSON.parse(savedDailyRecords).map(normalizeDailyRecord).filter(Boolean)
      : dailyRecords;
    const nextDailyRecords = [
      ...currentDailyRecords.filter((record) => record.date !== today),
      {
        date: today,
        sleepHours: form.sleepHours,
        workoutMinutes: form.workoutMinutes,
        phoneHours: form.phoneHours,
        mood: form.mood,
        streak: form.noRewardDays,
        noRewardDays: form.noRewardDays,
        actions: form.todayNote,
        todayNote: form.todayNote,
        xp: todayXp,
        xpEarned: todayXp,
        level: getLevelNumber(nextTotalXp),
        levelLabel: nextLevelInfo.level,
        levelTitle: nextLevelInfo.title,
        totalXp: nextTotalXp,
        buffs: storageBuffs,
        debuffs: storageDebuffs,
        reviewText: settlementReviewLines.join("\n"),
        noWorkoutDays: nextNoWorkoutDays,
      },
    ].sort((a, b) => a.date.localeCompare(b.date));

    localStorage.setItem("life-growth-today", JSON.stringify(todayRecord));
    localStorage.setItem("life-growth-total-xp", String(nextTotalXp));
    localStorage.setItem(
      "life-growth-daily-records",
      JSON.stringify(nextDailyRecords),
    );
    localStorage.setItem(
      "life-growth-no-workout-days",
      JSON.stringify({
        date: today,
        count: nextNoWorkoutDays,
      }),
    );
    setTotalXp(nextTotalXp);
    setTodayXpEarned(todayXp);
    setNoWorkoutDays(nextNoWorkoutDays);
    setDailyRecords(nextDailyRecords);
    setSelectedDate(today);
    setViewMonthDate(parseDateKey(today));
    setActivePage("status");
    setSaved(true);
  }

  function generateReview() {
    const sleepHours = Number(form.sleepHours);
    const workoutMinutes = Number(form.workoutMinutes);
    const phoneHours = Number(form.phoneHours);
    const mood = Number(form.mood);
    const nextReviewItems = [];

    if (form.sleepHours !== "" && sleepHours < 6) {
      nextReviewItems.push("今天睡眠不足，可能影响恢复和专注力。");
    }

    if (form.workoutMinutes !== "" && workoutMinutes > 45) {
      nextReviewItems.push("今天身体状态不错，训练有帮助。");
    }

    if (form.phoneHours !== "" && phoneHours > 5) {
      nextReviewItems.push("今天手机使用时间偏高，注意力可能被分散。");
    }

    if (form.mood !== "" && mood >= 8) {
      nextReviewItems.push("今天整体情绪状态不错。");
    }

    if (nextReviewItems.length === 0) {
      nextReviewItems.push("今天没有明显异常信号，保持观察。");
    }

    setReviewItems(nextReviewItems);
  }

  function handlePreviousMonth() {
    const previousMonth = shiftMonth(viewMonthDate, -1);
    setViewMonthDate(previousMonth);
    setSelectedDate(getDateKey(previousMonth));
  }

  function handleNextMonth() {
    const nextMonth = shiftMonth(viewMonthDate, 1);
    setViewMonthDate(nextMonth);
    setSelectedDate(getDateKey(nextMonth));
  }

  function handleSelectDate(dateKey) {
    setSelectedDate(dateKey);
    setViewMonthDate(parseDateKey(dateKey));
  }

  if (activePage === "home") {
    return <HomeDashboard onNavigate={setActivePage} />;
  }

  if (activePage === "record") {
    return <RecordPage onNavigate={setActivePage} />;
  }

  return (
    <main
      className={
        activePage === "home"
          ? "min-h-screen bg-[#EEF7FF] px-0 py-0 pb-28 text-[#0D1B33]"
          : "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_32%),linear-gradient(180deg,#050505_0%,#09090b_38%,#000_100%)] px-4 py-5 pb-28 text-white"
      }
    >
      {activePage === "home" && (
        <div className="mx-auto min-h-screen w-full max-w-[430px] bg-white px-5 pb-4 pt-6 shadow-[0_24px_80px_rgba(10,141,255,0.18)] sm:my-6 sm:rounded-[34px]">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-[27px] font-black tracking-tight text-[#0B2C7E]">
              男神进化日记
            </h1>
            <button
              aria-label="通知"
              className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#0B2C7E] shadow-[0_10px_24px_rgba(10,141,255,0.12)]"
              type="button"
            >
              <span className="text-3xl leading-none">♧</span>
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#0A8DFF]" />
            </button>
          </header>

          <section className="relative overflow-hidden rounded-[24px] border border-[#B9D8FF] bg-[linear-gradient(135deg,#F8FCFF_0%,#EAF5FF_58%,#FFFFFF_100%)] p-5 shadow-[0_18px_44px_rgba(10,141,255,0.12)]">
            <div className="relative z-10 max-w-[58%]">
              <div className="flex items-center gap-2 text-base font-bold text-[#0B2C7E]">
                <span>今日状态</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#9BB9DD] text-xs text-[#8AA5C8]">
                  i
                </span>
              </div>

              <div className="mt-3 flex items-end gap-4">
                <p className="text-[76px] font-black leading-[0.88] tracking-tight text-[#0B2C7E]">
                  {dashboardMockData.statusScore}
                </p>
                <p className="pb-2 text-[25px] font-black text-[#0A8DFF]">
                  {dashboardMockData.level}
                </p>
              </div>

              <p className="mt-6 text-[15px] font-bold text-[#0D1B33]">
                {dashboardMockData.xp} / {dashboardMockData.nextXp} XP
              </p>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#C8DDF6]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#0A8DFF,#1DA1FF)]"
                  style={{
                    width: `${(dashboardMockData.xp / dashboardMockData.nextXp) * 100}%`,
                  }}
                />
              </div>

              <div className="mt-6 rounded-[20px] border border-[#D4E6FA] bg-white/75 px-4 py-3 shadow-[0_10px_24px_rgba(10,141,255,0.08)]">
                <p className="text-sm font-semibold text-[#64748B]">今日称号</p>
                <p className="mt-1 text-[23px] font-black text-[#0A8DFF]">
                  {dashboardMockData.title}
                </p>
              </div>
            </div>

            <img
              alt="男神牛角色"
              className="absolute bottom-0 right-0 z-0 h-[255px] w-[178px] object-contain object-bottom"
              src="/cow-mascot.png"
            />
          </section>

          <section className="mt-4 grid grid-cols-3 gap-3">
            {dashboardMockData.features.map((feature) => (
              <button
                className="flex h-[104px] flex-col items-center justify-center rounded-[20px] border border-[#DCEBFF] bg-white text-[#0A8DFF] shadow-[0_12px_26px_rgba(10,141,255,0.08)] transition-transform hover:-translate-y-0.5"
                key={feature.label}
                type="button"
              >
                <span className="text-[34px] font-black leading-none">
                  {feature.icon}
                </span>
                <span className="mt-3 text-base font-black">{feature.label}</span>
              </button>
            ))}
          </section>

          <section className="mt-4 rounded-[20px] border border-[#DCEBFF] bg-white px-4 py-4 shadow-[0_12px_30px_rgba(10,141,255,0.08)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black text-[#0B2C7E]">Buff / Debuff</h2>
              <button
                className="text-sm font-bold text-[#0A8DFF]"
                type="button"
              >
                查看全部 〉
              </button>
            </div>

            <div>
              <p className="text-base font-black text-[#11B94A]">Buff</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {dashboardMockData.buffs.map((buff) => (
                  <span
                    className="rounded-xl bg-[#E4F8E9] px-4 py-2 text-sm font-bold text-[#049B3D]"
                    key={buff}
                  >
                    {buff}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-base font-black text-[#FF1F1F]">Debuff</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {dashboardMockData.debuffs.map((debuff) => (
                  <span
                    className="rounded-xl bg-[#FFE9E9] px-4 py-2 text-sm font-bold text-[#F01818]"
                    key={debuff}
                  >
                    {debuff}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <button
            className="mt-5 h-14 w-full rounded-[20px] bg-[linear-gradient(90deg,#0A8DFF,#0077FF)] text-xl font-black text-white shadow-[0_16px_32px_rgba(10,141,255,0.3)]"
            type="button"
            onClick={() => setActivePage("status")}
          >
            查看每日结算
          </button>
        </div>
      )}

      {activePage === "status" && (
        <>
          {saved && todayXpEarned !== null && (
            <DailySettlement
              form={form}
              xp={todayXpEarned}
              totalXp={totalXp}
              buffs={buffs}
              debuffs={debuffs}
            />
          )}

          <AppCard eyebrow="今日状态 Buff" title="状态栏卡片">
            <div className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-zinc-300">当前 Buff</span>
                  <span className="text-zinc-500">{buffs.length} 个</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {buffs.length === 0 ? (
                    <StatusBadge variant="neutral">暂无 Buff</StatusBadge>
                  ) : (
                    buffs.map((buff) => (
                      <StatusBadge variant="buff" key={buff.name}>
                        {buff.name}
                      </StatusBadge>
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-zinc-300">当前 Debuff</span>
                  <span className="text-zinc-500">{debuffs.length} 个</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {debuffs.length === 0 ? (
                    <StatusBadge variant="neutral">暂无 Debuff</StatusBadge>
                  ) : (
                    debuffs.map((debuff) => (
                      <StatusBadge variant="debuff" key={debuff.name}>
                        {debuff.name}
                      </StatusBadge>
                    ))
                  )}
                </div>
              </div>
            </div>
          </AppCard>
        </>
      )}

      {activePage === "growth" && (
        <AppCard eyebrow="XP 趋势面板" title="成长趋势" className="mx-auto w-full max-w-md">
          {dailyRecords.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-black/30 px-3 py-4 text-sm leading-6 text-zinc-400">
              还没有成长数据。
              <br />
              完成今天记录后，这里会显示你的 XP 趋势。
            </p>
          ) : (
            <>
              <XpChart records={dailyRecords} />
              <WeeklySummary records={dailyRecords} />
            </>
          )}
        </AppCard>
      )}

      {activePage === "calendar" && (
        <>
          <AppCard
            eyebrow="历史回看"
            title="状态日历"
            description="查看你过去每一天的人生 RPG 存档。"
            className="mx-auto mb-4 w-full max-w-md"
          >
            <CalendarView
              viewMonthDate={viewMonthDate}
              selectedDate={selectedDate}
              todayKey={todayKey}
              recordsByDate={recordsByDate}
              onPreviousMonth={handlePreviousMonth}
              onNextMonth={handleNextMonth}
              onSelectDate={handleSelectDate}
            />
          </AppCard>

          <DayDetailCard
            selectedDate={selectedDate}
            record={selectedRecord}
            allRecords={normalizedDailyRecords}
          />
        </>
      )}

      <BottomNav activePage={activePage} onChange={setActivePage} />
    </main>
  );
}
