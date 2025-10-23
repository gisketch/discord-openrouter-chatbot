require('dotenv').config();
const { Client, GatewayIntentBits, Events, REST, Routes } = require('discord.js');
const config = require('./config.js');
const fs = require('fs');
const fetch = require('node-fetch');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Default configuration for channels
const channelSettings = new Map(Object.entries(config.channelConfig));

// Register slash commands
const commands = [
  {
    name: 'model',
    description: 'Change the AI model for this channel',
    options: [{
      name: 'model_name',
      description: 'The model name to use',
      type: 3,
      required: true
    }]
  }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('Successfully registered application commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
});

// Handle slash commands
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'model') {
    const model = interaction.options.getString('model_name');
    const channelId = interaction.channelId;

    // Update model for this channel
    const settings = channelSettings.get(interaction.channel.name) || {};
    settings.model = model;
    channelSettings.set(interaction.channel.name, settings);

    await interaction.reply(`Model set to ${model} for this channel`);
  }
});

// Handle messages
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  const channel = message.channel;
  const config = channelSettings.get(channel.name);

  if (!config) return; // Not a configured channel

  try {
    // Get channel history
    const messages = await channel.messages.fetch({ limit: config.historyLimit || 10 });
    const history = Array.from(messages.values())
      .reverse()
      .filter(m => !m.author.bot)
      .map(m => ({
        role: m.author.id === client.user.id ? 'assistant' : 'user',
        content: m.content
      }));

    // Load system prompt
    const prompt = fs.readFileSync(`./prompts/${config.prompt}`, 'utf-8');

    // Create message payload for OpenRouter
    const payload = {
      model: config.model || config.defaultModel,
      messages: [
        { role: 'system', content: prompt },
        ...history.slice(-config.historyLimit)
      ]
    };

    // Make API call
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://github.com/your-repo',
        'X-Title': 'Discord AI Assistant',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    const reply = data.choices[0]?.message?.content;

    if (reply) {
      await channel.send(reply);
    } else {
      console.error('No response from OpenRouter:', data);
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
});

client.login(process.env.DISCORD_TOKEN);

console.log('Bot is running!');
