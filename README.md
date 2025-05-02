# revolt-bot-base
Tool to simplify the creation of basic Revolt bots.  
  
**Links:**  
[GitHub](https://github.com/AstronomyOverdrive/revolt-bot-base) | [NPM](https://www.npmjs.com/package/@astronomyoverdrive/revolt-bot-base) | [Documentation](https://astronomyoverdrive.github.io/revolt-bot-base/)  
  
## Install
```
npm install @astronomyoverdrive/revolt-bot-base
```  
(will also install [ws](https://www.npmjs.com/package/ws))
## Example bot
```js
const bot = require("@astronomyoverdrive/revolt-bot-base");

bot.ConfigureBot({
    botToken: "YOUR_BOT_TOKEN", // Found in: Settings -> My Bots
    botUserId: "YOUR_BOT_USER_ID", // Found in: Settings -> My Bots
    serverId: "YOUR_SERVER_ID", // Right-click server -> Copy server ID
    APILogs: false, // Don't show events/responses in terminal
    chatLogs: "", // Don't keep a log of users messages
    prefix: "!", // Use "!" as command prefix
    removeCaller: true, // Remove the message that triggered the command
    badWords: [/\bemacs\b/, "vscode"], // Remove messages with these words
    blockEmbeds: true, // Remove messages using []()
    blockAttachments: true, // Remove messages using attachments
    badWordLevel: 3, // Ban users using bad words
    embedLevel: 1, // Warn users using embed
    attachmentLevel: 1 // Warn users using attachment
});

// Get Role IDs with: Server settings -> Roles -> ROLE ID
// Get Channel IDs with: Right-click channel -> Copy channel ID
// Get User IDs with: Right-click user -> Copy user ID

// !live
bot.RegisterCommand({
    usePrefix: true,
    command: "live",
    action: "Send",
    allowedRoles: ["STAFF_ROLE_ID"],
    allowedChannels: ["STAFF_BOT_CHANNEL_ID"],
    targetChannel: "LIVE_CHANNEL_ID",
    contents: "<@USER_ID> is now live at [TEXT](URL)"
});

// !announce [what to announce]
bot.RegisterCommand({
    usePrefix: true,
    command: "announce",
    action: "Send",
    allowedRoles: ["STAFF_ROLE_ID"],
    allowedChannels: ["STAFF_BOT_CHANNEL_ID"],
    targetChannel: "SERVER_ANNOUNCEMENTS_CHANNEL_ID",
    contents: ""
});

// !poll [what to vote on]
bot.RegisterCommand({
    usePrefix: true,
    command: "poll",
    action: "Poll",
    allowedRoles: [],
    allowedChannels: [],
    targetChannel: "",
    contents: ""
});

// !remove [message-link]
bot.RegisterCommand({
    usePrefix: true,
    command: "remove",
    action: "Remove",
    allowedRoles: ["STAFF_ROLE_ID"],
    allowedChannels: ["STAFF_BOT_CHANNEL_ID"]
});

// !kick <@userid> [reason]
bot.RegisterCommand({
    usePrefix: true,
    command: "kick",
    action: "Kick",
    allowedRoles: ["STAFF_ROLE_ID"],
    allowedChannels: ["STAFF_BOT_CHANNEL_ID"]
});

// !ban <@userid> [reason]
bot.RegisterCommand({
    usePrefix: true,
    command: "ban",
    action: "Ban",
    allowedRoles: ["STAFF_ROLE_ID"],
    allowedChannels: ["STAFF_BOT_CHANNEL_ID"]
});

// Accept
bot.RegisterCommand({
    usePrefix: false,
    command: "Accept",
    action: "AddRole",
    allowedRoles: [],
    allowedChannels: ["WELCOME_CHANNEL_ID"],
    contents: "MEMBER_ROLE_ID"
});

bot.startBot();
```
