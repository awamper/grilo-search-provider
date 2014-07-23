const St = imports.gi.St;
const Lang = imports.lang;
const Signals = imports.signals;
const Separator = imports.ui.separator;
const Main = imports.ui.main;
const Params = imports.misc.params;
const Tweener = imports.ui.tweener;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const PrefsKeys = Me.imports.prefs_keys;

const CONNECTION_IDS = {
    OVERVIEW_HIDING: 0
};

const StatusBox = new Lang.Class({
    Name: 'GriloResultsView.StatusBox',

    _init: function(params) {
        this.params = Params.parse(params, {
            min_scale: 0.7,
            padding: 20,
            box_style_class: '',
            label_style_class: ''
        });
        this.actor = new St.BoxLayout({
            vertical: false,
            style_class: this.params.box_style_class
        });
        this.actor.hide();

        this._message = new St.Label({
            text: '...',
            style_class: this.params.label_style_class
        });

        this.actor.add_child(this._message);

        this._minimized = false;
        this._shown = false;

        Main.uiGroup.add_child(this.actor);
    },

    _set_position: function(x, y, animate) {
        if(!animate) {
            this.actor.translation_x = x;
            this.actor.translation_y = y;
            return;
        }

        Tweener.removeTweens(this.actor);
        Tweener.addTween(this.actor, {
            time: 0.5,
            transition: 'easeOutQuad',
            translation_x: x,
            translation_y: y
        });
    },

    _reposition: function() {
        let monitor = Main.layoutManager.currentMonitor;
        let x, y;

        if(!this._minimized) {
            x = Math.floor(monitor.width / 2 - this.actor.width / 2);
            y = Math.floor(monitor.height / 2 - this.actor.height / 2);
        }
        else {
            x = Math.floor(
                monitor.width - this.actor.width * this.params.min_scale
            );
            y = Math.floor(
                monitor.height - this.actor.height * this.params.min_scale
            );
        }

        this._set_position(x, y, this._shown);
    },

    show: function() {
        if(this._shown) return;

        this._shown = true;
        this._reposition();
        this.actor.show();

        Main.uiGroup.set_child_above_sibling(this.actor, null);
    },

    hide: function() {
        if(!this._shown) return;

        this._shown = false;
        this.actor.hide();
    },

    minimize: function() {
        if(this._minimized) return;
        this.actor.set_scale(this.params.min_scale, this.params.min_scale);
        this._minimized = true;
        this._reposition();
    },

    maximize: function() {
        if(!this._minimized) return;
        this.actor.set_scale(1, 1);
        this._minimized = false;
        this._reposition();
    },

    destroy: function() {
        this.actor.destroy();
    },

    set text(text) {
        this._message.set_text(text);
        this._reposition();
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

        CONNECTION_IDS.OVERVIEW_HIDING = Main.overview.connect(
            'hiding',
            Lang.bind(this, this.hide)
        );
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
            this._total_relative_width +=
                thumb_width + Utils.SETTINGS.get_int(PrefsKeys.RESULTS_SPACING) * 2;
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

const ResultsView = new Lang.Class({
    Name: 'GriloResultsView',

    _init: function() {
        this.actor = new St.ScrollView();
        this.actor.hide();

        this._box = new St.BoxLayout({
            vertical: true,
            style_class: 'grilo-results-box'
        });
        this.actor.add_actor(this._box);

        this._rows = [];
        this._status_box = new StatusBox({
            box_style_class: 'grilo-status-box',
            label_style_class: 'grilo-status-box-text'
        });
    },

    _make_new_row: function() {
        let [width, height] = this._get_size();
        let padding = this._get_padding();

        let row = new ResultRow({
            max_width: width - padding.left - padding.right
        });
        row.hide();
        this._rows.push(row);
        this._box.add(row.actor, {
            x_expand: true,
            y_expand: true,
            x_fill: false,
            y_fill: false,
            x_align: St.Align.START,
            y_align: St.Align.MIDDLE
        });

        return row;
    },

    _get_padding: function() {
        let padding_left = Utils.SETTINGS.get_int(PrefsKeys.RESULTS_PADDING_LEFT);
        let padding_right = Utils.SETTINGS.get_int(PrefsKeys.RESULTS_PADDING_RIGHT);
        let padding_top = Utils.SETTINGS.get_int(PrefsKeys.RESULTS_PADDING_TOP);
        let padding_bottom = Utils.SETTINGS.get_int(PrefsKeys.RESULTS_PADDING_BOTTOM);
        let result = {
            left: padding_left,
            right: padding_right,
            top: padding_top,
            bottom: padding_bottom
        };

        return result;
    },

    _get_size: function() {
        let entry = Main.overview._searchEntry;
        let monitor = Main.layoutManager.currentMonitor;
        let [entry_x, entry_y] = entry.get_transformed_position();
        let padding = this._get_padding();

        let width = monitor.width - padding.left - padding.right;
        let height =
            monitor.height -
            padding.top -
            padding.bottom -
            (entry_y + entry.height);

        return [width, height];
    },

    _resize: function() {
        let [width, height] = this._get_size();

        this.actor.set_width(width);
        this.actor.set_height(height);
    },

    _reposition: function() {
        this._resize();
        let entry = Main.overview._searchEntry;
        let [entry_x, entry_y] = entry.get_transformed_position();
        let padding = this._get_padding();

        let x = padding.left;
        let y = entry_y + entry.height + padding.top;
        this.actor.set_position(x, y);
    },

    add_result: function(result_view, is_last) {
        let should_make_row =
            this._rows.length === 0 ||
            !this.last_row.has_place_for(result_view);
        if(should_make_row) {
            if(this.last_row) this.last_row.show();
            this._make_new_row();
        }
        if(is_last && this.last_row) this.last_row.show();

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
        this._status_box.hide();
        this._box.destroy_all_children();
        this._rows = [];
    },

    show: function() {
        Main.overview.viewSelector._searchResults.actor.hide();
        if(!Main.uiGroup.contains(this.actor)) Main.uiGroup.add_child(this.actor);
        this._resize();
        this._reposition();
        this.actor.show();
    },

    hide: function() {
        Main.overview.viewSelector._searchResults.actor.show();
        this.actor.hide();
        if(Main.uiGroup.contains(this.actor)) Main.uiGroup.remove_child(this.actor);
    },

    destroy: function() {
        this.clear();
        this._status_box.destroy();
        this.actor.destroy();
    },

    get last_row() {
        return this._rows[this._rows.length - 1];
    },

    get status_box() {
        return this._status_box;
    }
});
Signals.addSignalMethods(ResultsView.prototype);
