// Upload files to Supabase Storage. Two buckets:
// - "posters" (public) — concert poster images.
// - "slips" (private) — customer bank-transfer slip photos, contain sensitive
//   bank details so they're not publicly readable; admin views them via a
//   short-lived signed URL instead (see getSignedSlipUrl).
// Uses the service-role key server-side only (never exposed to the browser).

const POSTERS_BUCKET = "posters";
const SLIPS_BUCKET = "slips";
// "banners" (public) — promo banner images shown in the dashboard hero carousel.
const BANNERS_BUCKET = "banners";

function env() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return base && key ? { base, key } : null;
}

// Create a bucket if it doesn't exist yet (idempotent — ignores "already exists").
async function ensureBucket(base: string, key: string, bucket: string, isPublic: boolean) {
  const res = await fetch(`${base}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: bucket, name: bucket, public: isPublic }),
  }).catch((e) => {
    console.error(`ensureBucket(${bucket}) fetch error:`, e);
    return null;
  });
  if (res && !res.ok && res.status !== 409) {
    console.error(`ensureBucket(${bucket}) non-ok:`, res.status, await res.text());
  }
}

export async function uploadPoster(file: File): Promise<string | null> {
  const e = env();
  if (!e) {
    console.error("Supabase storage env not set (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
    return null;
  }
  const { base, key } = e;
  await ensureBucket(base, key, POSTERS_BUCKET, true);

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const body = Buffer.from(await file.arrayBuffer());

  const res = await fetch(`${base}/storage/v1/object/${POSTERS_BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "true",
    },
    body,
  });

  if (!res.ok) {
    console.error("Poster upload failed:", res.status, await res.text());
    return null;
  }
  console.log("Poster uploaded OK:", path);
  return `${base}/storage/v1/object/public/${POSTERS_BUCKET}/${path}`;
}

// ── Promo banners (public bucket, no DB table — the bucket listing IS the data) ──

export type BannerFile = { path: string; url: string; createdAt: string };

export async function uploadBanner(file: File): Promise<string | null> {
  const e = env();
  if (!e) {
    console.error("Supabase storage env not set (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
    return null;
  }
  const { base, key } = e;
  await ensureBucket(base, key, BANNERS_BUCKET, true);

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const body = Buffer.from(await file.arrayBuffer());

  const res = await fetch(`${base}/storage/v1/object/${BANNERS_BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "true",
    },
    body,
  });

  if (!res.ok) {
    console.error("Banner upload failed:", res.status, await res.text());
    return null;
  }
  return `${base}/storage/v1/object/public/${BANNERS_BUCKET}/${path}`;
}

// List all banner images, newest first (filenames start with a timestamp).
export async function listBanners(): Promise<BannerFile[]> {
  const e = env();
  if (!e) return [];
  const { base, key } = e;

  const res = await fetch(`${base}/storage/v1/object/list/${BANNERS_BUCKET}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefix: "", limit: 50, sortBy: { column: "name", order: "desc" } }),
  }).catch((err) => {
    console.error("listBanners fetch error:", err);
    return null;
  });

  if (!res || !res.ok) return []; // bucket may not exist yet — that's fine
  const items = (await res.json()) as { name: string; created_at?: string }[];
  return items
    .filter((i) => i.name && !i.name.startsWith("."))
    .map((i) => ({
      path: i.name,
      url: `${base}/storage/v1/object/public/${BANNERS_BUCKET}/${i.name}`,
      createdAt: i.created_at ?? "",
    }));
}

export async function deleteBannerFile(path: string): Promise<boolean> {
  const e = env();
  if (!e) return false;
  const { base, key } = e;

  const res = await fetch(`${base}/storage/v1/object/${BANNERS_BUCKET}/${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${key}`, apikey: key },
  });
  if (!res.ok) console.error("Banner delete failed:", res.status, await res.text());
  return res.ok;
}

// Upload a transfer slip image (already-downloaded bytes from LINE's Content
// API). Returns the storage path (not a public URL — this bucket is
// private) to save on SlipSubmission.imagePath.
export async function uploadSlip(buffer: Buffer, contentType: string): Promise<string | null> {
  const e = env();
  if (!e) {
    console.error("Supabase storage env not set (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
    return null;
  }
  const { base, key } = e;
  await ensureBucket(base, key, SLIPS_BUCKET, false);

  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const res = await fetch(`${base}/storage/v1/object/${SLIPS_BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": contentType || "application/octet-stream",
      "x-upsert": "true",
    },
    body: new Uint8Array(buffer),
  });

  if (!res.ok) {
    console.error("Slip upload failed:", res.status, await res.text());
    return null;
  }
  return path;
}

// Generate a short-lived signed URL so admin can view a slip image. Slips
// bucket is private, so there's no public URL like posters have.
export async function getSignedSlipUrl(path: string, expiresInSeconds = 300): Promise<string | null> {
  const e = env();
  if (!e) return null;
  const { base, key } = e;

  const res = await fetch(`${base}/storage/v1/object/sign/${SLIPS_BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: expiresInSeconds }),
  });

  if (!res.ok) {
    console.error("getSignedSlipUrl failed:", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as { signedURL?: string };
  if (!data.signedURL) return null;
  return `${base}/storage/v1${data.signedURL}`;
}
