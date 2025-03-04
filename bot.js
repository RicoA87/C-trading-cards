// Discord Card Collecting Bot with Slash Commands
// This bot allows players to collect, trade, and manage digital trading cards.
// Features include packs, crafting, auctions, leaderboards, and live breaks.

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();
const fs = require('fs');

// Load configuration files
const config = JSON.parse(fs.readFileSync('./config.json'));
const commands = JSON.parse(fs.readFileSync('./commands.json'));
const economy = JSON.parse(fs.readFileSync('./economy.json'));
const liveBreaks = JSON.parse(fs.readFileSync('./liveBreaks.json'));
const packs = JSON.parse(fs.readFileSync('./packs.json'));
const auction = JSON.parse(fs.readFileSync('./auction.json'));
const admin = JSON.parse(fs.readFileSync('./admin.json'));

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const db = new sqlite3.Database(config.databasePath, (err) => {
    if (err) console.error(err.message);
    console.log('Connected to the SQLite database.');
});

// Define slash commands
const slashCommands = [
    new SlashCommandBuilder().setName('ping').setDescription('Check bot response'),
    new SlashCommandBuilder().setName('claim').setDescription('Claim your daily coins'),
    new SlashCommandBuilder().setName('balance').setDescription('Check your balance'),
    new SlashCommandBuilder().setName('joinbreak').setDescription('Join a live break').addStringOption(option => option.setName('break_name').setDescription('Name of the break').setRequired(true))
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

    const { commandName } = interaction;
    const userId = interaction.user.id;

    if (commandName === 'ping') {
        await interaction.reply('🏓 Pong!');
    } else if (commandName === 'claim') {
        db.get(`SELECT balance FROM users WHERE user_id = ?`, [userId], (err, row) => {
            if (err) return interaction.reply('❌ Error accessing balance.');
            
            const amount = economy.claimAmount;
            if (!row) {
                db.run(`INSERT INTO users (user_id, balance) VALUES (?, ?)`, [userId, amount]);
            } else {
                db.run(`UPDATE users SET balance = balance + ? WHERE user_id = ?`, [amount, userId]);
            }
            interaction.reply(`✅ You have claimed **${amount} coins**! Your balance has been updated.`);
        });
    } else if (commandName === 'balance') {
        db.get(`SELECT balance FROM users WHERE user_id = ?`, [userId], (err, row) => {
            if (err) return interaction.reply('❌ Error accessing balance.');
            
            const balance = row ? row.balance : 0;
            interaction.reply(`💰 Your current balance is: **${balance} coins**`);
        });
    } else if (commandName === 'joinbreak') {
        const breakName = interaction.options.getString('break_name');
        
        db.get(`SELECT id, price FROM live_breaks WHERE name = ?`, [breakName], (err, row) => {
            if (err || !row) return interaction.reply('❌ Live break not found.');
            
            const breakId = row.id;
            const price = row.price;
            
            db.get(`SELECT balance FROM users WHERE user_id = ?`, [userId], (err, userRow) => {
                if (err || !userRow || userRow.balance < price) {
                    return interaction.reply('❌ You do not have enough coins to join this break.');
                }
                
                db.run(`UPDATE users SET balance = balance - ? WHERE user_id = ?`, [price, userId]);
                db.run(`INSERT INTO live_break_entries (user_id, break_id) VALUES (?, ?)`, [userId, breakId]);
                
                interaction.reply(`✅ You have successfully joined the live break **${breakName}**!`);
            });
        });
    }
});

// Start the bot
client.login(process.env.TOKEN);
