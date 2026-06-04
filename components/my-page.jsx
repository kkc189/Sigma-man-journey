"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  Crown,
  Download,
  Home,
  Pen,
  Settings,
  Shield,
  Star,
  Trash2,
  User,
  X,
} from "lucide-react";
import {
  clearDailyRecords,
  loadDailyRecords,
  safeParseJson,
} from "../lib/records-store";

const navItems = [
  { id: "home", label: "首页", Icon: Home },
  { id: "record", label: "记录", Icon: Pen },
  { id: "calendar", label: "日历", Icon: CalendarDays },
  { id: "status", label: "我的", Icon: User },
];

function getDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateKey(dateKey) {
  return new Date(`${dateKey}T00:00:00`);
}

function getRecordsList(records) {
  return Object.values(records)
    .filter((record) => record?.date)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getRecordXp(record) {
  return Number(record?.xpGained ?? record?.xp) || 0;
}

function getRecordScore(record) {
  return Number(record?.statusScore ?? record?.score) || 0;
}

function getLatestRecord(recordsList) {
  return recordsList[recordsList.length - 1] || null;
}

function getTotalXp(recordsList) {
  return recordsList.reduce((sum, record) => sum + getRecordXp(record), 0);
}

function getLevelInfo(totalXp) {
  const level = Math.max(1, Math.floor(totalXp / 1000) + 1);
  const currentLevelXp = (level - 1) * 1000;
  const nextLevelXp = level * 1000;
  const xpInLevel = Math.max(0, totalXp - currentLevelXp);
  const progress = Math.min(100, Math.round((xpInLevel / 1000) * 100));

  return {
    label: `Lv.${level}`,
    nextLabel: `Lv.${level + 1}`,
    progress,
    totalXp,
    nextLevelXp,
    remainingXp: Math.max(0, nextLevelXp - totalXp),
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
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });

  return Math.round((monthRecords.length / Math.max(now.getDate(), 1)) * 100);
}

function getTotalBuffs(recordsList) {
  return recordsList.reduce(
    (sum, record) => sum + (Array.isArray(record.buffs) ? record.buffs.length : 0),
    0,
  );
}

function getTotalDebuffs(recordsList) {
  return recordsList.reduce(
    (sum, record) => sum + (Array.isArray(record.debuffs) ? record.debuffs.length : 0),
    0,
  );
}

function getAverage(recordsList, picker) {
  if (recordsList.length === 0) {
    return 0;
  }

  return Math.round(
    recordsList.reduce((sum, record) => sum + (Number(picker(record)) || 0), 0) /
      recordsList.length,
  );
}

function getPercent(recordsList, predicate) {
  if (recordsList.length === 0) {
    return 0;
  }

  const matched = recordsList.filter(predicate).length;
  return Math.round((matched / recordsList.length) * 100);
}

function getBadgeCount(recordsList, stats) {
  let count = 0;

  if (recordsList.length >= 1) count += 1;
  if (recordsList.length >= 7) count += 1;
  if (stats.streakDays >= 7) count += 1;
  if (stats.totalBuffs >= 10) count += 1;
  if (stats.averageScore >= 80) count += 1;
  if (stats.totalDistanceKm >= 10) count += 1;

  return count;
}

function getStats(records) {
  const recordsList = getRecordsList(records);
  const latestRecord = getLatestRecord(recordsList);
  const totalXp = getTotalXp(recordsList);
  const levelInfo = getLevelInfo(totalXp);
  const totalDistanceKm = Number(
    recordsList
      .reduce((sum, record) => sum + (Number(record.workoutDistanceKm) || 0), 0)
      .toFixed(2),
  );
  const stats = {
    records,
    recordsList,
    latestRecord,
    totalXp,
    levelInfo,
    title: latestRecord?.title || "轻微觉醒牛马",
    streakDays: getContinuousDays(records),
    monthCompletion: getMonthCompletion(recordsList),
    totalBuffs: getTotalBuffs(recordsList),
    totalDebuffs: getTotalDebuffs(recordsList),
    averageScore: getAverage(recordsList, getRecordScore),
    averageXp: getAverage(recordsList, getRecordXp),
    totalWorkoutMinutes: recordsList.reduce(
      (sum, record) => sum + (Number(record.workoutMinutes) || 0),
      0,
    ),
    totalDistanceKm,
    recoveryPercent: getPercent(recordsList, (record) => Number(record.sleepHours) >= 7),
    focusPercent: getPercent(recordsList, (record) => Number(record.phoneHours) <= 3),
    executionPercent: getPercent(recordsList, (record) => Number(record.completedActions) >= 3),
    slackPercent: getPercent(
      recordsList,
      (record) =>
        Number(record.phoneHours) > 6 ||
        Number(record.sleepHours) < 6 ||
        record.mood === "崩了" ||
        Number(record.completedActions) === 0,
    ),
  };

  return {
    ...stats,
    badgeCount: getBadgeCount(recordsList, stats),
  };
}

