/**
 * Regex for Instagram posts
 *
 * https://www.instagram.com/p/CHeENTUjysv/
 * https://www.instagram.com/p/CHeENTUjysv
 * http://www.instagram.com/p/CHeENTUjysv/
 * http://www.instagram.com/p/CHeENTUjysv
 * https://instagram.com/p/CHeENTUjysv/
 * https://instagram.com/p/CHeENTUjysv
 * http://instagram.com/p/CHeENTUjysv/
 * http://instagram.com/p/CHeENTUjysv
 * www.instagram.com/p/CHeENTUjysv/
 * www.instagram.com/p/CHeENTUjysv
 * instagram.com/p/CHeENTUjysv/
 * instagram.com/p/CHeENTUjysv
 */

/**
 * IGTV
 *
 * https://www.instagram.com/tv/CXLmUOzgW6w/
 */

/**
 * Reels
 *
 * https://www.instagram.com/p/CWdG72bFXhY/
 */
module.exports = {
    /**
     * Posts and reels
     */
    post: /((?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:[^?#&]*)(?:p|reel|tv)\/([^/?#&]+)).*/g,

    /**
     * Stories
     */
    story: /((?:https?:\/\/)?(?:www\.)?instagram\.com\/stories\/([^/?#&]+)\/([^/?#&]+)).*/g
}
