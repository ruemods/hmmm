const {commands, Sparky, isPublic, plugins} = require('./plugins');
const {YtInfo, yts, yta, ytv} = require('./youtube.js');
const {serialize} = require('./serialize');
const {whatsappAutomation, callAutomation} = require('./whatsappController');
const {warnDB} = require('./database/warn');
const {externalPlugins,installExternalPlugins} = require("./database/external_plugins");
const {personalDB} = require("./database/personal.js");

module.exports = {commands, Sparky, YtInfo, yts, yta, ytv, isPublic, serialize, whatsappAutomation, callAutomation, externalPlugins, installExternalPlugins, warnDB, personalDB};
