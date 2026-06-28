/**
 * Fingerprint Bridge Service
 * Connects USB fingerprint scanners (ZKTeco / DigitalPersona compatible) to the HR web app.
 *
 * With ZKFinger SDK installed, set ZKFINGER_SDK_PATH to the SDK bin folder.
 * With DigitalPersona Agent running, templates from @digitalpersona/websdk are verified here.
 */
import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.FP_BRIDGE_PORT || 9876;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

let deviceStatus = 'simulation';
let lastCapture = null;

function parseTemplate(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return { template: raw, id: raw.slice(0, 16) };
  }
}

function templateFingerprint(template) {
  const t = typeof template === 'string' ? template : JSON.stringify(template);
  return crypto.createHash('sha256').update(t).digest('hex');
}

function verifyTemplates(stored, scanned) {
  const s = parseTemplate(stored);
  const c = parseTemplate(scanned);
  if (!s || !c) return false;

  if (s.template && c.template && s.template === c.template) return true;
  if (s.id && c.id && s.id === c.id) return true;
  if (typeof stored === 'string' && stored === scanned) return true;

  return templateFingerprint(s) === templateFingerprint(c);
}

async function captureFromHardware() {
  const sdkPath = process.env.ZKFINGER_SDK_PATH;
  const captureExe = sdkPath ? path.join(sdkPath, 'zkfp_capture.exe') : null;

  if (captureExe && fs.existsSync(captureExe)) {
    return new Promise((resolve, reject) => {
      const proc = spawn(captureExe, [], { timeout: 15000 });
      let out = '';
      proc.stdout.on('data', d => { out += d.toString(); });
      proc.on('close', code => {
        if (code === 0 && out.trim()) {
          deviceStatus = 'zkfinger';
          const template = out.trim();
          resolve({
            id: `FP-${template.slice(0, 8).toUpperCase()}`,
            template,
            source: 'zkfinger',
            enrolledAt: new Date().toISOString(),
          });
        } else {
          reject(new Error('ZKFinger capture failed'));
        }
      });
      proc.on('error', reject);
    });
  }

  deviceStatus = 'simulation';
  const template = crypto.randomBytes(32).toString('base64');
  return {
    id: `FP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    template,
    source: 'simulation',
    enrolledAt: new Date().toISOString(),
  };
}

app.get('/status', (_req, res) => {
  res.json({
    ok: true,
    device: deviceStatus,
    port: PORT,
    message: deviceStatus === 'simulation'
      ? 'No hardware SDK detected. Install ZKFinger SDK or use DigitalPersona WebSDK in browser.'
      : 'Hardware scanner connected',
  });
});

app.post('/capture', async (_req, res) => {
  try {
    const fp = await captureFromHardware();
    lastCapture = fp;
    res.json({ success: true, fingerprint: fp });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/verify', (req, res) => {
  const { stored, scanned } = req.body;
  const match = verifyTemplates(stored, scanned);
  res.json({ match, device: deviceStatus });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Fingerprint bridge running at http://127.0.0.1:${PORT}`);
});
