const Lang = imports.lang;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const MediaBase = Me.imports.media_base;

const FlickrMedia = new Lang.Class({
    Name: 'FlickrMedia',
    Extends: MediaBase.MediaBase,

    get external_url() {
        let url = 'https://flic.kr/p/%s'.format(
            Utils.base58_encode(parseInt(this.id))
        );

        return url;
    }
});
