"use client";

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

const recordMockData = {
  sleepHours: 7.5,
  workoutMinutes: 45,
  nutritionScore: 8,
  phoneHours: 3.2,
  mood: "开心满满",
  completedActions: 3,
};

const navItems = [
  { id: "home", label: "首页", Icon: Home },
  { id: "record", label: "记录", Icon: Pen },
  { id: "calendar", label: "日历", Icon: CalendarDays },
  { id: "status", label: "我的", Icon: User },
];

export function RecordPage({ onNavigate }) {
  function handleSubmit() {
    console.log("record mock data", recordMockData);
  }

  return (
    <main className="min-h-screen bg-[#F5FBFF] text-[#0D1B33]">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col overflow-hidden rounded-[32px] bg-white px-5 pb-[calc(82px+env(safe-area-inset-bottom))] pt-4 shadow-[0_24px_80px_rgba(10,141,255,0.16)] sm:my-6">
        <RecordHeader onBack={() => onNavigate?.("home")} />
        <RecordHero />
        <DatePill />

        <section className="mt-2.5 space-y-1.5">
          <RecordItemCard
            Icon={MoonStar}
            title="睡眠"
            description="好睡眠，恢复精力"
            value={recordMockData.sleepHours}
            unit="小时"
            onClick={() => console.log("edit sleep")}
          />
          <RecordItemCard
            Icon={Dumbbell}
            title="健身"
            description="坚持锻炼，强健体魄"
            value={recordMockData.workoutMinutes}
            unit="分钟"
            onClick={() => console.log("edit workout")}
          />
          <RecordItemCard
            Icon={UtensilsCrossed}
            title="饮食评分"
            description="均衡饮食，营养满分"
            value={recordMockData.nutritionScore}
            unit="/10"
            footer={<StarRow filled={4} />}
            onClick={() => console.log("edit nutrition")}
          />
          <RecordItemCard
            Icon={Smartphone}
            title="手机使用"
            description="合理使用，掌控时间"
            value={recordMockData.phoneHours}
            unit="小时"
            onClick={() => console.log("edit phone")}
          />
          <RecordItemCard
            Icon={Smile}
            title="情绪"
            description="关注情绪，保持积极"
            footer={<MoodSelector mood={recordMockData.mood} />}
            onClick={() => console.log("edit mood")}
          />
          <RecordItemCard
            Icon={Target}
            title="执行力"
            description="今日行动，今日进步"
            prefix="完成了"
            value={recordMockData.completedActions}
            unit="件"
            onClick={() => console.log("edit execution")}
          />
        </section>

        <SubmitRecordButton onClick={handleSubmit} />
      </div>

      <BottomTabBar activePage="record" onNavigate={onNavigate} />
    </main>
  );
}

export function RecordHeader({ onBack }) {
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
          onClick={() => console.log("open calendar")}
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

export function DatePill() {
  return (
    <button
      className="relative z-20 mt-[-2px] inline-flex h-9 w-fit items-center gap-2.5 rounded-full border border-[#BFD8FF] bg-[#F0F7FF] px-5 text-[14px] font-bold text-[#1677FF]"
      type="button"
      onClick={() => console.log("select date")}
    >
      <CalendarDays className="h-5 w-5" strokeWidth={2.4} />
      <span>2025年05月20日 今天</span>
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

export function MoodSelector({ mood }) {
  const moodIcons = [Angry, Frown, Meh, Smile, Laugh];
  const activeIndex = 3;

  return (
    <div className="flex flex-col items-end">
      <div className="flex items-center gap-1">
        {moodIcons.map((MoodIcon, index) => {
          const isActive = index === activeIndex;

          return (
            <span
              className={[
                "flex h-6 w-6 items-center justify-center rounded-full border text-[#8C95A5] transition-colors",
                isActive
                  ? "border-[#1677FF] bg-[#FFE35A] text-[#111827] shadow-[0_4px_12px_rgba(22,119,255,0.22)]"
                  : "border-transparent bg-[#EEF2F8] text-[#8C95A5]",
              ]
                .filter(Boolean)
                .join(" ")}
              key={MoodIcon.displayName || `mood-${index}`}
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
