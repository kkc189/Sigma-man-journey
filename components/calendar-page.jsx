"use client";

import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Frown,
  Home,
  Pen,
  Plus,
  Trash2,
  Trophy,
  User,
} from "lucide-react";

const navItems = [
  { id: "home", label: "首页", Icon: Home },
  { id: "record", label: "记录", Icon: Pen },
  { id: "calendar", label: "日历", Icon: CalendarDays },
  { id: "status", label: "我的", Icon: User },
];

const weekdays = ["日", "一", "二", "三", "四", "五", "六"];

function getDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateKey(dateKey) {
  return new Date(`${dateKey}T00:00:00`);
}

function safeParseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function loadRecords() {
  if (typeof window === "undefined") {
    return {};
  }

  const saved = safeParseJson(localStorage.getItem("dailyRecords"), {});

  if (Array.isArray(saved)) {
    return saved.reduce((records, record) => {
      if (record?.date) {
        records[record.date] = record;
      }

      return records;
    }, {});
  }

  return saved && typeof saved === "object" ? saved : {};
}

function saveRecords(records) {
  localStorage.setItem("dailyRecords", JSON.stringify(records));
  updateUserStats(records);
}

function updateUserStats(records) {
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
    "userStats",
    JSON.stringify({
      totalXp,
      level: Math.max(1, Math.floor(totalXp / 1000) + 1),
      streakDays,
      updatedAt: new Date().toISOString(),
    }),
  );
}

function getMonthDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      date,
      dateKey: getDateKey(date),
      day: date.getDate(),
      muted: date.getMonth() !== month,
    };
  });
}

