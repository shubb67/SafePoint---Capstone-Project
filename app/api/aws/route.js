import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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
      fileName = form.get("fileName");
      fileType = form.get("fileType");
      incidentType = form.get("incidentType");
      category = form.get("category");
      step = form.get("step");
      folderPath = form.get("folderPath");
      const arr = await file.arrayBuffer();
      buffer = Buffer.from(arr);
    } else {
      // JSON path (base64)
      const body = await req.json();
      ({ fileName, fileType, base64: body.base64, incidentType, category, step, folderPath } = body);
      buffer = toBufferFromMaybeDataUrl(body.base64);
    }

    // Validate
    if (
      !fileName || !fileType || !buffer ||
      (!folderPath && (!incidentType || !category || !step))
    ) {
      return new Response(JSON.stringify({ error: "Missing upload fields" }), { status: 400 });
    }

    // ENV: support either name in prod
    const bucket = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET;
    const region = process.env.AWS_REGION;
    const key = folderPath
      ? `${folderPath}/${Date.now()}_${fileName}`
      : `incidentReport/${incidentType}/${step}/${category}/${Date.now()}_${fileName}`;

    if (!bucket || !region || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return new Response(JSON.stringify({
        error: "Missing AWS server env vars.",
        missing: {
          AWS_S3_BUCKET_or_S3_BUCKET: !bucket,
          AWS_REGION: !region,
          AWS_ACCESS_KEY_ID: !process.env.AWS_ACCESS_KEY_ID,
          AWS_SECRET_ACCESS_KEY: !process.env.AWS_SECRET_ACCESS_KEY
        }
      }), { status: 500 });
    }

    const s3 = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    });

    const put = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: fileType,
      // ACL: "public-read", // only if you need public objects and bucket allows it
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
