"use client";

// Banner carousel — สไลด์ได้หลายภาพ เลื่อนอัตโนมัติ + ปัดดูเอง + จุดบอกตำแหน่ง
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

export type BannerSlide = {
  id: string;
  imageUrl: string | null;
  title: string;
  subtitle?: string;
  href?: string;
};

export default function HeroCarousel({ slides }: { slides: BannerSlide[] }) {
  const all = slides;

  const [index, setIndex] = useState(0);
  const count = all.length;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchX = useRef<number | null>(null);

  const go = useCallback(
    (i: number) => setIndex(((i % count) + count) % count),
    [count],
  );

  // เลื่อนอัตโนมัติทุก 4 วิ (หยุดชั่วคราวตอนผู้ใช้แตะ/ชี้เมาส์)
  const start = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => setIndex((i) => (i + 1) % count), 4000);
  }, [count]);
  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => {
    if (count > 1) start();
    return stop;
  }, [count, start, stop]);

  // ยังไม่มีรูปเลย — ไม่ต้องแสดงแบนเนอร์
  if (count === 0) return null;

  return (
    <div
      className="relative overflow-hidden rounded-3xl"
      onMouseEnter={stop}
      onMouseLeave={() => count > 1 && start()}
      onTouchStart={(e) => {
        stop();
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (touchX.current ?? 0);
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
        touchX.current = null;
        if (count > 1) start();
      }}
    >
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {all.map((s) => (
          <Slide key={s.id} slide={s} />
        ))}
      </div>

      {count > 1 ? (
        <>
          {/* ปุ่มซ้าย/ขวา */}
          <button
            aria-label="ก่อนหน้า"
            onClick={() => go(index - 1)}
            className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/25 text-white backdrop-blur hover:bg-black/40"
          >
            ‹
          </button>
          <button
            aria-label="ถัดไป"
            onClick={() => go(index + 1)}
            className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/25 text-white backdrop-blur hover:bg-black/40"
          >
            ›
          </button>
          {/* จุดบอกตำแหน่ง */}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {all.map((s, i) => (
              <button
                key={s.id}
                aria-label={`สไลด์ที่ ${i + 1}`}
                onClick={() => go(i)}
                className={`h-2 rounded-full transition-all ${
                  i === index ? "w-5 bg-white" : "w-2 bg-white/50 hover:bg-white/75"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Slide({ slide }: { slide: BannerSlide }) {
  const inner = (
    <div className="relative h-48 w-full flex-none sm:h-56 lg:h-64">
      {slide.imageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.imageUrl}
            alt={slide.title}
            className="h-full w-full object-cover"
            draggable={false}
          />
          {/* โปรโมชันอิสระ (ไม่มีข้อความ) ไม่ต้องมีเงาทับรูป */}
          {slide.title ? (
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          ) : null}
        </>
      ) : (
        <div className="h-full w-full bg-gradient-to-r from-brand-navy via-purple-700 to-brand-pink" />
      )}
      {slide.title ? (
        <div className="absolute inset-x-0 bottom-0 p-6 pb-8 text-white">
          <p className="line-clamp-1 text-xl font-extrabold sm:text-2xl">{slide.title}</p>
          {slide.subtitle ? (
            <p className="mt-1 line-clamp-1 text-sm text-white/85">{slide.subtitle}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  return slide.href ? (
    <Link href={slide.href} className="w-full flex-none">
      {inner}
    </Link>
  ) : (
    <div className="w-full flex-none">{inner}</div>
  );
}
