const Lang = imports.lang;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const MediaBase = Me.imports.media_base;

const PHOTO_SIZE = {
    SQUARE: 'Square',
    LARGE_SQUARE: 'Large Square',
    THUMBNAIL: 'Thumbnail',
    SMALL: 'Small',
    SMALL_320: 'Small 320',
    MEDIUM: 'Medium',
    MEDIUM_640: 'Medium 640',
    ORIGINAL: 'Original'
};

const FlickrPhotoSize = new Lang.Class({
    Name: 'FlickrPhotoSize',

    _init: function(data) {
        this._data = data;
    },

    get label() {
        return this._data.label;
    },

    get width() {
        return parseInt(this._data.width, 10);
    },

    get height() {
        return parseInt(this._data.height, 10);
    },

    get source() {
        return this._data.source;
    }
});

const FlickrPhotoSizes = new Lang.Class({
    Name: 'FlickrPhotoSizes',

    _init: function(sizes) {
        this._sizes = sizes;
    },

    get: function(size_label) {
        let result = false;

        for (let i in this._sizes) {
            let size = this._sizes[i];

            if(size.label === size_label) {
                result = new FlickrPhotoSize(size);
                break;
            }
        }

        return result;
    }
});

const FlickrMedia = new Lang.Class({
    Name: 'FlickrMedia',
    Extends: MediaBase.MediaBase,

    _init: function(grilo_media, ready_callback) {
        this.parent(grilo_media, ready_callback);

        Utils.flickr_get_photo_sizes(this.id,
            Lang.bind(this, function(result) {
                if(!result) {
                    this._ready_callback(false);
                }
                else {
                    this.sizes = new FlickrPhotoSizes(result);
                    this._ready_callback(this);
                }
            })
        );
    },

    get external_url() {
        let url = 'https://flic.kr/p/%s'.format(
            Utils.base58_encode(parseInt(this.id))
        );

        return url;
    },

    get description() {
        return this.title;
    }
});
