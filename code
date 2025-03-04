// Discord Card Collecting Bot
// This bot allows players to collect, trade, and manage digital trading cards.
// Developed with features including packs, crafting, auctions, leaderboards, and live breaks.

const { Client, GatewayIntentBits } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();
const fs = require('fs');

// Load configuration files dynamically
const config = JSON.parse(fs.readFileSync('./config.json'));
const commands = JSON.parse(fs.readFileSync('./commands.json'));
const economy = JSON.parse(fs.readFileSync('./economy.json'));
const liveBreaks = JSON.parse(fs.readFileSync('./liveBreaks.json'));
const packs = JSON.parse(fs.readFileSync('./packs.json'));
const auction = JSON.parse(fs.readFileSync('./auction.json'));
const admin = JSON.parse(fs.readFileSync('./admin.json'));

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const db = new sqlite3.Database(config.databasePath, (err) => {
    if (err) console.error(err.message);
    console.log('Connected to the SQLite database.');
});

// Bot is ready event
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Basic command to test bot response
client.on('messageCreate', async (message) => {
    if (message.content.startsWith(commands.ping)) {
        message.reply('Pong! 🏓');
    }
});

// Economy System: Claim and Check Balance
client.on('messageCreate', async (message) => {
    if (message.content.startsWith(economy.claim)) {
        const userId = message.author.id;
        
        db.get(`SELECT balance FROM users WHERE user_id = ?`, [userId], (err, row) => {
            if (err) return message.reply('❌ Error accessing balance.');
            
            const amount = economy.claimAmount;
            if (!row) {
                db.run(`INSERT INTO users (user_id, balance) VALUES (?, ?)`, [userId, amount]);
            } else {
                db.run(`UPDATE users SET balance = balance + ? WHERE user_id = ?`, [amount, userId]);
            }
            message.reply(`✅ You have claimed **${amount} coins**! Your balance has been updated.`);
        });
    }
});

client.on('messageCreate', async (message) => {
    if (message.content.startsWith(economy.balance)) {
        const userId = message.author.id;
        
        db.get(`SELECT balance FROM users WHERE user_id = ?`, [userId], (err, row) => {
            if (err) return message.reply('❌ Error accessing balance.');
            
            const balance = row ? row.balance : 0;
            message.reply(`💰 Your current balance is: **${balance} coins**`);
        });
    }
});

// Live Breaks System - Join a Break
client.on('messageCreate', async (message) => {
    if (message.content.startsWith(liveBreaks.join)) {
        const args = message.content.split(' ');
        if (args.length < 2) return message.reply('Usage: !joinbreak <break_name>');
        
        const userId = message.author.id;
        const breakName = args[1];
        
        db.get(`SELECT id, price FROM live_breaks WHERE name = ?`, [breakName], (err, row) => {
            if (err || !row) return message.reply('❌ Live break not found.');
            
            const breakId = row.id;
            const price = row.price;
            
            db.get(`SELECT balance FROM users WHERE user_id = ?`, [userId], (err, userRow) => {
                if (err || !userRow || userRow.balance < price) {
                    return message.reply('❌ You do not have enough coins to join this break.');
                }
                
                db.run(`UPDATE users SET balance = balance - ? WHERE user_id = ?`, [price, userId]);
                db.run(`INSERT INTO live_break_entries (user_id, break_id) VALUES (?, ?)`, [userId, breakId]);
                
                message.reply(`✅ You have successfully joined the live break **${breakName}**!`);
            });
        });
    }
});

// Start the bot
client.login(process.env.TOKEN);
