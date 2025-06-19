// app/api/aws/route.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};

export async function POST(req) {
  const {
    fileName,
    fileType,
    base64,
    incidentType,
    category,    // “evidence” or “voiceNotes”
    step,        // e.g. "incident-details" or "impact-info"
    folderPath,  // OPTIONAL: e.g. "users/abcd1234/profile/images"
  } = await req.json();

  // you must have fileName, fileType, base64, and either folderPath OR all three of incidentType/category/step
  if (
    !fileName ||
    !fileType ||
    !base64 ||
    (
      !folderPath &&
      (!incidentType || !category || !step)
    )
  ) {
    return new Response(
      JSON.stringify({ error: "Missing upload fields" }),
      { status: 400 }
    );
  }

  // strip data URL prefix then to Buffer
  const buffer = Buffer.from(base64.split(",")[1], "base64");

  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  // choose key based on folderPath override or existing incident logic
  const Key = folderPath
    ? `${folderPath}/${Date.now()}_${fileName}`
    : `incidentReport/${incidentType}/${step}/${category}/${Date.now()}_${fileName}`;

  await s3.send(
    new PutObjectCommand({
      Bucket:      process.env.AWS_S3_BUCKET,
      Key,
      Body:        buffer,
      ContentType: fileType,
    })
  );

  const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${Key}`;
  return new Response(JSON.stringify({ url }), { status: 200 });
}
