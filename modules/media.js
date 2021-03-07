const HawkCatcher = require('@hawk.so/nodejs').default;

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

        this.content = contentData.graphql.shortcode_media;
    }

    /**
     * Get post description
     * @returns {string}
     */
    getDescription() {
        const mediaItem = this.content.edge_media_to_caption.edges[0];

        if (!mediaItem) return undefined;

        return mediaItem.node.text;
    }

    /**
     * Get media shorttag identifier
     * @returns {string}
     */
    getShortcode() {
        return this.content.shortcode;
    }

    /**
     * Is target node a video
     * @param node
     * @returns {boolean}
     */
    isVideo(node) {
        if (!node) {
            node = this.content;
        }

        return node.is_video;
    }

    /**
     * Get owner object
     * @returns {*}
     */
    getOwner() {
        return this.content.owner;
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
            const edges = this.content.edge_sidecar_to_children.edges;

            edges.forEach(edge => {
                medias.push(this.getMediaSourceObject(edge.node));
            })
        } else {
            medias.push(this.getMediaSourceObject(this.content));
        }

        return medias;
    }

    /**
     * Get media's type and source link
     * @param node
     * @returns {{media: string, type: string}}
     */
    getMediaSourceObject(node) {
        if (!node) {
            node = this.content;
        }

        if (this.isVideo(node)) {
            return {
                type: 'video',
                media: node.video_url
            };
        }

        return {
            type: 'photo',
            media: node.display_resources.slice(-1)[0].src
        };
    }

    /**
     * If post has children elements
     * then there is more than one media item
     * @returns {boolean}
     */
    hasMultipleMedia() {
        return !!this.content.edge_sidecar_to_children;
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
