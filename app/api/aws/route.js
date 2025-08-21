// app/api/aws/route.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// ---------- HARD-CODE TEST VALUES (TEMPORARY!) ----------
const AWS_REGION           = "us-east-2";            // e.g., "us-east-1"
const AWS_S3_BUCKET        = "safepoint-sait";       // e.g., "safepoint-sait"
const AWS_ACCESS_KEY_ID    = "AKIAVW66666666666666";
const AWS_SECRET_ACCESS_KEY= "abHqNOQEe3KcMvtcJvo0jNMoyjl4y7NVvVl21vVc";
// const USE_PUBLIC_READ   = false; // set to true ONLY if bucket policy allows and BPA is off
// --------------------------------------------------------

// Force Node runtime (Buffer/AWS SDK need this in prod)
export const runtime = "nodejs";

// Increase if you may send >10MB (base64 adds ~33% bloat)
export const config = { api: { bodyParser: { sizeLimit: "20mb" } } };

function toBufferFromMaybeDataUrl(input) {
  if (!input) return null;
  const i = input.indexOf(",");
  const raw = i >= 0 ? input.slice(i + 1) : input;
  return Buffer.from(raw, "base64");
}

export async function POST(req) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let fileName, fileType, incidentType, category, step, folderPath, buffer;

    if (contentType.startsWith("multipart/form-data")) {
      // FormData path (no base64 bloat)
      const form = await req.formData();
      const file = form.get("file");
      fileName    = form.get("fileName");
      fileType    = form.get("fileType");
      incidentType= form.get("incidentType");
      category    = form.get("category");
      step        = form.get("step");
      folderPath  = form.get("folderPath");
      const arr   = await file.arrayBuffer();
      buffer      = Buffer.from(arr);
    } else {
      // JSON path (base64)
      const body = await req.json();
      ({ fileName, fileType, incidentType, category, step, folderPath } = body);
      buffer = toBufferFromMaybeDataUrl(body.base64);
    }

    // Validate inputs
    if (
      !fileName || !fileType || !buffer ||
      (!folderPath && (!incidentType || !category || !step))
    ) {
      return new Response(JSON.stringify({ error: "Missing upload fields" }), { status: 400 });
    }

    // Build S3 client from hardcoded values
    const s3 = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });

    const key = folderPath
      ? `${folderPath}/${Date.now()}_${fileName}`
      : `incidentReport/${incidentType}/${step}/${category}/${Date.now()}_${fileName}`;

    const put = new PutObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: fileType,
      // ACL: USE_PUBLIC_READ ? "public-read" : undefined,
    });

    const result = await s3.send(put);

    const url = `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${encodeURIComponent(key)}`;
    return new Response(JSON.stringify({
      ok: true,
      url,
      key,
      etag: result.ETag,
      httpStatusCode: result.$metadata?.httpStatusCode,
      requestId: result.$metadata?.requestId,
    }), { status: 200 });

  } catch (err) {
    console.error("S3 Upload Error", {
      name: err?.name,
      message: err?.message,
      httpStatusCode: err?.$metadata?.httpStatusCode,
      requestId: err?.$metadata?.requestId,
      stack: err?.stack,
    });
    return new Response(JSON.stringify({
      error: err?.message || "Unknown server error",
      detail: {
        name: err?.name,
        httpStatusCode: err?.$metadata?.httpStatusCode,
        requestId: err?.$metadata?.requestId,
      }
    }), { status: 500 });
  }
}
