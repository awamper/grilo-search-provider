const St = imports.gi.St;
const Lang = imports.lang;
const Tweener = imports.ui.tweener;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const ResultViewBase = Me.imports.result_view_base;

const FlickrResultView = new Lang.Class({
    Name: 'FlickrResultView',
    Extends: ResultViewBase.ResultViewBase,

    _init: function(flickr_media) {
        let params = {
            width: 320,
            height: 180,
            description_height: 100,
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
