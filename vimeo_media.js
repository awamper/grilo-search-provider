const Lang = imports.lang;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const MediaBase = Me.imports.media_base;

const VimeoMedia = new Lang.Class({
    Name: 'VimeoMedia',
    Extends: MediaBase.MediaBase,

    _init: function(grilo_media, ready_callback) {
        this.parent(grilo_media, ready_callback);
        this._ready_callback(this);
    },

    get thumbnail() {
        let thumbnail_url = this._grilo_media.get_thumbnail();
        let bigger_url = thumbnail_url.replace(/([0-9]+x[0-9]+)/g, '320x180');
        return bigger_url;
    },

    get url() {
        return this.external_url;
    },

    get external_url() {
        return 'https://vimeo.com/%s'.format(this.id);
    }
});
