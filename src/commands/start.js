/**
 * @param {TelegramBot} bot
 * @return {(function(*, *): void)|*}
 */
function commandStart(bot) {
  return function (msg, match) {
    const chatId = msg.chat.id;
    const message =
      `😜\n` +
      `\n` +
      `Пришли мне ссылку на пост, рилс или сторис.\n` +
      `Могу работать даже в групповом чате.\n` +
      `\n` +
      `Send me a link to Instagram post, reel or story.\n` +
      `I even work in a group chat.\n`;

    bot.sendChatAction(chatId, 'typing');
    bot.sendMessage(chatId, message);
  }
}

module.exports = commandStart;
