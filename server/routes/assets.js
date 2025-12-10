import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Dev storage: local /uploads; in production use S3 when configured
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

async function uploadToS3(buffer, filename, mimetype) {
  // Dynamically import AWS SDK only when needed to avoid hard dependency in dev
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const region = process.env.S3_REGION;
  const bucket = process.env.S3_BUCKET;
  if (!region || !bucket) throw new Error('S3 region or bucket not configured');

  const client = new S3Client({ region });
  const key = filename;
  const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: mimetype });
  await client.send(cmd);
  // Optionally support a CDN_HOST env var to return full URL
  const host = process.env.S3_CDN_HOST || `https://${bucket}.s3.${region}.amazonaws.com`;
  return `${host}/${key}`;
}

// POST /api/assets/upload - returns { url }
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'no file' });

    // If S3 is configured, upload to S3 and return the CDN URL
    if (process.env.S3_BUCKET && process.env.S3_REGION) {
      try {
        const buffer = fs.readFileSync(file.path);
        const url = await uploadToS3(buffer, file.filename, file.mimetype);
        // Remove local file after upload
        try { fs.unlinkSync(file.path); } catch (e) { /* ignore */ }
        return res.json({ url });
      } catch (s3err) {
        console.error('[ASSETS] S3 upload failed', s3err);
        // Fall back to local URL
      }
    }

    // Dev fallback: return local uploads URL
    const url = `/uploads/${file.filename}`;
    return res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'upload failed' });
  }
});

export default router;
