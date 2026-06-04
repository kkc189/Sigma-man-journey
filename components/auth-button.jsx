"use client";

import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { LogOut, Mail, User } from "lucide-react";
import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabase-client";
import { syncLocalRecordsToCloud } from "../lib/records-store";

const ANDROID_AUTH_REDIRECT_URL = "com.lifegrowth.record://auth-callback";

function getEmailLabel(email) {
  if (!email) {
    return "已登录";
  }

  return email.split("@")[0] || "已登录";
}

function isAndroidAppWebView() {
  if (typeof window === "undefined") {
    return false;
  }

  const isNativeAndroid =
    Capacitor?.isNativePlatform?.() && Capacitor?.getPlatform?.() === "android";
  const isCapacitorLocalOrigin =
    window.location.protocol === "https:" && window.location.hostname === "localhost";

  return (
    isNativeAndroid ||
    isCapacitorLocalOrigin
  );
}

function getEmailRedirectTo() {
  if (isAndroidAppWebView()) {
    return ANDROID_AUTH_REDIRECT_URL;
  }

  return window.location.origin;
}

async function completeSessionFromRedirectUrl(supabase, url) {
  const authUrl = new URL(url);
  const hashParams = new URLSearchParams(authUrl.hash.replace(/^#/, ""));
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");
  const code = authUrl.searchParams.get("code") || hashParams.get("code");

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      throw error;
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      throw error;
    }
  }
}

export function AuthButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const supabase = getSupabaseClient();
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session || null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession || null);

      if (nextSession) {
        await syncLocalRecordsToCloud();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !isAndroidAppWebView()) {
      return undefined;
    }

    let listener;

    App.addListener("appUrlOpen", async ({ url }) => {
      if (!url?.startsWith(ANDROID_AUTH_REDIRECT_URL)) {
        return;
      }

      try {
        await completeSessionFromRedirectUrl(supabase, url);
        setMessage("登录成功，正在同步云端记录。");
      } catch (error) {
        setMessage(`登录失败：${error.message}`);
      }
    }).then((nextListener) => {
      listener = nextListener;
    });

    return () => {
      listener?.remove();
    };
  }, [supabase]);

  async function sendMagicLink(event) {
    event.preventDefault();

    if (!supabase || !email.trim()) {
      return;
    }

    setIsSending(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: getEmailRedirectTo(),
      },
    });

    setIsSending(false);
    setMessage(
      error
        ? `发送失败：${error.message}`
        : "登录链接已发送，请打开邮箱完成登录。",
    );
  }

  async function signOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setSession(null);
    setIsOpen(false);
  }

  return (
    <>
      <button
        className={[
          "inline-flex h-10 max-w-[104px] items-center justify-center gap-1.5 rounded-2xl px-3 text-[13px] font-black shadow-[0_10px_24px_rgba(10,141,255,0.10)]",
          session
            ? "border border-[#BDEFD5] bg-[#ECFFF4] text-[#079F43]"
            : "border border-[#BFD8FF] bg-white text-[#0A8DFF]",
        ].join(" ")}
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <User className="h-4 w-4 shrink-0" strokeWidth={2.5} />
        <span className="truncate">
          {session ? getEmailLabel(session.user?.email) : "登录"}
        </span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#07133B]/35 px-4 pb-4 backdrop-blur-sm">
          <section className="w-full max-w-[390px] rounded-[28px] border border-[#DCEBFF] bg-white p-5 shadow-[0_24px_64px_rgba(13,27,51,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[12px] font-black text-[#0A8DFF]">
                  云端账号
                </p>
                <h2 className="mt-1 text-[24px] font-black leading-tight text-[#07133B]">
                  邮箱免密码登录
                </h2>
              </div>
              <button
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0F7FF] text-[#1677FF]"
                type="button"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>

            {!configured ? (
              <div className="mt-4 rounded-[18px] bg-[#FFF8E7] px-4 py-3 text-[13px] font-bold leading-5 text-[#8A5A00]">
                还没有配置 Supabase。填好
                {" "}NEXT_PUBLIC_SUPABASE_URL{" "}
                和
                {" "}NEXT_PUBLIC_SUPABASE_ANON_KEY{" "}
                后，这里就会发送邮箱登录链接。
              </div>
            ) : session ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-[18px] bg-[#ECFFF4] px-4 py-3">
                  <p className="text-[12px] font-bold text-[#60728A]">
                    当前账号
                  </p>
                  <p className="mt-1 truncate text-[16px] font-black text-[#079F43]">
                    {session.user?.email}
                  </p>
                </div>
                <button
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[20px] bg-[#FFEDED] text-[15px] font-black text-[#E11919]"
                  type="button"
                  onClick={signOut}
                >
                  <LogOut className="h-5 w-5" strokeWidth={2.4} />
                  退出登录
                </button>
              </div>
            ) : (
              <form className="mt-4 space-y-3" onSubmit={sendMagicLink}>
                <label className="block">
                  <span className="text-[13px] font-black text-[#07133B]">
                    邮箱
                  </span>
                  <div className="mt-2 flex h-12 items-center gap-2 rounded-[18px] border border-[#DCEBFF] bg-[#F8FBFF] px-3">
                    <Mail className="h-5 w-5 shrink-0 text-[#0A8DFF]" />
                    <input
                      className="min-w-0 flex-1 bg-transparent text-[15px] font-bold text-[#07133B] outline-none placeholder:text-[#9AA6BC]"
                      inputMode="email"
                      placeholder="you@example.com"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                </label>

                <button
                  className="h-12 w-full rounded-[20px] bg-[#1677FF] text-[15px] font-black text-white disabled:opacity-60"
                  type="submit"
                  disabled={isSending || !email.trim()}
                >
                  {isSending ? "发送中..." : "发送登录链接"}
                </button>

                {message ? (
                  <p className="rounded-[16px] bg-[#F8FBFF] px-3 py-3 text-[12px] font-bold leading-5 text-[#60728A]">
                    {message}
                  </p>
                ) : null}
              </form>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
