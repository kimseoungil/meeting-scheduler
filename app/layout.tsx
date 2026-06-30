import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "모두의 시간",
  description: "여러 명이 함께 회의 시간을 정하는 가장 쉬운 방법",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body
        className="min-h-full flex flex-col"
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Malgun Gothic", sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  );
}
