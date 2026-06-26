import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ticketify · ผ่อนกับอิ้ง",
  description: "ซื้อบัตรคอนเสิร์ตแบบผ่อนชำระ ผ่าน LINE",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
