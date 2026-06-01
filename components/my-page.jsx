"use client";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  BatteryFull,
  Bell,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  Crown,
  Hexagon,
  Home,
  Pen,
  Settings,
  Shield,
  SignalHigh,
  Star,
  User,
  Wifi,
} from "lucide-react";

const navItems = [
  { id: "home", label: "首页", Icon: Home },
  { id: "record", label: "记录", Icon: Pen },
  { id: "calendar", label: "日历", Icon: CalendarDays },
  { id: "status", label: "我的", Icon: User },
];

const buffCards = [
  {
    title: "恢复 Buff",
    description: "睡得好，恢复快！",
    level: "Lv.6",
    percent: 85,
    image: "/my-recovery-buff.png",
    variant: "buff",
  },
  {
    title: "专注 Buff",
    description: "专注力爆表，效率翻倍！",
    level: "Lv.5",
    percent: 72,
    image: "/my-focus-buff.png",
    variant: "buff",
  },
  {
    title: "执行 Buff",
    description: "说到做到，干就完事！",
    level: "Lv.5",
    percent: 68,
    image: "/my-execution-buff.png",
    variant: "buff",
  },
  {
    title: "摆烂 Debuff",
    description: "摆烂拖延，快乐减半...",
    level: "Lv.2",
    percent: 35,
    image: "/my-slack-debuff.png",
    variant: "debuff",
  },
];

const menuItems = [
  {
    label: "我的称号",
    value: "轻微觉醒牛马",
    Icon: Crown,
    iconClass: "bg-[#FFF6D7] text-[#FFC400]",
  },
  {
    label: "成就徽章",
    value: "12 枚徽章",
    Icon: Shield,
    iconClass: "bg-[#ECEBFF] text-[#6257FF]",
  },
  {
    label: "数据统计",
    value: "查看详细数据",
    Icon: BarChart3,
    iconClass: "bg-[#E8F4FF] text-[#1677FF]",
  },
  {
    label: "系统设置",
    value: "",
    Icon: Settings,
    iconClass: "bg-[#EEF2F6] text-[#8A95A3]",
  },
];

export function MyPage({ onNavigate }) {
  return (
    <main className="min-h-screen bg-[#F5FBFF] text-[#07133B]">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col overflow-x-hidden overflow-y-auto rounded-[32px] bg-[#F9FDFF] px-4 pb-2 pt-3 shadow-[0_24px_80px_rgba(10,141,255,0.16)] sm:my-6">
        <MyStatusBar />
        <MyHeader />
        <ProfileCard />
        <StatsPanel />
        <BuffGrid />
        <MenuPanel />
        <MyBottomTabBar activePage="status" onNavigate={onNavigate} />
        <div className="mx-auto mt-2 h-1.5 w-32 rounded-full bg-black" />
      </div>
    </main>
  );
}

function MyStatusBar() {
  return (
    <div className="flex items-center justify-between px-2 text-[16px] font-black text-[#0D1B33]">
      <span>9:41</span>
      <div className="flex items-center gap-2">
        <SignalHigh className="h-5 w-5" strokeWidth={2.6} />
        <Wifi className="h-5 w-5" strokeWidth={2.6} />
        <BatteryFull className="h-6 w-6" strokeWidth={2.6} />
      </div>
    </div>
  );
}

function MyHeader() {
  return (
    <header className="mt-5 flex items-center justify-between px-2">
      <h1 className="text-[36px] font-black leading-none tracking-tight text-[#07133B]">
        我的
      </h1>
      <div className="flex items-center gap-5 text-[#07133B]">
        <button className="relative" type="button" aria-label="通知">
          <Bell className="h-8 w-8" strokeWidth={2.5} />
          <span className="absolute right-[-2px] top-[-3px] h-3.5 w-3.5 rounded-full border-2 border-white bg-[#FF3B3B]" />
        </button>
        <button type="button" aria-label="设置入口">
          <Hexagon className="h-8 w-8" strokeWidth={2.5} />
        </button>
      </div>
    </header>
  );
}

function ProfileCard() {
  return (
    <section className="relative mt-6 overflow-hidden rounded-[24px] border border-[#E6F1FF] bg-white px-4 py-3 shadow-[0_14px_36px_rgba(10,141,255,0.08)]">
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
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2B9BFF] text-[14px] font-black text-white">
              ♂
            </span>
          </div>

          <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#EAF5FF] px-3 py-1 text-[12px] font-black text-[#1677FF]">
            <span>✦</span>
            轻微觉醒牛马
          </div>

          <div className="mt-3 flex items-end justify-between gap-2">
            <div className="flex items-end gap-3">
              <span className="text-[22px] font-black leading-none text-[#1677FF]">Lv.8</span>
              <span className="whitespace-nowrap pb-0.5 text-[13px] font-medium leading-none text-[#07133B]">
                3680 / 6000 XP
              </span>
            </div>
            <span className="whitespace-nowrap pb-0.5 text-[10px] font-semibold leading-none text-[#07133B]">
              升级还需 2320 XP
            </span>
          </div>

          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#CDE5FF]">
            <div className="h-full w-[61%] rounded-full bg-[linear-gradient(90deg,#0A8DFF,#1DA1FF)]" />
          </div>
        </div>

        <ChevronRight className="mt-5 h-6 w-6 text-[#07133B]" strokeWidth={2.4} />
      </div>
    </section>
  );
}

