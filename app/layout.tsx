import type { Metadata } from "next";
import "./globals.css";

export const viewport = { width: "device-width", initialScale: 1 };

export const metadata: Metadata = {
  title: "开口小岛｜跟小熊做任务，开口说英语",
  description: "开口小岛是一款英语启蒙互动应用。跟小熊做任务，开口说英语，从「小熊的野餐」开始，练习水果、颜色和简单句子。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
