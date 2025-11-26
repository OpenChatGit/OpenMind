const path = require('path');
const fs = require('fs');

let chatsDbPath = null;
let chatsDb = { chats: [] };

function initDatabase() {
  // Use project's data folder instead of app data
  const projectRoot = path.join(__dirname, '..');
  const dataDir = path.join(projectRoot, 'data');
  
  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  chatsDbPath = path.join(dataDir, 'chats.json');
  
  // Load existing chats database or create new one
  if (fs.existsSync(chatsDbPath)) {
    try {
      const data = fs.readFileSync(chatsDbPath, 'utf8');
      chatsDb = JSON.parse(data);
    } catch (error) {
      console.error('Error loading chats database:', error);
      chatsDb = { chats: [] };
    }
  } else {
    chatsDb = { chats: [] };
    saveChatsDatabase();
  }
  
  console.log('Chats database initialized at:', chatsDbPath);
}

function saveChatsDatabase() {
  if (chatsDbPath) {
    try {
      fs.writeFileSync(chatsDbPath, JSON.stringify(chatsDb, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving chats database:', error);
    }
  }
}

// Chat persistence functions
function loadChats() {
  return { success: true, chats: chatsDb.chats || [] };
}

function saveChats(chats) {
  try {
    chatsDb.chats = chats;
    saveChatsDatabase();
    return { success: true };
  } catch (error) {
    console.error('Error saving chats:', error);
    return { success: false, error: error.message };
  }
}

function saveChat(chat) {
  try {
    const index = chatsDb.chats.findIndex(c => c.id === chat.id);
    if (index >= 0) {
      chatsDb.chats[index] = chat;
    } else {
      chatsDb.chats.unshift(chat);
    }
    saveChatsDatabase();
    return { success: true };
  } catch (error) {
    console.error('Error saving chat:', error);
    return { success: false, error: error.message };
  }
}

function deleteChat(chatId) {
  try {
    chatsDb.chats = chatsDb.chats.filter(c => c.id !== chatId);
    saveChatsDatabase();
    return { success: true };
  } catch (error) {
    console.error('Error deleting chat:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  initDatabase,
  loadChats,
  saveChats,
  saveChat,
  deleteChat
};
