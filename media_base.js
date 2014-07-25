const Lang = imports.lang;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;

const MediaBase = new Lang.Class({
    Name: 'MediaBase',

    _init: function(grilo_media, ready_callback) {
        this._grilo_media = grilo_media;
        this._ready_callback = ready_callback;
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

    get small_thumbnail() {
        return this.thumbnaill;
    },

    get thumbnail() {
        return this._grilo_media.get_thumbnail();
    },

    get big_thumbnail() {
        return this.thumbnail;
    },

    get url() {
        return this._grilo_media.get_url();
    },

    get external_url() {
        return this._grilo_media.get_external_url();
    },

    get creation_date() {
        return this._grilo_media.get_creation_date();
    },

    get author() {
        return this._grilo_media.get_author();
    },

    get rating() {
        return this._grilo_media.get_rating();
    },

    get duration() {
        return this._grilo_media.get_duration();
    },

    get duration_string() {
        return Utils.duration_string(this.duration);
    }
});
