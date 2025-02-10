const {getContentType, downloadContentFromMessage, generateWAMessageFromContent, jidDecode, generateForwardMessageContent} = require('@whiskeysockets/baileys');
const {fromBuffer} = require('file-type');
const {addExifToWebP, imageToWebP, videoToWebP, isUrl, getBuffer} = require('../plugins/pluginsCore');
const fs = require('fs');
const fetch = require('node-fetch');
const config = require('../config');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const decodeJid = (jid) => {
	if (!jid) return jid;
	if (/:\d+@/gi.test(jid)) {
		const decode = jidDecode(jid) || {};
		return decode.user && decode.server ?
			`${decode.user}@${decode.server}` : jid;
	} else {
		return jid;
	}
};

const downloadMedia = (message, pathFile) =>
	new Promise(async (resolve, reject) => {
		let type = Object.keys(message)[0];
		let mimeMap = {
			imageMessage: "image",
			videoMessage: "video",
			stickerMessage: "sticker",
			documentMessage: "document",
			audioMessage: "audio"
		};
		let mes = message;
		if (type == "templateMessage") {
			mes = message.templateMessage.hydratedFourRowTemplate;
			type = Object.keys(mes)[0];
		}
		if (type == "buttonsMessage") {
			mes = message.buttonsMessage;
			type = Object.keys(mes)[0];
		}
		try {
			if (pathFile) {
				const stream = await downloadContentFromMessage(mes[type], mimeMap[type]);
				let buffer = Buffer.from([]);
				for await (const chunk of stream) {
					buffer = Buffer.concat([buffer, chunk]);
				}
				await fs.promises.writeFile(pathFile, buffer);
				resolve(pathFile);
			} else {
				const stream = await downloadContentFromMessage(mes[type], mimeMap[type]);
				let buffer = Buffer.from([]);
				for await (const chunk of stream) {
					buffer = Buffer.concat([buffer, chunk]);
				}
				resolve(buffer);
			}
		} catch (e) {
			reject(e);
		}
	});

const isadmin = async (jid, user, client) => {
	const groupMetadata = await client.groupMetadata(jid);
	const groupAdmins = groupMetadata.participants.filter((participant) => participant.admin !== null).map((participant) => participant.id);
	return groupAdmins.includes(decodeJid(user));
}

