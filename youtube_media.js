const Lang = imports.lang;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const MediaBase = Me.imports.media_base;

const YoutubeMedia = new Lang.Class({
    Name: 'YoutubeMedia',
    Extends: MediaBase.MediaBase,

    get thumbnail() {
        let thumbnail_url = this._grilo_media.get_thumbnail();
        thumbnail_url =
            thumbnail_url.slice(0,
                thumbnail_url.lastIndexOf('/')
            ) + '/mqdefault.jpg';
        return thumbnail_url;
    },

    get url() {
        return this.external_url;
    }
});
