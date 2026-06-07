module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './src',
            '@lib': './src/lib',
            '@components': './src/components',
            '@screens': './src/screens',
            '@navigation': './src/navigation',
            '@stores': './src/stores',
            '@hooks': './src/hooks',
            '@theme': './src/theme',
            '@utils': './src/lib/utils',
          },
        },
      ],
    ],
  }
}
