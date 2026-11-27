import { copyFileSync, existsSync } from 'node:fs';

// Publish the single-file build next to the site so it can be downloaded from Pages.
if (existsSync('dist')) {
  copyFileSync('build/single/index.html', 'dist/interactive-designer-offline.html');
  console.log('Copied dist/interactive-designer-offline.html');
}
