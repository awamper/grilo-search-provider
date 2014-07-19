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
            actor_style_class: 'grilo-result-box',
            table_style_class: 'grilo-content-box',
            title_style_class: 'grilo-title',
            source_label_color: 'rgba(20, 230, 40, 0.7)',
            source_label: 'flickr',
            show_description: false
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

        this.connect('thumbnail-loaded',
            Lang.bind(this, function() {
                this.set_width(this._image_actor.width);
            })
        );
    },

    _show_title: function() {
        this._title.set_opacity(0);
        this._title.show();

        Tweener.removeTweens(this._title);
        Tweener.addTween(this._title, {
            time: 0.3,
            transition: 'easeOutQuad',
            opacity: 255
        });
    },

    _hide_title: function() {
        Tweener.removeTweens(this._title);
        Tweener.addTween(this._title, {
            time: 0.3,
            transition: 'easeOutQuad',
            opacity: 0,
            onComplete: Lang.bind(this, function() {
                this._title.hide();
                this._title.set_opacity(255);
            })
        });
    },
 
    _on_enter: function() {
        this._show_title();
        this.parent();
    },

    _on_leave: function() {
        this._hide_title();
        this.parent();
    }
});
