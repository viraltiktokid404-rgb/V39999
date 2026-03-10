const createFuncMessage = global.utils.message;
const handlerCheckDB = require("./handlerCheckData.js");

module.exports = (api, threadModel, userModel, dashBoardModel, globalModel, usersData, threadsData, dashBoardData, globalData) => {
	const handlerEvents = require(process.env.NODE_ENV == 'development'
		? "./handlerEvents.dev.js"
		: "./handlerEvents.js")(api, threadModel, userModel, dashBoardModel, globalModel, usersData, threadsData, dashBoardData, globalData);

	return async function (event) {

		// Anti inbox
		if (
			global.GoatBot.config.antiInbox == true &&
			(event.senderID == event.threadID || event.userID == event.senderID || event.isGroup == false)
		)
			return;

		const message = createFuncMessage(api, event);

		const { body } = event;
		const prefix = global.utils.getPrefix(event.threadID);

		// AUTO SEEN
		if (global.GoatBot.config.nix && global.GoatBot.config.nix.autoseen === true) {
			try {
				api.markAsRead(event.threadID);
			} catch (e) {}
		}

		// CHECK NIXPREFIX
		let processedBody = body;

		if (body) {
			const bodyTrim = body.trim();
			const splitBody = bodyTrim.split(/ +/);
			const commandNameRaw = splitBody[0] || "";
			const commandName = commandNameRaw.toLowerCase();

			const command =
				global.GoatBot.commands.get(commandName) ||
				global.GoatBot.commands.get(global.GoatBot.aliases.get(commandName));

			if (command && command.config && command.config.nixPrefix === true) {
				processedBody = prefix + bodyTrim;
				event.body = processedBody;
				event.args = splitBody.slice(1);
			}
		}

		// COMMAND CHECK
		if (processedBody && processedBody.startsWith(prefix)) {

			const bodySlice = processedBody.slice(prefix.length).trim();
			const splitCmd = bodySlice.split(/ +/);

			const matchedCommandRaw = splitCmd[0] || "";
			const matchedCommand = matchedCommandRaw.toLowerCase();

			if (
				!matchedCommand ||
				(!global.GoatBot.commands.has(matchedCommand) &&
				 !global.GoatBot.aliases.has(matchedCommand))
			) {

				const allCommands = Array.from(global.GoatBot.commands.keys());

				const { closestMatch, distance } = allCommands.reduce((acc, cmd) => {
					const dist = global.utils.levenshteinDistance(matchedCommand, cmd);
					if (dist < acc.distance)
						return { closestMatch: cmd, distance: dist };
					return acc;
				}, { closestMatch: null, distance: Infinity });

				if (matchedCommand && distance <= 2) {
					return message.reply(
						`❌ | Command "${matchedCommandRaw}" does not exist.\n\n📜 Type ${prefix}help to see all commands\n\n💡 Did you mean: ${prefix}${closestMatch}?`
					);
				}

				return message.reply(
					`❌ | The command you are using does not exist.\n\n📜 Type ${prefix}help to see all commands`
				);
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

		// UNSEND REACTION
		if (event.type === "message_reaction") {

			const { reaction, messageID, senderID, userID } = event;
			const reactorID = senderID || userID;

			const { adminBot, unsendEmoji } = global.GoatBot.config;

			if (
				unsendEmoji &&
				unsendEmoji.includes(reaction) &&
				adminBot.includes(reactorID)
			) {
				api.unsendMessage(messageID, () => {});
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

			default:
				break;
		}
	};
};
