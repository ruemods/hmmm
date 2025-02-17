const {Sparky} = require('../lib');
const {updateApp,deploymentInfo} = require('./pluginsCore/app');
const simpleGit = require('simple-git');
const git = simpleGit();

Sparky({
      name: "update",
      fromMe: true,
      desc: "Update",
      category: "app",
  },
  async ( { args, m }) => {
      await git.fetch();
      var commits = await git.log(['main' + "..origin/" + 'main']);
      let message = "*_New updates available!_*\n\n";
      commits["all"].map((e, i) =>
          message += "```" + `${i + 1}. ${e.message}\n[${e.date.substring(0, 10)}]\n` + "```"
      );

      if (args) {
            switch (args) {
                        case 'now': {
                              if(commits.total < 0) return await m.reply("```Bot is up-to-date!```");
                              await m.reply('_Updating..._');
          await updateApp();
            const deployment = await deploymentInfo()
            const interval = setInterval(async () => {
                  console.log(deployment.status);
                  if(deployment.status === 'STARTING') {
                        await m.reply('_Updated!\n_Restarting...');
                        clearInterval(interval);
                  }
            }, 5000)();
                              break;
                        }
            default: {
                  
            }
            }
            return;
      }
        return await m.reply(commits.total !== 0 ? message + `\n_Use '${m.prefix}update now' to update the bot._` : "```Bot is up-to-date!```");
  }
);
