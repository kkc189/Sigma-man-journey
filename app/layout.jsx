import "./globals.css";

export const metadata = {
  title: "AI 人生成长 RPG",
  description: "一个记录现实行为并转化为 RPG 状态的人生成长系统",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "人生RPG",
    statusBarStyle: "black-translucent",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport = {
  themeColor: "#020617",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
