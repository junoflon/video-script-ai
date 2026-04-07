import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ScriptFlow — 영상을 글로, 순식간에",
  description:
    "YouTube 영상의 자막을 추출하고 AI가 핵심 내용을 요약합니다. 블로그, 발표 대본, 학습 노트로 변환하세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <div className="noise-overlay" />
        <div className="ambient-bg" />
        <div className="relative z-10 flex flex-col min-h-full">{children}</div>
      </body>
    </html>
  );
}
