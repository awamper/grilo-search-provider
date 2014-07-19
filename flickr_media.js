const Lang = imports.lang;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;

const FlickrMedia = new Lang.Class({
    Name: 'FlickrMedia',

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
        return this._grilo_media.get_thumbnail();
    },

    get url() {
        return this._grilo_media.get_url();
    },

    get external_url() {
        let url = 'https://flic.kr/p/%s'.format(
            Utils.base58_encode(parseInt(this.id))
        );

        return url;
    },

    get creation_date() {
        return this._grilo_media.get_creation_date();
    },

    get author() {
        return this._grilo_media.get_author();
    }
});
