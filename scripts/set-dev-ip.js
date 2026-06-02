const { execSync } = require('child_process');
const { writeFileSync } = require('fs');
const { join } = require('path');

// Set up adb reverse tunnels for all connected devices
try {
  const devices = execSync('adb devices').toString()
    .split('\n')
    .slice(1)
    .filter(line => line.includes('\tdevice'))
    .map(line => line.split('\t')[0]);

  if (devices.length > 0) {
    devices.forEach(serial => {
      execSync(`adb -s ${serial} reverse tcp:8081 tcp:8081`);
      execSync(`adb -s ${serial} reverse tcp:5001 tcp:5001`);
      console.log(`✅ adb reverse set for device ${serial}`);
    });
    // Use localhost since adb reverse tunnels traffic through USB
    writeFileSync(join(__dirname, '../src/config/devIp.ts'), `export const DEV_IP = 'localhost';\n`);
    console.log('✅ DEV_IP set to localhost (via adb reverse)');
  } else {
    throw new Error('No ADB devices');
  }
} catch {
  // Fallback: no USB device, use Mac's local IP for Wi-Fi
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  let ip = null;
  for (const iface of Object.values(nets)) {
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) { ip = net.address; break; }
    }
    if (ip) break;
  }
  if (!ip) { console.error('❌ Could not detect local IP'); process.exit(1); }
  writeFileSync(join(__dirname, '../src/config/devIp.ts'), `export const DEV_IP = '${ip}';\n`);
  console.log(`✅ DEV_IP set to ${ip} (Wi-Fi fallback)`);
}
