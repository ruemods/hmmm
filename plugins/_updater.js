const {Sparky} = require('../lib');
const simpleGit = require('simple-git');
const git = simpleGit();

Sparky({
      name: "update",
      fromMe: true,
      desc: "Update",
      category: "app",
  },
  async ( {
        m
  }) => {
await git.fetch();
var commits = await git.log([
        'main' + "..origin/" + 'main',
      ]);
let message = "*_New updates available!_*\n\n";
commits["all"].map((e, i) =>
message += "```" + `${i + 1}. ${e.message}\n[${e.date.substring(0, 10)}]\n` + "```")
return await m.reply(commits.total !== 0 ? message : "```Bot is up-to-date!```");
 });
