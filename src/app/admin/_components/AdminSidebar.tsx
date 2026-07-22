"use client";

import { useState } from "react";
import Link from "next/link";
import {
  IconDashboard,
  IconMusic,
  IconClipboard,
  IconUpload,
  IconEye,
  IconLogout,
  IconMenu,
  IconClose,
} from "../../_components/icons";

type AdminNavKey = "overview" | "concerts" | "orders" | "banners";

type Item = { key: AdminNavKey; href: string; label: string; Icon: (p: { className?: string }) => JSX.Element };

const NAV: Item[] = [
  { key: "overview", href: "/admin", label: "ภาพรวม", Icon: IconDashboard },
  { key: "concerts", href: "/admin/concerts", label: "จัดการคอนเสิร์ต", Icon: IconMusic },
  { key: "orders", href: "/admin/orders", label: "ออเดอร์", Icon: IconClipboard },
  { key: "banners", href: "/admin/banners", label: "แบนเนอร์โปรโมชัน", Icon: IconUpload },
];

export default function AdminSidebar({
  active,
  user,
}: {
  active: AdminNavKey;
  user: { displayName: string | null; pictureUrl: string | null };
}) {
  const [open, setOpen] = useState(false);

  const Brand = (
    <div className="flex items-center gap-2.5 px-6 py-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="" className="h-10 w-10 rounded-full" />
      <div className="leading-tight">
        <p className="text-base font-extrabold tracking-tight text-brand-navy">ผ่อนบัตรร้านอิ๊งค์</p>
        <p className="text-[10px] font-semibold tracking-widest text-slate-400">ระบบผู้ดูแล</p>
      </div>
    </div>
  );

  const NavLinks = (
    <nav className="flex flex-col gap-1 px-3">
      <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        เมนูผู้ดูแล
      </p>
      {NAV.map(({ key, href, label, Icon }) => {
        const isActive = key === active;
        return (
          <Link
            key={key}
            href={href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? "bg-[#FCE7F1] text-brand-pink"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const Bottom = (
    <div className="mt-auto space-y-3 p-4">
      <div className="flex items-center gap-3 rounded-xl bg-brand-navy p-3">
        {user.pictureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.pictureUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div className="h-9 w-9 rounded-full bg-white/20" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{user.displayName ?? "แอดมิน"}</p>
          <p className="truncate text-xs text-slate-300">ผู้ดูแลระบบ</p>
        </div>
      </div>
      <Link
        href="/dashboard"
        className="flex items-center gap-3 rounded-xl bg-[#FCE7F1] px-3 py-2.5 text-sm font-medium text-brand-pink hover:opacity-90"
      >
        <IconEye className="h-5 w-5" /> ดูตัวอย่างฝั่งผู้ใช้
      </Link>
      {/* Plain <a> so Next.js does NOT prefetch it (prefetch would silently log the user out) */}
      <a
        href="/api/auth/logout"
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
      >
        <IconLogout className="h-5 w-5" /> ออกจากระบบ
      </a>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="h-8 w-8 rounded-full" />
          <span className="font-extrabold text-brand-navy">ผ่อนบัตรร้านอิ๊งค์</span>
        </div>
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="text-brand-navy">
          <IconMenu className="h-6 w-6" />
        </button>
      </div>

      {open && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between lg:block">
          {Brand}
          <button onClick={() => setOpen(false)} aria-label="Close menu" className="mr-4 text-brand-navy lg:hidden">
            <IconClose className="h-6 w-6" />
          </button>
        </div>
        {NavLinks}
        {Bottom}
      </aside>
    </>
  );
}
