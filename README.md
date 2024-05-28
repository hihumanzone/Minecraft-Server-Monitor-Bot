# Minecraft Server Monitor Bot

Welcome to the Minecraft Server Monitor Bot! This bot helps you monitor the status of a Minecraft server, and can even attempt to restart it if it goes offline. The bot posts notifications directly to a Discord channel of your choice.

---

## Features

- **Setup Command `/setup`:** Configure the bot to monitor a Minecraft server by providing the server IP and a Discord channel for notifications. Optional parameters for Pterodactyl Panel integration are also available.
- **Status Command `/mc_status`:** Check the current status of your Minecraft server with a simple command.
- **Start Command `/mc_start`:** Attempt to start the Minecraft server if it is offline, using the Pterodactyl Panel API.

---

## Commands

1. **`/setup`**: Initializes the monitoring of a Minecraft server.
   - `server_ip` (required): The IP of the Minecraft server.
   - `channel` (required): The channel where notifications will be sent.
   - `panel_link` (optional): Link to the Pterodactyl panel.
   - `server_id` (optional): Server ID on the panel.
   - `api_key` (optional): API key for the panel.

2. **`/mc_status`**: Reports the current status of the Minecraft server.

3. **`/mc_start`**: Attempts to start the server if it is offline.

---

## Installation

### Prerequisites

- Node.js (v16+)
- NPM or Yarn
- A Discord bot token
- Optional: Pterodactyl Panel setup for automated restarts

### Steps

1. Clone the repository:

    ```bash
    git clone https://github.com/yourusername/minecraft-server-monitor-bot.git
    cd minecraft-server-monitor-bot
    ```

2. Install the required dependencies:

    ```bash
    npm install
    ```

    or

    ```bash
    yarn install
    ```

3. Create a `config.json` file (this will be managed by the bot automatically).

4. Add your bot token to the script:

    ```javascript
    client.login('your-bot-token');
    ```

5. Start the bot:

    ```bash
    node bot.js
    ```

---

## Usage

1. Invite the bot to your Discord server.

2. Use the `/setup` command to configure the bot with your Minecraft server's IP and a channel for notifications.

3. Use `/mc_status` to check the current status of the Minecraft server.

4. Use `/mc_start` to attempt to start the server if it is offline.

---

## Configuration

### `config.json`

The bot uses a `config.json` file to store configurations for each Discord server. This file is managed automatically by the bot, but should you need to inspect or modify it manually, it stores configurations as an array of entries, where each entry includes:

- `ip`: Minecraft server IP
- `port`: Minecraft server port
- `channel`: Discord channel ID for notifications
- `panelLink`: Link to the Pterodactyl panel (optional)
- `serverId`: Server ID on the panel (optional)
- `apiKey`: API key for the panel (optional)
- `guildOwner`: Discord guild owner ID
- `restartTimeout`: Timeout ID for automatic restart attempts
- `offlineNotified`: Boolean flag for offline notifications

---

## Contributions

Feel free to fork this repository and submit pull requests. Contributions are welcome!

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

---

## Support

For issues or support, please open an issue on the [GitHub repository](https://github.com/yourusername/minecraft-server-monitor-bot/issues).

---

Happy monitoring! 🎮
