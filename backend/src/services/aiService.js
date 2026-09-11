const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const runProductDetection = (imageBase64) => {
  return new Promise((resolve, reject) => {
    try {
      const buffer = Buffer.from(imageBase64.split(',').pop(), 'base64');
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snapshop-'));
      const imagePath = path.join(tmpDir, 'upload.jpg');
      fs.writeFileSync(imagePath, buffer);

      const scriptPath = process.env.AI_DETECT_SCRIPT_PATH ||
        path.join(__dirname, '../../../ai-module/detect_product.py');

      const pythonBin = process.env.PYTHON_BIN || 'python3';
      const py = spawn(pythonBin, [scriptPath, '--image', imagePath]);

      let stdout = '';
      let stderr = '';

      py.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      py.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      py.on('error', (err) => {
        console.error('Failed to start AI process', err);
        try {
          fs.unlinkSync(imagePath);
        } catch (e) {
          // ignore
        }
        reject(new Error('AI process failed to start. Check PYTHON_BIN and Python installation.'));
      });

      py.on('close', (code) => {
        try {
          fs.unlinkSync(imagePath);
        } catch (e) {
          // ignore
        }

        try {
          if (code !== 0) {
            console.error('AI module error', stderr || stdout);
            return reject(new Error('AI module failed'));
          }

          // YOLOv8 may print logging lines before the final JSON.
          // Try to parse the last line that looks like JSON.
          const trimmed = stdout.trim();
          const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
          const jsonLine =
            [...lines]
              .reverse()
              .find((line) => line.startsWith('{') && line.endsWith('}')) || trimmed;

          const parsed = JSON.parse(jsonLine);
          resolve(parsed);
        } catch (err) {
          console.error('Failed to parse AI output', err, stdout);
          reject(new Error('Invalid AI response'));
        }
      });
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  runProductDetection
};

