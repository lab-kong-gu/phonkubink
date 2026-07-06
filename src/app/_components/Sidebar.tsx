"use client";

import { useState } from "react";
import Link from "next/link";
import {
  IconDashboard,
  IconMusic,
  IconTicket,
  IconUser,
  IconLogout,
  IconMenu,
  IconClose,
  IconShield,
} from "./icons";

type NavKey = "dashboard" | "concerts" | "tickets" | "profile" | "admin";

type NavItem = { key: NavKey; href: string; label: string; Icon: (p: { className?: string }) => JSX.Element };

const NAV: NavItem[] = [
  { key: "dashboard", href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
  { key: "concerts", href: "/concerts", label: "Concerts", Icon: IconMusic },
  { key: "tickets", href: "/tickets", label: "Ticket History", Icon: IconTicket },
  { key: "profile", href: "/profile", label: "Profile", Icon: IconUser },
];

const ADMIN_ITEM: NavItem = { key: "admin", href: "/admin", label: "Manage Concerts", Icon: IconShield };

export default function Sidebar({
  active,
  user,
  isAdmin = false,
}: {
  active: NavKey;
  user: { displayName: string | null; email: string | null; pictureUrl: string | null };
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const Brand = (
    <div className="flex items-center gap-2.5 px-6 py-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="" className="h-10 w-10 rounded-full" />
      <span className="text-base font-extrabold tracking-tight text-white">ผ่อนบัตรร้านอิ๊งค์</span>
    </div>
  );

  const UserCard = (
    <div className="mt-auto border-t border-white/10 p-4">
      <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
        {user.pictureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.pictureUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div className="h-9 w-9 rounded-full bg-white/20" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{user.displayName ?? "ผู้ใช้"}</p>
          <p className="truncate text-xs text-slate-400">{user.email ?? ""}</p>
        </div>
      </div>
      {isAdmin ? (
        <Link
          href="/admin"
          onClick={() => setOpen(false)}
          className="mt-3 flex items-center gap-3 rounded-xl bg-[#FCE7F1] px-3 py-2.5 text-sm font-medium text-brand-pink hover:opacity-90"
        >
          <IconShield className="h-5 w-5" /> Manage Concerts
        </Link>
      ) : null}
      {/* Plain <a> so Next.js does NOT prefetch it (prefetch would silently log the user out) */}
      <a
        href="/api/auth/logout"
        className="mt-3 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
      >
        <IconLogout className="h-5 w-5" /> Logout
      </a>
    </div>
  );

  const NavLinks = (
    <nav className="flex flex-col gap-1 px-3">
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
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-[#15213C] px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="h-8 w-8 rounded-full" />
          <span className="font-extrabold text-white">ผ่อนบัตรร้านอิ๊งค์</span>
        </div>
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="text-white">
          <IconMenu className="h-6 w-6" />
        </button>
      </div>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar drawer / fixed */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#15213C] transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between lg:block">
          {Brand}
          <button onClick={() => setOpen(false)} aria-label="Close menu" className="mr-4 text-white lg:hidden">
            <IconClose className="h-6 w-6" />
          </button>
        </div>
        {NavLinks}
        {UserCard}
      </aside>
    </>
  );
}
