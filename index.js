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
 * Compose text for message to be send
 * @param {Media} media
 * @returns {string}
 */
const getMediaText = function (media) {
    let caption = '';
    let mediaCaption = media.getDescription();

    if (mediaCaption) {
        mediaCaption = TextFormatting.getFirstParagraph(mediaCaption);
        mediaCaption = TextFormatting.removeHashtags(mediaCaption);
        mediaCaption = TextFormatting.trimStringMaxLenght(mediaCaption);

        caption = `${mediaCaption}\n` +
                  `\n`
    }

    caption += `📷 instagram.com/${media.getOwnerUsername()}`;

    return caption;
};

/**
 * Main process
 */
const main = (async () => { try {
    /**
     * Prepare Instagram
     * @type {Instagram}
     */
    const instagram = new Instagram({});

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
        } catch (e) {
            const error = new Error(`Cannot get media by shortcode because of ${e}`);

            HawkCatcher.send(error, {
                shortcode: mediaTag,
                msg,
                contentData
            }, { id: chatId });
            console.error(error);
        }

        if (!contentData) {
            const error = new Error('getMediaByShortcode returned undefined');

            HawkCatcher.send(error, {
                msg,
                link,
                contentData
            }, { id: chatId });
            console.error(error);
            return;
        }

        try {
            /**
             * Prepare Media object
             * @type {Media}
             */
            const media = new Media(contentData);

            if (media.getOwner().is_private) return;

            /**
             * Get array of medias
             * @type {{type: string, media: string}[]}
             */
            const medias = media.getMedias();

            /**
             * Compose text for message
             * @type {string}
             */
            const mediaText = getMediaText(media);

            if (!media.hasMultipleMedia()) {
                const mediaItem = medias[0];

                const action = mediaItem.type === 'video' ? 'upload_video' : 'upload_photo';
                const actionMethod = mediaItem.type === 'video' ? 'sendVideo' : 'sendPhoto';

                /** Prepare options */
                const options = {
                    reply_to_message_id: msg.message_id,
                    caption: mediaText
                };

                /**
                 * Send message
                 */
                bot.sendChatAction(chatId, action);
                bot[actionMethod](chatId, mediaItem.media, options)
                    .catch((error) => {
                        HawkCatcher.send(error, {
                            msg,
                            options,
                            contentData
                        }, {id: chatId});
                        console.error(error);
                    })
            } else {
                medias[0].caption = mediaText;

                /**
                 * Send message
                 */
                bot.sendChatAction(chatId, 'upload_photo');
                bot.sendMediaGroup(chatId, medias, {
                    reply_to_message_id: msg.message_id
                })
                    .catch((error) => {
                        HawkCatcher.send(error, {
                            msg,
                            contentData
                        }, {id: chatId});
                        console.error(error);
                    })
            }

            HawkCatcher.send('Metrika hit', {
                link,
                msg
            }, {id: chatId})
        } catch (e) {
            HawkCatcher.send(e, {
                link,
                msg,
                contentData
            }, {id: chatId})
            console.error(e);
        }
    });

    /**
     * Add error handling listener
     */
    bot.on('polling_error', (error) => {
        HawkCatcher.send(error);
        console.error(error);
    });
} catch (error) { HawkCatcher.send(error); console.error(error); }})();