function getBuffCards(stats) {
  return [
    {
      id: "recovery",
      title: "恢复 Buff",
      description: "睡得好，恢复快！",
      level: `Lv.${Math.max(1, Math.ceil(stats.recoveryPercent / 15))}`,
      percent: stats.recoveryPercent,
      image: "/my-recovery-buff.png",
      variant: "buff",
      detail: `睡眠 >= 7 小时的记录占比：${stats.recoveryPercent}%`,
    },
    {
      id: "focus",
      title: "专注 Buff",
      description: "专注力爆表，效率翻倍！",
      level: `Lv.${Math.max(1, Math.ceil(stats.focusPercent / 15))}`,
      percent: stats.focusPercent,
      image: "/my-focus-buff.png",
      variant: "buff",
      detail: `手机使用 <= 3 小时的记录占比：${stats.focusPercent}%`,
    },
    {
      id: "execution",
      title: "执行 Buff",
      description: "说到做到，干就完事！",
      level: `Lv.${Math.max(1, Math.ceil(stats.executionPercent / 15))}`,
      percent: stats.executionPercent,
      image: "/my-execution-buff.png",
      variant: "buff",
      detail: `完成行动 >= 3 件的记录占比：${stats.executionPercent}%`,
    },
    {
      id: "slack",
      title: "摆烂 Debuff",
      description: "摆烂拖延，快乐减半...",
      level: `Lv.${Math.max(1, Math.ceil(stats.slackPercent / 20))}`,
      percent: stats.slackPercent,
      image: "/my-slack-debuff.png",
      variant: "debuff",
      detail: `睡眠不足、手机超时、情绪崩或行动为 0 的占比：${stats.slackPercent}%`,
    },
  ];
}

