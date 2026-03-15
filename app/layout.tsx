import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sunjae Care Log",
  description: "10개월 아기의 분유, 이유식, 수면, 성장 기록을 가족이 함께 남기는 플랫폼"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
