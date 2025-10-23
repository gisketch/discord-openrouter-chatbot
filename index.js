// Check Node.js version before proceeding
const [major, minor] = process.version.slice(1).split('.').map(Number);
if (major < 22 || (major === 22 && minor < 12)) {
  console.error(`❌ Node.js v22.12.0 or newer required (current: ${process.version})`);
  process.exit(1);
}

require('dotenv').config();
const { Client, GatewayIntentBits, Events, REST, Routes } = require('discord.js');
const config = require('./config.js');
const fs = require('fs');
const fetch = require('node-fetch');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageTyping
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
  },
  {
    name: 'purge',
    description: 'Delete messages in this channel',
    options: [{
      name: 'amount',
      description: 'Number of messages to delete (leave blank to delete all)',
      type: 4,
      required: false
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
  } else if (interaction.commandName === 'purge') {
    await interaction.deferReply({ ephemeral: true });
    
    const amount = interaction.options.getInteger('amount');
    const channel = interaction.channel;
    
    try {
      if (amount) {
        // Delete specific number of messages
        const messages = await channel.messages.fetch({ limit: amount + 1 });
        await channel.bulkDelete(messages);
        await interaction.editReply(`Deleted ${messages.size - 1} messages`);
      } else {
        // Delete all messages in the channel
        let deletedCount = 0;
        let messages;
        
        do {
          // Fetch messages in batches of 100
          messages = await channel.messages.fetch({ limit: 100 });
          if (messages.size === 0) break;
          
          await channel.bulkDelete(messages);
          deletedCount += messages.size;
        } while (messages.size >= 2); // Continue until less than 2 messages remain
        
        await interaction.editReply(`Deleted ${deletedCount} messages`);
      }
    } catch (error) {
      console.error('Purge error:', error);
      await interaction.editReply('Error deleting messages: ' + error.message);
    }
  }
});

// Handle messages
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  const channel = message.channel;
  const config = channelSettings.get(channel.name);

  if (!config) return; // Not a configured channel

  try {
    // Show typing indicator while processing
    await channel.sendTyping();
    
    // Get channel history
    const messages = await channel.messages.fetch({ limit: config.historyLimit || 10 });
    const history = Array.from(messages.values())
      .reverse()
      .filter(m => !m.author.bot)
      .map(m => ({
        role: m.author.id === client.user.id ? 'assistant' : 'user',
        content: m.content
      }));

    // Load prompts
    const userContext = fs.readFileSync('./user_context.txt', 'utf-8');
    const channelPrompt = fs.readFileSync(`./prompts/${config.prompt}`, 'utf-8');
    const fullSystemPrompt = `USER is ${userContext.trim()}\nYour system prompt: ${channelPrompt.trim()}`;

    // Create message payload for OpenRouter with reasoning disabled
    const payload = {
      model: config.model || config.defaultModel,
      reasoning: {
        exclude: true  // Disable reasoning tokens in response
      },
      messages: [
        { role: 'system', content: fullSystemPrompt },
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
      // If reasoning is disabled, send immediately
      if (!config.reasoning) {
        await channel.send(reply);
      } else {
        // For models with reasoning, wait a brief moment before replying
        await new Promise(resolve => setTimeout(resolve, 1500));
        await channel.send(reply);
      }
    } else {
      console.error('No response from OpenRouter:', data);
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
});

client.login(process.env.DISCORD_TOKEN);

console.log('Bot is running!');
