// Upload concert posters to Supabase Storage and return the public URL.
// Uses the service-role key server-side only (never exposed to the browser).

const BUCKET = "posters";

function env() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return base && key ? { base, key } : null;
}

// Create the bucket if it doesn't exist yet (idempotent — ignores "already exists").
async function ensureBucket(base: string, key: string) {
  const res = await fetch(`${base}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  }).catch((e) => {
    console.error("ensureBucket fetch error:", e);
    return null;
  });
  if (res && !res.ok && res.status !== 409) {
    console.error("ensureBucket non-ok:", res.status, await res.text());
  }
}

export async function uploadPoster(file: File): Promise<string | null> {
  const e = env();
  if (!e) {
    console.error("Supabase storage env not set (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
    return null;
  }
  const { base, key } = e;
  await ensureBucket(base, key);

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const body = Buffer.from(await file.arrayBuffer());

  const res = await fetch(`${base}/storage/v1/object/${BUCKET}/${path}`, {
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
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}
