/*
    Revolt Bot Base - Simplify the creation of basic revolt bots!

    Copyright (C) 2025 William Pettersson

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
import WebSocket from "ws";

let commands = [];
let recurring = [];
let lastRecurring;
let botConfig = {
    botToken: "",
    botUserId: "",
    serverId: "",
    APILogs: false,
    chatLogs: "",
    modLogs: "",
    prefix: "!",
    removeCaller: false,
    badWords: [],
    blockEmbeds: false,
    blockAttachments: false,
    badWordLevel: 3,
    embedLevel: 1,
    attachmentLevel: 1
}
let pollText = false;

console.log(
` ___   ___         ___       _____
|   | |    \\    / /   \\ |      |
|__/  |--   \\  /  |   | |      |
|  \\  |___   \\/   \\___/ |___   |
 ___    ___  _____
|   /  /   \\   |
|---\\  |   |   |
|___/  \\___/   |
 ___          ___  ___
|   /   /\\   /__  |
|---\\  /__\\     \\ |--
|___/ /    \\ ___/ |___
v25.06b
William Pettersson
Licensed under GPL-3.0
Read the docs at: https://astronomyoverdrive.github.io/revolt-bot-base/
`);

function startBot() {
    if (botConfig.botToken !== "") {
        let heartbeat;
        const Socket = new WebSocket(`wss://ws.revolt.chat?version=1&format=json&token=${botConfig.botToken}`);

        Socket.addEventListener("open", (event) => {
            console.log("Websocket connection open");
            Socket.send(`{"type":"Authenticate","token":"{${botConfig.botToken}}"}`);
            heartbeat = setInterval(ping, 25000, Socket); // Should be every 10-30s according to the docs
        });

        Socket.addEventListener("close", (event) => {
            console.log("Attempting reconnect in 20 seconds.");
            clearInterval(heartbeat);
            setTimeout(() => {
                startBot();
            }, 20000);
        });

        Socket.addEventListener("message", (event) => {
            if (botConfig.APILogs) {
                console.log(event.data, "\n\n");
            }
            const ServerMessage = JSON.parse(event.data);
            if (ServerMessage.type === "Message" && ServerMessage.member._id.server === botConfig.serverId) {
                if (ServerMessage.author === botConfig.botUserId) { // Sent by the bot
                    if (pollText !== false && ServerMessage.content === pollText) { // Add reactions to polls
                        pollText = false;
                        makeRequest("PollReact1", [ServerMessage.channel, ServerMessage._id]);
                        makeRequest("PollReact2", [ServerMessage.channel, ServerMessage._id]);
                    }
                } else { // Sent by a user
                    if (botConfig.chatLogs !== "") {
                        makeRequest("Send", [
                        botConfig.chatLogs,
                        `**New message from**:

                        **Name**: ${ServerMessage.user.username}#${ServerMessage.user.discriminator} (${ServerMessage.user.display_name})
                        **UserID**: <@${ServerMessage.author}> / ${ServerMessage.author}

                        **Channel**: <#${ServerMessage.channel}> / ${ServerMessage.channel}

                        **Message**: \`\`\`${ServerMessage.content}\`\`\``
                        ]);
                    }
                    let block = false;
                    botConfig.badWords.forEach(word => { // Check for bad words
                        if (ServerMessage.content.toLowerCase().match(word) !== null) {
                            block = true;
                            handlePunishment(1, botConfig.badWordLevel, ServerMessage.member._id.server, ServerMessage.channel, ServerMessage._id, ServerMessage.author, ServerMessage.content);
                        }
                    })
                    if (botConfig.blockEmbeds && ServerMessage.content.match(/\[[^\]]*\]\([^\)]*\)/g) !== null) { // Check for embeds
                        block = true;
                        handlePunishment(2, botConfig.embedLevel, ServerMessage.member._id.server, ServerMessage.channel, ServerMessage._id, ServerMessage.author, ServerMessage.content);
                    }
                    if (botConfig.blockAttachments && ServerMessage.attachments != undefined) { // Check for images
                        block = true;
                        handlePunishment(3, botConfig.attachmentLevel, ServerMessage.member._id.server, ServerMessage.channel, ServerMessage._id, ServerMessage.author, ServerMessage.content);
                    }
                    commands.forEach(cmd => { // Check if message is a command
                        if (ServerMessage.content.substring(0,cmd.command.length) === cmd.command && !block) {
                           handleCommand(ServerMessage, cmd);
                        }
                    });
                }
            }
        });

        Socket.addEventListener("error", (event) => {
            if (botConfig.APILogs) {
                console.error(event.error);
            }
            console.log("Could not connect to server!");
        });
    } else {
        console.log("No bot token provided!");
    }
}

function handleCommand(message, cmdObject) {
    let allowed = false;

    // Check if user is allowed to use the command
    if (cmdObject.roles.length !== 0) {
        cmdObject.roles.forEach(role => {
            if (message.member.roles !== undefined && message.member.roles.includes(role)) {
                allowed = true;
            }
        });
    } else {
        allowed = true;
    }

    // Process the command
    if (allowed && cmdObject.channels.includes(message.channel) || allowed && cmdObject.channels.length === 0) {
        if (botConfig.removeCaller) {
            makeRequest("Remove", [message.channel, message._id]);
        }
        switch (cmdObject.action) {
            case "Custom":
                try {
                    eval(`
                        const UserChannel = message.channel;
                        const UserText = message.content.replace(cmdObject.command+" ", "");
                        const UserId = message.author;
                        ${cmdObject.contents}
                    `);
                } catch (error) {
                    console.error(`Command "${cmdObject.command}" failed!\n${error}`);
                }
                break;
            case "Send":
                let msgTarget = message.channel;
                if (cmdObject.target !== "") {
                    msgTarget = cmdObject.target;
                }
                let msgText = message.content.replace(`${cmdObject.command}`, "");
                if (cmdObject.contents !== "") {
                    msgText = cmdObject.contents;
                }
                if (msgText.replaceAll(" ","") !== "") { // Don't send blank messages
                    makeRequest("Send", [msgTarget, msgText]);
                }
                break;
            case "Remove":
                try {
                    const Channel = message.content.match(/https:\/\/app\.revolt\.chat\/server\/[A-Za-z0-9]*\/channel\/([A-Za-z0-9]*)\/([A-Za-z0-9]*)/)[1];
                    const Message = message.content.match(/https:\/\/app\.revolt\.chat\/server\/[A-Za-z0-9]*\/channel\/([A-Za-z0-9]*)\/([A-Za-z0-9]*)/)[2];
                    makeRequest("Remove", [Channel, Message]);
                } catch {
                    makeRequest("Send", [message.channel, "Something went wrong!"]);
                }
                break;
            case "Kick":
                try {
                    const userRegex = new RegExp(`${cmdObject.command} <@(.*)>`);
                    const reasonRegex = new RegExp(`${cmdObject.command} <@.*> (.*)`);
                    const userToKick = message.content.match(userRegex)[1];
                    const kickReason = message.content.match(reasonRegex)[1] + ` | By: ${message.user.display_name} (${message.user.username}#${message.user.discriminator} / <@${message.author}>)`;
                    makeRequest("Kick", [message.member._id.server, userToKick, kickReason]);
                    if (botConfig.modLogs !== "") {
                        makeRequest("Send", [botConfig.modLogs, `<@${userToKick}> Kicked\nReason: ${kickReason}`]);
                    }
                } catch {
                    makeRequest("Send", [message.channel, `Invalid syntax, <@${message.author}>! Use "${cmdObject.command} <@userid> reason"`]);
                }
                break;
            case "Ban":
                try {
                    const userRegex = new RegExp(`${cmdObject.command} <@(.*)>`);
                    const reasonRegex = new RegExp(`${cmdObject.command} <@.*> (.*)`);
                    const userToBan = message.content.match(userRegex)[1];
                    const banReason = message.content.match(reasonRegex)[1] + ` | By: ${message.user.display_name} (${message.user.username}#${message.user.discriminator} / <@${message.author}>)`;
                    makeRequest("Ban", [message.member._id.server, userToBan, banReason]);
                    if (botConfig.modLogs !== "") {
                        makeRequest("Send", [botConfig.modLogs, `<@${userToBan}> Banned\nReason: ${banReason}`]);
                    }
                } catch {
                    makeRequest("Send", [message.channel, `Invalid syntax, <@${message.author}>! Use "${cmdObject.command} <@userid> reason"`]);
                }
                break;
            case "Poll":
                let pollTarget = message.channel;
                if (cmdObject.target !== "") {
                    pollTarget = cmdObject.target;
                }
                pollText = message.content.replace(`${cmdObject.command}`, "");
                if (cmdObject.contents !== "") {
                    pollText = cmdObject.contents;
                }
                if (pollText.replaceAll(" ","") !== "") {
                    makeRequest("Send", [pollTarget, pollText]);
                }
                break;
            case "AddRole":
                let userRoles = [cmdObject.contents];
                if (message.member.roles !== undefined) {
                    if (message.member.roles.includes(cmdObject.contents)) { // Check if user already has role
                        userRoles = message.member.roles;
                    } else {
                        userRoles = userRoles.concat(message.member.roles); // Keep existing roles
                    }
                }
                makeRequest("AddRole", [message.member._id.server, message.author, userRoles]);
                break;
            default:
                console.log(`WARNING: Command "${cmdObject.command}" has invalid action "${cmdObject.action}"!`);
        }
    }
}

function handlePunishment(offence, level, server, channel, message, author, context) {
    makeRequest("Remove", [channel, message]);
    if (level === 1) {
        let warning = "";
        if (offence === 1) {
            warning = "bad words"
        } else if (offence === 2) {
            warning = "embeds";
        } else if (offence === 3) {
            warning = "attachments";
        }
        makeRequest("Send", [channel, `<@${author}>, ${warning} are not allowed!`]);
    } else if (level === 2) {
        makeRequest("Kick", [server, author, `Kicked by bot for message: ${context}`]);
    } else if (level === 3) {
        makeRequest("Ban", [server, author, `Banned by bot for message: ${context}`]);
    }
}

function ping(server) {
    server.send(`{"type":"Ping","data":0}`);

    // Also check if it's time to send a recurring message
    const DateNow = new Date();
    const DayNow = DateNow.getDay();
    const HourNow = DateNow.getHours();
    const MinuteNow = DateNow.getMinutes();
    recurring.forEach(item => {
        if (item.Day === DayNow && item.Hour === HourNow && item.Minute === MinuteNow && lastRecurring !== MinuteNow) {
            makeRequest("Send", [item.Channel, item.Message]);
        }
    });
    lastRecurring = MinuteNow;
}

// Current limited URLs + when the limits expires
let rateLimits = [];
async function makeRequest(action, options) {
    let url;
    let extras;

    // What endpoint to call
    switch (action) {
        case "Remove":
            url = `https://api.revolt.chat/channels/${options[0]}/messages/${options[1]}`;
            extras = {method:'DELETE',headers:{'X-Bot-Token':botConfig.botToken}}
            break;
        case "Send":
            url = `https://api.revolt.chat/channels/${options[0]}/messages`;
            extras = {method:'POST',headers:{'X-Bot-Token':botConfig.botToken,'Content-Type':'application/json'},body:JSON.stringify({content:options[1]})}
            break;
        case "PollReact1":
            url = `https://api.revolt.chat/channels/${options[0]}/messages/${options[1]}/reactions/👍`;
            extras = {method:'PUT',headers:{'X-Bot-Token':botConfig.botToken}}
            break;
        case "PollReact2":
            url = `https://api.revolt.chat/channels/${options[0]}/messages/${options[1]}/reactions/👎`;
            extras = {method:'PUT',headers:{'X-Bot-Token':botConfig.botToken}}
            break;
        case "Kick":
            url = `https://api.revolt.chat/servers/${options[0]}/members/${options[1]}`;
            extras = {method:'DELETE',headers:{'X-Bot-Token':botConfig.botToken}}
            break;
        case "Ban":
            url = `https://api.revolt.chat/servers/${options[0]}/bans/${options[1]}`;
            extras = {method:'PUT',headers:{'Content-Type':'application/json','X-Bot-Token':botConfig.botToken},body:JSON.stringify({reason:options[2]})}
            break;
        case "AddRole":
            url = `https://api.revolt.chat/servers/${options[0]}/members/${options[1]}`;
            extras = {method:'PATCH',headers:{'Content-Type':'application/json','X-Bot-Token':botConfig.botToken},body:JSON.stringify({roles:options[2]})}
            break;
        default:
            extras = "Invalid!";
    }
    // Check so we haven't reached the rate limit, doesn't work perfectly as messages sometimes still slip by
    const CheckUrl = url.replace(options[1], "");
    for (let i = 0; i < rateLimits.length; i++) {
        if (rateLimits[i][0] === CheckUrl) {
            const Timestamp = Date.now();
            if (rateLimits[i][1] > Timestamp) { // Still rate limited
                setTimeout(() => {
                    makeRequest(action, options);
                }, rateLimits[i][1] - Timestamp + 50); // Retry once rate limit expires
                extras = "Invalid!";
            } else {
                rateLimits.splice(i, 1); // Remove expired rate limit
            }
        }
    }
    // Make the request
    if (extras !== "Invalid!") {
        try {
            const response = await fetch(url, extras);
            if (!response.ok) {
                throw new Error(response.status, response.statusText);
            }
            const HeaderData = await response;
            const Remaining = HeaderData.headers.get("x-ratelimit-remaining");
            const Reset = HeaderData.headers.get("x-ratelimit-reset-after");
            if (Remaining === "0") {
                rateLimits.push([CheckUrl, Number(Reset)+Date.now()]); // URL is being rate limited so add to rateLimits
            }
        } catch (error) {
            console.error(error);
        }
    }
}

function ConfigureBot(newConfig) {
    botConfig = newConfig;
}

function RegisterCommand(newCmd) {
    let newCommand = newCmd.command;
    if (newCmd.usePrefix) {
        newCommand = botConfig.prefix + newCmd.command;
    }
    commands.push({
        command: newCommand,
        action: newCmd.action,
        roles: newCmd.allowedRoles,
        channels: newCmd.allowedChannels,
        target: newCmd.targetChannel || "",
        contents: newCmd.contents || ""
    });
}

function RegisterRecurring(newRec) {
    newRec.Day.forEach(day => {
        newRec.Hour.forEach(hour => {
            newRec.Minute.forEach(minute => {
                recurring.push({
                    Day: day,
                    Hour: hour,
                    Minute: minute,
                    Channel: newRec.Channel,
                    Message: newRec.Message
                });
            });
        });
    });
}

export {ConfigureBot, RegisterCommand, RegisterRecurring, startBot}