export function MyPage({ onNavigate }) {
  const [records, setRecords] = useState({});
  const [activePanel, setActivePanel] = useState(null);
  const stats = getStats(records);
  const buffCards = getBuffCards(stats);

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
    window.addEventListener("daily-records-updated", refreshRecords);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshRecords);
      window.removeEventListener("daily-records-updated", refreshRecords);
    };
  }, []);

  async function refreshRecords() {
    setRecords(await loadDailyRecords());
  }

  function exportData() {
    const payload = JSON.stringify(
      {
        dailyRecords: records,
        userStats: safeParseJson(localStorage.getItem("userStats"), {}),
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nanshen-rpg-data-${getDateKey(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function clearData() {
    const confirmed = window.confirm("确定清空所有本地记录吗？这个操作不能撤销。");

    if (!confirmed) {
      return;
    }

    await clearDailyRecords();
    localStorage.removeItem("userStats");
    localStorage.removeItem("selectedRecordDate");
    localStorage.removeItem("selectedRecordSource");
    refreshRecords();
    setActivePanel("settings");
  }

  return (
    <main className="min-h-screen bg-[#F5FBFF] text-[#07133B]">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col overflow-x-hidden overflow-y-auto rounded-[32px] bg-[#F9FDFF] px-4 pb-2 pt-3 shadow-[0_24px_80px_rgba(10,141,255,0.16)] sm:my-6">
        <MyHeader onOpenPanel={setActivePanel} />
        <ProfileCard stats={stats} onOpenPanel={setActivePanel} />
        <StatsPanel stats={stats} onOpenPanel={setActivePanel} />
        <BuffGrid cards={buffCards} onOpenPanel={setActivePanel} />
        <MenuPanel stats={stats} onOpenPanel={setActivePanel} />
        <MyBottomTabBar activePage="status" onNavigate={onNavigate} />
        <div className="mx-auto mt-2 h-1.5 w-32 rounded-full bg-black" />
      </div>

      <MyDetailSheet
        activePanel={activePanel}
        buffCards={buffCards}
        stats={stats}
        onClose={() => setActivePanel(null)}
        onClearData={clearData}
        onExportData={exportData}
        onNavigate={onNavigate}
      />
    </main>
  );
}

function MyHeader({ onOpenPanel }) {
  return (
    <header className="mt-1 flex items-center justify-between px-2">
      <h1 className="text-[36px] font-black leading-none tracking-tight text-[#07133B]">
        我的
      </h1>
      <div className="flex items-center gap-5 text-[#07133B]">
        <button
          className="relative"
          type="button"
          aria-label="通知"
          onClick={() => onOpenPanel("notifications")}
        >
          <img
            alt=""
            aria-hidden="true"
            className="h-8 w-8 object-contain"
            src="/my-header-bell.png"
          />
        </button>
        <button
          className="flex h-8 w-8 items-center justify-center"
          type="button"
          aria-label="设置入口"
          onClick={() => onOpenPanel("settings")}
        >
          <img
            alt=""
            aria-hidden="true"
            className="h-8 w-8 object-contain"
            src="/my-header-settings.png"
          />
        </button>
      </div>
    </header>
  );
}

function ProfileCard({ stats, onOpenPanel }) {
  const { levelInfo } = stats;

  return (
    <button
      className="relative mt-6 w-full overflow-hidden rounded-[24px] border border-[#E6F1FF] bg-white px-4 py-3 text-left shadow-[0_14px_36px_rgba(10,141,255,0.08)]"
      type="button"
      onClick={() => onOpenPanel("profile")}
    >
      <div className="pointer-events-none absolute right-0 top-[-16px] h-36 w-44 rounded-full bg-[#EAF6FF]" />
      <div className="pointer-events-none absolute bottom-8 right-12 flex items-end gap-3 opacity-50">
        <span className="h-16 w-6 rounded-t-md bg-[#DCEFFF]" />
        <span className="h-24 w-6 rounded-t-md bg-[#DCEFFF]" />
        <span className="h-12 w-6 rounded-t-md bg-[#DCEFFF]" />
      </div>
      <div className="pointer-events-none absolute right-12 top-8 h-20 w-20 rotate-45 border-r-[10px] border-t-[10px] border-white/80" />

      <div className="relative z-10 grid grid-cols-[76px_1fr_20px] items-start gap-3">
        <img
          alt="男神进化日记头像"
          className="h-[76px] w-[76px] rounded-[18px] object-cover shadow-[0_10px_22px_rgba(10,141,255,0.18)]"
          src="/my-profile-logo.png"
        />

        <div className="min-w-0 pt-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[24px] font-black leading-none tracking-tight text-[#07133B]">
              今日进化者
            </h2>
            <img
              alt=""
              aria-hidden="true"
              className="h-6 w-6 object-contain"
              src="/my-gender-male.png"
            />
          </div>

          <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-xl bg-[#EAF5FF] px-3 py-1 text-[12px] font-black text-[#1677FF]">
            <span>✦</span>
            <span className="truncate">{stats.title}</span>
          </div>

          <div className="mt-3 flex items-end justify-between gap-2">
            <div className="flex items-end gap-3">
              <span className="text-[22px] font-black leading-none text-[#1677FF]">
                {levelInfo.label}
              </span>
              <span className="whitespace-nowrap pb-0.5 text-[13px] font-medium leading-none text-[#07133B]">
                {levelInfo.totalXp} / {levelInfo.nextLevelXp} XP
              </span>
            </div>
            <span className="whitespace-nowrap pb-0.5 text-[10px] font-semibold leading-none text-[#07133B]">
              升级还需 {levelInfo.remainingXp} XP
            </span>
          </div>

          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#CDE5FF]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#0A8DFF,#1DA1FF)]"
              style={{ width: `${levelInfo.progress}%` }}
            />
          </div>
        </div>

        <ChevronRight className="mt-5 h-6 w-6 text-[#07133B]" strokeWidth={2.4} />
      </div>
    </button>
  );
}

function StatsPanel({ stats, onOpenPanel }) {
  return (
    <section className="mt-3 grid grid-cols-[1fr_1px_1fr_1px_1fr] items-center rounded-[22px] border border-[#E6F1FF] bg-white px-4 py-3 shadow-[0_12px_30px_rgba(10,141,255,0.07)]">
      <button type="button" onClick={() => onOpenPanel("streak")}>
        <StatBlock
          Icon={CalendarCheck}
          iconSrc="/my-stat-streak.png"
          iconClass="bg-[#EAF5FF] text-[#1677FF]"
          label="连续记录"
          value={stats.streakDays}
          unit="天"
        />
      </button>
      <div className="h-10 bg-[#DDEBFA]" />
      <button type="button" onClick={() => onOpenPanel("statistics")}>
        <StatBlock
          iconSrc="/my-stat-ring.png"
          label="本月完成率"
          value={`${stats.monthCompletion}%`}
          percent={stats.monthCompletion}
        />
      </button>
      <div className="h-10 bg-[#DDEBFA]" />
      <button type="button" onClick={() => onOpenPanel("buffs")}>
        <StatBlock
          Icon={Star}
          iconSrc="/my-stat-buff.png"
          iconClass="bg-[#E7F9EF] text-[#36C86E]"
          label="总 Buff"
          value={stats.totalBuffs}
        />
      </button>
    </section>
  );
}

function StatBlock({ Icon, iconSrc, iconClass, label, value, unit, type, percent = 0 }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {iconSrc ? (
        <img
          alt=""
          aria-hidden="true"
          className="h-10 w-10 shrink-0 object-contain"
          src={iconSrc}
        />
      ) : type === "ring" ? (
        <div
          className="relative h-10 w-10 shrink-0 rounded-full"
          style={{
            background: `conic-gradient(#1677FF 0 ${percent}%, #DDEBFA ${percent}% 100%)`,
          }}
        >
          <div className="absolute inset-[7px] rounded-full bg-white" />
        </div>
      ) : (
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
          <Icon className="h-6 w-6" fill="currentColor" strokeWidth={2.2} />
        </div>
      )}

      <div>
        <p className="whitespace-nowrap text-[13px] font-medium leading-none text-[#333D55]">{label}</p>
        <p className="mt-1.5 text-[25px] font-black leading-none text-[#07133B]">
          {value}
          {unit ? <span className="ml-1.5 text-[14px] font-medium">{unit}</span> : null}
        </p>
      </div>
    </div>
  );
}

function BuffGrid({ cards, onOpenPanel }) {
  return (
    <section className="mt-3 grid grid-cols-2 gap-2.5">
      {cards.map((card) => (
        <BuffCard
          key={card.id}
          {...card}
          onClick={() => onOpenPanel(`buff:${card.id}`)}
        />
      ))}
    </section>
  );
}

function BuffCard({ title, description, level, percent, image, variant, onClick }) {
  const isDebuff = variant === "debuff";

  return (
    <button
      className="min-h-[212px] overflow-hidden rounded-[22px] border border-[#E6F1FF] bg-white px-3 pt-3 text-left shadow-[0_12px_30px_rgba(10,141,255,0.07)]"
      type="button"
      onClick={onClick}
    >
      <div className="relative z-10">
        <div
          className={[
            "flex items-center gap-1.5 text-[20px] font-black leading-none",
            isDebuff ? "text-[#E11919]" : "text-[#12A94B]",
          ].join(" ")}
        >
          {title}
          <img
            alt=""
            aria-hidden="true"
            className="h-5 w-5 object-contain"
            src={isDebuff ? "/my-debuff-arrow-down.png" : "/my-buff-arrow-up.png"}
          />
        </div>
        <p className="mt-2 truncate text-[13px] font-medium text-[#60728A]">
          {description}
        </p>
      </div>

      <div className="relative mt-1.5 h-[124px] overflow-hidden rounded-[14px] bg-white">
        <img
          alt={title}
          className="h-full w-full rounded-[14px] object-contain object-center"
          src={image}
        />
      </div>

      <div className="mt-1.5 flex items-center gap-2 pb-2">
        <span
          className={[
            "rounded-lg px-2 py-0.5 text-[13px] font-black",
            isDebuff ? "bg-[#FFE8E8] text-[#E11919]" : "bg-[#E5FAEF] text-[#079F43]",
          ].join(" ")}
        >
          {level}
        </span>
        <div
          className={[
            "h-2.5 flex-1 overflow-hidden rounded-full",
            isDebuff ? "bg-[#FFD0D0]" : "bg-[#CDEEDC]",
          ].join(" ")}
        >
          <div
            className={[
              "h-full rounded-full",
              isDebuff ? "bg-[#FF3B3B]" : "bg-[#1FC764]",
            ].join(" ")}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className={["text-[13px] font-black", isDebuff ? "text-[#E11919]" : "text-[#079F43]"].join(" ")}>
          {percent}%
        </span>
      </div>
    </button>
  );
}

function MenuPanel({ stats, onOpenPanel }) {
  const menuItems = [
    {
      id: "titles",
      label: "我的称号",
      value: stats.title,
      Icon: Crown,
      iconSrc: "/my-menu-title.png",
      iconClass: "bg-[#FFF6D7] text-[#FFC400]",
    },
    {
      id: "badges",
      label: "成就徽章",
      value: `${stats.badgeCount} 枚徽章`,
      Icon: Shield,
      iconSrc: "/my-menu-badge.png",
      iconClass: "bg-[#ECEBFF] text-[#6257FF]",
    },
    {
      id: "statistics",
      label: "数据统计",
      value: "查看详细数据",
      Icon: BarChart3,
      iconSrc: "/my-menu-statistics.png",
      iconClass: "bg-[#E8F4FF] text-[#1677FF]",
    },
    {
      id: "settings",
      label: "系统设置",
      value: "",
      Icon: Settings,
      iconSrc: "/my-menu-settings.png",
      iconClass: "bg-[#EEF2F6] text-[#8A95A3]",
    },
  ];

  return (
    <section className="mt-3 overflow-hidden rounded-[22px] border border-[#E6F1FF] bg-white px-5 py-0.5 shadow-[0_12px_30px_rgba(10,141,255,0.07)]">
      {menuItems.map(({ id, label, value, Icon, iconSrc, iconClass }, index) => (
        <button
          className={[
            "flex h-[38px] w-full items-center gap-3 text-left",
            index !== menuItems.length - 1 ? "border-b border-[#E7EEF8]" : "",
          ].join(" ")}
          key={label}
          type="button"
          onClick={() => onOpenPanel(id)}
        >
          <span className={`flex h-7 w-7 items-center justify-center rounded-xl ${iconClass}`}>
            {iconSrc ? (
              <img
                alt=""
                aria-hidden="true"
                className="h-7 w-7 object-contain"
                src={iconSrc}
              />
            ) : (
              <Icon className="h-5 w-5" fill="currentColor" strokeWidth={2.1} />
            )}
          </span>
          <span className="flex-1 text-[16px] font-black text-[#07133B]">{label}</span>
          {value ? <span className="max-w-[120px] truncate text-[12px] font-medium text-[#8A95AA]">{value}</span> : null}
          <ChevronRight className="h-5 w-5 text-[#9AA6BC]" strokeWidth={2.4} />
        </button>
      ))}
    </section>
  );
}

function MyDetailSheet({
  activePanel,
  buffCards,
  stats,
  onClose,
  onClearData,
  onExportData,
  onNavigate,
}) {
  if (!activePanel) {
    return null;
  }

  const buffId = activePanel.startsWith("buff:") ? activePanel.split(":")[1] : null;
  const activeBuff = buffCards.find((card) => card.id === buffId);
  const titleMap = {
    profile: "角色档案",
    streak: "连续记录",
    buffs: "Buff 总览",
    titles: "我的称号",
    badges: "成就徽章",
    statistics: "数据统计",
    settings: "系统设置",
    notifications: "系统通知",
  };
  const title = activeBuff?.title || titleMap[activePanel] || "数据详情";

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#07133B]/35 px-4 pb-4 backdrop-blur-sm">
      <section className="max-h-[78vh] w-full max-w-[390px] overflow-y-auto rounded-[28px] border border-[#DCEBFF] bg-white p-5 shadow-[0_24px_64px_rgba(13,27,51,0.22)]">
        <div className="flex items-center justify-between">
          <h2 className="text-[22px] font-black text-[#07133B]">{title}</h2>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F0F7FF] text-[#1677FF]"
            type="button"
            onClick={onClose}
          >
            <X className="h-5 w-5" strokeWidth={2.6} />
          </button>
        </div>

        <div className="mt-4">
          {activeBuff ? <BuffDetail card={activeBuff} /> : null}
          {activePanel === "profile" ? <ProfileDetail stats={stats} /> : null}
          {activePanel === "streak" ? <StreakDetail stats={stats} onNavigate={onNavigate} /> : null}
          {activePanel === "buffs" ? <BuffsDetail stats={stats} buffCards={buffCards} /> : null}
          {activePanel === "titles" ? <TitlesDetail stats={stats} /> : null}
          {activePanel === "badges" ? <BadgesDetail stats={stats} /> : null}
          {activePanel === "statistics" ? <StatisticsDetail stats={stats} /> : null}
          {activePanel === "settings" ? (
            <SettingsDetail onClearData={onClearData} onExportData={onExportData} />
          ) : null}
          {activePanel === "notifications" ? <NotificationsDetail stats={stats} /> : null}
        </div>
      </section>
    </div>
  );
}

function DetailGrid({ items }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(([label, value]) => (
        <div className="rounded-[18px] border border-[#E6F1FF] bg-[#F8FBFF] p-3" key={label}>
          <p className="text-[12px] font-bold text-[#60728A]">{label}</p>
          <p className="mt-1 text-[19px] font-black text-[#1677FF]">{value}</p>
        </div>
      ))}
    </div>
  );
}

function ProfileDetail({ stats }) {
  return (
    <div className="space-y-4">
      <DetailGrid
        items={[
          ["当前等级", stats.levelInfo.label],
          ["总 XP", stats.totalXp],
          ["当前称号", stats.title],
          ["距离升级", `${stats.levelInfo.remainingXp} XP`],
        ]}
      />
      <LatestRecord recordsList={stats.recordsList} />
    </div>
  );
}

function StreakDetail({ stats, onNavigate }) {
  return (
    <div className="space-y-4">
      <DetailGrid
        items={[
          ["连续记录", `${stats.streakDays} 天`],
          ["总记录", `${stats.recordsList.length} 天`],
          ["本月完成率", `${stats.monthCompletion}%`],
          ["平均状态", `${stats.averageScore} 分`],
        ]}
      />
      <button
        className="h-12 w-full rounded-[20px] bg-[#1677FF] text-[16px] font-black text-white"
        type="button"
        onClick={() => onNavigate?.("calendar")}
      >
        去日历查看历史
      </button>
    </div>
  );
}

function BuffsDetail({ stats, buffCards }) {
  return (
    <div className="space-y-3">
      <DetailGrid
        items={[
          ["总 Buff", stats.totalBuffs],
          ["总 Debuff", stats.totalDebuffs],
          ["恢复占比", `${stats.recoveryPercent}%`],
          ["专注占比", `${stats.focusPercent}%`],
        ]}
      />
      {buffCards.map((card) => (
        <p className="rounded-[16px] bg-[#F8FBFF] px-3 py-2 text-[13px] font-bold leading-5 text-[#60728A]" key={card.id}>
          <span className="font-black text-[#07133B]">{card.title}：</span>
          {card.detail}
        </p>
      ))}
    </div>
  );
}

function BuffDetail({ card }) {
  return (
    <div className="space-y-3">
      <img
        alt={card.title}
        className="h-44 w-full rounded-[20px] bg-white object-contain"
        src={card.image}
      />
      <DetailGrid
        items={[
          ["等级", card.level],
          ["进度", `${card.percent}%`],
        ]}
      />
      <p className="rounded-[16px] bg-[#F8FBFF] px-3 py-3 text-[13px] font-bold leading-5 text-[#60728A]">
        {card.detail}
      </p>
    </div>
  );
}

function TitlesDetail({ stats }) {
  const titles = [...new Set(stats.recordsList.map((record) => record.title).filter(Boolean))];

  return titles.length > 0 ? (
    <div className="space-y-2">
      {titles.map((title) => (
        <div className="flex items-center justify-between rounded-[16px] border border-[#E6F1FF] bg-[#F8FBFF] px-3 py-3" key={title}>
          <span className="font-black text-[#07133B]">{title}</span>
          <Crown className="h-5 w-5 text-[#FFC400]" fill="currentColor" />
        </div>
      ))}
    </div>
  ) : (
    <EmptyState text="还没有称号，完成一次今日记录后这里会生成。" />
  );
}

function BadgesDetail({ stats }) {
  const badges = [
    ["首次记录", stats.recordsList.length >= 1],
    ["记录 7 天", stats.recordsList.length >= 7],
    ["连续 7 天", stats.streakDays >= 7],
    ["Buff 收集者", stats.totalBuffs >= 10],
    ["高分状态", stats.averageScore >= 80],
    ["跑步徒步 10km", stats.totalDistanceKm >= 10],
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {badges.map(([label, achieved]) => (
        <div
          className={[
            "rounded-[18px] border px-3 py-3",
            achieved ? "border-[#BDEFD5] bg-[#ECFFF4]" : "border-[#E6F1FF] bg-[#F8FBFF]",
          ].join(" ")}
          key={label}
        >
          <Shield
            className={["h-6 w-6", achieved ? "text-[#12A94B]" : "text-[#9AA6BC]"].join(" ")}
            fill="currentColor"
          />
          <p className="mt-2 text-[13px] font-black text-[#07133B]">{label}</p>
          <p className="mt-1 text-[11px] font-bold text-[#60728A]">
            {achieved ? "已解锁" : "未解锁"}
          </p>
        </div>
      ))}
    </div>
  );
}

function StatisticsDetail({ stats }) {
  return (
    <div className="space-y-4">
      <DetailGrid
        items={[
          ["总记录", `${stats.recordsList.length} 天`],
          ["总 XP", stats.totalXp],
          ["平均 XP", stats.averageXp],
          ["平均评分", stats.averageScore],
          ["运动总时长", `${stats.totalWorkoutMinutes} 分钟`],
          ["跑步徒步距离", `${stats.totalDistanceKm} km`],
        ]}
      />
      <LatestRecord recordsList={stats.recordsList} />
    </div>
  );
}

function SettingsDetail({ onClearData, onExportData }) {
  return (
    <div className="space-y-3">
      <button
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[20px] bg-[#1677FF] text-[15px] font-black text-white"
        type="button"
        onClick={onExportData}
      >
        <Download className="h-5 w-5" />
        导出本地数据
      </button>
      <button
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[20px] bg-[#FFEDED] text-[15px] font-black text-[#E11919]"
        type="button"
        onClick={onClearData}
      >
        <Trash2 className="h-5 w-5" />
        清空本地记录
      </button>
      <p className="rounded-[16px] bg-[#F8FBFF] px-3 py-3 text-[12px] font-bold leading-5 text-[#60728A]">
        未登录时数据保存在浏览器本地。登录后会同步到云端，换设备也可以找回自己的记录。
      </p>
    </div>
  );
}

function NotificationsDetail({ stats }) {
  return (
    <div className="space-y-2">
      <p className="rounded-[16px] bg-[#F8FBFF] px-3 py-3 text-[13px] font-bold leading-5 text-[#60728A]">
        今日系统：你目前累计 {stats.totalXp} XP，连续记录 {stats.streakDays} 天。
      </p>
      <p className="rounded-[16px] bg-[#F8FBFF] px-3 py-3 text-[13px] font-bold leading-5 text-[#60728A]">
        本月完成率 {stats.monthCompletion}%，继续把现实行动喂给角色。
      </p>
    </div>
  );
}

function LatestRecord({ recordsList }) {
  const latest = getLatestRecord(recordsList);

  if (!latest) {
    return <EmptyState text="还没有记录，先去记录页完成一次今日状态。" />;
  }

  return (
    <div className="rounded-[18px] border border-[#E6F1FF] bg-[#F8FBFF] p-3">
      <p className="text-[12px] font-bold text-[#60728A]">最近一次记录</p>
      <p className="mt-1 text-[16px] font-black text-[#07133B]">
        {latest.date} · {getRecordScore(latest)} 分 · +{getRecordXp(latest)} XP
      </p>
      <p className="mt-1 line-clamp-3 text-[12px] font-medium leading-5 text-[#60728A]">
        {latest.summary || "暂无复盘文案"}
      </p>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <p className="rounded-[16px] border border-dashed border-[#BFD8FF] bg-[#F8FBFF] px-3 py-4 text-center text-[13px] font-bold text-[#60728A]">
      {text}
    </p>
  );
}

function MyBottomTabBar({ activePage, onNavigate }) {
  return (
    <nav className="mt-auto rounded-[24px] bg-white px-4 py-1.5 shadow-[0_8px_26px_rgba(10,141,255,0.08)]">
      <div className="grid grid-cols-4 gap-1">
        {navItems.map(({ id, label, Icon }) => {
          const isActive = id === activePage;

          return (
            <button
              className={[
                "flex min-h-[42px] flex-col items-center justify-center gap-0.5 rounded-2xl text-[12px] font-bold",
                isActive ? "text-[#1677FF]" : "text-[#8A95A3]",
              ].join(" ")}
              key={id}
              type="button"
              onClick={() => onNavigate?.(id)}
            >
              <Icon
                className="h-6 w-6"
                fill={isActive ? "currentColor" : "none"}
                strokeWidth={2.4}
              />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
