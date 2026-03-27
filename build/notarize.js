/**
 * electron-builder afterSign hook.
 * When no signing identity is configured, removes the broken adhoc signature
 * that Electron embeds by default — prevents macOS "app is damaged" error.
 */
const { execFileSync } = require('child_process')
const path = require('path')

exports.default = async function afterSign(context) {
  const { electronPlatformName, appOutDir, packager } = context
  if (electronPlatformName !== 'darwin') return

  const appName = packager.appInfo.productFilename
  const appPath = path.join(appOutDir, `${appName}.app`)
  const binaryPath = path.join(appPath, 'Contents', 'MacOS', appName)

  try {
    execFileSync('codesign', ['--remove-signature', binaryPath], { stdio: 'pipe' })
    execFileSync('codesign', ['--remove-signature', appPath], { stdio: 'pipe' })
    console.log(`  • removed adhoc signature from ${appName}.app`)
  } catch {
    // Ignore — no signature to remove, or codesign not available
  }
}
