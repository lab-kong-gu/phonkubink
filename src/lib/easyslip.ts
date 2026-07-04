// EasySlip — Thai bank transfer slip verification API.
// Docs: https://document.easyslip.com/
//
// We send the slip image a customer posts in LINE chat; EasySlip reads the
// QR code embedded in the slip and checks it against real bank data. We ask
// it to also validate the amount (matchAmount) and flag reused slips
// (checkDuplicate) so the webhook can auto-confirm safely.

const API_BASE = "https://api.easyslip.com/v2";

export interface EasySlipBank {
  id: string;
  name: string;
  short: string;
}

export interface EasySlipRawSlip {
  payload: string;
  transRef: string;
  date: string;
  amount: { amount: number };
  sender?: { bank?: EasySlipBank; account?: { name?: { th?: string; en?: string } } };
  receiver?: { bank?: EasySlipBank; account?: { name?: { th?: string; en?: string } } };
}

export interface EasySlipVerifyData {
  isDuplicate: boolean;
  amountInOrder?: number;
  amountInSlip: number;
  isAmountMatched?: boolean;
  rawSlip: EasySlipRawSlip;
}

export type EasySlipResult =
  | { ok: true; data: EasySlipVerifyData }
  | { ok: false; code: string; message: string };

// Verify a slip image (raw bytes, as downloaded from LINE's Content API).
// matchAmount: pass the amount we expect (e.g. remaining balance owed) to get
// back `isAmountMatched`. checkDuplicate: flags slips that were already used.
export async function verifyBankSlipImage(
  imageBuffer: Buffer,
  contentType: string,
  opts: { matchAmount?: number; checkDuplicate?: boolean } = {}
): Promise<EasySlipResult> {
  // Never throw — a missing key or a network failure should route the slip to
  // the admin review queue (and still acknowledge the customer), not crash the
  // whole webhook handler before it can reply.
  const key = process.env.EASYSLIP_API_KEY;
  if (!key) {
    return { ok: false, code: "NO_API_KEY", message: "EASYSLIP_API_KEY is not set" };
  }

  const formData = new FormData();
  formData.append("image", new Blob([new Uint8Array(imageBuffer)], { type: contentType || "image/jpeg" }), "slip.jpg");
  if (opts.matchAmount !== undefined) formData.append("matchAmount", String(opts.matchAmount));
  if (opts.checkDuplicate !== undefined) formData.append("checkDuplicate", String(opts.checkDuplicate));

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/verify/bank`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: formData,
    });
  } catch (e) {
    return { ok: false, code: "NETWORK_ERROR", message: `EasySlip request failed: ${e instanceof Error ? e.message : String(e)}` };
  }

  const body = await res.json().catch(() => null);
  if (!body) {
    return { ok: false, code: "INVALID_RESPONSE", message: `EasySlip returned a non-JSON response (${res.status})` };
  }
  if (!body.success) {
    return {
      ok: false,
      code: body.error?.code || "UNKNOWN_ERROR",
      message: body.error?.message || `EasySlip API error (${res.status})`,
    };
  }
  return { ok: true, data: body.data as EasySlipVerifyData };
}
