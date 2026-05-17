import type { Configuration } from 'electron-builder'

const config: Configuration = {
  appId: 'com.quizapp.desktop',
  productName: 'Quiz Practice',
  directories: {
    output: 'release',
    buildResources: 'assets',
  },
  files: [
    'dist/**/*',
    'dist-electron/**/*',
    'node_modules/**/*',
  ],
  extraMetadata: {
    main: 'dist-electron/electron/main.js',
  },
  win: {
    target: 'nsis',
    icon: 'assets/icon.png',
  },
  mac: {
    target: 'dmg',
    icon: 'assets/icon.png',
  },
  linux: {
    target: 'AppImage',
    icon: 'assets/icon.png',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
}

export default config
