const hashtagRegex = require('hashtag-regex')();

module.exports = () => {
    return {
        trimStringMaxLenght: (text, length = 930) => {
            return text.length > length ?
                text.substring(0, length - 3) + "..." :
                text;
        },

        getFirstParagraph: (text) => {
            return (text.match(/[^\r\n]+/g)[0]).trim();
        },

        removeHashtags: (text) => {
            return text.replace(hashtagRegex, '');
        },

        createProfileLink: (text) => {
            return text.replace(/(?:@)([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)/, (matched, index, original) => {
                if (index !== 0) {
                    return `[${matched}](https://instagram.com/${matched.slice(1)})`;
                } else {
                    return '';
                }
            });
        },

        /** For enabled parse_mode */
        coverBadSymbols: (text, regex = /([_*`\[])/g) => {
            return text.replace(regex, '\\$&');
        },
    }
};
