// APEX — validates and (re)creates the Capacitor Android project, then syncs web assets + plugins.
//
// Fixes the historical failures:
//   • "The Capacitor CLI needs to run at the root of an npm package"  → always runs from the project root
//   • "Missing appId for new platform"                                → validates capacitor.config.json first
//   • "Could not read script capacitor.settings.gradle"               → detects a half-generated android/ folder,
//                                                                       moves it aside (never deletes) and re-adds it
//   • SDK path errors in android/local.properties                     → detects/repairs sdk.dir
//   • native plugin not linked                                        → verifies the generated settings file
//
// Usage:  node scripts/ensure-android.mjs
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)

const isWin = process.platform === 'win32'
const npx = isWin ? 'npx.cmd' : 'npx'
const log = (message) => console.log(`[APEX] ${message}`)
const warn = (message) => console.warn(`[APEX] WARNING: ${message}`)
const fail = (message) => { console.error(`\n[APEX] ERROR: ${message}\n`); process.exit(1) }

function run(cmd, args, cwd = ROOT) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: isWin, cwd })
  if (result.status !== 0) fail(`"${cmd} ${args.join(' ')}" failed (exit ${result.status ?? 'signal'}).`)
}

// 1) Must be an npm package root with the Capacitor packages installed.
if (!existsSync(join(ROOT, 'package.json'))) fail('package.json not found at the project root.')
for (const pkg of ['@capacitor/core', '@capacitor/cli', '@capacitor/android', '@apex/nexus-native']) {
  if (!existsSync(join(ROOT, 'node_modules', ...pkg.split('/')))) fail(`${pkg} is not installed. Run "npm install" in ${ROOT} first.`)
}

// 2) Capacitor config must be valid before "cap add" (that is what raised "Missing appId").
const configPath = join(ROOT, 'capacitor.config.json')
if (!existsSync(configPath)) fail('capacitor.config.json is missing.')
let config
try { config = JSON.parse(readFileSync(configPath, 'utf8')) } catch (error) { fail(`capacitor.config.json is not valid JSON: ${error.message}`) }
if (!/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(config.appId || '')) fail(`capacitor.config.json appId "${config.appId}" is not a valid Android application id.`)
if (!config.appName) fail('capacitor.config.json appName is missing.')
const webDir = join(ROOT, config.webDir || 'dist')
if (!existsSync(join(webDir, 'index.html'))) fail(`Web build not found at ${webDir}. Run "npm run build" first.`)

// 3) android/ must be complete, otherwise move it aside and generate a fresh one.
const androidDir = join(ROOT, 'android')
const REQUIRED = [
  'settings.gradle', 'build.gradle', 'variables.gradle', 'gradlew', 'gradlew.bat',
  join('gradle', 'wrapper', 'gradle-wrapper.jar'),
  join('app', 'build.gradle'),
  join('app', 'src', 'main', 'AndroidManifest.xml'),
]
if (existsSync(androidDir)) {
  const missing = REQUIRED.filter((file) => !existsSync(join(androidDir, file)))
  if (missing.length) {
    const backup = `${androidDir}.incomplete-${Date.now()}`
    warn(`android/ is incomplete (missing: ${missing.join(', ')}). Moving it to ${backup} and regenerating.`)
    renameSync(androidDir, backup)
  }
}
if (!existsSync(androidDir)) {
  log('Creating the Android project (npx cap add android)…')
  run(npx, ['cap', 'add', 'android'])
}

// 4) Android SDK location.
const sdkCandidates = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
  join(homedir(), 'Library', 'Android', 'sdk'),
  join(homedir(), 'Android', 'Sdk'),
].filter(Boolean)
const sdk = sdkCandidates.find((dir) => existsSync(join(dir, 'platforms')) || existsSync(join(dir, 'platform-tools')))
const localProps = join(androidDir, 'local.properties')
const sdkLine = (dir) => `sdk.dir=${dir.replace(/\\/g, '/')}\n`
if (existsSync(localProps)) {
  const current = /^sdk\.dir\s*=\s*(.+)$/m.exec(readFileSync(localProps, 'utf8'))?.[1]?.trim().replace(/\\\\/g, '\\').replace(/^([A-Za-z])\\:/, '$1:')
  if (!current || !existsSync(current)) {
    if (sdk) {
      writeFileSync(`${localProps}.bak`, readFileSync(localProps))
      writeFileSync(localProps, sdkLine(sdk))
      warn(`android/local.properties pointed to a missing SDK; rewritten to ${sdk}`)
    } else {
      warn('android/local.properties points to a missing SDK and no SDK was auto-detected. Set ANDROID_HOME or edit sdk.dir.')
    }
  }
} else if (sdk) {
  writeFileSync(localProps, sdkLine(sdk))
  log(`Android SDK detected: ${sdk}`)
} else {
  fail('Android SDK not found. Install Android Studio (SDK Platform 36 + Build-Tools) or set ANDROID_HOME, then re-run.')
}

// 5) Java 21 is required by the current Capacitor Android template.
const java = spawnSync('java', ['-version'], { encoding: 'utf8', shell: isWin })
const javaMajor = Number(/version "(\d+)/.exec(`${java.stderr || ''}${java.stdout || ''}`)?.[1] || 0)
if (javaMajor && javaMajor < 21) warn(`Java ${javaMajor} detected; Capacitor 8 needs JDK 21 (Android Studio's bundled JBR works). Set JAVA_HOME accordingly.`)

// 6) Keep the keyboard from destroying the layout: the window resizes and the WebView follows.
const manifestPath = join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml')
let manifest = readFileSync(manifestPath, 'utf8')
if (!/windowSoftInputMode/.test(manifest) && /<activity\b/.test(manifest)) {
  manifest = manifest.replace(/<activity\b/, '<activity\n            android:windowSoftInputMode="adjustResize"')
  writeFileSync(manifestPath, manifest)
  log('MainActivity: windowSoftInputMode=adjustResize')
}

// 7) Sync web assets + plugins, then verify the generated files that Gradle depends on.
log('Syncing Capacitor (web assets + native plugins)…')
run(npx, ['cap', 'sync', 'android'])

const settingsGradle = join(androidDir, 'capacitor.settings.gradle')
if (!existsSync(settingsGradle)) fail('capacitor.settings.gradle was not generated. Delete android/ and re-run this script.')
if (!/nexus-native/.test(readFileSync(settingsGradle, 'utf8'))) fail('The Nexus native plugin is not linked in capacitor.settings.gradle. Run "npm install", then re-run this script.')
if (!existsSync(join(androidDir, 'app', 'capacitor.build.gradle'))) fail('android/app/capacitor.build.gradle was not generated.')

log('Android project is consistent. Build with:  cd android && gradlew.bat assembleDebug')
