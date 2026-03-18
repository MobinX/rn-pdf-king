// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Ensure NODE_ENV is set for tools like @expo/env
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const config = getDefaultConfig(__dirname);

// npm v7+ will install ../node_modules/react and ../node_modules/react-native because of peerDependencies.
// To prevent the incompatible react-native between ./node_modules/react-native and ../node_modules/react-native,
// excludes the one from the parent folder when bundling.
config.resolver.blockList = [
  ...Array.from(config.resolver.blockList ?? []),
  new RegExp(path.resolve('..', 'node_modules', 'react')),
  new RegExp(path.resolve('..', 'node_modules', 'react-native')),
];

config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, './node_modules'),
  path.resolve(__dirname, '../node_modules'),
];

config.resolver.extraNodeModules = {
  'rn-pdf-king': '..',
  'react-native': path.resolve(__dirname, 'node_modules/react-native'),
  'react': path.resolve(__dirname, 'node_modules/react'),
};

config.watchFolders = [path.resolve(__dirname, '..')];

module.exports = config;
