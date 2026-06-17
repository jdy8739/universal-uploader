import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import cors from 'cors';
import express from 'express';

const app = express();
const port = 3000;
const failTwiceCounter = new Map<string, number>();

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(os.homedir(), 'Desktop');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log(`[INFO] Created upload directory: ${UPLOAD_DIR}`);
}

app.use(cors());

/**
 * Reads bytes from the request and ensures they are fully written to the file.
 * Handles backpressure for memory efficiency.
 */
const readRequestBytes = (
  req: express.Request,
  writeStream?: fs.WriteStream,
): Promise<number> =>
  new Promise((resolve, reject) => {
    let receivedBytes = 0;

    req.on('data', (chunk) => {
      receivedBytes += chunk.length;
      
      if (writeStream) {
        // Handle backpressure: if internal buffer is full, pause the request stream
        const canWrite = writeStream.write(chunk);
        if (!canWrite) {
          req.pause();
          writeStream.once('drain', () => req.resume());
        }
      }

      if (receivedBytes % (1024 * 1024) < chunk.length) {
        console.log(
          `Server received: ${Math.round(receivedBytes / 1024 / 1024)} MB`,
        );
      }
    });

    req.on('end', () => {
      if (writeStream) {
        writeStream.end();
        writeStream.on('finish', () => resolve(receivedBytes));
        writeStream.on('error', (err) => reject(err));
      } else {
        resolve(receivedBytes);
      }
    });

    req.on('error', (err) => {
      if (writeStream) writeStream.destroy();
      reject(err);
    });
  });
/**
 * Gets a consistent filename based on headers and creates a write stream.
 */
const getFileWriteStream = (req: express.Request) => {
  const originalName = decodeURIComponent(
    req.header('x-file-name') || 'upload.bin',
  );
  const testKey = req.header('x-test-key');
  const chunkIndex = parseInt(req.header('X-Chunk-Index') || '-1', 10);

  // Use the original filename directly.
  const filename = originalName;
  const saveDir = UPLOAD_DIR;
  const filePath = path.join(saveDir, filename);

  // 'w' for chunk 0 or single uploads, 'a' for subsequent chunks (resumption)
  const flags = chunkIndex <= 0 ? 'w' : 'a';

  if (chunkIndex <= 0) {
    console.log(`[FILE] Creating file: ${filename}`);
  }

  return fs.createWriteStream(filePath, { flags });
  };
app.post('/upload', async (req, res) => {
  console.log('[POST] /upload');

  try {
    const writeStream = getFileWriteStream(req);
    const receivedBytes = await readRequestBytes(req, writeStream);
    console.log(`[SUCCESS] Upload complete. Total: ${receivedBytes} bytes`);

    res.status(200).json({
      message: 'Upload successful',
      size: receivedBytes,
    });
  } catch (err) {
    console.error('[ERROR] /upload:', err);
    res.status(500).json({ message: 'Upload failed' });
  }
});

app.post('/upload/fail-always', async (req, res) => {
  console.log('[POST] /upload/fail-always');
  try {
    await readRequestBytes(req);
    res.status(500).json({ message: 'Intentional failure' });
  } catch (err) {
    res.status(500).json({ message: 'Upload failed' });
  }
});

app.post('/upload/fail-twice-then-success', async (req, res) => {
  const testKey = req.header('x-test-key') || 'default';
  const attempt = (failTwiceCounter.get(testKey) ?? 0) + 1;
  failTwiceCounter.set(testKey, attempt);

  console.log(`[POST] /fail-twice-then-success: attempt=${attempt}`);

  try {
    const writeStream = attempt > 2 ? getFileWriteStream(req) : undefined;
    const receivedBytes = await readRequestBytes(req, writeStream);

    if (attempt <= 2) {
      res.status(500).json({ message: `Failure ${attempt}/2`, size: receivedBytes });
      return;
    }

    failTwiceCounter.set(testKey, 0);
    res.status(200).json({ message: 'Recovered', size: receivedBytes, attempt });
  } catch (err) {
    res.status(500).json({ message: 'Upload failed' });
  }
});

app.post('/upload/fail-at-chunk-3', async (req, res) => {
  const testKey = req.header('x-test-key') || 'default';
  const chunkIndex = req.header('X-Chunk-Index') || 'none';
  const attempt = (failTwiceCounter.get(testKey) ?? 0) + 1;
  failTwiceCounter.set(testKey, attempt);

  console.log(`[POST] /fail-at-chunk-3: attempt=${attempt}, chunkIndex=${chunkIndex}`);

  try {
    const writeStream = attempt !== 3 ? getFileWriteStream(req) : undefined;
    const receivedBytes = await readRequestBytes(req, writeStream);

    if (attempt === 3) {
      res.status(500).json({ message: 'Failure on 3rd attempt', size: receivedBytes });
      return;
    }

    if (attempt > 3) failTwiceCounter.set(testKey, 0);
    res.status(200).json({ message: 'Successful', size: receivedBytes, attempt });
  } catch (err) {
    res.status(500).json({ message: 'Upload failed' });
  }
});

app.post('/upload/reset-test-counters', (_req, res) => {
  failTwiceCounter.clear();
  res.status(200).json({ message: 'Test counters reset' });
});

export { app };

app.listen(port, () => {
  console.log(`Test server running at http://localhost:${port}`);
  console.log(`Uploads will be saved to: ${UPLOAD_DIR}`);
});

process.on('SIGINT', () => {
  console.log('Server shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Server shutting down...');
  process.exit(0);
});
