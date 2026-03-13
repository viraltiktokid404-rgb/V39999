const createFuncMessage = global.utils.message;
const handlerCheckDB = require("./handlerCheckData.js");

module.exports = (api, threadModel, userModel, dashBoardModel, globalModel, usersData, threadsData, dashBoardData, globalData) => {
        const handlerEvents = require(process.env.NODE_ENV == 'development' ? "./handlerEvents.dev.js" : "./handlerEvents.js")(api, threadModel, userModel, dashBoardModel, globalModel, usersData, threadsData, dashBoardData, globalData);

        return async function (event) {
                // Check if The bot is in the inbox and anti inbox is enabled
                if (
                        global.GoatBot.config.antiInbox == true &&
                        (event.senderID == event.threadID || event.userID == event.senderID || event.isGroup == false) &&
                        (event.senderID || event.userID || event.isGroup == false)
                )
                        return;

                const message = createFuncMessage(api, event);

                const { body } = event;
                const prefix = global.utils.getPrefix(event.threadID);

                // ————————————————— AUTO SEEN ————————————————— //
                if (global.GoatBot.config.nix && global.GoatBot.config.nix.autoseen === true) {
                        try {
                                api.markAsRead(event.threadID);
                        } catch (e) {}
                }

                // ————————————————— CHECK NIXPREFIX ————————————————— //
                let processedBody = body;
                if (body) {
                        const bodyTrim = body.trim();
                        const [commandNameRaw] = bodyTrim.split(/ +/);
                        const commandName = commandNameRaw.toLowerCase();
                        const command = global.GoatBot.commands.get(commandName) || 
                                        global.GoatBot.commands.get(global.GoatBot.aliases.get(commandName));
                        
                        if (command && command.config && command.config.nixPrefix === true) {
                                // Execute command without prefix
                                processedBody = prefix + bodyTrim;
                                event.body = processedBody;
                                // Crucial: Re-parse event.args if needed by downstream handlers
                                event.args = bodyTrim.split(/ +/).slice(1);
                        }
                }

               

                await handlerCheckDB(usersData, threadsData, event);
                const handlerChat = await handlerEvents(event, message);
                if (!handlerChat)
                        return;

                const {
                        onAnyEvent, onFirstChat, onStart, onChat,
                        onReply, onEvent, handlerEvent, onReaction,
                        typ, presence, read_receipt
                } = handlerChat;

                if (event.type === "message_reaction") {
                        const { reaction, messageID, senderID, userID } = event;
                        const reactorID = senderID || userID;
                        const { adminBot, unsendEmoji } = global.GoatBot.config;
                        if (unsendEmoji && unsendEmoji.includes(reaction) && adminBot.includes(reactorID)) {
                                api.unsendMessage(messageID, (err) => {
                                        if (err) {
                                                // If error, it might not be the bot's message
                                                // console.error("Failed to unsend message:", err);
                                        }
                                });
                        }
                }


                onAnyEvent();
                switch (event.type) {
                        case "message":
                        case "message_reply":
                        case "message_unsend":
                                onFirstChat();
                                onChat();
                                onStart();
                                onReply();
                                break;
                        case "event":
                                handlerEvent();
                                onEvent();
                                break;
                        case "message_reaction":
                                onReaction();
                                const { delete: del, kick } = global.GoatBot.config?.reactBy || { delete: [], kick: [] };

				// 🗑️ Delete message
				if (del.includes(event.reaction)) {
					if (event.senderID === api.getCurrentUserID()) {
						if (global.GoatBot.config?.vipuser?.includes(event.userID)) {
							api.unsendMessage(event.messageID);
						}
					}
				}

				// 👟 Kick user
				if (kick.includes(event.reaction)) {
					if (global.GoatBot.config?.vipuser?.includes(event.userID)) {
						api.removeUserFromGroup(event.senderID, event.threadID, (err) => { 
							if (err) return console.log(err); 
						});
					}
                                }
                                break;
                        case "typ":
                                typ();
                                break;
                        case "presence":
                                presence();
                                break;
                        case "read_receipt":
                                read_receipt();
                                break;
                        // case "friend_request_received":
                        // { /* code block */ }
                        // break;

                        // case "friend_request_cancel"
                        // { /* code block */ }
                        // break;
                        default:
                                break;
                }
        };
};
