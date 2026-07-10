import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
// Pretendard 가변 폰트 (한글) — dynamic subset 을 번들에 포함해 셀프호스팅.
// CDN 을 쓰지 않으므로 Tauri/Android 오프라인 환경에서도 동일하게 렌더링됨.
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/themeScript";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  // maximumScale 미지정 — 저시력 사용자의 핀치 줌(확대)을 막지 않음 (접근성)
};

export const metadata: Metadata = {
  title: "PT-NOTE",
  description: "물리치료(도수치료) 환자 평가 및 기록 애플리케이션",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PT-NOTE",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* hydration 전에 html.dark 미리 붙여 FOUC 차단. localStorage["pt-theme"] 참조. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${geistMono.variable} antialiased`}>
        {/* 서비스 워커 언레지스터 (의도적 유지) — 과거 버전이 등록해 둔 SW 가
            오래된 자산을 계속 서빙하는 것을 방지. 오프라인 캐싱은 현재 미지원
            정책이며, PWA 는 "설치형(홈 화면 추가)"까지만 제공한다. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(regs) {
                  regs.forEach(function(reg) { reg.unregister(); });
                }).catch(function() {});
              }
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
