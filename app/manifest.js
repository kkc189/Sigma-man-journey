export const dynamic = "force-static";

export default function manifest() {
  return {
    name: "男神进化日记",
    short_name: "男神日记",
    description: "一个记录现实行为并转化为 RPG 状态的男神进化系统",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#020617",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}
