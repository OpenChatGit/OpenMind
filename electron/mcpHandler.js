const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mcpToolsPath = null;
let loadedTools = [];

function initMcpHandler() {
  const projectRoot = path.join(__dirname, '..');
  mcpToolsPath = path.join(projectRoot, 'mcp-tools');
  
  // Create mcp-tools directory if it doesn't exist
  if (!fs.existsSync(mcpToolsPath)) {
    fs.mkdirSync(mcpToolsPath, { recursive: true });
    // Create example tool config
    const exampleConfig = {
      name: 'example-tool',
      description: 'Example MCP tool - replace with your own',
      enabled: false,
      command: 'node',
      args: ['tool.js'],
      env: {}
    };
    fs.writeFileSync(
      path.join(mcpToolsPath, 'example-tool.json'),
      JSON.stringify(exampleConfig, null, 2)
    );
  }
  
  console.log('MCP Tools directory:', mcpToolsPath);
  loadTools();
}

function loadTools() {
  loadedTools = [];
  
  if (!fs.existsSync(mcpToolsPath)) return;
  
  const entries = fs.readdirSync(mcpToolsPath, { withFileTypes: true });
  
  for (const entry of entries) {
    // Handle .json config files (simple tools)
    if (entry.isFile() && entry.name.endsWith('.json')) {
      try {
        const configPath = path.join(mcpToolsPath, entry.name);
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        loadedTools.push({
          id: entry.name.replace('.json', ''),
          name: config.name || entry.name.replace('.json', ''),
          description: config.description || '',
          enabled: config.enabled !== false,
          command: config.command,
          args: config.args || [],
          env: config.env || {},
          parameters: config.parameters,
          required: config.required,
          configPath,
          toolDir: mcpToolsPath
        });
      } catch (error) {
        console.error(`Error loading MCP tool ${entry.name}:`, error);
      }
    }
    
    // Handle directories (npm-style MCP packages)
    if (entry.isDirectory()) {
      const dirPath = path.join(mcpToolsPath, entry.name);
      const packageJsonPath = path.join(dirPath, 'package.json');
      const toolConfigPath = path.join(dirPath, 'tool.json');
      
      // Check for package.json (npm MCP package)
      if (fs.existsSync(packageJsonPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          
          // Check if it's an MCP tool (has mcp in keywords or name)
          const isMcp = pkg.keywords?.includes('mcp') || 
                        pkg.name?.includes('mcp') ||
                        pkg.description?.toLowerCase().includes('mcp');
          
          if (isMcp) {
            // Check for local tool.json config for enabled state
            let enabled = true;
            let env = {};
            if (fs.existsSync(toolConfigPath)) {
              const toolConfig = JSON.parse(fs.readFileSync(toolConfigPath, 'utf8'));
              enabled = toolConfig.enabled !== false;
              env = toolConfig.env || {};
            }
            
            // Determine the main entry point
            const mainFile = pkg.main || pkg.bin?.[Object.keys(pkg.bin || {})[0]] || 'dist/index.js';
            const mainPath = path.join(dirPath, mainFile);
            
            loadedTools.push({
              id: pkg.name || entry.name,
              name: pkg.name || entry.name,
              description: pkg.description || '',
              enabled: enabled,
              command: 'node',
              args: [mainPath],
              env: env,
              parameters: {
                query: {
                  type: 'string',
                  description: 'Search query or input for the tool'
                }
              },
              required: ['query'],
              configPath: toolConfigPath,
              toolDir: dirPath,
              isNpmPackage: true,
              needsBuild: !fs.existsSync(path.join(dirPath, 'dist'))
            });
            
            console.log(`Loaded MCP package: ${pkg.name} from ${entry.name}`);
          }
        } catch (error) {
          console.error(`Error loading MCP package ${entry.name}:`, error);
        }
      }
    }
  }
  
  console.log(`Loaded ${loadedTools.length} MCP tools`);
  return loadedTools;
}

function getTools() {
  return loadedTools;
}

function getEnabledTools() {
  return loadedTools.filter(t => t.enabled);
}

// Get tools in Ollama tool format for AI integration
function getOllamaToolDefinitions() {
  return loadedTools
    .filter(t => t.enabled)
    .map(tool => ({
      type: 'function',
      function: {
        name: `mcp_${tool.id}`,
        description: tool.description || `MCP Tool: ${tool.name}`,
        parameters: {
          type: 'object',
          properties: tool.parameters || {
            input: {
              type: 'string',
              description: 'Input for the tool (e.g., city name for weather)'
            }
          },
          required: tool.required || ['input']
        }
      }
    }));
}

function toggleTool(toolId, enabled) {
  const tool = loadedTools.find(t => t.id === toolId);
  if (!tool) return { success: false, error: 'Tool not found' };
  
  try {
    // For npm packages, create/update tool.json in the package directory
    if (tool.isNpmPackage) {
      const toolConfig = { enabled, env: tool.env || {} };
      fs.writeFileSync(tool.configPath, JSON.stringify(toolConfig, null, 2));
    } else {
      // For simple .json tools
      const config = JSON.parse(fs.readFileSync(tool.configPath, 'utf8'));
      config.enabled = enabled;
      fs.writeFileSync(tool.configPath, JSON.stringify(config, null, 2));
    }
    tool.enabled = enabled;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function refreshTools() {
  return loadTools();
}

async function executeTool(toolId, input) {
  const tool = loadedTools.find(t => t.id === toolId);
  if (!tool) return { success: false, error: 'Tool not found' };
  if (!tool.enabled) return { success: false, error: 'Tool is disabled' };
  
  console.log(`MCP executeTool: ${toolId}`, JSON.stringify(input));
  
  // Check if npm package needs to be built first
  if (tool.isNpmPackage && tool.needsBuild) {
    console.log(`Building MCP package: ${tool.id}`);
    try {
      const { execSync } = require('child_process');
      execSync('npm install && npm run build', { 
        cwd: tool.toolDir, 
        stdio: 'inherit',
        timeout: 60000 
      });
      tool.needsBuild = false;
    } catch (error) {
      return { success: false, error: `Failed to build MCP package: ${error.message}` };
    }
  }
  
  return new Promise((resolve) => {
    try {
      const proc = spawn(tool.command, tool.args, {
        cwd: tool.toolDir,
        env: { ...process.env, ...tool.env },
        shell: true
      });
      
      let stdout = '';
      let stderr = '';
      
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      if (input) {
        proc.stdin.write(JSON.stringify(input));
        proc.stdin.end();
      }
      
      proc.on('close', (code) => {
        if (code === 0) {
          try {
            resolve({ success: true, result: JSON.parse(stdout) });
          } catch {
            resolve({ success: true, result: stdout });
          }
        } else {
          resolve({ success: false, error: stderr || `Process exited with code ${code}` });
        }
      });
      
      proc.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        proc.kill();
        resolve({ success: false, error: 'Tool execution timed out' });
      }, 30000);
      
    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
}

function openToolsFolder() {
  const { shell } = require('electron');
  shell.openPath(mcpToolsPath);
}

module.exports = {
  initMcpHandler,
  getTools,
  getEnabledTools,
  getOllamaToolDefinitions,
  toggleTool,
  refreshTools,
  executeTool,
  openToolsFolder
};
