// Discord Card Collecting Bot with Slash Commands
// This bot allows players to collect, trade, and manage digital trading cards.
// Features include packs, crafting, auctions, leaderboards, and live breaks.

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();
const fs = require('fs');

// Load configuration files
const config = JSON.parse(fs.readFileSync('./config.json'));
const economy = JSON.parse(fs.readFileSync('./economy.json'));

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const db = new sqlite3.Database('./cards.db', (err) => {
    if (err) {
        console.error("❌ Database Connection Error:", err.message);
    } else {
        console.log("✅ Connected to the SQLite database.");
    }
});

// Ensure tables exist
db.run(`CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    balance INTEGER DEFAULT 0,
    last_claim INTEGER DEFAULT 0
)`, (err) => {
    if (err) console.error("❌ Error creating users table:", err.message);
    else console.log("✅ Users table is ready.");
});

db.run(`CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    image_url TEXT,
    rarity TEXT,
    value INTEGER
)`, (err) => {
    if (err) console.error("❌ Error creating cards table:", err.message);
    else console.log("✅ Cards table is ready.");
});

// Define slash commands
const slashCommands = [
    new SlashCommandBuilder().setName('ping').setDescription('Check bot response'),
    new SlashCommandBuilder().setName('claim').setDescription('Claim your daily coins'),
    new SlashCommandBuilder().setName('balance').setDescription('Check your balance'),
    new SlashCommandBuilder().setName('addcard')
        .setDescription('Add a new card to the collection (Admin Only)')
        .addStringOption(option => option.setName('name').setDescription('Card Name').setRequired(true))
        .addStringOption(option => option.setName('image').setDescription('Image URL').setRequired(true))
        .addStringOption(option => option.setName('rarity').setDescription('Rarity Level').setRequired(true))
        .addIntegerOption(option => option.setName('value').setDescription('Coin Value').setRequired(true))
].map(command => command.toJSON());

// Register Slash Commands
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    
    try {
        console.log("Registering slash commands...");
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: slashCommands }
        );
        console.log("✅ Slash commands registered successfully!");
    } catch (error) {
        console.error("❌ Error registering slash commands:", error);
    }
});

// Handle slash command interactions
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const userId = interaction.user.id;
    const now = Date.now();
    const cooldown = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

    if (interaction.commandName === 'claim') {
        db.get(`SELECT balance, last_claim FROM users WHERE user_id = ?`, [userId], (err, row) => {
            if (err) {
                console.error("❌ Database Error:", err.message);
                return interaction.reply('❌ Error accessing balance.');
            }

            if (row && now - row.last_claim < cooldown) {
                const remainingTime = Math.ceil((cooldown - (now - row.last_claim)) / (60 * 60 * 1000));
                return interaction.reply(`⏳ You can claim again in **${remainingTime} hours**.`);
            }

            const amount = 250; // Default claim amount
            if (!row) {
                db.run(`INSERT INTO users (user_id, balance, last_claim) VALUES (?, ?, ?)`, [userId, amount, now], (err) => {
                    if (err) {
                        console.error("❌ Error inserting new user:", err.message);
                        return interaction.reply('❌ Could not claim coins.');
                    }
                    interaction.reply(`✅ You have claimed **${amount} coins**!`);
                });
            } else {
                db.run(`UPDATE users SET balance = balance + ?, last_claim = ? WHERE user_id = ?`, [amount, now, userId], (err) => {
                    if (err) {
                        console.error("❌ Error updating balance:", err.message);
                        return interaction.reply('❌ Could not claim coins.');
                    }
                    interaction.reply(`✅ You have claimed **${amount} coins**! Your new balance is **${row.balance + amount}**.`);
                });
            }
        });
    }
    
    if (interaction.commandName === 'debugcards') {
        db.all(`SELECT * FROM cards`, [], (err, rows) => {
            if (err) {
                console.error("❌ Database Error:", err.message);
                return interaction.reply('❌ Error retrieving cards.');
            }
            if (rows.length === 0) {
                return interaction.reply('📂 No cards found in the database.');
            }
            let cardList = rows.map(card => `**${card.name}** - ${card.rarity} (${card.value} coins)`).join("\n");
            interaction.reply(`📋 **Stored Cards:**\n${cardList}`);
        });
    }
});

// Start the bot
client.login(process.env.TOKEN);
