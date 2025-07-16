require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');

const token = process.env.BOT_TOKEN;
const chatId = process.env.CHAT_ID;
const goalsPath = path.join(__dirname, 'goals.json');
const historyPath = path.join(__dirname, 'history.json');

if (!token || !chatId) {
  console.error("❌ BOT_TOKEN or CHAT_ID is missing in .env file");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// Debug incoming messages to find chat ID
bot.on('message', (msg) => {
  console.log('📥 Received message from chat ID:', msg.chat.id);
});

// Read goals
const readGoals = () => {
  try {
    const data = fs.readFileSync(goalsPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('⚠️ Failed to read goals:', err);
    return [];
  }
};

const writeGoals = (goals) => {
  fs.writeFileSync(goalsPath, JSON.stringify(goals, null, 2));
};

const appendToHistory = (goal) => {
  const history = fs.existsSync(historyPath)
    ? JSON.parse(fs.readFileSync(historyPath, 'utf8'))
    : [];
  history.push({ ...goal, completedAt: new Date().toISOString() });
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
};

// Commands
bot.onText(/\/goals/, (msg) => {
  const goals = readGoals().filter(g => !g.completed);
  if (goals.length === 0) {
    return bot.sendMessage(chatId, "🎉 No pending goals!");
  }
  const text = goals.map(g => `- [${g.category}] ${g.text}`).join('\n');
  bot.sendMessage(chatId, `🎯 *Your Pending Goals:*\n${text}`, { parse_mode: 'Markdown' });
});

bot.onText(/\/addgoal (.+)\|(.+)/, (msg, match) => {
  const text = match[1].trim();
  const category = match[2].trim();
  const goals = readGoals();
  goals.push({ id: uuidv4(), text, category, completed: false, recurring: false });
  writeGoals(goals);
  bot.sendMessage(chatId, `✅ Goal added: [${category}] ${text}`);
});

// Send reminder from category
const sendCategory = (category) => {
  try {
    const goals = readGoals();
    const goal = goals.find(g => g.category === category && !g.completed);
    if (goal) {
      bot.sendMessage(chatId, `⏰ Reminder: [${goal.category}] ${goal.text}`);
    }
  } catch (err) {
    console.error(`⚠️ Error sending ${category} reminder:`, err);
  }
};

// Schedules
cron.schedule('0 9 * * *', () => sendCategory("🏃 Health"));
cron.schedule('0 14 * * *', () => sendCategory("💼 Work"));
cron.schedule('0 20 * * *', () => sendCategory("👤 Personal"));

console.log("🤖 Telegram bot is running and waiting for commands...");
