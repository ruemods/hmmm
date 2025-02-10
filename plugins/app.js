const {Sparky} = require('../lib');
const {getString,setVar,delVar,getVars} = require('./pluginsCore');
const {exec} = require("child_process");
const config = require("../config")
const lang = getString('app');

const settingsMenu = [
    { title: "Auto read all messages", env_var: "READ_MESSAGES" },
    { title: "Auto status react", env_var: "STATUS_REACTION" },
    { title: "Auto read status updates", env_var: "AUTO_STATUS_VIEW" },
    { title: "Auto reject calls", env_var: "REJECT_CALL" },
    { title: "Always online", env_var: "ALWAYS_ONLINE" },
    { title: "Disable bot in PM", env_var: "DISABLE_PM" },
    { title: "PM Auto blocker", env_var: "PM_BLOCK" },
    { title: "Bot Work type", env_var: "WORK_TYPE" }
];

let settingsContext = {};

Sparky({
    name: "settings",
    fromMe: true,
    desc: "Settings Configuration",
    category: "downloader",
}, async ({ m }) => {
    const menu = settingsMenu.map((e, i) => `_${i + 1}. ${e.title}_`).join("\n");
    await m.reply(`*_Settings Configuration Menu_*\n\n${menu}\n\n_Reply with a number to continue._`);
});

Sparky({
    on: "text",
    fromMe: true,
}, async ({ client, m }) => {
    if (m.quoted?.text.includes("Settings Configuration Menu")) {
        const selected = settingsMenu[parseInt(m.text) - 1];
        if (!selected) return;

        const currentStatus = config[selected.env_var] ? "on" : "off";
        const statusOptions = ["on", "off"].map((s, i) => `_${i + 1}. ${s}_`).join("\n");
        
        await m.reply(`*_${selected.title}_*\n\n_Current status: ${currentStatus}_\n\n_Reply with a number to update the status._\n\n${statusOptions}`);
        settingsContext = { sender: m.sender, title: selected.title, env_var: selected.env_var };
    }

    if (settingsContext.sender === m.sender && m.quoted?.text.includes(settingsContext.title)) {
        const status = ["on", "off"][parseInt(m.text) - 1];
        if (!status) return;

        await setVar(settingsContext.env_var, status === "on" ? "true" : "false");
        delete settingsContext;
        
        return await m.reply(`_${settingsContext.title} ${status === "on" ? "enabled." : "disabled."}_`);
    }
});



Sparky({
      name: "restart",
      fromMe: true,
      desc: lang.RESTART_DESC,
      category: "app",
  },
  async ( {
        m
  }) => {
      await m.reply(lang.RESTARTING);
      exec("pm2 restart X-BOT-MD", async (error, stdout, stderr) => {
      if (error) {
            return await m.reply(`Error: ${error}`);
      } 
      return;
    });
 });


Sparky({
		name: "setvar",
		fromMe: true,
		desc: lang.SETVAR_DESC,
		category: "app",
	},
	async ({
		m,
		args
	}) => {
		if (!args) return await m.reply(lang.SETVAR_ALERT.replace("{}", m.prefix));
		const [key, value] = args.split(":");
		const setVariable = await setVar(key.trim().toUpperCase(), value.trim());
		return await m.reply(setVariable ? lang.SETVAR_SUCCESS.replace("{}", key.trim().toUpperCase()).replace("{}", value.trim()) : lang.SETVAR_FAILED);
	});


Sparky({
		name: "delvar",
		fromMe: true,
		desc: lang.DELVAR_DESC,
		category: "app",
	},
	async ({
		m,
		args
	}) => {
		if (!args) return await m.reply(lang.DELVAR_ALERT.replace("{}", m.prefix));
		const delVariable = await delVar(args.trim().toUpperCase());
		return await m.reply(delVariable ? lang.DELVAR_SUCCESS.replace("{}", args.trim().toUpperCase()) : lang.DELVAR_NOTFOUND.replace("{}", args.trim().toUpperCase()));
	});


Sparky({
		name: "getvar",
		fromMe: true,
		desc: lang.GETVAR_DESC,
		category: "app",
	},
	async ({
		m,
		args
	}) => {
		if (!args) return await m.reply(lang.GETVAR_ALERT.replace("{}", m.prefix));
		const getVariables = await getVars();
		const vars = getVariables.find(i => i.key === args.toUpperCase());
		return await m.reply(`_${vars.key}: ${vars.value}_`);
	});
	
	
Sparky({
		name: "getallvars",
		fromMe: true,
		desc: lang.GETALLVARS_DESC,
		category: "app",
	},
	async ({
		m
	}) => {
		const getVariables = await getVars();
		const vars = getVariables.map((e, i)=> `\`\`\`${i + 1}. ${e.key}: ${e.value}\`\`\``).join('\n');
		return await m.reply(vars);
	});


Sparky({
	name: "mode",
	fromMe: true,
	desc: "hu",
	category: "app",
},
async ( {
	  m, args
}) => {
	if (args?.toLowerCase() == "public" || args?.toLowerCase() == "private"){
		return await setVar("WORK_TYPE",args,m)
	} else {
		return await m.reply(`_*Mode manager*_\n_Current mode: ${config.WORK_TYPE}_\n_Use .mode public/private_`)
}
}
);
