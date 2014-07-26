const St = imports.gi.St;
const Lang = imports.lang;
const Tweener = imports.ui.tweener;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const ResultViewBase = Me.imports.result_view_base;
const Utils = Me.imports.utils;
const PrefsKeys = Me.imports.prefs_keys;

const VimeoResultView = new Lang.Class({
    Name: 'VimeoResultView',
    Extends: ResultViewBase.ResultViewBase,

    _init: function(vimeo_media) {
        let description_height_percents =
            Utils.SETTINGS.get_int(PrefsKeys.DESCRIPTION_HEIGHT_PERCENTS);
        let params = {
            real_width: 320,
            real_height: 180,
            description_height_percents: description_height_percents,
            actor_style_class: 'grilo-result-box',
            table_style_class: 'grilo-content-box',
            description_style_class: 'grilo-vimeo-description',
            title_style_class: 'grilo-title',
            source_label_color: 'rgba(36, 90, 255, 0.7)',
            source_label: 'Vimeo',
        };
        this.parent(vimeo_media, params);

        this._duration_label = new St.Label({
            style_class: 'grilo-vimeo-duration-label',
            text: this._media.duration_string
        });
        this._duration_label.translation_x = -10;
        this._duration_label.translation_y = -10;

        this.table.add(this._duration_label, {
            row: 0,
            col: 0,
            x_align: St.Align.END,
            y_align: St.Align.END,
            x_expand: false,
            y_expand: false,
            x_fill: false,
            y_fill: false
        });
    }
});
