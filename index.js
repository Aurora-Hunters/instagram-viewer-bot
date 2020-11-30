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
 * @param {Media} media
 * @returns {string}
 */
const getMediaText = function (media) {
    let composedCaption = media.getDescription();

    composedCaption = TextFormatting.getFirstParagraph(composedCaption);
    composedCaption = TextFormatting.removeHashtags(composedCaption);
    composedCaption = TextFormatting.trimStringMaxLenght(composedCaption);

    return `${composedCaption}\n` +
           `\n` +
           `📷 instagram.com/${media.getOwnerUsername()}`;
};

/**
 * Main process
 */
const main = (async () => { try {
        /**
         * Prepare Instagram
         * @type {Instagram}
         */
        const instagram = new Instagram({
            username: process.env.INSTAGRAM_USERNAME,
            password: process.env.INSTAGRAM_PASSWORD
        });

        /**
         * Try to login
         */
        await instagram.login();

        /**
         * Try to get profile data
         */
        try {
            const user = await instagram.getUserByUsername({
                username: process.env.INSTAGRAM_USERNAME
            })

            console.log(`Logged in as ${process.env.INSTAGRAM_USERNAME}.`);
        } catch (error) {
            throw new Error(`Cannot login as ${process.env.INSTAGRAM_USERNAME}`);
        }

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

            /**
             * Prepare Media object
             * @type {Media}
             */
            const media = new Media(contentData);

            /**
             * Compose text for message
             * @type {string}
             */
            const mediaText = getMediaText(media);

            if (!media.hasMultipleMedia()) {
                /** Get a link for media file */
                const mediaSrc = media.getMediaSourceObject();
                const mediaLink = mediaSrc.media;

                const action = media.isVideo() ? 'upload_video' : 'upload_photo';
                const actionMethod = media.isVideo() ? 'sendVideo' : 'sendPhoto';

                /** Prepare options */
                const options = {
                    reply_to_message_id: msg.message_id,
                    caption: mediaText
                };

                /**
                 * Send message
                 */
                bot.sendChatAction(chatId, action);
                bot[actionMethod](chatId, mediaLink, options)
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
} catch (error) { HawkCatcher.send(error); console.error(error); }})();