const Lang = imports.lang;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const MediaBase = Me.imports.media_base;
const Utils = Me.imports.utils;

const VimeoMedia = new Lang.Class({
    Name: 'VimeoMedia',
    Extends: MediaBase.MediaBase,

    _init: function(grilo_media, ready_callback) {
        this.parent(grilo_media, ready_callback);
        this._ready_callback(this);
    },

    _replace_url: function(new_resolution) {
        let thumbnail_url = this._grilo_media.get_thumbnail();
        thumbnail_url = thumbnail_url.replace(/([0-9]+x[0-9]+)/g, new_resolution);
        return thumbnail_url;
    },

    get small_thumbnail() {
        let resolution = '%sx%s'.format(
            Utils.THUMBNAIL_RESOLUTIONS[Utils.THUMBNAIL_SIZES.MEDIUM].W,
            Utils.THUMBNAIL_RESOLUTIONS[Utils.THUMBNAIL_SIZES.MEDIUM].H
        );
        return this._replace_url(resolution);
    },

    get thumbnail() {
        let resolution = '%sx%s'.format(
            Utils.THUMBNAIL_RESOLUTIONS[Utils.THUMBNAIL_SIZES.MEDIUM].W,
            Utils.THUMBNAIL_RESOLUTIONS[Utils.THUMBNAIL_SIZES.MEDIUM].H
        );
        return this._replace_url(resolution);
    },

    get big_thumbnail() {
        let resolution = '%sx%s'.format(
            Utils.THUMBNAIL_RESOLUTIONS[Utils.THUMBNAIL_SIZES.BIG].W,
            Utils.THUMBNAIL_RESOLUTIONS[Utils.THUMBNAIL_SIZES.BIG].H
        );
        return this._replace_url(resolution);
    },

    get url() {
        return this.external_url;
    },

    get external_url() {
        return 'https://vimeo.com/%s'.format(this.id);
    }
});
