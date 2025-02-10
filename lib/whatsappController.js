const config = require('../config');

async function whatsappAutomation(client, m, message) {
    if (
        config.LOGS &&
        message.type === "notify" &&
        !m?.sender?.includes(client?.user?.id?.split(":")[0])
    ) {
        // Logging is controlled by config.LOGS; this block handles notify messages.
    } else if (
        config.LOGS &&
        message.type !== "notify" &&
        !m?.sender?.includes(client?.user?.id?.split(":")[0])
    ) {
        // Logging is controlled by config.LOGS; this block handles non-notify messages.
    }

    if (
        config.AUTO_STATUS_VIEW &&
        m.key &&
        m.key.remoteJid === 'status@broadcast' &&
        m.key.participant
    ) {
        try {
            // Mark the status as read
            await client.readMessages([m.key]);
        } catch (err) {
            // Handle error silently
        }

        if (config.STATUS_REACTION) {
            const emojiArray = config.STATUS_REACTION_EMOJI.split(',');
            const emoji = emojiArray[Math.floor(Math.random() * emojiArray.length)];

            try {
                await client.sendMessage(
                    "status@broadcast",
                    {
                        react: {
                            key: m.key,
                            text: emoji,
                        },
                    },
                    {
                        statusJidList: [m.key.participant, client.user.id].filter(Boolean),
                    }
                );
            } catch (err) {
                // Handle error silently
            }
        }

        if (config.STATUS_REPLY) {
            try {
                await client.sendMessage(m.key.participant, {
                    text: config.STATUS_REPLY_MSG,
                }, {quoted: m});
            } catch (err) {
                // Handle error silently
            }
        }
    }
}


async function callAutomation(client, callInfo) {
    if(config.REJECT_CALL && callInfo.status === "offer" && !config.SUDO.includes(callInfo.from.split("@")[0])) {
        await client.rejectCall(callInfo.id, callInfo.from);
        return await client.sendMessage(callInfo.from, {text: config.REJECT_CALL_MSG });
    }
    if(config.CALL_BLOCK && callInfo.status === "offer" && !config.SUDO.includes(callInfo.from.split("@")[0])) {
        await client.rejectCall(callInfo.id, callInfo.from);
        await client.sendMessage(callInfo.from, {text: config.CALL_BLOCK_MSG });
        return await client.updateBlockStatus(callInfo.from, 'block');
    }
}


module.exports = {whatsappAutomation, callAutomation};
