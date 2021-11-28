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

const TelegramBot = require('node-telegram-bot-api');
const TextFormatting = require('./utils/text-formatting')();
const instagramRegex = require('./utils/instagram-regex');
const Media = require('./modules/media');
const axios = require('axios');
const {story} = require("./utils/instagram-regex");

const request = async (uri, isApi = true) => {
    console.log('REQ', `https://${isApi ? '' : 'i.'}instagram.com${uri}${isApi ? '/?__a=1' : ''}`);

    return (await axios({
        method: 'get',
        url: `https://${isApi ? '' : 'i.'}instagram.com${uri}${isApi ? '/?__a=1' : ''}`,
        headers: {
            "Cookie": process.env.COOKIE_STRING,
            "User-Agent": "Instagram 10.26.0 (iPhone8,1; iOS 10_2; en_US; en-US; scale=2.00; gamut=normal; 750x1334) AppleWebKit/420+",
            // "Accept-Language":  "en-us",
            // "Accept-Encoding": "gzip, deflate, br",
            // "Connection": "keep-alive",
            // "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            // "Host": "www.instagram.com"
        }
    })).data;
};

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
        // mediaCaption = TextFormatting.createProfileLink(mediaCaption);

        caption = `${mediaCaption}\n` +
                  `\n`
    }

    // caption += `[📷](${media.getMediaPostLink()}) instagram.com/${media.getOwnerUsername()}`;
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
    // const instagram = new Instagram({});
    await request('/instagram');

    console.log('Ready to process photos')


    /**
     * Prepare Telegram bot
     * @type {TelegramBot}
     */
    const bot = new TelegramBot(process.env.BOT_TOKEN, {polling: true});

    /**
     * If message contains a link to instagram post
     * Then get this link and find a post data
     */
    bot.onText(instagramRegex.post, async (msg, match) => {
        /** Get chatId for response sending */
        const chatId = msg.chat.id;

        /** Get Instagram post tag */
        const link = match[1];
        const mediaTag = match[2];

        let contentData;

        try {
            /** Load Instagram post media data*/
            contentData = await request(`/p/${mediaTag}`);
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

            if (media.getOwner().is_private) {
                const action = 'typing';
                const message = 'Unable to get images because this profile is private';
                const options = {
                    reply_to_message_id: msg.message_id
                }

                bot.sendChatAction(chatId, action);
                bot.sendMessage(chatId, message, options)
                    .catch((error) => {
                        HawkCatcher.send(error, {
                            msg,
                            options,
                            contentData
                        }, {id: chatId});
                        console.error(error);
                    })
                return;
            }

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
                    caption: mediaText,
                    // parse_mode: 'Markdown'
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
                // medias[0].parse_mode = 'Markdown';

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

    bot.onText(instagramRegex.story, async (msg, match) => {
        /** Get chatId for response sending */
        const chatId = msg.chat.id;

        const link = match[1];
        const userName = match[2];
        const storyId = match[3];

        let contentData;

        try {
            /** Load Instagram post media data*/
            contentData = await request(`/stories/${userName}/${storyId}`);
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
            const error = new Error('Cannot get story author cause response is empty');

            HawkCatcher.send(error, {
                msg,
                link,
                contentData
            }, { id: chatId });
            console.error(error);
            return;
        }

        try {
            const userId = contentData.user.id;

            const storiesData = await request(`/api/v1/feed/reels_media/?reel_ids=${userId}`, false);

            storiesData.reels[userId.toString()].items.forEach(storyItem => {
                if (storyItem.id !== `${storyId}_${userId}`) return;

                let mediaUrl;

                /** Prepare options */
                const options = {
                    reply_to_message_id: msg.message_id,
                    caption: `🚀 instagram.com/${userName}`,
                    // parse_mode: 'Markdown'
                };

                /**
                 * media_type 1 — photo
                 * media_type 2 — video
                 */
                if (storyItem.media_type === 1) {
                    mediaUrl = storyItem.image_versions2.candidates[0].url;

                    bot.sendChatAction(chatId, 'upload_photo');

                    bot.sendPhoto(chatId, mediaUrl, options)
                } else if (storyItem.media_type === 2) {
                    mediaUrl = storyItem.video_versions[0].url;

                    bot.sendChatAction(chatId, 'upload_video');
                    bot.sendVideo(chatId, mediaUrl, options)
                }

            });

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
