"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { uploadPoster } from "@/lib/storage";

type ConcertStatus = "DRAFT" | "PUBLISHED" | "SOLD_OUT" | "CANCELLED";

function str(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}
function dateOrNull(v: FormDataEntryValue | null): Date | null {
  const s = (v ?? "").toString().trim();
  return s ? new Date(s) : null;
}
function money(v: FormDataEntryValue | null): string {
  return (v ?? "0").toString().trim() || "0";
}
function int(v: FormDataEntryValue | null): number {
  return parseInt((v ?? "0").toString(), 10) || 0;
}

function concertFields(formData: FormData) {
  return {
    name: (formData.get("name") ?? "").toString().trim(),
    artist: str(formData.get("artist")),
    venue: str(formData.get("venue")),
    eventDate: dateOrNull(formData.get("eventDate")),
    description: str(formData.get("description")),
    status: (formData.get("status") ?? "DRAFT").toString() as ConcertStatus,
  };
}

// Returns the uploaded poster URL, or null if no new file was chosen.
async function posterFromForm(formData: FormData): Promise<string | null> {
  const file = formData.get("poster");
  if (!(file instanceof File) || file.size === 0) return null;
  return uploadPoster(file);
}

// ── Concerts ──
export async function createConcert(formData: FormData) {
  const admin = await requireAdmin();
  const posterUrl = await posterFromForm(formData);
  const concert = await prisma.concert.create({
    data: { ...concertFields(formData), posterUrl, createdById: admin.lineUserId },
  });
  revalidatePath("/admin");
  redirect(`/admin/concerts/${concert.id}`);
}

export async function updateConcert(formData: FormData) {
  await requireAdmin();
  const id = (formData.get("id") ?? "").toString();
  const posterUrl = await posterFromForm(formData);
  await prisma.concert.update({
    where: { id },
    // Only overwrite the poster if a new file was uploaded; otherwise keep the old one.
    data: { ...concertFields(formData), ...(posterUrl ? { posterUrl } : {}) },
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/concerts/${id}`);
  redirect("/admin");
}

// ── Tiers (seat zones) ──
export async function createTier(formData: FormData) {
  await requireAdmin();
  const concertId = (formData.get("concertId") ?? "").toString();
  const price = money(formData.get("price"));
  // Zone name is optional — fall back to the price as the label.
  const name =
    (formData.get("name") ?? "").toString().trim() ||
    `฿${Number(price).toLocaleString("th-TH")}`;
  await prisma.ticketTier.create({
    data: {
      concertId,
      name,
      price,
      downAmount: money(formData.get("downAmount")),
      sortOrder: int(formData.get("sortOrder")),
    },
  });
  revalidatePath(`/admin/concerts/${concertId}`);
}

export async function deleteTier(formData: FormData) {
  await requireAdmin();
  const id = (formData.get("id") ?? "").toString();
  const concertId = (formData.get("concertId") ?? "").toString();
  await prisma.ticketTier.delete({ where: { id } });
  revalidatePath(`/admin/concerts/${concertId}`);
}

// ── Installment cells (weekly amount for a tier × length) ──
export async function addPlan(formData: FormData) {
  await requireAdmin();
  const concertId = (formData.get("concertId") ?? "").toString();
  await prisma.installmentPlan.create({
    data: {
      tierId: (formData.get("tierId") ?? "").toString(),
      weeks: int(formData.get("weeks")),
      weeklyAmount: money(formData.get("weeklyAmount")),
    },
  });
  revalidatePath(`/admin/concerts/${concertId}`);
}

export async function deletePlan(formData: FormData) {
  await requireAdmin();
  const id = (formData.get("id") ?? "").toString();
  const concertId = (formData.get("concertId") ?? "").toString();
  await prisma.installmentPlan.delete({ where: { id } });
  revalidatePath(`/admin/concerts/${concertId}`);
}
