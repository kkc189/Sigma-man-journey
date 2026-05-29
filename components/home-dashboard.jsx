"use client";

import {
  BatteryFull,
  Bell,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Dumbbell,
  Home,
  Info,
  MoonStar,
  Pen,
  SignalHigh,
  Smile,
  Smartphone,
  Soup,
  User,
  Wifi,
} from "lucide-react";

const dashboardData = {
  statusScore: 78,
  level: "Lv. 8",
  xp: 320,
  maxXp: 500,
  title: "轻微觉醒牛马",
  buffs: ["早起 +20 XP", "健身达标 +30 XP", "专注时刻 +15 XP"],
  debuffs: ["熬夜 -20 XP", "手机超时 -15 XP"],
};

const featureItems = [
  { label: "睡眠", Icon: MoonStar },
  { label: "健身", Icon: Dumbbell },
  { label: "饮食", Icon: Soup },
  { label: "手机", Icon: Smartphone },
  { label: "情绪", Icon: Smile },
  { label: "执行力", Icon: ClipboardCheck },
];

const navItems = [
  { id: "home", label: "首页", Icon: Home },
  { id: "record", label: "记录", Icon: Pen },
  { id: "calendar", label: "日历", Icon: CalendarDays },
  { id: "status", label: "我的", Icon: User },
];

export function HomeDashboard({ onNavigate }) {
  return (
    <main className="min-h-screen bg-[#EEF8FF] text-[#0D1B33]">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col overflow-hidden rounded-[32px] bg-white px-5 pb-[calc(84px+env(safe-area-inset-bottom))] pt-4 shadow-[0_24px_80px_rgba(10,141,255,0.16)] sm:my-6">
        <HomeStatusBar />
        <HomeHeader />
        <StatusHeroCard />
        <FeatureGrid />
        <BuffPanel />

        <button
          className="mt-3 h-[54px] w-full rounded-[22px] bg-[linear-gradient(90deg,#0A8DFF_0%,#006DFF_100%)] text-[20px] font-black text-white shadow-[0_16px_32px_rgba(10,141,255,0.3)]"
          type="button"
          onClick={() => onNavigate?.("status")}
        >
          查看每日结算
        </button>
      </div>

      <HomeBottomTabBar activePage="home" onNavigate={onNavigate} />
    </main>
  );
}

function HomeStatusBar() {
  return (
    <div className="flex items-center justify-between px-1 text-[16px] font-black text-[#0D1B33]">
      <span>9:41</span>
      <div className="flex items-center gap-2">
        <SignalHigh className="h-5 w-5" strokeWidth={2.4} />
        <Wifi className="h-5 w-5" strokeWidth={2.4} />
        <BatteryFull className="h-6 w-6" strokeWidth={2.4} />
      </div>
    </div>
  );
}

function HomeHeader() {
  return (
    <header className="mt-6 flex items-center justify-between">
      <h1 className="text-[27px] font-black tracking-tight text-[#0B2C7E]">
        男神进化日记
      </h1>

      <button
        aria-label="通知"
        className="relative flex h-10 w-10 items-center justify-center rounded-2xl text-[#0B2C7E] transition-colors hover:bg-[#EEF6FF]"
        type="button"
        onClick={() => console.log("open notifications")}
      >
        <Bell className="h-7 w-7" strokeWidth={2.3} />
        <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#0A8DFF]" />
      </button>
    </header>
  );
}

function StatusHeroCard() {
  const progress = (dashboardData.xp / dashboardData.maxXp) * 100;

  return (
    <section className="relative mt-5 min-h-[254px] overflow-hidden rounded-[24px] border border-[#B9D8FF] bg-[linear-gradient(135deg,#F8FCFF_0%,#EAF5FF_58%,#FFFFFF_100%)] px-5 py-4 shadow-[0_18px_44px_rgba(10,141,255,0.12)]">
      <div className="relative z-10 max-w-[58%]">
        <div className="flex items-center gap-2 text-[16px] font-black text-[#0B2C7E]">
          <span>今日状态</span>
          <Info className="h-4 w-4 text-[#9BB3D6]" strokeWidth={2.2} />
        </div>

        <div className="mt-3 flex items-end gap-4">
          <p className="text-[72px] font-black leading-[0.86] tracking-tight text-[#0B2C7E]">
            {dashboardData.statusScore}
          </p>
          <p className="pb-2 text-[25px] font-black text-[#0A8DFF]">
            {dashboardData.level}
          </p>
        </div>

        <p className="mt-5 text-[15px] font-bold text-[#0D1B33]">
          {dashboardData.xp} / {dashboardData.maxXp} XP
        </p>

        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#C8DDF6]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#0A8DFF,#1DA1FF)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-5 rounded-[18px] border border-[#D4E6FA] bg-white/80 px-4 py-2.5 shadow-[0_10px_24px_rgba(10,141,255,0.08)]">
          <p className="text-[13px] font-semibold text-[#64748B]">今日称号</p>
          <p className="mt-1 text-[23px] font-black leading-7 text-[#0A8DFF]">
            {dashboardData.title}
          </p>
        </div>
      </div>

      <img
        alt="男神牛角色"
        className="pointer-events-none absolute bottom-[-2px] right-[-2px] z-0 h-[238px] w-[182px] object-contain object-bottom"
        src="/cow-mascot.png"
      />
    </section>
  );
}

function FeatureGrid() {
  return (
    <section className="mt-3 grid grid-cols-3 gap-3">
      {featureItems.map(({ label, Icon }) => (
        <button
          className="flex h-[88px] flex-col items-center justify-center rounded-[20px] border border-[#DCEBFF] bg-white text-[#0A8DFF] shadow-[0_12px_26px_rgba(10,141,255,0.08)] transition-transform hover:-translate-y-0.5"
          key={label}
          type="button"
          onClick={() => console.log(`open ${label}`)}
        >
          <Icon className="h-8 w-8" strokeWidth={2.25} />
          <span className="mt-2 text-[15px] font-black">{label}</span>
        </button>
      ))}
    </section>
  );
}

function BuffPanel() {
  return (
    <section className="mt-3 rounded-[20px] border border-[#DCEBFF] bg-white px-4 py-3 shadow-[0_12px_30px_rgba(10,141,255,0.08)]">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[18px] font-black text-[#0B2C7E]">Buff / Debuff</h2>
        <button
          className="inline-flex items-center gap-1 text-[14px] font-bold text-[#0A8DFF]"
          type="button"
          onClick={() => console.log("view all status")}
        >
          查看全部
          <ChevronRight className="h-4 w-4" strokeWidth={2.4} />
        </button>
      </div>

      <div>
        <p className="text-[16px] font-black text-[#11B94A]">Buff</p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {dashboardData.buffs.map((buff) => (
            <span
              className="rounded-xl bg-[#E4F8E9] px-3 py-1.5 text-[12px] font-bold text-[#049B3D]"
              key={buff}
            >
              {buff}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-2">
        <p className="text-[16px] font-black text-[#FF1F1F]">Debuff</p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {dashboardData.debuffs.map((debuff) => (
            <span
              className="rounded-xl bg-[#FFE9E9] px-3 py-1.5 text-[12px] font-bold text-[#F01818]"
              key={debuff}
            >
              {debuff}
            </span>
          ))}
        </div>
      </div>
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
