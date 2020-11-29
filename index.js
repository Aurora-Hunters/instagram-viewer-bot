/**
 * Load environment variables
 */
require('dotenv').config();

/**
 * Load Hawk module
 * @type {HawkCatcher}
 */
const HawkCatcher = require('@hawk.so/nodejs').default;
HawkCatcher.init({
    token: process.env.HAWK_TOKEN
});

const Instagram = require('instagram-web-api');
const TelegramBot = require('node-telegram-bot-api');
const TextFormatting = require('./utils/text-formatting')();
const instagramRegex = require('./utils/instagram-regex')();
const Media = require('./modules/media');

/**
 * Get a url for media entity
 * @param contentData
 * @returns {string|*}
 */
const getMediaLink = function (contentData) {
    if (contentData.is_video) {
        return contentData.video_url;
    }

    return contentData.display_resources.slice(-1)[0].src;
};

/**
 * Compose text for message to be send
 * @param contentData
 * @returns {string}
 */
const getMediaText = function (contentData) {
    let composedCaption = contentData.edge_media_to_caption.edges[0].node.text;

    composedCaption = TextFormatting.getFirstParagraph(composedCaption);
    composedCaption = TextFormatting.removeHashtags(composedCaption);
    composedCaption = TextFormatting.trimStringMaxLenght(composedCaption);

    return `${composedCaption}\n` +
        `\n` +
        `📷 instagram.com/${contentData.owner.username}`;
};

/**
 * Compose a link to post
 */
const getMediaPostLink = function (contentData) {
    return `https://www.instagram.com/p/${contentData.shortcode}`;
};

/**
 * Main process
 */
(async () => {
    /**
     * Prepare Instagram
     * @type {Instagram}
     */
    const instagram = new Instagram({
        username: process.env.INSTAGRAM_LOGIN,
        password: process.env.INSTAGRAM_PASSWORD
    });

    /**
     * Try to login
     */
    await instagram.login();

    /**
     * Prepare Telegram bot
     * @type {TelegramBot}
     */
    const bot = new TelegramBot(process.env.BOT_TOKEN, {polling: true});

    /**
     * If message contains a link to instagram post
     * Then get this link and find a post data
     */
    bot.onText(instagramRegex, async (msg, match) => {
        /** Get chatId for response sending */
        const chatId = msg.chat.id;
        /** Get Instagram post tag */
        const link = match[1];
        const mediaTag = match[2];

        let contentData;

        try {
            /** Load Instagram post media data*/
            contentData = await instagram.getMediaByShortcode({shortcode: mediaTag});
        } catch (error) {
            HawkCatcher.send(error, {
                msg,
                contentData
            });
            console.error(error);
        }

        if (!contentData) {
            const error = new Error('getMediaByShortcode returned undefined');

            HawkCatcher.send(error, {
                msg,
                link,
                contentData
            });
            console.error(error);
            return;
        }

        const media = new Media(contentData);

        /** Get a link for media file */
        const mediaLink = getMediaLink(contentData);

        /** Compose text for message */
        const mediaText = getMediaText(contentData);



        /** Prepare options */
        const options = {
            reply_to_message_id: msg.message_id,
            caption: mediaText
        };

        if (!media.hasMultipleMedia()) {
            /**
             * Send message
             */
            bot.sendChatAction(chatId, contentData.is_video ? 'upload_video' : 'upload_photo');
            bot[contentData.is_video ? 'sendVideo' : 'sendPhoto'](chatId, mediaLink, options)
                .catch((error) => {
                    HawkCatcher.send(error, {
                        msg,
                        options,
                        contentData
                    });
                    console.error(error);
                })
        } else {
            const medias = media.getMedias();

            medias[0].caption = mediaText;

            bot.sendChatAction(chatId, 'typing');
            bot.sendMediaGroup(chatId, medias, {
                reply_to_message_id: msg.message_id,
                caption: mediaText
            })
                .catch((error) => {
                    HawkCatcher.send(error, {
                        msg,
                        options,
                        contentData
                    });
                    console.error(error);
                })
        }
    });

    /**
     * Add error handling listener
     */
    bot.on('polling_error', (error) => {
        HawkCatcher.send(error);
        console.error(error);
    });
})();