function formatMonthTitle(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function formatDayTitle(dateKey) {
  const date = parseDateKey(dateKey);
  return `${date.getMonth() + 1}月${date.getDate()}日 星期${weekdays[date.getDay()]}`;
}

function getRecordXp(record) {
  return Number(record?.xpGained ?? record?.xp) || 0;
}

function getRecordScore(record) {
  return Number(record?.statusScore ?? record?.score) || 0;
}

function getRecordTitle(record) {
  return record?.title || record?.dailyTitle || "未生成称号";
}

function getRecordSummary(record) {
  return record?.summary || record?.reviewText || "这一天已经留下记录，但还没有复盘文案。";
}

function getWorkoutSnapshot(record) {
  const workoutType = record?.workoutType === "anaerobic" ? "无氧" : "有氧";
  const workoutName = record?.customWorkout?.trim() || record?.workoutName || "健身";

  return `${workoutType} · ${workoutName}`;
}

function getRecordBuffs(record) {
  return Array.isArray(record?.buffs) ? record.buffs : [];
}

function getRecordDebuffs(record) {
  return Array.isArray(record?.debuffs) ? record.debuffs : [];
}

function getMonthRecords(records, monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  return Object.values(records).filter((record) => {
    if (!record?.date) {
      return false;
    }

    const date = parseDateKey(record.date);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

function getMonthCompletion(records, monthDate) {
  const now = new Date();
  const monthRecords = getMonthRecords(records, monthDate);
  const isCurrentMonth =
    now.getFullYear() === monthDate.getFullYear() &&
    now.getMonth() === monthDate.getMonth();
  const daysInMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    0,
  ).getDate();
  const targetDays = isCurrentMonth ? now.getDate() : daysInMonth;

  return Math.round((monthRecords.length / Math.max(targetDays, 1)) * 100);
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

function getWeekTrend(records, selectedDateKey) {
  const selectedDate = parseDateKey(selectedDateKey);
  const weekStart = new Date(selectedDate);
  weekStart.setDate(selectedDate.getDate() - selectedDate.getDay() + 1);

  return ["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map(
    (label, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      const dateKey = getDateKey(date);
      const record = records[dateKey];
      const value = record ? getRecordScore(record) : "--";

      return {
        label,
        value,
        active: dateKey === selectedDateKey,
        height:
          typeof value === "number"
            ? Math.max(22, Math.round((value / 100) * 72))
            : 26,
      };
    },
  );
}

function openRecordEditor(dateKey, onNavigate) {
  localStorage.setItem("selectedRecordDate", dateKey);
  localStorage.setItem("selectedRecordSource", "calendar");
  onNavigate?.("record");
}

export function CalendarPage({ onNavigate }) {
  const todayKey = getDateKey(new Date());
  const [records, setRecords] = useState({});
  const [currentMonth, setCurrentMonth] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const selectedRecord = records[selectedDateKey] || null;
  const monthDays = getMonthDays(currentMonth);
  const monthCompletion = getMonthCompletion(records, currentMonth);
  const continuousDays = getContinuousDays(records);
  const weekTrend = getWeekTrend(records, selectedDateKey);

  useEffect(() => {
    const nextRecords = loadRecords();
    setRecords(nextRecords);
    updateUserStats(nextRecords);
  }, []);

  function changeMonth(direction) {
    setCurrentMonth((month) => {
      const nextMonth = new Date(month);
      nextMonth.setMonth(month.getMonth() + direction);
      return nextMonth;
    });
  }

  function selectDay(dateKey) {
    const date = parseDateKey(dateKey);
    setSelectedDateKey(dateKey);
    setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }

  function deleteSelectedRecord() {
    if (!selectedRecord) {
      return;
    }

    const confirmed = window.confirm("确定删除这一天的人生存档吗？");

    if (!confirmed) {
      return;
    }

    const nextRecords = { ...records };
    delete nextRecords[selectedDateKey];
    saveRecords(nextRecords);
    setRecords(nextRecords);
  }

  function goToday() {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateKey(todayKey);
  }

  return (
    <main className="min-h-screen bg-[#EEF8FF] text-[#0D1B33]">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col overflow-x-hidden overflow-y-auto rounded-[32px] bg-white px-5 pb-0 pt-7 shadow-[0_24px_80px_rgba(10,141,255,0.16)] sm:my-6">
        <CalendarHeader onToday={goToday} />
        <MonthCalendar
          currentMonth={currentMonth}
          monthDays={monthDays}
          records={records}
          selectedDateKey={selectedDateKey}
          todayKey={todayKey}
          onChangeMonth={changeMonth}
          onSelectDay={selectDay}
        />
        <MonthStats
          completion={monthCompletion}
          continuousDays={continuousDays}
          onToday={goToday}
        />
        <DayArchiveCard
          record={selectedRecord}
          selectedDateKey={selectedDateKey}
          weekTrend={weekTrend}
          onCreate={() => openRecordEditor(selectedDateKey, onNavigate)}
          onDelete={deleteSelectedRecord}
          onEdit={() => openRecordEditor(selectedDateKey, onNavigate)}
        />
        <CalendarBottomTabBar activePage="calendar" onNavigate={onNavigate} />
      </div>
    </main>
  );
}

function CalendarHeader({ onToday }) {
  return (
    <header className="flex items-center justify-between">
      <h1 className="text-[31px] font-black tracking-tight text-[#07133B]">
        进化日历
      </h1>

      <button
        aria-label="回到今天"
        className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#DCEBFF] bg-white text-[#1677FF] shadow-[0_10px_24px_rgba(10,141,255,0.08)]"
        type="button"
        onClick={onToday}
      >
        <BarChart3 className="h-7 w-7" fill="#1677FF" strokeWidth={2.4} />
      </button>
    </header>
  );
}

function MonthCalendar({
  currentMonth,
  monthDays,
  records,
  selectedDateKey,
  todayKey,
  onChangeMonth,
  onSelectDay,
}) {
  return (
    <section className="mt-3 rounded-[22px] border border-[#D8E9FF] bg-white px-4 pb-3 pt-3 shadow-[0_12px_30px_rgba(10,141,255,0.06)]">
      <div className="flex items-center justify-between">
        <button
          aria-label="上个月"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#DCEBFF] bg-[#F8FBFF] text-[#4B5A73]"
          type="button"
          onClick={() => onChangeMonth(-1)}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
        </button>

        <button
          className="flex items-center gap-2 text-[21px] font-black text-[#0D173B]"
          type="button"
          onClick={() => onChangeMonth(0)}
        >
          {formatMonthTitle(currentMonth)}
          <ChevronDown className="h-5 w-5 fill-[#222A3D] text-[#222A3D]" strokeWidth={2.4} />
        </button>

        <button
          aria-label="下个月"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#DCEBFF] bg-[#F8FBFF] text-[#4B5A73]"
          type="button"
          onClick={() => onChangeMonth(1)}
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2.4} />
        </button>
      </div>

      <div className="mt-2 h-px bg-[#E6F0FF]" />

      <div className="mt-2 grid grid-cols-7 text-center text-[14px] font-medium text-[#6D7890]">
        {weekdays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-7 gap-y-1 text-center">
        {monthDays.map((item) => (
          <CalendarDayCell
            key={item.dateKey}
            record={records[item.dateKey]}
            selected={item.dateKey === selectedDateKey}
            today={item.dateKey === todayKey}
            {...item}
            onSelect={() => onSelectDay(item.dateKey)}
          />
        ))}
      </div>
    </section>
  );
}

function CalendarDayCell({ day, muted = false, selected = false, today = false, record, onSelect }) {
  const xp = getRecordXp(record);
  const isHighXp = xp >= 250;

  return (
    <button
      className={[
        "relative mx-auto flex h-[45px] w-10 flex-col items-center justify-center rounded-[14px] text-[16px] font-black transition-colors",
        selected
          ? "border-2 border-[#1677FF] bg-[#1677FF] text-white shadow-[0_6px_16px_rgba(22,119,255,0.28)] ring-2 ring-[#1677FF]/20"
          : "",
        !selected && today ? "border border-[#1677FF] text-[#1677FF]" : "",
        !selected && !today && muted ? "text-[#B8BFCC]" : "",
        !selected && !today && !muted ? "text-black" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      type="button"
      onClick={onSelect}
    >
      <span>{day}</span>
      {record ? (
        <span
          className={[
            "mt-0.5 h-1.5 w-1.5 rounded-full",
            selected ? "bg-white" : isHighXp ? "bg-[#005BFF]" : "bg-[#1677FF]",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      ) : null}
    </button>
  );
}

function MonthStats({ completion, continuousDays, onToday }) {
  return (
    <section className="mt-2.5 flex h-[60px] items-center rounded-[20px] border border-[#D8E9FF] bg-white px-5 shadow-[0_12px_30px_rgba(10,141,255,0.06)]">
      <button className="flex flex-1 items-center gap-3 text-left" type="button" onClick={onToday}>
        <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#1677FF] text-white">
          <CalendarDays className="h-6 w-6" fill="currentColor" strokeWidth={2.1} />
        </div>
        <div>
          <p className="text-[14px] font-medium text-[#6B7890]">连续记录</p>
          <p className="text-[23px] font-black leading-none text-[#1677FF]">
            {continuousDays}<span className="ml-1 text-[15px] text-[#0D1B33]">天</span>
          </p>
        </div>
      </button>

      <div className="h-9 w-px bg-[#DDEBFA]" />

      <div className="flex flex-1 items-center justify-center gap-3">
        <div
          className="relative h-10 w-10 rounded-full"
          style={{
            background: `conic-gradient(#1677FF 0 ${completion}%, #DDEBFA ${completion}% 100%)`,
          }}
        >
          <div className="absolute inset-[6px] rounded-full bg-white" />
        </div>
        <div>
          <p className="text-[14px] font-medium text-[#6B7890]">本月完成率</p>
          <p className="text-[23px] font-black leading-none text-[#1677FF]">{completion}%</p>
        </div>
      </div>

      <ChevronRight className="h-6 w-6 text-[#9AA8BD]" strokeWidth={2.2} />
    </section>
  );
}

function DayArchiveCard({
  record,
  selectedDateKey,
  weekTrend,
  onCreate,
  onDelete,
  onEdit,
}) {
  if (!record) {
    return (
      <section className="relative mt-2.5 overflow-hidden rounded-[20px] border border-[#D8E9FF] bg-white px-4 pb-4 pt-3 shadow-[0_12px_30px_rgba(10,141,255,0.06)]">
        <p className="text-[15px] font-black text-[#1677FF]">
          {formatDayTitle(selectedDateKey)}
        </p>

        <div className="mt-4 rounded-[18px] border border-dashed border-[#BFD8FF] bg-[#F6FBFF] p-5 text-center">
          <p className="text-[18px] font-black text-[#0D1B33]">这一天还没有状态记录</p>
          <p className="mx-auto mt-2 max-w-[280px] text-[13px] font-medium leading-5 text-[#6B7890]">
            完成当天记录后，这里会生成你的人生 RPG 存档。
          </p>
          <button
            className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#1677FF] px-5 text-[14px] font-black text-white shadow-[0_12px_26px_rgba(22,119,255,0.28)]"
            type="button"
            onClick={onCreate}
          >
            <Plus className="h-4 w-4" strokeWidth={2.6} />
            补记录
          </button>
        </div>

        <WeeklyTrend trendData={weekTrend} />
      </section>
    );
  }

  return (
    <section className="relative mt-2.5 overflow-hidden rounded-[20px] border border-[#D8E9FF] bg-white px-4 pb-2 pt-3 shadow-[0_12px_30px_rgba(10,141,255,0.06)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[15px] font-black text-[#1677FF]">
          {formatDayTitle(selectedDateKey)}
        </p>
        <div className="flex gap-2">
          <button
            className="rounded-full bg-[#EEF6FF] px-3 py-1 text-[12px] font-black text-[#1677FF]"
            type="button"
            onClick={onEdit}
          >
            编辑
          </button>
          <button
            aria-label="删除记录"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFEDED] text-[#F04141]"
            type="button"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" strokeWidth={2.4} />
          </button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-[1fr_0.82fr_1.32fr] items-center gap-2">
        <div>
          <div className="flex items-center gap-2 text-[14px] font-medium text-[#0D1B33]">
            状态评分
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#A9B9D3] text-xs text-[#8BA0BD]">
              ?
            </span>
          </div>
          <p className="mt-1 text-[45px] font-black leading-none text-[#1677FF]">
            {getRecordScore(record)}
            <span className="ml-1 text-[17px] font-bold text-[#7A879E]">/100</span>
          </p>
        </div>

        <div className="border-x border-[#DDEBFA] px-2 text-center">
          <p className="text-[13px] font-medium text-[#7A879E]">XP 获得</p>
          <p className="mt-2 text-[27px] font-black leading-none text-[#1677FF]">
            +{getRecordXp(record)}
            <span className="ml-1 text-[14px] font-bold text-[#7A879E]">XP</span>
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[#7A879E]">今日称号</p>
          <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#D8E9FF] bg-[#F3F8FF] px-2.5 py-1.5 text-[12px] font-black text-[#1677FF]">
            <Trophy className="h-4 w-4 shrink-0" fill="currentColor" strokeWidth={2.2} />
            <span className="truncate">{getRecordTitle(record)}</span>
          </div>
        </div>
      </div>

      <ActionSnapshot record={record} />

      <div className="mt-2.5 grid grid-cols-2 gap-3">
        <EffectPanel title="Buff 增益效果" type="buff" items={getRecordBuffs(record)} />
        <EffectPanel title="Debuff 减益效果" type="debuff" items={getRecordDebuffs(record)} />
      </div>

      <div className="mt-2.5 rounded-[16px] border border-[#E7F0FF] bg-[#F8FBFF] px-3 py-2">
        <p className="text-[13px] font-black text-[#0D1B33]">结算复盘</p>
        <p className="mt-1 whitespace-pre-line text-[12px] font-medium leading-5 text-[#60728A]">
          {getRecordSummary(record)}
        </p>
      </div>

      <WeeklyTrend trendData={weekTrend} />
    </section>
  );
}

function ActionSnapshot({ record }) {
  const workoutDistance = Number(record.workoutDistanceKm) || 0;
  const workoutDistanceText = workoutDistance > 0 ? ` · ${workoutDistance} km` : "";
  const items = [
    ["睡眠", `${record.sleepHours ?? 0} 小时`],
    [
      "健身",
      `${getWorkoutSnapshot(record)} · ${record.workoutMinutes ?? 0} 分钟${workoutDistanceText}`,
    ],
    ["饮食", `${record.nutritionScore ?? "-"} / 10`],
    ["手机", `${record.phoneHours ?? 0} 小时`],
    ["情绪", record.mood || "未记录"],
    ["执行", `${record.completedActions ?? 0} 件`],
  ];

  return (
    <div className="mt-2 grid grid-cols-3 gap-2">
      {items.map(([label, value]) => (
        <div
          className="rounded-[14px] border border-[#E8F1FF] bg-[#FBFDFF] px-2 py-1.5"
          key={label}
        >
          <p className="text-[10px] font-bold text-[#8A95AA]">{label}</p>
          <p className="mt-0.5 truncate text-[12px] font-black text-[#0D1B33]">{value}</p>
        </div>
      ))}
    </div>
  );
}

function EffectPanel({ title, type, items }) {
  const isBuff = type === "buff";
  const fallback = isBuff ? "暂无 Buff" : "暂无 Debuff";
  const visibleItems = items.length > 0 ? items : [fallback];

  return (
    <div className="rounded-[16px] border border-[#D8E9FF] bg-white px-2 py-2">
      <div className="mb-1.5 flex items-center gap-1.5 whitespace-nowrap text-[13px] font-black text-[#07133B]">
        {title}
        {isBuff ? (
          <ArrowUp className="h-4 w-4 fill-[#13B866] text-[#13B866]" strokeWidth={3} />
        ) : (
          <ArrowDown className="h-4 w-4 fill-[#E22323] text-[#E22323]" strokeWidth={3} />
        )}
      </div>

      <div className="space-y-1.5">
        {visibleItems.slice(0, 3).map((item) => (
          <div
            className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 rounded-[12px] border border-[#ECF3FF] bg-white px-1.5 py-1"
            key={item}
          >
            <span
              className={[
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                isBuff ? "bg-[#DFF8EC] text-[#12B866]" : "bg-[#FFE8E8] text-[#F04141]",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {isBuff ? (
                <Dumbbell className="h-4 w-4" strokeWidth={2.4} />
              ) : (
                <Frown className="h-4 w-4" strokeWidth={2.4} />
              )}
            </span>
            <span className="min-w-0 truncate text-[11px] font-black leading-tight text-[#0D1B33]">
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklyTrend({ trendData = [] }) {
  return (
    <div className="relative mt-2 overflow-hidden rounded-b-[18px] pb-1 pt-1">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-[linear-gradient(180deg,rgba(234,246,255,0),rgba(234,246,255,0.9))]" />

      <div className="relative grid min-h-[122px] grid-cols-[72px_minmax(0,1fr)_72px] items-end gap-1">
        <div className="relative h-[112px] overflow-hidden">
          <img
            alt="牛马角色"
            className="absolute bottom-[-8px] left-[2px] h-[112px] w-[88px] object-contain object-bottom"
            src="/calendar-cow-cutout.png"
          />
        </div>

        <div className="min-w-0 self-stretch border-l border-r border-[#DDEBFA] px-2 pt-1">
          <p className="mb-1 text-center text-[14px] font-medium leading-none text-[#4A5670]">
            本周状态趋势
          </p>
          <div className="flex h-[94px] items-end justify-between gap-1">
            {trendData.map((item) => (
              <div
                className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
                key={item.label}
              >
                <span
                  className={[
                    "text-[10px] font-medium leading-none",
                    item.active ? "text-[#1677FF]" : "text-[#7A879E]",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {item.value}
                </span>
                <span
                  className={[
                    "w-3.5 rounded-t-lg",
                    item.active
                      ? "bg-[linear-gradient(180deg,#367CFF,#7DB4FF)]"
                      : "bg-[#D6E6FB]",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ height: item.height }}
                />
                <span className="whitespace-nowrap text-[9px] font-medium leading-none text-[#56637A]">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative h-[112px] overflow-hidden">
          <img
            alt="疲惫马角色"
            className="absolute bottom-[-4px] right-[3px] h-[108px] w-[88px] object-contain object-bottom"
            src="/calendar-horse-cutout.png"
          />
        </div>
      </div>
    </div>
  );
}

function CalendarBottomTabBar({ activePage, onNavigate }) {
  return (
    <nav className="-mx-5 mt-auto border-t border-[#E6EDFF] bg-white/95 px-5 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur-xl">
      <div className="mx-auto grid w-full grid-cols-4 gap-1">
        {navItems.map(({ id, label, Icon }) => {
          const isActive = id === activePage;

          return (
            <button
              className={[
                "flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-2xl text-[12px] font-bold transition-colors",
                isActive ? "text-[#1677FF]" : "text-[#9AA6BC]",
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
                    ? "bg-[#1677FF] text-white shadow-[0_8px_18px_rgba(22,119,255,0.28)]"
                    : "text-[#9AA6BC]",
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
