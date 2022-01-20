const HawkCatcher = require('@hawk.so/nodejs').default;


const MEDIA_TYPE = {
    PHOTO: 1,
    VIDEO: 2
}

/**
 * Helper wrapper for getting information from Instagram media response
 */
class Media {
    /**
     * Initialize class with content data
     * @param contentData
     */
    constructor(contentData) {
        console.log('contentData', contentData);

        this.content = contentData.items[0];
    }

    /**
     * Get post description
     * @returns {string}
     */
    getDescription() {
        const mediaItem = this.content;

        if (!mediaItem) return undefined;

        return mediaItem.caption.text;
    }

    /**
     * Get media shorttag identifier
     * @returns {string}
     */
    getShortcode() {
        return this.content.code;
    }

    /**
     * Is target node a video
     * @param node
     * @returns {boolean}
     */
    isVideo(mediaItem) {
        return mediaItem.media_type === MEDIA_TYPE.VIDEO;
    }

    /**
     * Get owner object
     * @returns {*}
     */
    getOwner() {
        return this.content.user;
    }

    /**
     * Get owner's username
     */
    getOwnerUsername() {
        return this.getOwner().username;
    }

    /**
     * Get array of medias for target post
     * @returns {[]}
     */
    getMedias() {
        const medias = [];

        /**
         * If more than one item then process children array
         * Otherwise get only first item
         */
        if (this.hasMultipleMedia()) {
            const mediaItems = this.content.carousel_media;

            mediaItems.forEach(item => {
                medias.push(this.getMediaSourceObject(item));
            })
        } else {
            medias.push(this.getMediaSourceObject(this.content));
        }

        return medias;
    }

    /**
     * Get media's type and source link
     * @param mediaItem
     * @returns {{media: string, type: string}}
     */
    getMediaSourceObject(mediaItem) {
        if (this.isVideo(mediaItem)) {
            return {
                type: 'video',
                media: mediaItem.video_versions[0].url
            };
        }

        return {
            type: 'photo',
            media: mediaItem.image_versions2.candidates[0].url
        };
    }

    /**
     * If post has children elements
     * then there is more than one media item
     * @returns {boolean}
     */
    hasMultipleMedia() {
        return this.content.carousel_media_count > 1;
    }

    /**
     * Compose a link to post
     * @returns {string}
     */
    getMediaPostLink () {
        return `https://www.instagram.com/p/${this.getShortcode()}`;
    }
}

module.exports = Media;
