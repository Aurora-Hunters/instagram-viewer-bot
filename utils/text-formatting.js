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

        /** For enabled parse_mode */
        coverBadSymbols: (text, regex = /([_*`\[])/g) => {
            return text.replace(regex, '\\$&');
        },
    }
};