async function serialize(m, client) {
	if (m.key) {
		m.id = m.key.id;
		m.isSelf = m.key.fromMe;
		m.jid = m.key.remoteJid;
		m.isGroup = m.jid.endsWith("@g.us");
		m.user = decodeJid(client.user.id);
		m.sender = m.isGroup ?
			m.key.participant : m.isSelf ? client.user.id : m.jid;
		m.isAdmin = (user) => {
			return isadmin(m.jid, user, client);
		}
		m.botNumber = client?.user?.id?.replace(/:[^@]*/, '');
	        m.botIsAdmin = m.isGroup ? await m.isAdmin(m?.botNumber) : false;
	
	}
	m.prefix = ["false"].includes(config.HANDLERS) ? "" : config.HANDLERS;
	if (m.message) {
		m.type = await getContentType(m.message);
		if (m.type === "ephemeralMessage") {
			m.message = m.message[m.type].message;
			const tipe = Object.keys(m.message)[0];
			m.type = tipe;
			if (tipe === "viewOnceMessage") {
				m.message = m.message[m.type].message;
				m.type = await getContentType(m.message);
			}
		}
		if (m.type === "viewOnceMessage") {
			m.message = m.message[m.type].message;
			m.type = await getContentType(m.message);
		}
		try {
			m.mentions = m.message[m.type].contextInfo ?
				m.message[m.type].contextInfo.mentionedJid || [] : [];
		} catch {
			m.mentions = false;
		}
		try {
			const quoted = m.message[m.type].contextInfo;
			let type;
			if (quoted && quoted.quotedMessage) {
				if (quoted.quotedMessage["ephemeralMessage"]) {
					type = Object.keys(quoted.quotedMessage.ephemeralMessage.message)[0];
					m.quoted = {
						type: type === "viewOnceMessage" ? "view_once" : "ephemeral",
						stanzaId: quoted.stanzaId,
						sender: quoted.participant,
						message: type === "viewOnceMessage" ? quoted.quotedMessage.ephemeralMessage.message.viewOnceMessage.message : quoted.quotedMessage.ephemeralMessage.message
					};
				} else if (quoted.quotedMessage["viewOnceMessage"]) {
					m.quoted = {
						type: "view_once",
						stanzaId: quoted.stanzaId,
						sender: quoted.participant,
						message: quoted.quotedMessage.viewOnceMessage.message
					};
				} else {
					m.quoted = {
						type: "normal",
						stanzaId: quoted.stanzaId,
						sender: quoted.participant,
						message: quoted.quotedMessage
					};
				}
				m.quoted.isSelf = m.quoted.sender === client.user.id;
				m.quoted.mtype = Object.keys(m.quoted.message);
				m.quoted.text = m.quoted.message[m.quoted.mtype]?.text || m.quoted.message[m.quoted.mtype]?.description || m.quoted.message[m.quoted.mtype]?.caption || (m.quoted.mtype === "templateButtonReplyMessage" && m.quoted.message[m.quoted.mtype].hydratedTemplate?.hydratedContentText) || m.quoted.message[m.quoted.mtype] || "";
				m.quoted.key = {
					id: m.quoted.stanzaId,
					fromMe: m.quoted.isSelf,
					remoteJid: m.jid
				};
				m.quoted.download = (pathFile) => downloadMedia(m.quoted.message, pathFile);
			}
		} catch {
			m.quoted = null;
		}
		try {
			m.text = m.message.conversation || m.message[m.type].text || m.message[m.type].selectedId
			m.body = m.message.conversation || m.message[m.type].text || m.message[m.type].caption || (m.type === "listResponseMessage" && m.message[m.type].singleSelectReply.selectedRowId) || (m.type === "buttonsResponseMessage" && m.message[m.type].selectedButtonId && m.message[m.type].selectedButtonId) || (m.type === "templateButtonReplyMessage" && m.message[m.type].selectedId) || false;
		} catch {
			m.body = false;
		}
		m.sudo = config.SUDO.split(",").includes(m?.sender?.split("@")[0]) || config.SUDO.split(",").includes(m?.quoted?.sender?.split("@")[0]) || m?.isSelf;

		m.formatNumberToJid = async (number) => {
			return number.replace(/\s+/g, '').replace(/^[+@]/, '') + '@s.whatsapp.net';
		}
		m.downloadAndSaveMedia = async (m, filename, attachExtension = true) => {
			let quoted = m.message ? m.message : m
			let mime = (m.message || m).mimetype || ''
			let messageType = m.mtype ? m.mtype.replace(/Message/gi, '') : mime.split('/')[0]
			const stream = await downloadContentFromMessage(quoted, messageType)
			let buffer = Buffer.from([])
			for await (const chunk of stream) {
				buffer = Buffer.concat([buffer, chunk])
			}
			let type = await fromBuffer(buffer)
			let trueFileName = attachExtension ? (filename + '.' + type.ext) : filename
			await fs.writeFileSync(trueFileName, buffer)
			return trueFileName
		}

		m.runtime = async () => {
			seconds = Number(`${process.uptime()}`);
			var d = Math.floor(seconds / (3600 * 24));
			var h = Math.floor(seconds % (3600 * 24) / 3600);
			var m = Math.floor(seconds % 3600 / 60);
			var s = Math.floor(seconds % 60);
			var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
			var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
			var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
			var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
			return dDisplay + hDisplay + mDisplay + sDisplay;
		}

		m.uptime = async () => {
			const duration = process.uptime();
			const seconds = Math.floor(duration % 60);
			const minutes = Math.floor((duration / 60) % 60);
			const hours = Math.floor((duration / (60 * 60)) % 24);
			const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
			return formattedTime;
		}

		m.getFile = async (PATH, returnAsFilename) => {
			let res, filename;
			let data = Buffer.isBuffer(PATH) ? PATH : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,` [1], "base64") : /^https?:\/\//.test(PATH) ? await getBuffer(PATH).catch(async ()=> (await fetch(PATH)).buffer()) : fs.existsSync(PATH) ? ((filename = PATH), fs.readFileSync(PATH)) : typeof PATH === "string" ? PATH : Buffer.alloc(0);
			if (!Buffer.isBuffer(data)) throw console.log("Result is not a buffer");
			let type = (await fromBuffer(data)) || {
				mime: "application/octet-stream",
				ext: ".bin"
			};
			if (data && returnAsFilename && !filename)(filename = path.join(__dirname, "../" + new Date() * 1 + "." + type.ext)),
				await fs.promises.writeFile(filename, data);
			return {
				res,
				filename,
				...type,
				data
			};
		};

		m.forwardMessage = async (targetJid, message, options = {}) => {
			let contentType;
			let content = message;
			if (options.readViewOnce) {
				content = content && content.ephemeralMessage && content.ephemeralMessage.message ? content.ephemeralMessage.message : content || undefined;
				const viewOnceKey = Object.keys(content)[0];
				delete(content && content.ignore ? content.ignore : content || undefined);
				delete content.viewOnceMessage.message[viewOnceKey].viewOnce;
				content = {
					...content.viewOnceMessage.message
				};
			}
			if (options.mentions) {
				content[contentType].contextInfo.mentionedJid = options.mentions;
			}
			const forwardContent = await generateForwardMessageContent(content, false);
			contentType = await getContentType(forwardContent);
			if (options.ptt) forwardContent[contentType].ptt = options.ptt;
			if (options.audiowave) forwardContent[contentType].waveform = options.audiowave;
			if (options.seconds) forwardContent[contentType].seconds = options.seconds;
			if (options.fileLength) forwardContent[contentType].fileLength = options.fileLength;
			if (options.caption) forwardContent[contentType].caption = options.caption;
			if (options.contextInfo) forwardContent[contentType].contextInfo = options.contextInfo;
			if (options.mentions) forwardContent[contentType].contextInfo.mentionedJid = options.mentions;
			let contextInfo = {};
			if (contentType != "conversation") {
				contextInfo = message.message[contentType].contextInfo;
			}
			forwardContent[contentType].contextInfo = {
				...contextInfo,
				...forwardContent[contentType].contextInfo
			};
			const waMessage = await generateWAMessageFromContent(targetJid, forwardContent, options ? {
				...forwardContent[contentType],
				...options,
				...(options.contextInfo ? {
					'contextInfo': {
						...forwardContent[contentType].contextInfo,
						...options.contextInfo
					}
				} : {})
			} : {});
			await client.relayMessage(targetJid, waMessage.message, {
				'messageId': waMessage.key.id
			});
			return waMessage;
		}

		m.forward = async (jid, message, options = {}) => {
			let opt = await generateWAMessageFromContent(jid, message, {
				...options,
				userJid: client.user.id
			});
			let msg = {
				viewOnceMessage: {
					message: {
						...opt.message
					},
				},
			};
			await client.relayMessage(jid, msg, {
				messageId: opt.key.id,
				...options
			});
			return msg;
		}

		m.react = async (txt) => {
			return await client.sendMessage(m.jid, {
				react: {
					text: txt,
					key: m.key
				}
			});
		}

		m.sendPoll = async (jid, name = '', values = [], selectableCount = 1) => {
			return await client.sendMessage(jid, {
				poll: {
					name,
					values
				}
			});
		}

		m.poll = async (jid, text, list) => {
			return await client.relayMessage(jid, {
				"pollCreationMessage": {
					"name": text,
					"options": list.map(v => {
						return {
							optionName: v
						}
					}),
					"selectableOptionsCount": list.length
				}
			}, {});
		}

		m.reply = async (txt) => {
			return await client.sendMessage(m.jid, {
				text: txt
			}, {
				quoted: m
			});
		}

		m.sendFromUrl = async(url, options = {}) => {
			let mime = await fromBuffer(await getBuffer(url).catch(async ()=> (await fetch(url)).buffer()));
			if (mime.mime.split("/")[0] === "audio") {
			  options.mimetype = "audio/mpeg";
			}
			return await client.sendMessage(
			  m.jid,
			  { [mime.mime.split("/")[0]]: await getBuffer(url).catch(async ()=> (await fetch(url)).buffer()), ...options },
			  { ...options }
			);
		  }

		m.sendMsg = async (jid, content, opt = {
			packname: "A-S-W-I-N-S-P-A-R-K-Y"
		}, type = "text") => {
			{
				switch (type.toLowerCase()) {
					case "text": {
						return await client.sendMessage(jid, {
							text: content,
							...opt,
						}, {
							...opt
						});
					}
					break;
					case "image": {
					if (!Buffer.isBuffer(content) && !(await isUrl(content))) return;
							return await client.sendMessage(jid, {
								image: Buffer.isBuffer(content) ? content : (await isUrl(content)) ? await getBuffer(content).catch(async ()=> (await fetch(content)).buffer()) : null,
								...opt
							}, {
								...opt
							});
					}
					break;
					case "video": {
					if (!Buffer.isBuffer(content) && !(await isUrl(content))) return;
							return await client.sendMessage(jid, {
								video: Buffer.isBuffer(content) ? content : (await isUrl(content)) ? await getBuffer(content).catch(async ()=> (await fetch(content)).buffer()) : null,
								...opt
							}, {
								...opt
							});
					}
					break;
					case "audio": {
						if (!Buffer.isBuffer(content) && !(await isUrl(content))) return;
							return await client.sendMessage(jid, {
								audio: Buffer.isBuffer(content) ? content : (await isUrl(content)) ? await getBuffer(content).catch(async ()=> (await fetch(content)).buffer()) : null,
								...opt
							}, {
								...opt
							});
					}
					break;
					case "sticker": {
const {data, mime} = await m.getFile(content);
const stickerBuffer = mime === "image/webp" ? await addExifToWebP(data, opt) : mime.startsWith("video") ? await videoToWebP(data, opt) : mime.startsWith("image") ? await imageToWebP(data, opt) : null;
if (!stickerBuffer) throw new Error("Unsupported media type");
return await client.sendMessage(jid, {
	sticker: stickerBuffer,
	...opt
}, opt);
}
break;
				}
			}
		}

	}
	return m;
}
module.exports = {serialize};
