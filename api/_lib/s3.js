import crypto from "node:crypto";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const UPLOAD_URL_TTL_SECONDS = 5 * 60;

const getS3Config = () => {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION;
  const bucket = process.env.S3_BUCKET_NAME;

  if (!accessKeyId || !secretAccessKey || !region || !bucket) {
    const error = new Error("AWS S3 storage is not configured");
    error.code = "S3_CONFIG_MISSING";
    throw error;
  }

  return { accessKeyId, secretAccessKey, region, bucket };
};

const getClient = () => {
  const { accessKeyId, secretAccessKey, region } = getS3Config();

  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
};

export const buildPhotoKey = (profileId, fileName) => {
  const safeName = String(fileName || "photo")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-80);

  return `gallery/${profileId}/${crypto.randomUUID()}-${safeName}`;
};

export const createUploadUrl = async (key, contentType) => {
  const { bucket } = getS3Config();
  const client = getClient();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn: UPLOAD_URL_TTL_SECONDS });
};

export const deleteObject = async (key) => {
  const { bucket } = getS3Config();
  const client = getClient();

  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
};

export const publicUrlFor = (key) => {
  const { region, bucket } = getS3Config();

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

export const handleS3Error = (error, response) => {
  console.error(error);

  if (error.code === "S3_CONFIG_MISSING") {
    return response.status(500).json({
      error: "Photo storage is not configured in Vercel yet.",
      code: "S3_CONFIG_MISSING",
    });
  }

  return response.status(500).json({ error: "Something went wrong while handling photo storage." });
};
