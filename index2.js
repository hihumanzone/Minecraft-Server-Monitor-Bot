const fs = require('fs');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const mcping = require('mcping-js');
const { request } = require('undici');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
let config = new Map();

function loadConfig() {
    try {
        let rawData = fs.readFileSync('config.json');
        let savedConfig = JSON.parse(rawData);
        config = new Map(savedConfig);
    } catch (error) {
        console.error('Failed to load the config file:', error);
    }
}

function saveConfig() {
    try {
        let jsonData = JSON.stringify(Array.from(config.entries()));
        fs.writeFileSync('config.json', jsonData);
    } catch (error) {
        console.error('Failed to save the config file:', error);
    }
}

client.once('ready', () => {
    console.log('Bot is now connected');
    loadConfig(); // Load configuration on startup
    
    client.application.commands.set([
        {
            name: 'setup',
            description: 'Initializes the monitoring of a Minecraft server',
            options: [
                { name: 'server_ip', type: 3, description: 'The IP of the Minecraft server', required: true },
                { name: 'channel', type: 7, description: 'The channel where notifications will be sent', required: true },
                { name: 'panel_link', type: 3, description: 'Link to the Pterodactyl panel (optional)', required: false },
                { name: 'server_id', type: 3, description: 'Server ID on the panel (optional)', required: false },
                { name: 'api_key', type: 3, description: 'API key for the panel (optional)', required: false }
            ]
        },
        {
            name: 'mc_status',
            description: 'Reports the current status of the server'
        },
        {
            name: 'mc_start',
            description: 'Attempts to start the server if it\'s offline'
        }
    ]);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options, guild } = interaction;

    try {
        if (commandName === 'setup') {
            await interaction.deferReply();
            
            const serverIp = options.getString('server_ip');
            const channel = options.getChannel('channel');
            const panelLink = options.getString('panel_link');
            const serverId = options.getString('server_id');
            const apiKey = options.getString('api_key');
            const guildOwner = guild.ownerId;

            const [ip, port = 25565] = serverIp.split(':');
            config.set(interaction.guildId, { ip, port, channel: channel.id, panelLink, serverId, apiKey, restartTimeout: null, guildOwner });

            saveConfig();
            const embed = new EmbedBuilder().setTitle('Setup Complete :✅').setDescription(`Monitoring setup for server \`${serverIp}\` in <#${channel.id}>.`).setColor(0x00FF00);
            await interaction.editReply({ embeds: [embed] });
        } else if (commandName === 'mc_status') {
            await interaction.deferReply();

            const serverInfo = config.get(interaction.guildId);
            if (!serverInfo) {
                const embed = new EmbedBuilder().setTitle('Error: ⛔').setDescription('Server setup not found.  Use `/setup` to configure the server IP and notifications channel.').setColor(0xFF0000);
                await interaction.editReply({ embeds: [embed] });
                return;
            }

            const { ip, port } = serverInfo;
            const minecraftServer = new mcping.MinecraftServer(ip, parseInt(port));

            minecraftServer.ping(6000, -1, async (err, res) => {
                if (err) {
                    const embed = new EmbedBuilder().setTitle('Server Status :🛑').setDescription(`### Minecraft server is currently offline.\n**IP**: \`${ip}:${port}\``).setColor(0xFF0000);
                    await interaction.editReply({ embeds: [embed] });
                } else {
                    const embed = new EmbedBuilder().setTitle('Server Status :🟢').setDescription(`### Minecraft server is online.\n**IP**: \`${ip}:${port}\`\n**Version**: \`${res.version.name}\`\n **Players**: \`${res.players.online}\`/\`${res.players.max}\``).setColor(0x00FF00);
                    await interaction.editReply({ embeds: [embed] });
                }
            });
        } else if (commandName === 'mc_start') {
            await interaction.deferReply();

            const serverInfo = config.get(interaction.guildId);
            if (!serverInfo || !serverInfo.panelLink || !serverInfo.serverId || !serverInfo.apiKey) {
                const embed = new EmbedBuilder().setTitle('Error :⛔').setDescription('Complete setup information not provided for automatic restart.').setColor(0xFF0000);
                await interaction.editReply({ embeds: [embed] });
                return;
            }

            if (await sendPowerSignal(serverInfo.panelLink, serverInfo.serverId, serverInfo.apiKey)) {
                const embed = new EmbedBuilder().setTitle('Restart Initiated :🔄').setDescription('### Server restart initiated.').setColor(0x00FF00);
                await interaction.editReply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder().setTitle('Error :⛔').setDescription('Failed to start the server, please check the panel manually.').setColor(0xFF0000);
                await interaction.editReply({ embeds: [embed] });
            }
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
    }
});

