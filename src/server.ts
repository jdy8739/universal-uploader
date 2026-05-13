import express from 'express';
import cors from 'cors';

const app = express();
const port = 3000;

app.use(cors());

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
      size: receivedBytes,
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
