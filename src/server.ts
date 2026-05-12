import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

app.use(cors());

// Configure multer for memory storage or disk storage for testing
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post('/upload', (req, res) => {
  console.log('Upload request received');
  
  let receivedBytes = 0;
  
  req.on('data', (chunk) => {
    receivedBytes += chunk.length;
    // Log progress every ~1MB to avoid flooding the console
    if (receivedBytes % (1024 * 1024) < chunk.length) {
      console.log(`Server received: ${Math.round(receivedBytes / 1024 / 1024)} MB`);
    }
  });

  req.on('end', () => {
    console.log(`Upload complete. Total bytes: ${receivedBytes}`);
    res.status(200).json({
      message: 'Upload successful',
      size: receivedBytes
    });
  });

  req.on('error', (err) => {
    console.error('Server error during upload:', err);
    res.status(500).send('Upload failed');
  });
});

app.listen(port, () => {
  console.log(`Test server running at http://localhost:${port}`);
});
