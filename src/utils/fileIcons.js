// File extension to icon color/style mapping (VS Code style)
const fileIconMap = {
  // JavaScript/TypeScript
  js: { color: '#f7df1e', label: 'JS' },
  jsx: { color: '#61dafb', label: 'JSX' },
  ts: { color: '#3178c6', label: 'TS' },
  tsx: { color: '#3178c6', label: 'TSX' },
  mjs: { color: '#f7df1e', label: 'MJS' },
  cjs: { color: '#f7df1e', label: 'CJS' },
  
  // Web
  html: { color: '#e34c26', label: 'HTML' },
  htm: { color: '#e34c26', label: 'HTM' },
  css: { color: '#264de4', label: 'CSS' },
  scss: { color: '#c6538c', label: 'SCSS' },
  sass: { color: '#c6538c', label: 'SASS' },
  less: { color: '#1d365d', label: 'LESS' },
  
  // Data
  json: { color: '#cbcb41', label: '{}' },
  xml: { color: '#e37933', label: 'XML' },
  yaml: { color: '#cb171e', label: 'YML' },
  yml: { color: '#cb171e', label: 'YML' },
  toml: { color: '#9c4121', label: 'TOML' },
  
  // Python
  py: { color: '#3572A5', label: 'PY' },
  pyw: { color: '#3572A5', label: 'PY' },
  pyx: { color: '#3572A5', label: 'PYX' },
  
  // Other languages
  java: { color: '#b07219', label: 'JAVA' },
  c: { color: '#555555', label: 'C' },
  cpp: { color: '#f34b7d', label: 'C++' },
  h: { color: '#555555', label: 'H' },
  hpp: { color: '#f34b7d', label: 'HPP' },
  cs: { color: '#178600', label: 'C#' },
  go: { color: '#00ADD8', label: 'GO' },
  rs: { color: '#dea584', label: 'RS' },
  rb: { color: '#701516', label: 'RB' },
  php: { color: '#4F5D95', label: 'PHP' },
  swift: { color: '#ffac45', label: 'SWIFT' },
  kt: { color: '#A97BFF', label: 'KT' },
  
  // Shell/Config
  sh: { color: '#89e051', label: 'SH' },
  bash: { color: '#89e051', label: 'BASH' },
  zsh: { color: '#89e051', label: 'ZSH' },
  ps1: { color: '#012456', label: 'PS1' },
  bat: { color: '#C1F12E', label: 'BAT' },
  cmd: { color: '#C1F12E', label: 'CMD' },
  
  // Docs
  md: { color: '#083fa1', label: 'MD' },
  mdx: { color: '#083fa1', label: 'MDX' },
  txt: { color: '#888888', label: 'TXT' },
  pdf: { color: '#ec1c24', label: 'PDF' },
  doc: { color: '#2b579a', label: 'DOC' },
  docx: { color: '#2b579a', label: 'DOCX' },
  
  // Images
  png: { color: '#a074c4', label: 'PNG' },
  jpg: { color: '#a074c4', label: 'JPG' },
  jpeg: { color: '#a074c4', label: 'JPEG' },
  gif: { color: '#a074c4', label: 'GIF' },
  svg: { color: '#ffb13b', label: 'SVG' },
  ico: { color: '#a074c4', label: 'ICO' },
  webp: { color: '#a074c4', label: 'WEBP' },
  
  // Config files
  env: { color: '#ecd53f', label: 'ENV' },
  gitignore: { color: '#f14e32', label: 'GIT' },
  dockerignore: { color: '#2496ed', label: 'DOCK' },
  eslintrc: { color: '#4b32c3', label: 'ESL' },
  prettierrc: { color: '#56b3b4', label: 'PRET' },
  
  // Package managers
  lock: { color: '#888888', label: 'LOCK' },
  
  // Default
  default: { color: '#888888', label: 'FILE' }
};

// Special filename mappings
const specialFiles = {
  'package.json': { color: '#cb3837', label: '{}' },
  'package-lock.json': { color: '#cb3837', label: '{}' },
  'tsconfig.json': { color: '#3178c6', label: '{}' },
  'jsconfig.json': { color: '#f7df1e', label: '{}' },
  '.gitignore': { color: '#f14e32', label: 'GIT' },
  '.env': { color: '#ecd53f', label: 'ENV' },
  '.env.local': { color: '#ecd53f', label: 'ENV' },
  '.env.development': { color: '#ecd53f', label: 'ENV' },
  '.env.production': { color: '#ecd53f', label: 'ENV' },
  'dockerfile': { color: '#2496ed', label: 'DOCK' },
  'docker-compose.yml': { color: '#2496ed', label: 'DOCK' },
  'readme.md': { color: '#083fa1', label: 'i' },
  'license': { color: '#d4af37', label: 'LIC' },
  'license.md': { color: '#d4af37', label: 'LIC' },
  'makefile': { color: '#6d8086', label: 'MAKE' },
  'vite.config.js': { color: '#646cff', label: 'VITE' },
  'vite.config.ts': { color: '#646cff', label: 'VITE' },
  'webpack.config.js': { color: '#8dd6f9', label: 'WP' },
  'eslint.config.js': { color: '#4b32c3', label: 'ESL' },
  '.eslintrc.js': { color: '#4b32c3', label: 'ESL' },
  '.prettierrc': { color: '#56b3b4', label: 'PRET' },
  'index.html': { color: '#e34c26', label: '<>' },
};

// Folder icon colors
const folderIconMap = {
  'src': '#42a5f5',
  'source': '#42a5f5',
  'components': '#7c4dff',
  'pages': '#7c4dff',
  'views': '#7c4dff',
  'assets': '#ffca28',
  'images': '#ffca28',
  'img': '#ffca28',
  'styles': '#ec407a',
  'css': '#ec407a',
  'scripts': '#66bb6a',
  'js': '#66bb6a',
  'lib': '#78909c',
  'libs': '#78909c',
  'utils': '#78909c',
  'helpers': '#78909c',
  'hooks': '#00bcd4',
  'services': '#ff7043',
  'api': '#ff7043',
  'config': '#8d6e63',
  'public': '#26a69a',
  'static': '#26a69a',
  'dist': '#9e9e9e',
  'build': '#9e9e9e',
  'node_modules': '#689f38',
  'test': '#ef5350',
  'tests': '#ef5350',
  '__tests__': '#ef5350',
  'spec': '#ef5350',
  '.git': '#f14e32',
  '.vscode': '#007acc',
  '.github': '#333',
  'electron': '#47848f',
  'python': '#3572A5',
  'data': '#ffa726',
  'models': '#ab47bc',
  'default': '#90a4ae'
};

export function getFileIcon(filename) {
  const lowerName = filename.toLowerCase();
  
  // Check special files first
  if (specialFiles[lowerName]) {
    return specialFiles[lowerName];
  }
  
  // Get extension
  const ext = filename.split('.').pop()?.toLowerCase();
  
  if (ext && fileIconMap[ext]) {
    return fileIconMap[ext];
  }
  
  return fileIconMap.default;
}

export function getFolderColor(folderName) {
  const lowerName = folderName.toLowerCase();
  return folderIconMap[lowerName] || folderIconMap.default;
}
