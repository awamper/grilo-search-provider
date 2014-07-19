const Lang = imports.lang;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;

const VimeoMedia = new Lang.Class({
    Name: 'VimeoMedia',

    _init: function(grilo_media) {
        this._grilo_media = grilo_media;
    },

    get id() {
        return this._grilo_media.get_id();
    },

    get title() {
        return this._grilo_media.get_title();
    },

    get description() {
        return this._grilo_media.get_description();
    },

    get thumbnail() {
        let thumbnail_url = this._grilo_media.get_thumbnail();
        let bigger_url = thumbnail_url.replace(/([0-9]+x[0-9]+)/g, '320x180');
        return bigger_url;
    },

    get rating() {
        return this._grilo_media.get_rating();
    },

    get duration() {
        return this._grilo_media.get_duration();
    },

    get duration_string() {
        return Utils.duration_string(this.duration);
    },

    get url() {
        return this.external_url;
    },

    get external_url() {
        return 'https://vimeo.com/%s'.format(this.id);
    }
});
