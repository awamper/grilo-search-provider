const St = imports.gi.St;
const Lang = imports.lang;
const Params = imports.misc.params;
const Main = imports.ui.main;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const PrefsKeys = Me.imports.prefs_keys;

const CONNECTION_IDS = {
    OVERVIEW_HIDING: 0
};

const ResultsViewRow = new Lang.Class({
    Name: 'GriloResultsView.ResultsViewRow',

    _init: function(params) {
        this.params = Params.parse(params, {
            max_width: 960,
            default_height: 200,
            max_ratio: 1.2
        });

        this.actor = new St.BoxLayout({
            vertical: false,
            style: 'spacing: %spx; padding-bottom: %spx;'.format(
                Utils.SETTINGS.get_int(PrefsKeys.RESULTS_SPACING),
                Utils.SETTINGS.get_int(PrefsKeys.RESULTS_SPACING)
            )
        });
        this.actor.connect('destroy', Lang.bind(this, this.destroy));

        this._items = [];
        this._relative_widths = [];
        this._total_relative_width = 0;
    },

    _update: function() {
        this._relative_widths = [];
        this._total_relative_width = 0;

        for each(let item in this._items) {
            let thumb_width = item.real_width;
            let thumb_height = item.real_height;

            if(thumb_height != this.params.default_height) {
                thumb_width = Math.floor(
                    thumb_width * (this.params.default_height / thumb_height)
                );
            }

            this._relative_widths.push(thumb_width);
            this._total_relative_width +=
                thumb_width + Utils.SETTINGS.get_int(PrefsKeys.RESULTS_SPACING) * 2;
        }

        let ratio = this.params.max_width / this._total_relative_width;
        if(ratio > this.params.max_ratio) ratio = this.params.max_ratio;

        for (let i in this._items) {
            let item = this._items[i];
            let relative_width = this._relative_widths[i];

            let thumb_width = Math.floor(relative_width * ratio);
            let thumb_height = Math.floor(this.params.default_height * ratio);

            item.set_width(thumb_width);
            item.set_height(thumb_height);
        }
    },

    has_place_for: function(result_view) {
        if(this._total_relative_width * 1.1 < this.params.max_width) return true;
        else return false;
    },

    add: function(result_view) {
        this.actor.add(result_view.actor, {
            x_expand: false,
            y_expand: false,
            x_fill: false,
            y_fill: false,
            x_align: St.Align.START,
            y_align: St.Align.MIDDLE
        });
        this._items.push(result_view);
        this._update();
    },

    show: function() {
        this.actor.show();
    },

    hide: function() {
        this.actor.hide();
    },

    destroy: function() {
        if(CONNECTION_IDS.OVERVIEW_HIDING > 0) {
            Main.overview.disconnect(CONNECTION_IDS.OVERVIEW_HIDING);
            CONNECTION_IDS.OVERVIEW_HIDING = 0;
        }

        if(this.actor) this.actor.destroy();
        this._items = [];
        this._relative_widths = [];
        this._total_relative_width = null;
    },

    get n_items() {
        return this._items.length;
    }
});