function StatsPanel() {
  return (
    <section className="mt-3 grid grid-cols-[1fr_1px_1fr_1px_1fr] items-center rounded-[22px] border border-[#E6F1FF] bg-white px-4 py-3 shadow-[0_12px_30px_rgba(10,141,255,0.07)]">
      <StatBlock
        Icon={CalendarCheck}
        iconClass="bg-[#EAF5FF] text-[#1677FF]"
        label="连续记录"
        value="7"
        unit="天"
      />
      <div className="h-10 bg-[#DDEBFA]" />
      <StatBlock type="ring" label="本月完成率" value="76%" />
      <div className="h-10 bg-[#DDEBFA]" />
      <StatBlock
        Icon={Star}
        iconClass="bg-[#E7F9EF] text-[#36C86E]"
        label="总 Buff"
        value="12"
      />
    </section>
  );
}

function StatBlock({ Icon, iconClass, label, value, unit, type }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {type === "ring" ? (
        <div className="relative h-10 w-10 shrink-0 rounded-full bg-[conic-gradient(#1677FF_0_76%,#DDEBFA_76%_100%)]">
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

function BuffGrid() {
  return (
    <section className="mt-3 grid grid-cols-2 gap-2.5">
      {buffCards.map((card) => (
        <BuffCard key={card.title} {...card} />
      ))}
    </section>
  );
}

function BuffCard({ title, description, level, percent, image, variant }) {
  const isDebuff = variant === "debuff";

  return (
    <article className="min-h-[194px] overflow-hidden rounded-[22px] border border-[#E6F1FF] bg-white px-3 pt-3 shadow-[0_12px_30px_rgba(10,141,255,0.07)]">
      <div className="relative z-10">
        <div
          className={[
            "flex items-center gap-1.5 text-[20px] font-black leading-none",
            isDebuff ? "text-[#E11919]" : "text-[#12A94B]",
          ].join(" ")}
        >
          {title}
          {isDebuff ? (
            <ArrowDownCircle className="h-5 w-5" fill="currentColor" strokeWidth={2.4} />
          ) : (
            <ArrowUpCircle className="h-5 w-5" fill="currentColor" strokeWidth={2.4} />
          )}
        </div>
        <p className="mt-2 truncate text-[13px] font-medium text-[#60728A]">
          {description}
        </p>
      </div>

      <div className="relative mt-1.5 h-[106px] overflow-hidden rounded-xl bg-white">
        <img
          alt={title}
          className="h-full w-full object-cover object-center"
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
        <span
          className={[
            "text-[13px] font-black",
            isDebuff ? "text-[#E11919]" : "text-[#079F43]",
          ].join(" ")}
        >
          {percent}%
        </span>
      </div>
    </article>
  );
}

function MenuPanel() {
  return (
    <section className="mt-3 overflow-hidden rounded-[22px] border border-[#E6F1FF] bg-white px-5 py-0.5 shadow-[0_12px_30px_rgba(10,141,255,0.07)]">
      {menuItems.map(({ label, value, Icon, iconClass }, index) => (
        <button
          className={[
            "flex h-[38px] w-full items-center gap-3 text-left",
            index !== menuItems.length - 1 ? "border-b border-[#E7EEF8]" : "",
          ].join(" ")}
          key={label}
          type="button"
          onClick={() => console.log(label)}
        >
          <span className={`flex h-7 w-7 items-center justify-center rounded-xl ${iconClass}`}>
            <Icon className="h-5 w-5" fill="currentColor" strokeWidth={2.1} />
          </span>
          <span className="flex-1 text-[16px] font-black text-[#07133B]">{label}</span>
          {value ? (
            <span className="text-[12px] font-medium text-[#8A95AA]">{value}</span>
          ) : null}
          <ChevronRight className="h-5 w-5 text-[#9AA6BC]" strokeWidth={2.4} />
        </button>
      ))}
    </section>
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
