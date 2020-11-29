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
module.exports = () => {
    return /((?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel)\/([^/?#&]+)).*/g
}