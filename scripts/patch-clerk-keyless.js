const fs = require('fs');
const path = require('path');

const targets = [
  path.join(__dirname, '..', 'node_modules', '@clerk', 'nextjs', 'dist', 'esm', 'app-router', 'client', 'keyless-cookie-sync.js'),
  path.join(__dirname, '..', 'node_modules', '@clerk', 'nextjs', 'dist', 'cjs', 'app-router', 'client', 'keyless-cookie-sync.js')
];

targets.forEach((filePath) => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('safeProps') && content.includes('...props')) {
      content = content.replace(
        'if (canUseKeyless && !isNotFoundRoute) {',
        'if (canUseKeyless && !isNotFoundRoute) {\n      const { children, ...safeProps } = props;'
      ).replace(
        'if (import_feature_flags.canUseKeyless && !isNotFoundRoute) {',
        'if (import_feature_flags.canUseKeyless && !isNotFoundRoute) {\n      const { children, ...safeProps } = props;'
      ).replace(
        '...props,',
        '...safeProps,'
      );
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Successfully patched Clerk keyless-cookie-sync at:', filePath);
    }
  }
});
