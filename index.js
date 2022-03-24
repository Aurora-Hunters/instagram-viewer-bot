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
const axios = require('axios');
const { uploadByUrl, uploadByBuffer } = require('telegraph-uploader');
const path = require('path');
const fs = require('fs');

const commandStart = require('./src/commands/start');

const TextFormatting = require('./src/utils/text-formatting')();
const instagramRegex = require('./src/utils/instagram-regex');
const Media = require('./src/modules/media');
const {story} = require("./src/utils/instagram-regex");
const ffmpeg = require('./src/utils/ffmpeg');
const downloadFile = require('./src/utils/download-content');
const throttle = require('./src/utils/throttle');

const request = async (uri, isApi = true) => {
    console.log('REQ', `https://${isApi ? '' : 'i.'}instagram.com${uri}${isApi ? '/?__a=1' : ''}`);

    const UA = {
        iphone: 'Instagram 10.26.0 (iPhone8,1; iOS 10_2; en_US; en-US; scale=2.00; gamut=normal; 750x1334) AppleWebKit/420+',
        macos: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15'
    };

    return (await axios({
        method: 'get',
        url: `https://${isApi ? '' : 'i.'}instagram.com${uri}${isApi ? '/?__a=1' : ''}`,
        headers: {
            "Cookie": process.env.COOKIE_STRING,
            "User-Agent": isApi ? UA.macos : UA.iphone,
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

    bot.onText(/\/start/, commandStart(bot));

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
            const error = new Error(`Cannot get media by shortcode "${mediaTag}" because of ${e}`);

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
                const message = 'Profile is private';
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
            let medias = media.getMedias();

            /**
             * Compose text for message
             * @type {string}
             */
            medias[0].caption = getMediaText(media);

            const action = medias[0].type === 'video' ? 'upload_video' : 'upload_photo';

            medias = await Promise.all(medias.map(async (mediaItem) => {
                try {
                    let tgContent;

                    if (mediaItem.type === 'video') {
                        // return null;

                        const sendAction = throttle(() => {
                            bot.sendChatAction(chatId, 'upload_video');
                        }, 3000)

                        let tempDir = path.join(__dirname, 'temp');
                        if (!fs.existsSync(tempDir)){
                            fs.mkdirSync(tempDir);
                        }

                        let fileName = path.basename(mediaItem.media);
                        fileName = fileName.substring(0, fileName.indexOf('?'));

                        let filePath = path.join(tempDir, fileName);

                        bot.sendChatAction(chatId, 'upload_video');

                        await downloadFile(mediaItem.media, filePath);

                        await new Promise((resolve, reject) => {
                            ffmpeg()
                                .input(filePath)
                                .input('anullsrc=channel_layout=stereo:sample_rate=44100')
                                .inputFormat('lavfi')
                                .outputOption([
                                    '-c:v libx264',
                                    '-b:v 660K',
                                    '-maxrate 660K',
                                    '-bufsize 330K',
                                    '-c:a aac',
                                    '-shortest'
                                ])
                                .on('end', async function (stdout, stderr) {
                                    resolve();
                                })
                                .on('error', function (err, stdout, stderr) {
                                    reject(err);
                                }).on('progress', function(progress) {
                                    sendAction();
                                })
                                .save(`${filePath}.mp4`)
                        });

                        // tgContent = await uploadByBuffer(fs.readFileSync(`${filePath}.mp4`), 'video/mp4');

                        // fs.unlinkSync(`${filePath}`);
                        // fs.unlinkSync(`${filePath}.mp4`);

                        tgContent = fs.createReadStream(`${filePath}.mp4`);
                      // tgContent = fs.createReadStream(`${filePath}`);
                    } else {
                        tgContent = mediaItem.media;
                    }

                    mediaItem.media = tgContent;

                    return mediaItem;
                } catch (error) {
                    HawkCatcher.send(error, {
                        msg,
                        contentData
                    }, {id: chatId});
                    console.error(error);
                }

                return null;
            }));

            medias = medias.filter(mediaItem => {
                return mediaItem !== null;
            });

            // Do not send any message if no media was found
            if (medias.length === 0) {
                return;
            }

            /**
             * Send message
             */
            bot.sendChatAction(chatId, action);
            bot.sendMediaGroup(chatId, medias, {
                reply_to_message_id: msg.message_id,
                allow_sending_without_reply: true
            })
                .catch((error) => {
                    HawkCatcher.send(error, {
                        msg,
                        contentData
                    }, {id: chatId});
                    console.error(error);
                })

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

            if (contentData.user.is_private) {
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

            const storiesData = await request(`/api/v1/feed/reels_media/?reel_ids=${userId}`, false);

            storiesData.reels[userId.toString()].items.forEach(storyItem => {
                if (storyItem.id !== `${storyId}_${userId}`) return;

                if (storyItem.audience) {
                    console.log(`Not allow to show cause storyItem.audience ${storyItem.audience}`);
                    return;
                }

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
                        .catch((error) => {
                            HawkCatcher.send(error, {
                                msg,
                                options,
                                mediaUrl,
                                storyItem
                            }, {id: chatId});
                            console.error(error);
                        })
                } else if (storyItem.media_type === 2) {
                    mediaUrl = storyItem.video_versions[0].url;

                    bot.sendChatAction(chatId, 'upload_video');
                    bot.sendVideo(chatId, mediaUrl, options)
                        .catch((error) => {
                            HawkCatcher.send(error, {
                                msg,
                                options,
                                mediaUrl,
                                storyItem
                            }, {id: chatId});
                            console.error(error);
                        })
                }

                HawkCatcher.send('Metrika hit', {
                    link,
                    msg
                }, {id: chatId})
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
