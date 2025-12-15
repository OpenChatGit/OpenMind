const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');

// Simple local auth system with encrypted storage
// Store in secure userData folder (e.g., %APPDATA% on Windows, ~/Library/Application Support on macOS)
let AUTH_FILE = null;
let TOKENS_FILE = null;

// Generate a machine-specific encryption key based on hardware
function getMachineKey() {
  const os = require('os');
  const machineId = `${os.hostname()}-${os.platform()}-${os.arch()}-${os.cpus()[0]?.model || 'cpu'}`;
  return crypto.createHash('sha256').update(machineId).digest('hex').slice(0, 32);
}

const ENCRYPTION_KEY = getMachineKey();

// Initialize file paths (must be called after app is ready)
function initPaths() {
  if (!AUTH_FILE) {
    const userDataPath = app.getPath('userData');
    const secureDir = path.join(userDataPath, 'secure');
    
    // Create secure directory if it doesn't exist
    if (!fs.existsSync(secureDir)) {
      fs.mkdirSync(secureDir, { recursive: true });
    }
    
    AUTH_FILE = path.join(secureDir, 'auth.enc');
    TOKENS_FILE = path.join(secureDir, 'tokens.enc');
    
    console.log('Auth storage location:', secureDir);
  }
}

// Ensure paths are initialized
function ensureInit() {
  if (!AUTH_FILE) {
    initPaths();
  }
}

// Encrypt data
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Decrypt data
function decrypt(text) {
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    return null;
  }
}

// Hash password
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Load auth data
function loadAuthData() {
  ensureInit();
  try {
    if (fs.existsSync(AUTH_FILE)) {
      const encrypted = fs.readFileSync(AUTH_FILE, 'utf8');
      const decrypted = decrypt(encrypted);
      if (decrypted) {
        return JSON.parse(decrypted);
      }
    }
  } catch (e) {
    console.error('Error loading auth data:', e);
  }
  return { users: [], currentUser: null };
}

// Save auth data
function saveAuthData(data) {
  ensureInit();
  const encrypted = encrypt(JSON.stringify(data));
  fs.writeFileSync(AUTH_FILE, encrypted);
}

// Load tokens (HuggingFace, API keys, etc.) - separate file for extra security
function loadTokens() {
  ensureInit();
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      const encrypted = fs.readFileSync(TOKENS_FILE, 'utf8');
      const decrypted = decrypt(encrypted);
      if (decrypted) {
        return JSON.parse(decrypted);
      }
    }
  } catch (e) {
    console.error('Error loading tokens:', e);
  }
  return {};
}

// Save tokens
function saveTokens(tokens) {
  ensureInit();
  const encrypted = encrypt(JSON.stringify(tokens));
  fs.writeFileSync(TOKENS_FILE, encrypted);
}

// Store a token securely
function storeToken(key, value) {
  const tokens = loadTokens();
  tokens[key] = {
    value,
    storedAt: new Date().toISOString(),
  };
  saveTokens(tokens);
  return { success: true };
}

// Get a stored token
function getToken(key) {
  const tokens = loadTokens();
  return tokens[key]?.value || null;
}

// Delete a stored token
function deleteToken(key) {
  const tokens = loadTokens();
  delete tokens[key];
  saveTokens(tokens);
  return { success: true };
}

// Register new user
function register(email, password, name) {
  const data = loadAuthData();
  
  // Check if email already exists
  if (data.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, error: 'Email already registered' };
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: 'Invalid email format' };
  }
  
  // Validate password length
  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }
  
  const user = {
    id: crypto.randomUUID(),
    email: email.toLowerCase(),
    name: name || email.split('@')[0],
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
    huggingface: null, // Will store HF connection info
    subscription: null, // Will store subscription info
  };
  
  data.users.push(user);
  data.currentUser = user.id;
  saveAuthData(data);
  
  return { 
    success: true, 
    user: { id: user.id, email: user.email, name: user.name }
  };
}

// Login user
function login(email, password) {
  const data = loadAuthData();
  
  const user = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return { success: false, error: 'User not found' };
  }
  
  if (user.passwordHash !== hashPassword(password)) {
    return { success: false, error: 'Invalid password' };
  }
  
  data.currentUser = user.id;
  saveAuthData(data);
  
  return { 
    success: true, 
    user: { 
      id: user.id, 
      email: user.email, 
      name: user.name,
      avatar: user.avatar || null,
      huggingface: user.huggingface,
      subscription: user.subscription,
    }
  };
}

// Logout user
function logout() {
  const data = loadAuthData();
  data.currentUser = null;
  saveAuthData(data);
  return { success: true };
}

// Get current user
function getCurrentUser() {
  const data = loadAuthData();
  if (!data.currentUser) {
    return { success: false, user: null };
  }
  
  const user = data.users.find(u => u.id === data.currentUser);
  if (!user) {
    return { success: false, user: null };
  }
  
  return { 
    success: true, 
    user: { 
      id: user.id, 
      email: user.email, 
      name: user.name,
      avatar: user.avatar || null,
      huggingface: user.huggingface,
      subscription: user.subscription,
    }
  };
}

// Update user profile
function updateProfile(updates) {
  const data = loadAuthData();
  if (!data.currentUser) {
    return { success: false, error: 'Not logged in' };
  }
  
  const userIndex = data.users.findIndex(u => u.id === data.currentUser);
  if (userIndex === -1) {
    return { success: false, error: 'User not found' };
  }
  
  // Only allow updating certain fields
  if (updates.name) data.users[userIndex].name = updates.name;
  if (updates.avatar !== undefined) data.users[userIndex].avatar = updates.avatar;
  if (updates.huggingface !== undefined) data.users[userIndex].huggingface = updates.huggingface;
  if (updates.subscription !== undefined) data.users[userIndex].subscription = updates.subscription;
  
  saveAuthData(data);
  
  return { 
    success: true, 
    user: {
      id: data.users[userIndex].id,
      email: data.users[userIndex].email,
      name: data.users[userIndex].name,
      avatar: data.users[userIndex].avatar || null,
      huggingface: data.users[userIndex].huggingface,
      subscription: data.users[userIndex].subscription,
    }
  };
}

// Connect HuggingFace account
function connectHuggingFace(hfToken, hfUsername) {
  return updateProfile({
    huggingface: {
      token: hfToken,
      username: hfUsername,
      connectedAt: new Date().toISOString(),
    }
  });
}

// Disconnect HuggingFace account
function disconnectHuggingFace() {
  return updateProfile({ huggingface: null });
}

// Change password
function changePassword(currentPassword, newPassword) {
  const data = loadAuthData();
  if (!data.currentUser) {
    return { success: false, error: 'Not logged in' };
  }
  
  const userIndex = data.users.findIndex(u => u.id === data.currentUser);
  if (userIndex === -1) {
    return { success: false, error: 'User not found' };
  }
  
  if (data.users[userIndex].passwordHash !== hashPassword(currentPassword)) {
    return { success: false, error: 'Current password is incorrect' };
  }
  
  if (newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters' };
  }
  
  data.users[userIndex].passwordHash = hashPassword(newPassword);
  saveAuthData(data);
  
  return { success: true };
}

module.exports = {
  initPaths,
  register,
  login,
  logout,
  getCurrentUser,
  updateProfile,
  connectHuggingFace,
  disconnectHuggingFace,
  changePassword,
  storeToken,
  getToken,
  deleteToken,
};
