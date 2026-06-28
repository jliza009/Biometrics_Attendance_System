/**
 * Fingerprint Scanner — uses the local fingerprint-bridge service (http://127.0.0.1:9876)
 *
 * The bridge communicates with a USB fingerprint reader (ZKTeco/DigitalPersona).
 * If no hardware SDK is installed it returns a simulation template for testing.
 *
 * Start the bridge with:  npm run dev:fp   (in a separate terminal)
 */

const BRIDGE_URL = 'http://127.0.0.1:9876';
const CAPTURE_TIMEOUT_MS = 20_000; // 20 seconds for user to place finger

/**
 * Check if the fingerprint bridge is running and what device is connected.
 */
export async function getScannerStatus() {
  try {
    const res = await fetch(`${BRIDGE_URL}/status`, {
      signal: AbortSignal.timeout(2000),
    });
    const data = await res.json();
    return {
      available: data.ok,
      mode: data.device,      // 'zkfinger' | 'simulation'
      message: data.message,
    };
  } catch {
    return {
      available: false,
      mode: 'offline',
      message: 'Fingerprint bridge is not running. Open a new terminal and run: npm run dev:fp',
    };
  }
}

/**
 * Capture a NEW fingerprint for enrollment (Add Employee flow).
 * Calls the bridge /capture endpoint which triggers the USB scanner.
 * Returns a fingerprint template object to store in the database.
 */

async function trySecuGenCapture() {
  try {
    const res = await fetch('https://localhost:8443/SGIFPCapture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'licstr=&req=2&seclvl=5&timeout=15000',
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json();
    if (data && data.ErrorCode === 0 && data.TemplateBase64) {
      return {
        id: `SG-${data.SerialNumber || Math.floor(Math.random() * 10000)}`,
        template: data.TemplateBase64,
        source: 'secugen',
        enrolledAt: new Date().toISOString()
      };
    }
    if (data && data.ErrorCode !== 0) {
      console.warn('SecuGen capture error:', data.ErrorCode);
    }
  } catch (e) {
    // Fallback if SecuGen service is not running
  }
  return null;
}

async function trySecuGenMatch(template1, template2) {
  try {
    const res = await fetch('https://localhost:8443/SGIFPMatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `template1=${encodeURIComponent(template1)}&template2=${encodeURIComponent(template2)}&licstr=&seclvl=5`,
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (data && data.ErrorCode === 0) {
      return data.MatchingScore > 100; // SecuGen score scale
    }
  } catch (e) {
    console.warn('SecuGen match error:', e);
  }
  return false;
}

export async function captureFingerprint(employeeInfo = {}) {
  // 1. Try SecuGen WebAPI (Primary Hardware)
  const sgFp = await trySecuGenCapture();
  if (sgFp) return sgFp;

  // Try WebAuthn (in-built scanner like Windows Hello / Touch ID) first
  if (window.PublicKeyCredential) {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "HR Attendance System" },
          user: {
            id: userId,
            name: employeeInfo.email || "employee@company.com",
            displayName: employeeInfo.name || "Employee"
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
          authenticatorSelection: {
            authenticatorAttachment: "platform", // forces built-in scanner
            userVerification: "required"
          },
          timeout: 60000,
          attestation: "none"
        }
      });

      const rawId = Array.from(new Uint8Array(credential.rawId));
      return {
        id: credential.id,
        template: JSON.stringify({ id: credential.id, rawId }),
        source: 'webauthn',
        enrolledAt: new Date().toISOString(),
      };
    } catch (err) {
      console.warn('WebAuthn failed or cancelled. Falling back to bridge.', err);
    }
  }

  let res;
  try {
    res = await fetch(`${BRIDGE_URL}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee: employeeInfo }),
      signal: AbortSignal.timeout(CAPTURE_TIMEOUT_MS),
    });
  } catch (err) {
    if (err.name === 'TimeoutError') {
      throw new Error('Fingerprint scan timed out. Please place your finger on the scanner and try again.');
    }
    throw new Error(
      'Cannot reach the fingerprint bridge. ' +
      'Open a new terminal in the project folder and run: npm run dev:fp'
    );
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || 'Fingerprint capture failed. Please try again.');
  }

  return {
    id: data.fingerprint.id,
    template: data.fingerprint.template,
    source: data.fingerprint.source,
    enrolledAt: data.fingerprint.enrolledAt || new Date().toISOString(),
  };
}

/**
 * Verify an employee's live fingerprint against the stored template.
 * Step 1: Capture live scan via bridge /capture
 * Step 2: Send both to bridge /verify for comparison
 * Used at clock-in / clock-out.
 */
export async function verifyAgainstStored(storedFingerprint) {
  if (!storedFingerprint) {
    return { success: false, message: 'No fingerprint enrolled for this employee. Contact HR administrator.' };
  }

  const fpObj = typeof storedFingerprint === 'string' ? JSON.parse(storedFingerprint) : storedFingerprint;

  // SecuGen verification
  if (fpObj.source === 'secugen') {
    const sgFp = await trySecuGenCapture();
    if (!sgFp) {
      return { success: false, message: 'Could not connect to SecuGen scanner. Make sure SecuGen WebAPI is running.' };
    }
    const isMatch = await trySecuGenMatch(fpObj.template, sgFp.template);
    return {
      success: isMatch,
      template: sgFp,
      message: isMatch ? 'Biometric verification successful' : 'Fingerprint does not match. Please try again.',
    };
  }

  // WebAuthn verification
  if (fpObj.source === 'webauthn') {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const credentialData = JSON.parse(fpObj.template);
      const allowCredentials = [{
        id: new Uint8Array(credentialData.rawId),
        type: 'public-key'
      }];

      await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials,
          userVerification: 'required'
        }
      });
      return { success: true, message: 'Biometric verification successful', template: fpObj };
    } catch (err) {
      return { success: false, message: 'Fingerprint does not match or was cancelled.' };
    }
  }

  // Step 1: Capture the live fingerprint scan
  let captured;
  try {
    const capRes = await fetch(`${BRIDGE_URL}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(CAPTURE_TIMEOUT_MS),
    });
    const capData = await capRes.json();
    if (!capData.success) {
      return { success: false, message: capData.message || 'Could not capture fingerprint from scanner.' };
    }
    captured = capData.fingerprint;
  } catch (err) {
    if (err.name === 'TimeoutError') {
      return { success: false, message: 'Scan timed out. Place your finger firmly on the scanner.' };
    }
    return {
      success: false,
      message: 'Fingerprint bridge is not running. Start it with: npm run dev:fp',
    };
  }

  // Step 2: Verify scanned vs stored template
  try {
    const verRes = await fetch(`${BRIDGE_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stored: storedFingerprint,
        scanned: captured,
      }),
      signal: AbortSignal.timeout(5000),
    });
    const verData = await verRes.json();
    return {
      success: verData.match,
      template: captured,
      message: verData.match ? 'Fingerprint verified' : 'Fingerprint does not match. Please try again.',
    };
  } catch {
    return { success: false, message: 'Verification request failed. Check that the bridge is running.' };
  }
}

/** Helper to extract the storable template from a fingerprint object */
export function getTemplateForVerify(fingerprint) {
  if (!fingerprint) return null;
  if (typeof fingerprint === 'string') return fingerprint;
  return fingerprint;   // pass the full object to /verify — bridge handles both
}
