class Media {
    constructor(contentData) {
        this.content = contentData;
    }

    getShortcode() {
        return this.content.shortcode;
    }

    isVideo(node) {
        return node.is_video;
    }

    getOwner() {
        return this.content.owner;
    }

    getOwnerUsername() {
        this.getOwner().username;
    }

    getMedias() {
        const medias = [];

        if (this.hasMultipleMedia()) {
            const edges = this.content.edge_sidecar_to_children.edges;

            edges.forEach(edge => {
                medias.push(this.getFirstMedia(edge.node));
            })
        } else {
            medias.push(this.getFirstMedia(this.content));
        }

        return medias;
    }

    getFirstMedia(node) {
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

    hasMultipleMedia() {
        return !!this.content.edge_sidecar_to_children;
    }
}

module.exports = Media;