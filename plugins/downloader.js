const { Sparky, isPublic } = require("../lib");
const { AP, getJson, extractUrlsFromText, getString, isUrl } = require("./pluginsCore");
const axios = require('axios');
const fetch = require('node-fetch');
const config = require("../config.js");
const lang = getString('download');


Sparky(
    {
        name: "insta",
        fromMe: isPublic,
        desc: "Instagram media downloader - download images and videos from Instagram",
        category: "downloader",
    },
    async ({
        m, client, args
    }) => {
        args = args || m.quoted?.text;
        if (!args) return await m.reply(lang.NEED_URL);
        let dl = await client.sendMessage(m.jid, {
            text: lang.DOWNLOADING
        }, {
            quoted: m
        })
        try {
            let response = await getJson(config.API + "/v1/igdl?url=" + args);
            for (let i of response.data) {
                await m.sendMsg(m.jid, i.url, { quoted: m }, i.type)
            }
        } catch (e) {
            console.log(e);
            client.sendMessage(m.jid, {
                text: lang.ERROR, edit: dl.key
            })
        }
    }
);


Sparky({
    name: "apk",
    fromMe: isPublic,
    category: "downloader",
    desc: "Find and download APKs from Aptoide by app ID",
},
async ({
    m, client, args
}) => {
    let appId = args || m.quoted?.text;
    if (!appId) return await m.reply(lang.NEED_Q);

    try {
        await m.react('⬇️');

        const { result: appInfo } = await getJson(AP + "download/aptoide?id=" + appId);
        
        await client.sendMessage(m.jid, {
            document: {
                url: appInfo.link
            },
            fileName: appInfo.appname,
            caption: `App Name: ${appInfo.appname}\nDeveloper: ${appInfo.developer}`,
            mimetype: "application/vnd.android.package-archive"
        }, {
            quoted: m
        });
        await m.react('✅');
    } catch (error) {
        await m.react('❌');
        console.error(error);
    }
});


Sparky({
    name: "pintrest",
    fromMe: isPublic,
    category: "downloader",
    desc: "Download images and content from Pinterest",
},
async ({
    m, client, args
}) => {
    try {
        let match = args || m.quoted?.text;
        if (!match) return await m.reply(lang.NEED_URL);
        await m.react('⬇️');
        if (!match.includes("pin.it")) return await m.reply("_Please provide a valid Pinterest URL_");
        const { result } = await getJson(AP + "download/pinterest?url=" + match);
        await m.sendFromUrl(result.url, { caption: "_*downloaded 🤍*_" });
        await m.react('✅');
    } catch (error) {
        await m.react('❌');
        console.error(error);
    }
});


Sparky({
    name: "xnxx",
    fromMe: isPublic,
    category: "downloader",
    desc: "Download media from XNXX by search or URL",
},
async ({
    m, client, args
}) => {
    try {
        let match = args || m.quoted?.text;
        if (!match) return await m.reply(lang.NEED_Q);
        if (isUrl(match)) {
            let url = (await extractUrlsFromText(match));
            await m.react('⬇️');
            const { result } = await getJson(AP + "download/xnxx?url=" + url);
            await m.sendFromUrl(result.files.high, { caption: "👅💦" });
        } else {
            let url = await getJson(AP + "search/xnxx?q=" + match);
            const { result } = await getJson(AP + "download/xnxx?url=" + url.result[0].link);
            await m.sendFromUrl(result.files.high, { caption: "👅💦" });
        }
        await m.react('✅');
    } catch (error) {
        await m.react('❌');
        m.reply(error);
    }
});


Sparky({
    name: "terabox",
    fromMe: isPublic,
    category: "downloader",
    desc: "Download files from TeraBox by providing a valid URL",
},
async ({
    m, client, args
}) => {
    try {
        let match = args || m.quoted?.text;
        if (!match) return await m.reply(lang.NEED_URL);
        await m.react('⬇️');
        const { data } = await getJson(AP + "download/terabox?url=" + match);
        await m.sendFromUrl(data.result.downloadUrl, { caption: data.result.filename });
        await m.react('✅');
    } catch (error) {
        await m.react('❌');
        console.error(error);
    }
});


Sparky({
    name: "gitclone",
    fromMe: isPublic,
    category: "downloader",
    desc: "Download GitHub repositories as ZIP files",
},
async ({
    m, client, args
}) => {
    try {
        let match = args || m.quoted?.text;
        if (!isUrl(match)) return await m.reply(lang.NEED_URL)
        await m.react('⬇️');
        let user = match.split("/")[3];
        let repo = match.split("/")[4];
        const msg = await m.reply(lang.DOWNLOADING);
        await client.sendMessage(m.jid, {
            document: {
                url: `https://api.github.com/repos/${user}/${repo}/zipball`
            },
            fileName: repo,
            mimetype: "application/zip"
        }, {
            quoted: m
        });
        await m.react('✅');
    } catch (error) {
        await m.react('❌');
        console.error(error);
    }
});