async function sendPowerSignal(panelLink, serverId, apiKey) {
  const apiUrl = `https://${panelLink}/api/client/servers/${serverId}/power`;
  const signalData = JSON.stringify({ signal: 'start' });

  try {
    const { statusCode } = await request(apiUrl, {
      method: 'POST',
      body: signalData,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 10000
    });

    if (statusCode !== 204) {
      throw new Error(`Request failed with status code ${statusCode}`);
    }

    return true;
  } catch (error) {
    console.error('Error sending power signal:', error);
    return false;
  }
}

// Monitor server status
setInterval(async () => {
  for (let [guildId, info] of config) {
    const { ip, port, channel, panelLink, serverId, apiKey, restartTimeout, guildOwner } = info;
    const minecraftServer = new mcping.MinecraftServer(ip, port);

    const pingServer = () => new Promise((resolve) => {
      minecraftServer.ping(6000, -1, (err, res) => resolve({ err, res }));
    });

    let isOnline = false;
    let error, result;

    // Retry up to 3 times
    for (let i = 0; i < 3; i++) {
      ({ err: error, res: result } = await pingServer());
      if (result) {
        isOnline = true;
        break;
      }
    }

    const channelObject = await client.channels.fetch(channel);

    if (!isOnline && !info.offlineNotified) { // If all retries fail
      const embed = new EmbedBuilder()
        .setTitle('Server Offline :🛑')
        .setDescription(`### The Minecraft server is offline.\n**IP**: \`${ip}:${port}\``)
        .setColor(0xFF0000);

      await channelObject.send({ content: `<@${guildOwner}>`, embeds: [embed] });
      info.offlineNotified = true;
      retryServerStart(channelObject, info, ip, port, guildOwner, panelLink, serverId, apiKey);
    } else if (isOnline && info.offlineNotified) { // If any retry shows online
      const onlineEmbed = new EmbedBuilder()
        .setTitle('Server Online :🟢')
        .setDescription(`### Minecraft server is back online.\n**IP**: \`${ip}:${port}\``)
        .setColor(0x00FF00);

      await channelObject.send({ embeds: [onlineEmbed] });
      clearTimeout(info.restartTimeout);
      info.offlineNotified = false;
    }
  }
}, 60000); // Check every minute

async function retryServerStart(channelObject, info, ip, port, guildOwner, panelLink, serverId, apiKey) {
  info.restartTimeout = setTimeout(async () => {
    if (!info.offlineNotified) { // If server is reported back online, cancel the restart.
      clearTimeout(info.restartTimeout);
      return;
    }

    if (panelLink && serverId && apiKey) { // Automated restart process if configured
      if (await sendPowerSignal(panelLink, serverId, apiKey)) {
        const restartEmbed = new EmbedBuilder()
          .setTitle('Restart Attempt :🔄')
          .setDescription(`Server restart attempt initiated after offline detection.\n**IP**: \`${ip}:${port}\``)
          .setColor(0xFFFF00);

        channelObject.send({ content: `<@${guildOwner}>`, embeds: [restartEmbed] });
      } else {
        const failEmbed = new EmbedBuilder()
          .setTitle('Restart Failed :⛔')
          .setDescription(`Failed to initiate server restart.\nPlease check manually.\n**IP**: \`${ip}:${port}\``)
          .setColor(0xFF0000);

        channelObject.send({ content: `<@${guildOwner}>`, embeds: [failEmbed] });
      }
    }
  }, 150000); // 2.5 minutes delay before restart attempt
}

client.login('your-bot-token');