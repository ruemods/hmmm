const {Sparky} = require('../lib');
const {updateApp} = require('./pluginsCore');
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

      if (args && args.toLowerCase() === "now") {
          await git.fetch();
          const branches = await git.branch(['-r']);
          const remoteBranch = branches.all.find(branch => branch.includes('origin/main'));

          if (!remoteBranch) return;

          const commit = await git.log([`HEAD..${remoteBranch}`]);
          if (!(commit.total > 0)) {
              return await m.reply("```Bot is up-to-date!```");
          }
          await updateApp(m);
      }
        return await m.reply(commits.total !== 0 ? message + `\n_Use '${m.prefix}update now' to update the bot._` : "```Bot is up-to-date!```");
  }
);
