import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import cors from 'cors';
import express from 'express';

const app = express();
const port = 3000;
const failTwiceCounter = new Map<string, number>();

const DESKTOP_PATH = path.join(os.homedir(), 'Desktop');

app.use(cors());

/**
 * Reads bytes from the request and ensures they are fully written to the file.
 * 요청으로부터 바이트를 읽고 파일에 완전히 기록되는지 확인합니다.
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
        writeStream.write(chunk);
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
        // Wait for the file to be fully flushed to disk
        writeStream.on('finish', () => resolve(receivedBytes));
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
  const testKey = req.header('x-test-key') || 'upload';
  const originalName = decodeURIComponent(
    req.header('x-file-name') || 'file.bin',
  );
  const chunkIndex = parseInt(req.header('X-Chunk-Index') || '-1', 10);
  
  // Create a safe filename that keeps the original extension
  const ext = path.extname(originalName);
  const filename = `usu_${testKey}${ext}`;
  const filePath = path.join(DESKTOP_PATH, filename);

  const flags = chunkIndex <= 0 ? 'w' : 'a';
  return fs.createWriteStream(filePath, { flags });
};

app.post('/upload', async (req, res) => {
  console.log('Upload request received');

  try {
    const writeStream = getFileWriteStream(req);
    const receivedBytes = await readRequestBytes(req, writeStream);
    console.log(`Upload complete. Total bytes: ${receivedBytes}`);

    res.status(200).json({
      message: 'Upload successful',
      size: receivedBytes,
    });
  } catch (err) {
    console.error('Server error during upload:', err);
    res.status(500).json({ message: 'Upload failed' });
  }
});

app.post('/upload/fail-always', async (req, res) => {
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
  const attempt = (failTwiceCounter.get(testKey) ?? 0) + 1;
  failTwiceCounter.set(testKey, attempt);

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
});

process.on('SIGINT', () => {
  console.log('Server shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Server shutting down...');
  process.exit(0);
});
