"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

function str(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  await prisma.user.update({
    where: { lineUserId: user.lineUserId },
    data: {
      displayName: str(formData.get("displayName")),
      phone: str(formData.get("phone")),
      address: str(formData.get("address")),
    },
  });
  revalidatePath("/profile");
}
