import "./globals.css";

export const metadata = {
  title: "男神进化日记",
  description: "一个记录现实行为并转化为 RPG 状态的男神进化系统",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "男神进化日记",
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
  themeColor: "#F5FBFF",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
