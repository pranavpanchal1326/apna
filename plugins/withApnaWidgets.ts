// plugins/withApnaWidgets.ts
// Expo Config Plugin — wires the Glance widget native layer into the Android project.
//
// What this plugin does during `npx expo prebuild`:
//   1. Adds Glance dependency to android/app/build.gradle
//   2. Copies Kotlin templates into the correct Android package directory
//   3. Copies XML resources (widget info metadata + preview layouts)
//   4. Patches AndroidManifest.xml with <receiver> declarations
//   5. Patches MainApplication.kt to register ApnaWidgetPackage
//
// Usage: reference from app.config.ts plugins array — see bottom of this file.

import {
  ConfigPlugin,
  withAppBuildGradle,
  withAndroidManifest,
  withMainApplication,
  withDangerousMod,
  AndroidConfig,
} from 'expo/config-plugins'
import * as fs from 'fs'
import * as path from 'path'

// ── Android package constant ────────────────────────────────────────────
const WIDGET_PACKAGE  = 'com.apna.widget'

// ── Step 1: Add Glance dependency to build.gradle ──────────────────────

const withGlanceDependency: ConfigPlugin = (config) =>
  withAppBuildGradle(config, (mod) => {
    const gradle = mod.modResults.contents
    const glanceDep = `    implementation("androidx.glance:glance-appwidget:1.0.0")`

    if (!gradle.includes('glance-appwidget')) {
      mod.modResults.contents = gradle.replace(
        /dependencies\s*\{/,
        `dependencies {\n${glanceDep}`
      )
    }
    return mod
  })

// ── Step 2: Copy Kotlin sources into Android source tree ────────────────

const withKotlinSources: ConfigPlugin = (config) =>
  withDangerousMod(config, [
    'android',
    async (mod) => {
      const projectRoot = mod.modRequest.projectRoot
      const templateDir = path.join(projectRoot, 'src', 'native', 'widget')

      // Destination: android/app/src/main/java/com/apna/widget/
      const destDir = path.join(
        mod.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'java',
        'com', 'apna', 'widget'
      )
      fs.mkdirSync(destDir, { recursive: true })

      const kotlinFiles = [
        'WidgetDataReader.kt',
        'BalanceWidget.kt',
        'MapWidget.kt',
        'ApnaWidgetModule.kt',
        'ApnaWidgetPackage.kt',
      ]

      for (const file of kotlinFiles) {
        const src  = path.join(templateDir, file)
        const dest = path.join(destDir, file)
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest)
        }
      }

      return mod
    },
  ])

// ── Step 3: Copy XML resources ─────────────────────────────────────────

const withXmlResources: ConfigPlugin = (config) =>
  withDangerousMod(config, [
    'android',
    async (mod) => {
      const projectRoot = mod.modRequest.projectRoot
      const templateResDir = path.join(projectRoot, 'src', 'native', 'widget', 'res')
      const androidResDir  = path.join(
        mod.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'res'
      )

      // Copy xml/ (widget info metadata)
      const xmlSrc  = path.join(templateResDir, 'xml')
      const xmlDest = path.join(androidResDir, 'xml')
      fs.mkdirSync(xmlDest, { recursive: true })

      for (const file of ['balance_widget_info.xml', 'map_widget_info.xml']) {
        const src = path.join(xmlSrc, file)
        if (fs.existsSync(src)) fs.copyFileSync(src, path.join(xmlDest, file))
      }

      // Copy layout/ (preview layouts)
      const layoutSrc  = path.join(templateResDir, 'layout')
      const layoutDest = path.join(androidResDir, 'layout')
      fs.mkdirSync(layoutDest, { recursive: true })

      for (const file of ['balance_widget_preview.xml', 'map_widget_preview.xml']) {
        const src = path.join(layoutSrc, file)
        if (fs.existsSync(src)) fs.copyFileSync(src, path.join(layoutDest, file))
      }

      // Ensure widget string resources exist (referenced by widget_info XMLs)
      const valuesDest = path.join(androidResDir, 'values')
      fs.mkdirSync(valuesDest, { recursive: true })
      const widgetStringsPath = path.join(valuesDest, 'widget_strings.xml')
      if (!fs.existsSync(widgetStringsPath)) {
        fs.writeFileSync(
          widgetStringsPath,
          `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="balance_widget_description">Shows your current balance in the active group.</string>
    <string name="map_widget_description">Shows which squad members are sharing their live location.</string>
</resources>
`
        )
      }

      return mod
    },
  ])

// ── Step 4: Patch AndroidManifest.xml ──────────────────────────────────

const withWidgetManifest: ConfigPlugin = (config) =>
  withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults
    const app = AndroidConfig.Manifest.getMainApplication(manifest)
    if (!app) return mod

    const receivers: any[] =
      (app.receiver as any[] | undefined) ?? []

    const makeReceiver = (
      receiverClass: string,
      metaDataResource: string
    ): any => ({
      $: {
        'android:name':      `${WIDGET_PACKAGE}.${receiverClass}`,
        'android:exported':  'true',
        'android:label':     receiverClass.replace('Receiver', ' Widget'),
      },
      'intent-filter': [
        {
          action: [
            { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
          ],
        },
      ],
      'meta-data': [
        {
          $: {
            'android:name':     'android.appwidget.provider',
            'android:resource': `@xml/${metaDataResource}`,
          },
        },
      ],
    })

    const balanceReceiverName = `${WIDGET_PACKAGE}.BalanceWidgetReceiver`
    const mapReceiverName     = `${WIDGET_PACKAGE}.MapWidgetReceiver`

    const alreadyHasBalance = receivers.some(
      (r) => r.$['android:name'] === balanceReceiverName
    )
    const alreadyHasMap = receivers.some(
      (r) => r.$['android:name'] === mapReceiverName
    )

    if (!alreadyHasBalance) {
      receivers.push(
        makeReceiver('BalanceWidgetReceiver', 'balance_widget_info')
      )
    }
    if (!alreadyHasMap) {
      receivers.push(
        makeReceiver('MapWidgetReceiver', 'map_widget_info')
      )
    }

    app.receiver = receivers as any
    return mod
  })

// ── Step 5: Register ApnaWidgetPackage in MainApplication.kt ───────────

const withWidgetPackage: ConfigPlugin = (config) =>
  withMainApplication(config, (mod) => {
    const contents = mod.modResults.contents

    const importLine  = `import ${WIDGET_PACKAGE}.ApnaWidgetPackage`
    const packageLine = `            packages.add(ApnaWidgetPackage())`

    let updated = contents

    // Inject import if missing
    if (!updated.includes(importLine)) {
      updated = updated.replace(
        /^(package\s+\S+\s*\n)/m,
        `$1\n${importLine}\n`
      )
    }

    // Inject package registration if missing
    if (!updated.includes('ApnaWidgetPackage')) {
      updated = updated.replace(
        /override fun getPackages\(\): List<ReactPackage> \{[\s\S]*?val packages = PackageList\(this\)\.packages/,
        (match) => `${match}\n${packageLine}`
      )
    }

    mod.modResults.contents = updated
    return mod
  })

// ── Compose all sub-plugins ────────────────────────────────────────────

const withApnaWidgets: ConfigPlugin = (config) => {
  config = withGlanceDependency(config)
  config = withKotlinSources(config)
  config = withXmlResources(config)
  config = withWidgetManifest(config)
  config = withWidgetPackage(config)
  return config
}

export default withApnaWidgets
