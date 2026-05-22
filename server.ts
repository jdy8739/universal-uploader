import process from 'node:process';
import { pathToFileURL } from 'node:url';

import cors from 'cors';
import express from 'express';

const app = express();
const port = 3000;
const failTwiceCounter = new Map<string, number>();

app.use(cors());

const readRequestBytes = (req: express.Request): Promise<number> =>
  new Promise((resolve, reject) => {
    let receivedBytes = 0;

    req.on('data', (chunk) => {
      receivedBytes += chunk.length;
      // Log progress every ~1MB to avoid flooding the console
      if (receivedBytes % (1024 * 1024) < chunk.length) {
        console.log(`Server received: ${Math.round(receivedBytes / 1024 / 1024)} MB`);
      }
    });

    req.on('end', () => {
      resolve(receivedBytes);
    });

    req.on('error', (err) => {
      reject(err);
    });
  });

app.post('/upload', async (req, res) => {
  console.log('Upload request received');

  try {
    const receivedBytes = await readRequestBytes(req);
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
  console.log('Intentional failure endpoint hit: /upload/fail-always');

  try {
    const receivedBytes = await readRequestBytes(req);
    console.log(`Intentional failure after receiving bytes: ${receivedBytes}`);
    res.status(500).json({ message: 'Intentional failure for onError/throwOnError testing' });
  } catch (err) {
    console.error('Server error during fail-always upload:', err);
    res.status(500).json({ message: 'Upload failed at fail-always controller' });
  }
});

app.post('/upload/fail-twice-then-success', async (req, res) => {
  const testKey = req.header('x-test-key') || 'default';
  const attempt = (failTwiceCounter.get(testKey) ?? 0) + 1;
  failTwiceCounter.set(testKey, attempt);

  console.log(`[SERVER] /fail-twice-then-success: key=${testKey}, attempt=${attempt}`);

  try {
    const receivedBytes = await readRequestBytes(req);

    if (attempt <= 2) {
      res.status(500).json({
        message: `Intentional failure ${attempt}/2 for retry testing`,
        size: receivedBytes,
      });
      return;
    }

    failTwiceCounter.set(testKey, 0);

    res.status(200).json({
      message: 'Recovered after intentional retries',
      size: receivedBytes,
      attempt,
    });
  } catch (err) {
    console.error('Server error during fail-twice upload:', err);
    res.status(500).json({ message: 'Upload failed at fail-twice controller' });
  }
});

app.post('/upload/reset-test-counters', (_req, res) => {
  failTwiceCounter.clear();
  res.status(200).json({ message: 'Test counters reset' });
});

export { app };

// Start the server
app.listen(port, () => {
  console.log(`Test server running at http://localhost:${port}`);
});

// Ensure the process doesn't exit prematurely
process.on('SIGINT', () => {
  console.log('Server shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Server shutting down...');
  process.exit(0);
});

