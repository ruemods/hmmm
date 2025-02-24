(async function Sparky() {
const {makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, makeInMemoryStore} = require('@whiskeysockets/baileys');
const {default: axios} = require('axios');
const {Boom} = require('@hapi/boom');
const simpleGit = require('simple-git');
const git = simpleGit();
const P = require('pino');
const fs = require('fs');
const path = require('path');
const {serialize, commands, whatsappAutomation, callAutomation, externalPlugins} = require('./lib');
const config = require('./config');
const sleep = ms => new Promise(res => setTimeout(res, ms));
	
require('http').createServer(async (req, res) => {
	res.end("Server is running.");
}).listen(config.PORT, () => {
	console.log(`Server successfully started on port ${config.PORT}.`);
});
	
if (!fs.existsSync('./lib/session')) fs.mkdirSync('./lib/session', {
	recursive: true
});

const store = makeInMemoryStore({
	logger: P({
		level: 'silent'
	})
});
	
try { 
	try {
if (!config.SESSION_ID) throw new Error('Session ID missing');
const {data} = await axios.get(`https://gist.github.com/ESWIN-SPERKY/${config.SESSION_ID.split(':')[1]}/raw`);
fs.writeFileSync('./lib/session/creds.json', JSON.stringify(data));
console.log("session created sucessfully");
} catch (e) {
console.error('Error:', e.message);
}
	
const {state, saveCreds} = await useMultiFileAuthState('./lib/session');

const client = makeWASocket({
	auth: state,
	browser: Browsers.macOS('Desktop'),
	logger: P({
		level: 'silent'
	})
});

const sudoIde = (config.SUDO !== '' ? config.SUDO.split(',')[0] : client.user.id.split(':')[0]) + "@s.whatsapp.net";
const updateCheck = setInterval(async() => {
      await git.fetch();
      var commits = await git.log(['main' + "..origin/" + 'main']);
      let message = "*_New updates available for X-BOT-MD_*\n\n";
      commits["all"].map((e, i) =>
          message += "```" + `${i + 1}. ${e.message}\n` + "```"
      );
	      if(commits.total > 0) {
		      await client.sendMessage(sudoIde, { text: message + `\n_Type '${config.HANDLERS === 'false' ? '' : config.HANDLERS}update now' to update the bot._`});
		      clearInterval(updateCheck);
	      }
      }, 60000)
store.bind(client.ev);

try {
	await config.DATABASE.sync;
	console.log("Database synced.");
} catch (error) {
	console.error("Error while syncing database:", error);
}
		
async function initializePlugins() {
	try {
		let plugins = await externalPlugins.findAll();
		plugins.map(async (plugin) => {
			if (!fs.existsSync('./plugins/' + plugin.dataValues.name + '.js')) {
			var response = await axios.get(plugin.dataValues.url);
			if (response.status == 200) {
				console.log("Installing external plugins...");
				fs.writeFileSync('./plugins/' + plugin.dataValues.name + '.js', response.data);
				require('./plugins/' + plugin.dataValues.name + '.js');
				console.log("External plugins loaded successfully.");
			}
			}
		});
	} catch (e) {
		console.log(e);
	}
}

client.ev.on('connection.update', async ({connection, lastDisconnect}) => {
	if(connection === 'connecting') console.log('Connecting...');
	else if (connection === 'open') {
		await initializePlugins();
		console.log('Connected.');
		fs.readdirSync('./plugins').filter(file => path.extname(file) === '.js').forEach(file => require(`./plugins/${file}`));
	        var startupMessage = `*X BOT MD STARTED!*\n\n_Mode: ${config.WORK_TYPE}_\n_Prefix: ${config.HANDLERS}_\n_Version: ${config.VERSION}_\n_Menu Type: ${config.MENU_TYPE}_\n_Language: ${config.LANGUAGE}_\n\n*Extra Configurations*\n\n\`\`\`Always online: ${config.ALWAYS_ONLINE ? '✅' : '❌'}\nAuto status view: ${config.AUTO_STATUS_VIEW ? '✅' : '❌'}\nAuto reject calls: ${config.REJECT_CALLS ? '✅' : '❌'}\nAuto read messages: ${config.READ_MESSAGES ? '✅' : '❌'}\nAuto call blocker: ${config.CALL_BLOCK ? '✅' : '❌'}\nAuto status save: ${config.SAVE_STATUS ? '✅' : '❌'}\nAuto status reply: ${config.STATUS_REPLY ? '✅' : '❌'}\nAuto status reaction: ${config.STATUS_REACTION ? '✅' : '❌'}\nLogs: ${config.LOGS ? '✅' : '❌'}\nPM Blocker: ${config.PM_BLOCK ? '✅' : '❌'}\nPM Disabler: ${config.DISABLE_PM ? '✅' : '❌'}\`\`\``;
			var sudoId = (config.SUDO !== '' ? config.SUDO.split(',')[0] : client.user.id.split(':')[0]) + "@s.whatsapp.net";
		if (config.START_MSG) {
			return await client.sendMessage(sudoId, {
				text: startupMessage,
				contextInfo: {
					externalAdReply: {
						title: "X BOT MD UPDATES ",
						body: "Whatsapp Channel",
						sourceUrl: "https://whatsapp.com/channel/0029Va9ZOf36rsR1Ym7O2x00",
						mediaUrl: "https://whatsapp.com/channel/0029Va9ZOf36rsR1Ym7O2x00",
						mediaType: 1,
						showAdAttribution: false,
						renderLargerThumbnail: true,
						thumbnailUrl: "https://i.imgur.com/Q2UNwXR.jpg"
					}
				}
			}, {quoted:false});
		}
	} else if (connection === 'close') {
		const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
		if (reason === DisconnectReason.connectionReplaced) {
		console.log('Connection replaced. Logout current session first.');
		await client.logout();
		} else {
		console.log('Reconnecting...');
		await sleep(3000);
		Sparky();
		}
	}
});

client.ev.on('messages.upsert', async (msg) => {
	let m;
	
	try {
		m = await serialize(JSON.parse(JSON.stringify(msg.messages[0])), client);
	} catch (error) {
		console.error("Error serializing message:", error);
		return;
	}
	
	await whatsappAutomation(client, m, msg);
	
	if(config.DISABLE_PM && !m.isGroup) {
		return;
	}
	
	commands.map(async (Sparky) => {
		if (Sparky.fromMe && !m.sudo) return;
		let comman = m.text ? m.body[0].toLowerCase() + m.body.slice(1).trim() : "";
		let args;
		try {
			if (Sparky.on) {
				Sparky.function({m, args: m.body, client});
			} else if (Sparky.name && Sparky.name.test(comman)) {
				args = m.body.replace(Sparky.name, '$1').trim();
				Sparky.function({m, args, client});
			}
		} catch (error) {
			console.log(error);
		}
	});
});

client.ev.on('creds.update', saveCreds);

client.ev.on('call', async (call) => {
	for(let i of call) {
		await callAutomation(client, i);
	}
});
} catch (e) {
	console.error('Error:', e.message);
	await sleep(3000);
	Sparky();
}
})();
