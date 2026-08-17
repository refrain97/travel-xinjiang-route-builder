import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "新疆自由拼盘｜路线编辑器",
  description: "从机场与景点节点开始，自由拼出一趟能落到每天的新疆自驾方案。",
  applicationName: "新疆自由拼盘",
  openGraph: {
    title: "新疆自由拼盘｜路线编辑器",
    description: "任选进出机场，按顺序点选地点，把路线自动落到 Day 1—Day N。",
    type: "website",
    locale: "zh_CN",
    siteName: "新疆自由拼盘",
    images: [
      {
        url: "/og.png",
        width: 1731,
        height: 909,
        alt: "秋色森林、湖泊与雪山间的一条自由拼盘路线",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "新疆自由拼盘｜路线编辑器",
    description: "任选进出机场，按顺序点选地点，把路线自动落到逐日行程。",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
