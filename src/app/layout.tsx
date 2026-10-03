import type { Metadata } from "next";
import localFont from "next/font/local";

import { OutboxTicker } from "@/components/layout/outbox-ticker";
import { RenewalRuntimeProvider } from "@/lib/renewal-runtime-state";

import "./globals.css";

export const metadata: Metadata = {
  title: "Trellis | Renewal Risk",
  description: "Track renewal risk, decision windows, and accountable owners.",
};

const switzer = localFont({
  src: [
    {
      path: "../../public/assets/fonts/Switzer-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/assets/fonts/Switzer-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/assets/fonts/Switzer-Bold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-switzer",
});

// Body copy uses Circular Std; Switzer is reserved for headings (see
// `font-heading` utility in globals.css).
const circular = localFont({
  src: [
    {
      path: "../../public/assets/fonts/CircularStd-Book.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/assets/fonts/CircularStd-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/assets/fonts/CircularStd-Bold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-circular",
});

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${circular.className} ${circular.variable} ${switzer.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-ui-bg-subtle text-ui-fg-base tracking-[0]">
        <RenewalRuntimeProvider>
          <OutboxTicker />
          {children}
        </RenewalRuntimeProvider>
      </body>
    </html>
  );
}
