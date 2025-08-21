// app/api/aws/route.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// IMPORTANT: Force Node runtime in Next.js Route Handlers
export const runtime = "nodejs";

// Increase if your files can exceed 10 MB
export const config = {
  api: { bodyParser: { sizeLimit: "20mb" } },
};

function base64ToBuffer(b64) {
  // supports "data:*/*;base64,..." or raw base64
  const idx = b64.indexOf(",");
  const raw = idx !== -1 ? b64.slice(idx + 1) : b64;
  return Buffer.from(raw, "base64");
}

export async function POST(req) {
  try {
    const {
      fileName,
      fileType,
      base64,
      incidentType,
      category,   // "evidence" | "voiceNotes"
      step,       // e.g., "incident-details"
      folderPath, // e.g., "users/abcd1234/profile/images"
    } = await req.json();

    // Validate input
    if (
      !fileName || !fileType || !base64 ||
      (!folderPath && (!incidentType || !category || !step))
    ) {
      return new Response(JSON.stringify({ error: "Missing upload fields" }), { status: 400 });
    }

    // ----- ENV VARS (double-check these exist in prod) -----
    // Prefer a single canonical name; keep both to avoid mismatch
    const bucket = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET;
    const region = process.env.AWS_REGION;

    if (!bucket || !region || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return new Response(JSON.stringify({
        error: "Server is missing required AWS env vars (bucket/region/credentials).",
        hint: "Set AWS_S3_BUCKET (or S3_BUCKET), AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY in your hosting dashboard."
      }), { status: 500 });
    }

    // Build S3 client
    const s3 = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    const key = folderPath
      ? `${folderPath}/${Date.now()}_${fileName}`
      : `incidentReport/${incidentType}/${step}/${category}/${Date.now()}_${fileName}`;

    const body = base64ToBuffer(base64);

    // If you truly need public reads and your bucket policy allows it,
    // uncomment ACL line AND ensure "Block Public Access" isn't blocking it:
    const put = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: fileType,
      // ACL: "public-read",
    });

    const result = await s3.send(put);

    const url = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`;

    return new Response(JSON.stringify({
      ok: true,
      url,
      key,
      etag: result.ETag,
      httpStatusCode: result.$metadata?.httpStatusCode,
      requestId: result.$metadata?.requestId,
    }), { status: 200 });

  } catch (err) {
    // Log rich details for prod debugging (visible in server logs)
    console.error("S3 Upload Error", {
      name: err?.name,
      message: err?.message,
      code: err?.$metadata?.httpStatusCode,
      requestId: err?.$metadata?.requestId,
      stack: err?.stack,
    });

    return new Response(JSON.stringify({
      error: err?.message || "Unknown error",
      detail: {
        name: err?.name,
        httpStatusCode: err?.$metadata?.httpStatusCode,
        requestId: err?.$metadata?.requestId,
      },
    }), { status: 500 });
  }
}
