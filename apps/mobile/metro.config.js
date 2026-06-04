const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch workspace root so Metro can find pnpm packages
config.watchFolders = [workspaceRoot];

// Prefer mobile's own node_modules first
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Force singleton packages to resolve from mobile's own node_modules.
// Only list packages that are actually installed in apps/mobile/node_modules
// to avoid require.resolve crashes for packages not present (e.g. react-dom).
const SINGLETONS = ['react', 'react-native', 'react-native-web', 'scheduler'];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  for (const pkg of SINGLETONS) {
    if (moduleName === pkg || moduleName.startsWith(pkg + '/')) {
      const localPkgDir = path.resolve(projectRoot, 'node_modules', pkg);
      if (fs.existsSync(localPkgDir)) {
        // Redirect resolution to start from the local package directory
        const suffix = moduleName.slice(pkg.length);
        const target = suffix
          ? path.resolve(localPkgDir, suffix)
          : localPkgDir;
        // Walk up to find the actual file Metro should serve
        try {
          const resolved = require.resolve(target);
          return { filePath: resolved, type: 'sourceFile' };
        } catch {
          // Fall through to default resolver if sub-path can't be found
        }
      }
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
