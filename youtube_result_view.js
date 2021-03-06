const St = imports.gi.St;
const Lang = imports.lang;
const Params = imports.misc.params;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const ResultViewBase = Me.imports.result_view_base;
const Utils = Me.imports.utils;
const PrefsKeys = Me.imports.prefs_keys;

const RatingView = new Lang.Class({
    Name: 'YoutubeRatingView',

    _init: function(params) {
        this.params = Params.parse(params, {
            style_class: '',
            likes_style_class: '',
            dislikes_style_class: '',
            rating: 0,
            rating_max: 5,
            width: 200,
            height: 5
        });
        this.actor = new St.BoxLayout({
            style_class: this.params.style_class,
            width: this.params.width,
            height: this.params.height,
            vertical: false
        });
        this.actor.connect('destroy', Lang.bind(this, this.destroy));

        this._likes = new St.Bin({
            style_class: this.params.likes_style_class,
            width: this._get_likes_width()
        });
        this._dislikes = new St.Bin({
            style_class: this.params.dislikes_style_class,
            width: this._get_dislikes_width()
        });

        this.actor.add(this._likes);
        this.actor.add(this._dislikes);

        if(this.params.rating < 1) this.actor.hide();
    },

    _get_likes_width: function() {
        let percent_width = this.actor.width / 100;
        let percent_progress =
            100 / this.params.rating_max
            * this.params.rating;
        let result = Math.floor(percent_width * percent_progress);
        return result;
    },

    _get_dislikes_width: function() {
        let percent_width = this.actor.width / 100;
        let percent_progress =
            100 / this.params.rating_max
            * (this.params.rating_max - this.params.rating);
        let result = Math.floor(percent_width * percent_progress);
        return result;
    },

    _update: function() {
        this._likes.set_width(this._get_likes_width());
        this._dislikes.set_width(this._get_dislikes_width());
    },

    destroy: function() {
        if(this.actor) this.actor.destroy();
    },

    set_width: function(width) {
        this.actor.set_width(width);
        this._update();
    }
});

const YoutubeResultView = new Lang.Class({
    Name: 'YoutubeResultView',
    Extends: ResultViewBase.ResultViewBase,

    _init: function(youtube_media) {
        let description_height_percents =
            Utils.SETTINGS.get_int(PrefsKeys.DESCRIPTION_HEIGHT_PERCENTS);
        let params = {
            real_width: 320,
            real_height: 180,
            description_height_percents: description_height_percents,
            actor_style_class: 'grilo-result-box',
            table_style_class: 'grilo-content-box',
            title_style_class: 'grilo-title',
            description_style_class: 'grilo-youtube-description',
            source_label_color: 'rgba(250, 30, 30, 0.7)',
            source_label: 'YouTube'
        };
        this.parent(youtube_media, params);

        this._rating = new RatingView({
            width: this.params.real_width,
            rating: this._media.rating,
            style_class: 'grilo-youtube-rating-box',
            likes_style_class: 'grilo-youtube-likes',
            dislikes_style_class: 'grilo-youtube-dislikes'
        });

        this._duration_label = new St.Label({
            style_class: 'grilo-youtube-duration-label',
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
        this.table.add(this._rating.actor, {
            row: 0,
            col: 0,
            x_align: St.Align.START,
            y_align: St.Align.END,
            x_expand: false,
            y_expand: false,
            x_fill: false,
            y_fill: false
        });
    },

    set_width: function(width) {
        if(this._rating) this._rating.set_width(width);
        this.parent(width);
    }
});
