import { memo, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

// Seti UI color palette - default colors
const defaultColors = {
  blue: '#519aba',
  grey: '#4d5a5e',
  'grey-light': '#6d8086',
  green: '#8dc149',
  orange: '#e37933',
  pink: '#f55385',
  purple: '#a074c4',
  red: '#cc3e44',
  white: '#d4d7d6',
  yellow: '#cbcb41',
  ignore: '#41535b',
};

// Colorblind-friendly color palettes
const colorblindPalettes = {
  none: defaultColors,
  deuteranopia: {
    ...defaultColors,
    red: '#d55e00',      // Orange-Red (distinguishable from green)
    green: '#0072b2',    // Blue (instead of green)
    pink: '#cc79a7',     // Muted pink
  },
  protanopia: {
    ...defaultColors,
    red: '#e69f00',      // Orange (instead of red)
    green: '#0072b2',    // Blue (instead of green)
    pink: '#cc79a7',     // Muted pink
  },
  tritanopia: {
    ...defaultColors,
    blue: '#009e73',     // Teal (instead of blue)
    yellow: '#cc79a7',   // Pink (instead of yellow)
    pink: '#d55e00',     // Orange-Red
  },
  monochromacy: {
    ...defaultColors,
    blue: '#666666',
    green: '#888888',
    red: '#444444',
    pink: '#777777',
    purple: '#555555',
    orange: '#999999',
    yellow: '#aaaaaa',
  }
};

// Get colors based on colorblind mode
const getColors = (colorblindMode) => {
  return colorblindPalettes[colorblindMode] || defaultColors;
};

// Extension to icon mapping based on Seti UI (using defaultColors)
const extensionMap = {
  // JavaScript
  'js': { icon: 'javascript', color: defaultColors.yellow },
  'mjs': { icon: 'javascript', color: defaultColors.yellow },
  'cjs': { icon: 'javascript', color: defaultColors.yellow },
  'es6': { icon: 'javascript', color: defaultColors.yellow },
  
  // TypeScript
  'ts': { icon: 'typescript', color: defaultColors.blue },
  'd.ts': { icon: 'typescript', color: defaultColors.blue },
  
  // React
  'jsx': { icon: 'react', color: defaultColors.blue },
  'tsx': { icon: 'react', color: defaultColors.blue },
  
  // HTML
  'html': { icon: 'html', color: defaultColors.orange },
  'htm': { icon: 'html', color: defaultColors.orange },
  
  // CSS
  'css': { icon: 'css', color: defaultColors.blue },
  'scss': { icon: 'sass', color: defaultColors.pink },
  'sass': { icon: 'sass', color: defaultColors.pink },
  'less': { icon: 'less', color: defaultColors.blue },
  'styl': { icon: 'stylus', color: defaultColors.green },
  
  // JSON
  'json': { icon: 'json', color: defaultColors.yellow },
  'cson': { icon: 'json', color: defaultColors.yellow },
  
  // Markdown
  'md': { icon: 'markdown', color: defaultColors.blue },
  'markdown': { icon: 'markdown', color: defaultColors.blue },
  'mdx': { icon: 'markdown', color: defaultColors.blue },
  
  // Python
  'py': { icon: 'python', color: defaultColors.blue },
  'pyw': { icon: 'python', color: defaultColors.blue },
  'pyx': { icon: 'python', color: defaultColors.blue },
  
  // Ruby
  'rb': { icon: 'ruby', color: defaultColors.red },
  'erb': { icon: 'html_erb', color: defaultColors.red },
  
  // PHP
  'php': { icon: 'php', color: defaultColors.purple },
  
  // Java
  'java': { icon: 'java', color: defaultColors.red },
  'class': { icon: 'java', color: defaultColors.blue },
  'jar': { icon: 'zip', color: defaultColors.red },
  
  // C/C++
  'c': { icon: 'c', color: defaultColors.blue },
  'h': { icon: 'c', color: defaultColors.purple },
  'cpp': { icon: 'cpp', color: defaultColors.blue },
  'cc': { icon: 'cpp', color: defaultColors.blue },
  'cxx': { icon: 'cpp', color: defaultColors.blue },
  'hpp': { icon: 'cpp', color: defaultColors.purple },
  'hxx': { icon: 'cpp', color: defaultColors.purple },
  
  // C#
  'cs': { icon: 'c-sharp', color: defaultColors.blue },
  
  // Go
  'go': { icon: 'go2', color: defaultColors.blue },
  
  // Rust
  'rs': { icon: 'rust', color: defaultColors['grey-light'] },
  
  // Swift
  'swift': { icon: 'swift', color: defaultColors.orange },
  
  // Kotlin
  'kt': { icon: 'kotlin', color: defaultColors.orange },
  'kts': { icon: 'kotlin', color: defaultColors.orange },
  
  // Scala
  'scala': { icon: 'scala', color: defaultColors.red },
  
  // Dart
  'dart': { icon: 'dart', color: defaultColors.blue },
  
  // Shell
  'sh': { icon: 'shell', color: defaultColors.green },
  'bash': { icon: 'shell', color: defaultColors.green },
  'zsh': { icon: 'shell', color: defaultColors.green },
  'fish': { icon: 'shell', color: defaultColors.green },
  
  // PowerShell
  'ps1': { icon: 'powershell', color: defaultColors.blue },
  'psm1': { icon: 'powershell', color: defaultColors.blue },
  'psd1': { icon: 'powershell', color: defaultColors.blue },
  
  // Windows
  'bat': { icon: 'windows', color: defaultColors.blue },
  'cmd': { icon: 'windows', color: defaultColors.blue },
  
  // Config
  'yml': { icon: 'yml', color: defaultColors.purple },
  'yaml': { icon: 'yml', color: defaultColors.purple },
  'xml': { icon: 'xml', color: defaultColors.orange },
  'toml': { icon: 'config', color: defaultColors['grey-light'] },
  'ini': { icon: 'config', color: defaultColors['grey-light'] },
  'conf': { icon: 'config', color: defaultColors['grey-light'] },
  'config': { icon: 'config', color: defaultColors['grey-light'] },
  
  // Database
  'sql': { icon: 'db', color: defaultColors.pink },
  'sqlite': { icon: 'db', color: defaultColors.pink },
  'prisma': { icon: 'prisma', color: defaultColors.blue },
  
  // GraphQL
  'graphql': { icon: 'graphql', color: defaultColors.pink },
  'gql': { icon: 'graphql', color: defaultColors.pink },
  
  // Vue
  'vue': { icon: 'vue', color: defaultColors.green },
  
  // Svelte
  'svelte': { icon: 'svelte', color: defaultColors.red },
  
  // Templates
  'ejs': { icon: 'ejs', color: defaultColors.yellow },
  'pug': { icon: 'pug', color: defaultColors.red },
  'jade': { icon: 'jade', color: defaultColors.red },
  'hbs': { icon: 'mustache', color: defaultColors.orange },
  'handlebars': { icon: 'mustache', color: defaultColors.orange },
  'mustache': { icon: 'mustache', color: defaultColors.orange },
  'twig': { icon: 'twig', color: defaultColors.green },
  'liquid': { icon: 'liquid', color: defaultColors.green },
  'njk': { icon: 'nunjucks', color: defaultColors.green },
  
  // Images
  'png': { icon: 'image', color: defaultColors.purple },
  'jpg': { icon: 'image', color: defaultColors.purple },
  'jpeg': { icon: 'image', color: defaultColors.purple },
  'gif': { icon: 'image', color: defaultColors.purple },
  'webp': { icon: 'image', color: defaultColors.purple },
  'avif': { icon: 'image', color: defaultColors.purple },
  'ico': { icon: 'favicon', color: defaultColors.yellow },
  'svg': { icon: 'svg', color: defaultColors.purple },
  
  // Fonts
  'ttf': { icon: 'font', color: defaultColors.red },
  'otf': { icon: 'font', color: defaultColors.red },
  'woff': { icon: 'font', color: defaultColors.red },
  'woff2': { icon: 'font', color: defaultColors.red },
  'eot': { icon: 'font', color: defaultColors.red },
  
  // Audio
  'mp3': { icon: 'audio', color: defaultColors.purple },
  'wav': { icon: 'audio', color: defaultColors.purple },
  'ogg': { icon: 'audio', color: defaultColors.purple },
  'flac': { icon: 'audio', color: defaultColors.purple },
  
  // Video
  'mp4': { icon: 'video', color: defaultColors.pink },
  'webm': { icon: 'video', color: defaultColors.pink },
  'mov': { icon: 'video', color: defaultColors.pink },
  'avi': { icon: 'video', color: defaultColors.pink },
  'mkv': { icon: 'video', color: defaultColors.pink },
  
  // Archives
  'zip': { icon: 'zip', color: defaultColors['grey-light'] },
  'tar': { icon: 'zip', color: defaultColors['grey-light'] },
  'gz': { icon: 'zip', color: defaultColors['grey-light'] },
  'rar': { icon: 'zip', color: defaultColors['grey-light'] },
  '7z': { icon: 'zip', color: defaultColors['grey-light'] },
  
  // Documents
  'pdf': { icon: 'pdf', color: defaultColors.red },
  'doc': { icon: 'word', color: defaultColors.blue },
  'docx': { icon: 'word', color: defaultColors.blue },
  'xls': { icon: 'xls', color: defaultColors.green },
  'xlsx': { icon: 'xls', color: defaultColors.green },
  'csv': { icon: 'csv', color: defaultColors.green },
  
  // Adobe
  'psd': { icon: 'photoshop', color: defaultColors.blue },
  'ai': { icon: 'illustrator', color: defaultColors.yellow },
  
  // Git
  'gitignore': { icon: 'git', color: defaultColors.ignore },
  'gitattributes': { icon: 'git', color: defaultColors.ignore },
  'gitmodules': { icon: 'git', color: defaultColors.ignore },
  
  // Misc
  'log': { icon: 'default', color: defaultColors['grey-light'] },
  'txt': { icon: 'default', color: defaultColors.white },
  'lock': { icon: 'lock', color: defaultColors.green },
  
  // Elixir
  'ex': { icon: 'elixir', color: defaultColors.purple },
  'exs': { icon: 'elixir_script', color: defaultColors.purple },
  
  // Haskell
  'hs': { icon: 'haskell', color: defaultColors.purple },
  'lhs': { icon: 'haskell', color: defaultColors.purple },
  
  // Clojure
  'clj': { icon: 'clojure', color: defaultColors.green },
  'cljs': { icon: 'clojure', color: defaultColors.green },
  'cljc': { icon: 'clojure', color: defaultColors.green },
  
  // Lua
  'lua': { icon: 'lua', color: defaultColors.blue },
  
  // R
  'r': { icon: 'R', color: defaultColors.blue },
  'rmd': { icon: 'R', color: defaultColors.blue },
  
  // Julia
  'jl': { icon: 'julia', color: defaultColors.purple },
  
  // Elm
  'elm': { icon: 'elm', color: defaultColors.blue },
  
  // F#
  'fs': { icon: 'f-sharp', color: defaultColors.blue },
  'fsx': { icon: 'f-sharp', color: defaultColors.blue },
  
  // OCaml
  'ml': { icon: 'ocaml', color: defaultColors.orange },
  'mli': { icon: 'ocaml', color: defaultColors.orange },
  
  // Perl
  'pl': { icon: 'perl', color: defaultColors.blue },
  'pm': { icon: 'perl', color: defaultColors.blue },
  
  // Groovy
  'groovy': { icon: 'grails', color: defaultColors.green },
  'gradle': { icon: 'gradle', color: defaultColors.blue },
  
  // Terraform
  'tf': { icon: 'terraform', color: defaultColors.purple },
  'tfvars': { icon: 'terraform', color: defaultColors.purple },
  
  // Docker
  'dockerfile': { icon: 'docker', color: defaultColors.blue },
  
  // Solidity
  'sol': { icon: 'ethereum', color: defaultColors.blue },
  
  // WebAssembly
  'wasm': { icon: 'wasm', color: defaultColors.purple },
  'wat': { icon: 'wat', color: defaultColors.purple },
  
  // Zig
  'zig': { icon: 'zig', color: defaultColors.orange },
  
  // Nim
  'nim': { icon: 'nim', color: defaultColors.yellow },
  
  // Crystal
  'cr': { icon: 'crystal', color: defaultColors.white },
  
  // D
  'd': { icon: 'd', color: defaultColors.red },
  
  // Assembly
  'asm': { icon: 'asm', color: defaultColors.red },
  's': { icon: 'asm', color: defaultColors.red },
  
  // CUDA
  'cu': { icon: 'cu', color: defaultColors.green },
  'cuh': { icon: 'cu', color: defaultColors.purple },
};

// Special filename mappings (using defaultColors)
const filenameMap = {
  'package.json': { icon: 'npm', color: defaultColors.red },
  'package-lock.json': { icon: 'npm', color: defaultColors.red },
  '.npmrc': { icon: 'npm', color: defaultColors.red },
  '.npmignore': { icon: 'npm', color: defaultColors.red },
  'yarn.lock': { icon: 'yarn', color: defaultColors.blue },
  '.yarnrc': { icon: 'yarn', color: defaultColors.blue },
  'tsconfig.json': { icon: 'tsconfig', color: defaultColors.blue },
  'jsconfig.json': { icon: 'json', color: defaultColors.yellow },
  '.gitignore': { icon: 'git', color: defaultColors.ignore },
  '.gitattributes': { icon: 'git', color: defaultColors.ignore },
  '.gitmodules': { icon: 'git', color: defaultColors.ignore },
  '.env': { icon: 'config', color: defaultColors['grey-light'] },
  '.env.local': { icon: 'config', color: defaultColors['grey-light'] },
  '.env.development': { icon: 'config', color: defaultColors['grey-light'] },
  '.env.production': { icon: 'config', color: defaultColors['grey-light'] },
  '.env.example': { icon: 'config', color: defaultColors['grey-light'] },
  'dockerfile': { icon: 'docker', color: defaultColors.blue },
  'docker-compose.yml': { icon: 'docker', color: defaultColors.pink },
  'docker-compose.yaml': { icon: 'docker', color: defaultColors.pink },
  '.dockerignore': { icon: 'docker', color: defaultColors.grey },
  'vite.config.js': { icon: 'javascript', color: defaultColors.yellow },
  'vite.config.ts': { icon: 'typescript', color: defaultColors.blue },
  'webpack.config.js': { icon: 'webpack', color: defaultColors.blue },
  'webpack.config.ts': { icon: 'webpack', color: defaultColors.blue },
  'rollup.config.js': { icon: 'rollup', color: defaultColors.red },
  'rollup.config.ts': { icon: 'rollup', color: defaultColors.red },
  'eslint.config.js': { icon: 'eslint', color: defaultColors.purple },
  'eslint.config.mjs': { icon: 'eslint', color: defaultColors.purple },
  '.eslintrc': { icon: 'eslint', color: defaultColors.purple },
  '.eslintrc.js': { icon: 'eslint', color: defaultColors.purple },
  '.eslintrc.json': { icon: 'eslint', color: defaultColors.purple },
  '.eslintignore': { icon: 'eslint', color: defaultColors.grey },
  '.prettierrc': { icon: 'config', color: defaultColors['grey-light'] },
  '.prettierrc.js': { icon: 'config', color: defaultColors['grey-light'] },
  '.prettierrc.json': { icon: 'config', color: defaultColors['grey-light'] },
  '.prettierignore': { icon: 'config', color: defaultColors.grey },
  '.stylelintrc': { icon: 'stylelint', color: defaultColors.white },
  '.stylelintrc.json': { icon: 'stylelint', color: defaultColors.white },
  'stylelint.config.js': { icon: 'stylelint', color: defaultColors.white },
  '.babelrc': { icon: 'babel', color: defaultColors.yellow },
  '.babelrc.js': { icon: 'babel', color: defaultColors.yellow },
  'babel.config.js': { icon: 'babel', color: defaultColors.yellow },
  'babel.config.json': { icon: 'babel', color: defaultColors.yellow },
  '.editorconfig': { icon: 'editorconfig', color: defaultColors['grey-light'] },
  'readme.md': { icon: 'info', color: defaultColors.blue },
  'readme.txt': { icon: 'info', color: defaultColors.blue },
  'readme': { icon: 'info', color: defaultColors.blue },
  'changelog.md': { icon: 'clock', color: defaultColors.blue },
  'changelog.txt': { icon: 'clock', color: defaultColors.blue },
  'changelog': { icon: 'clock', color: defaultColors.blue },
  'license': { icon: 'license', color: defaultColors.yellow },
  'license.md': { icon: 'license', color: defaultColors.yellow },
  'license.txt': { icon: 'license', color: defaultColors.yellow },
  'licence': { icon: 'license', color: defaultColors.yellow },
  'copying': { icon: 'license', color: defaultColors.yellow },
  'contributing.md': { icon: 'license', color: defaultColors.red },
  'makefile': { icon: 'makefile', color: defaultColors.orange },
  'cmakelists.txt': { icon: 'makefile', color: defaultColors.blue },
  'gruntfile.js': { icon: 'grunt', color: defaultColors.orange },
  'gulpfile.js': { icon: 'gulp', color: defaultColors.red },
  'gulpfile.babel.js': { icon: 'gulp', color: defaultColors.red },
  'jenkinsfile': { icon: 'jenkins', color: defaultColors.red },
  'procfile': { icon: 'heroku', color: defaultColors.purple },
  '.gitlab-ci.yml': { icon: 'gitlab', color: defaultColors.orange },
  'firebase.json': { icon: 'firebase', color: defaultColors.orange },
  '.firebaserc': { icon: 'firebase', color: defaultColors.orange },
  'karma.conf.js': { icon: 'karma', color: defaultColors.green },
  'todo.md': { icon: 'todo', color: defaultColors.blue },
  'todo.txt': { icon: 'todo', color: defaultColors.blue },
  'todo': { icon: 'todo', color: defaultColors.blue },
  'pom.xml': { icon: 'maven', color: defaultColors.red },
  'bower.json': { icon: 'bower', color: defaultColors.orange },
  '.bowerrc': { icon: 'bower', color: defaultColors.orange },
  'ionic.config.json': { icon: 'ionic', color: defaultColors.blue },
  'platformio.ini': { icon: 'platformio', color: defaultColors.orange },
  '.codeclimate.yml': { icon: 'code-climate', color: defaultColors.green },
  'swagger.json': { icon: 'json', color: defaultColors.green },
  'swagger.yml': { icon: 'json', color: defaultColors.green },
  'swagger.yaml': { icon: 'json', color: defaultColors.green },
};

// Folder icon mappings (using defaultColors)
const folderMap = {
  'src': defaultColors.blue,
  'source': defaultColors.blue,
  'lib': defaultColors.blue,
  'dist': defaultColors.yellow,
  'build': defaultColors.yellow,
  'out': defaultColors.yellow,
  'public': defaultColors.green,
  'static': defaultColors.green,
  'assets': defaultColors.purple,
  'images': defaultColors.purple,
  'img': defaultColors.purple,
  'icons': defaultColors.purple,
  'fonts': defaultColors.red,
  'styles': defaultColors.pink,
  'css': defaultColors.pink,
  'scss': defaultColors.pink,
  'components': defaultColors.blue,
  'pages': defaultColors.green,
  'views': defaultColors.green,
  'layouts': defaultColors.orange,
  'templates': defaultColors.orange,
  'utils': defaultColors['grey-light'],
  'helpers': defaultColors['grey-light'],
  'hooks': defaultColors.blue,
  'contexts': defaultColors.purple,
  'services': defaultColors.yellow,
  'api': defaultColors.green,
  'routes': defaultColors.orange,
  'middleware': defaultColors.red,
  'models': defaultColors.red,
  'controllers': defaultColors.blue,
  'config': defaultColors['grey-light'],
  'configs': defaultColors['grey-light'],
  'settings': defaultColors['grey-light'],
  'test': defaultColors.orange,
  'tests': defaultColors.orange,
  '__tests__': defaultColors.orange,
  'spec': defaultColors.orange,
  'specs': defaultColors.orange,
  'node_modules': defaultColors.green,
  '.git': defaultColors.red,
  '.github': defaultColors.white,
  '.vscode': defaultColors.blue,
  '.idea': defaultColors.blue,
  'vendor': defaultColors['grey-light'],
  'packages': defaultColors.blue,
  'docs': defaultColors.blue,
  'documentation': defaultColors.blue,
  'scripts': defaultColors.yellow,
  'bin': defaultColors.yellow,
  'data': defaultColors.green,
  'database': defaultColors.pink,
  'db': defaultColors.pink,
  'migrations': defaultColors.orange,
  'seeds': defaultColors.green,
  'logs': defaultColors['grey-light'],
  'tmp': defaultColors['grey-light'],
  'temp': defaultColors['grey-light'],
  'cache': defaultColors['grey-light'],
  '.cache': defaultColors['grey-light'],
  'types': defaultColors.blue,
  '@types': defaultColors.blue,
  'typings': defaultColors.blue,
  'interfaces': defaultColors.blue,
  'locales': defaultColors.purple,
  'i18n': defaultColors.purple,
  'translations': defaultColors.purple,
  'plugins': defaultColors.green,
  'modules': defaultColors.blue,
  'features': defaultColors.purple,
  'store': defaultColors.purple,
  'redux': defaultColors.purple,
  'state': defaultColors.purple,
  'actions': defaultColors.orange,
  'reducers': defaultColors.blue,
  'selectors': defaultColors.green,
  'sagas': defaultColors.red,
  'effects': defaultColors.yellow,
  'graphql': defaultColors.pink,
  'queries': defaultColors.pink,
  'mutations': defaultColors.pink,
  'subscriptions': defaultColors.pink,
  'resolvers': defaultColors.purple,
  'schema': defaultColors.blue,
  'schemas': defaultColors.blue,
  'electron': defaultColors.blue,
  'native': defaultColors.green,
  'android': defaultColors.green,
  'ios': defaultColors['grey-light'],
  'web': defaultColors.blue,
  'mobile': defaultColors.purple,
  'desktop': defaultColors.blue,
  'server': defaultColors.green,
  'client': defaultColors.blue,
  'shared': defaultColors.purple,
  'common': defaultColors.purple,
  'core': defaultColors.red,
  'base': defaultColors.orange,
  'abstract': defaultColors.purple,
  'entities': defaultColors.blue,
  'domain': defaultColors.purple,
  'infrastructure': defaultColors.orange,
  'application': defaultColors.green,
  'presentation': defaultColors.blue,
  'ui': defaultColors.blue,
  'widgets': defaultColors.purple,
  'elements': defaultColors.blue,
  'atoms': defaultColors.green,
  'molecules': defaultColors.blue,
  'organisms': defaultColors.purple,
  'mcp-tools': defaultColors.green,
  'python': defaultColors.blue,
  'projects': defaultColors.purple,
  'models': defaultColors.red,
};

// SVG cache
const svgCache = new Map();

// Load SVG from seti-ui package
const loadSvg = async (iconName) => {
  if (svgCache.has(iconName)) {
    return svgCache.get(iconName);
  }
  
  try {
    // Dynamic import for Vite
    const svgModule = await import(`../../node_modules/seti-ui/icons/${iconName}.svg?raw`);
    const svgContent = svgModule.default;
    svgCache.set(iconName, svgContent);
    return svgContent;
  } catch {
    // Fallback to default icon
    if (iconName !== 'default') {
      return loadSvg('default');
    }
    return null;
  }
};

// Get icon info for a file (with colorblind-aware colors)
const getFileIconInfo = (filename, colors) => {
  if (!filename) return { icon: 'default', color: colors.white };
  
  const lowerName = filename.toLowerCase();
  
  // Check special filenames first - remap colors
  if (filenameMap[lowerName]) {
    const mapped = filenameMap[lowerName];
    return { icon: mapped.icon, color: remapColor(mapped.color, colors) };
  }
  
  // Check for d.ts files
  if (lowerName.endsWith('.d.ts')) {
    return { icon: 'typescript', color: colors.blue };
  }
  
  // Check for test files
  if (lowerName.includes('.spec.') || lowerName.includes('.test.')) {
    const ext = lowerName.split('.').pop();
    if (ext === 'ts' || ext === 'tsx') {
      return { icon: 'typescript', color: colors.orange };
    }
    if (ext === 'js' || ext === 'jsx') {
      return { icon: 'javascript', color: colors.orange };
    }
  }
  
  // Get extension - remap colors
  const ext = lowerName.split('.').pop();
  if (extensionMap[ext]) {
    const mapped = extensionMap[ext];
    return { icon: mapped.icon, color: remapColor(mapped.color, colors) };
  }
  
  return { icon: 'default', color: colors.white };
};

// Remap default color to colorblind-aware color
const remapColor = (originalColor, colors) => {
  // Map original default colors to current palette
  const colorMap = {
    [defaultColors.red]: colors.red,
    [defaultColors.green]: colors.green,
    [defaultColors.blue]: colors.blue,
    [defaultColors.yellow]: colors.yellow,
    [defaultColors.orange]: colors.orange,
    [defaultColors.pink]: colors.pink,
    [defaultColors.purple]: colors.purple,
    [defaultColors.grey]: colors.grey,
    [defaultColors['grey-light']]: colors['grey-light'],
    [defaultColors.white]: colors.white,
    [defaultColors.ignore]: colors.ignore,
  };
  return colorMap[originalColor] || originalColor;
};

// Get folder color (with colorblind-aware colors)
const getFolderColor = (foldername, colors) => {
  if (!foldername) return colors['grey-light'];
  const lowerName = foldername.toLowerCase();
  const originalColor = folderMap[lowerName] || defaultColors['grey-light'];
  return remapColor(originalColor, colors);
};

// Preloaded SVGs for common icons (inline for instant rendering)
const inlineSvgs = {
  'default': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M20.414,2H5V30H27V8.586ZM7,28V4H19v6h6V28Z"/></svg>',
  'folder': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M28.8 6.9H16.1V5.7c0-1.4-1.1-2.5-2.5-2.5H.6v25.6h30.6V9.4c.1-1.4-1-2.5-2.4-2.5z"/></svg>',
  'folder-open': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M28.8 6.9H16.1V5.7c0-1.4-1.1-2.5-2.5-2.5H.6v25.6h30.6V9.4c.1-1.4-1-2.5-2.4-2.5z"/><path d="M.6 28.8V12h30.6v16.8z" opacity="0.5"/></svg>',
};

import { useState, useEffect } from 'react';

const FileIcon = memo(({ filename, isFolder = false, isOpen = false, size = 16 }) => {
  const [svgContent, setSvgContent] = useState(null);
  const { colorblindMode } = useTheme();
  
  // Get colors based on colorblind mode
  const colors = useMemo(() => getColors(colorblindMode), [colorblindMode]);
  
  const iconInfo = useMemo(() => {
    if (isFolder) {
      return { icon: 'folder', color: getFolderColor(filename, colors) };
    }
    return getFileIconInfo(filename, colors);
  }, [filename, isFolder, colors]);

  useEffect(() => {
    let mounted = true;
    
    const loadIcon = async () => {
      const iconName = isFolder ? (isOpen ? 'folder' : 'folder') : iconInfo.icon;
      const svg = await loadSvg(iconName);
      if (mounted && svg) {
        setSvgContent(svg);
      }
    };
    
    loadIcon();
    
    return () => {
      mounted = false;
    };
  }, [iconInfo.icon, isFolder, isOpen]);

  // Use inline SVG as fallback while loading
  const displaySvg = svgContent || (isFolder ? inlineSvgs.folder : inlineSvgs.default);
  
  // Apply color only to folder icons and icons without fill
  // File icons from Seti UI already have their colors baked in
  let coloredSvg = displaySvg;
  
  if (isFolder) {
    // Folders need coloring
    if (displaySvg.includes('fill="')) {
      coloredSvg = displaySvg.replace(/fill="[^"]*"/g, `fill="${iconInfo.color}"`);
    } else {
      coloredSvg = displaySvg.replace(/<path/g, `<path fill="${iconInfo.color}"`);
    }
  } else if (!displaySvg.includes('fill="')) {
    // Only add fill if SVG doesn't have one (like default.svg)
    coloredSvg = displaySvg.replace(/<path/g, `<path fill="${iconInfo.color}"`);
  }
  // Otherwise keep original Seti UI colors

  // Normalize SVG to ensure consistent sizing
  // Add viewBox if missing and remove fixed width/height
  let normalizedSvg = coloredSvg
    .replace(/width="[^"]*"/g, '')
    .replace(/height="[^"]*"/g, '')
    .replace(/<svg/, `<svg width="${size}" height="${size}" style="display:block"`);
  
  // Add viewBox if not present
  if (!normalizedSvg.includes('viewBox')) {
    normalizedSvg = normalizedSvg.replace(/<svg/, '<svg viewBox="0 0 32 32"');
  }

  return (
    <span 
      style={{ 
        width: size, 
        height: size, 
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}
      dangerouslySetInnerHTML={{ __html: normalizedSvg }}
    />
  );
});

FileIcon.displayName = 'FileIcon';

export default FileIcon;
