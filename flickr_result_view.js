const St = imports.gi.St;
const Lang = imports.lang;
const Tweener = imports.ui.tweener;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const ResultViewBase = Me.imports.result_view_base;
const FlickrMedia = Me.imports.flickr_media;
const Utils = Me.imports.utils;
const PrefsKeys = Me.imports.prefs_keys;

const FlickrResultView = new Lang.Class({
    Name: 'FlickrResultView',
    Extends: ResultViewBase.ResultViewBase,

    _init: function(flickr_media) {
        let description_height_percents =
            Utils.SETTINGS.get_int(PrefsKeys.DESCRIPTION_HEIGHT_PERCENTS);
        let photos_size;
        let user_size = Utils.SETTINGS.get_string(PrefsKeys.THUMBNAILS_SIZE);

        if(user_size === Utils.THUMBNAIL_SIZES.MEDIUM) {
            photos_size = FlickrMedia.PHOTO_SIZE.SMALL_320;
        }
        else if(user_size === Utils.THUMBNAIL_SIZES.BIG) {
            photos_size = FlickrMedia.PHOTO_SIZE.MEDIUM;
        }
        else {
            photos_size = FlickrMedia.PHOTO_SIZE.SMALL;
        }

        let size_info = flickr_media.sizes.get(photos_size);

        let params = {
            real_width: size_info.width,
            real_height: size_info.height,
            description_height_percents: description_height_percents,
            actor_style_class: 'grilo-result-box',
            table_style_class: 'grilo-content-box',
            title_style_class: 'grilo-title',
            description_style_class: 'grilo-flickr-description',
            source_label_color: 'rgba(20, 230, 40, 0.7)',
            source_label: 'flickr'
        };
        this.parent(flickr_media, params);

        this.table.remove_child(this._title);
        this.table.add(this._title, {
            row: 0,
            col: 0,
            x_align: St.Align.MIDDLE,
            y_align: St.Align.END,
            x_expand: false,
            y_expand: false,
            x_fill: false,
            y_fill: false
        });
        this._title.hide();
    }
});
