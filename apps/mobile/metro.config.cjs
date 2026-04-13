const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

// Monorepo root
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch the monorepo root so Metro can resolve @lynx/* workspace packages
config.watchFolders = [monorepoRoot];

// 2. Prioritize mobile's own node_modules BEFORE root node_modules.
//    This prevents Metro from picking up broken/incompatible packages
//    hoisted to the root (e.g. react-is@16 missing CJS bundles,
//    tailwindcss@4 instead of the required v3.3.2).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = withNativeWind(config, { input: "./global.css" });
