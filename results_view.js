const St = imports.gi.St;
const Lang = imports.lang;
const Signals = imports.signals;
const Separator = imports.ui.separator;
const Main = imports.ui.main;
const Params = imports.misc.params;

const Me = imports.misc.extensionUtils.getCurrentExtension();
// const Utils = Me.imports.utils;
// const PrefsKeys = Me.imports.prefs_keys;
const ResultViewBase = Me.imports.result_view_base;

const MessageResultView = new Lang.Class({
    Name: 'GriloMessageResultView',
    Extends: ResultViewBase.ResultViewBase,

    _init: function(message) {
        let params = {
            real_width: 320,
            real_height: 180,
            actor_style_class: 'grilo-result-box',
            table_style_class: 'grilo-content-box',
            show_description: false
        };
        this.parent(null, params);

        this._title = new St.Label({
            text: 'Grilo Search Provider',
            style: 'font-size: 23px; padding: 5px;'
        });
        this._message = new St.Label({
            text: message,
            style: 'font-size: 15px; padding: 10px;'
        });

        this.table.add(this._title, {
            row: 0,
            col: 0,
            x_expand: false,
            y_expand: false
        })
        this.table.add(this._message, {
            row: 1,
            col: 0,
            x_align: St.Align.START,
            y_align: St.Align.START,
            x_expand: true,
            y_expand: true
        });
    }
});

const ResultRow = new Lang.Class({
    Name: 'GriloResultsView.ResultRow',

    _init: function(params) {
        this.params = Params.parse(params, {
            max_width: 960,
            default_height: 200
        });

        this.actor = new St.BoxLayout({
            vertical: false
        });
        this.actor.connect('destroy', Lang.bind(this, this.destroy));

        this._items = [];
        this._relative_widths = [];
        this._total_relative_width = 0;
    },

    _update: function() {
        this._relative_widths = [];
        this._total_relative_width = 0;

        if(this.n_items == 1) return;

        for each(let item in this._items) {
            let thumb_width = item.real_width;
            let thumb_height = item.real_height;

            if(thumb_height != this.params.default_height) {
                thumb_width = Math.floor(
                    thumb_width * (this.params.default_height / thumb_height)
                );
            }

            this._relative_widths.push(thumb_width);
            this._total_relative_width += thumb_width;
        }

        let ratio = this.params.max_width / this._total_relative_width;

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
        if(this.actor) this.actor.destroy();
        this._items = [];
        this._relative_widths = [];
        this._total_relative_width = null;
    },

    get n_items() {
        return this._items.length;
    }
});

const ResultsView = new Lang.Class({
    Name: 'GriloResultsView',

    _init: function() {
        this.actor = new St.BoxLayout({
            vertical: true,
            style_class: 'grilo-results-box'
        });

        this._rows = [];
    },

    _make_new_row: function() {
        let row = new ResultRow({
            max_width: Main.overview.viewSelector._searchResults._contentBin.width
        });
        this._rows.push(row);
        this.actor.add_child(row.actor);

        return row;
    },

    add_result: function(result_view) {
        let should_make_row =
            this._rows.length === 0 ||
            !this.last_row.has_place_for(result_view);
        if(should_make_row) this._make_new_row();

        this.last_row.add(result_view);
        result_view.connect("clicked",
            Lang.bind(this, function() {
                this.emit("activate", result_view);
            })
        );
    },

    set_results: function(results) {
        this.clear();
        for(let i = 0; i < results.length; i++) this.add_result(results[i]);
    },

    clear: function() {
        this.actor.destroy_all_children();
        this._rows = [];
    },

    show: function() {
        this.actor.show();
    },

    hide: function() {
        this.actor.hide();
    },

    show_message: function(message) {
        let view = new MessageResultView(message);
        this.set_results([view]);
    },

    destroy: function() {
        this.clear();
        this.actor.destroy();
    },

    get last_row() {
        return this._rows[this._rows.length - 1];
    }
});
Signals.addSignalMethods(ResultsView.prototype);
