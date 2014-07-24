const St = imports.gi.St;
const Lang = imports.lang;
const Signals = imports.signals;
const Separator = imports.ui.separator;
const Main = imports.ui.main;
const Params = imports.misc.params;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const PrefsKeys = Me.imports.prefs_keys;
const ResultsStatusBox = Me.imports.results_status_box;
const ResultsViewRow = Me.imports.results_view_row;

const CONNECTION_IDS = {
    OVERVIEW_HIDING: 0
};

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
        this._status_box = new ResultsStatusBox.ResultsStatusBox({
            box_style_class: 'grilo-status-box',
            label_style_class: 'grilo-status-box-text'
        });

        Main.uiGroup.add_child(this.actor);

        CONNECTION_IDS.OVERVIEW_HIDING = Main.overview.connect(
            'hiding',
            Lang.bind(this, this.hide)
        );
    },

    _make_new_row: function() {
        let [width, height] = this._get_size();
        let padding = this._get_padding();

        let row = new ResultsViewRow.ResultsViewRow({
            max_width: width
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
        Main.uiGroup.set_child_above_sibling(this.actor, null);
        this._resize();
        this._reposition();
        this.actor.show();
    },

    hide: function() {
        Main.overview.viewSelector._searchResults.actor.show();
        this.actor.hide();
    },

    destroy: function() {
        if(CONNECTION_IDS.OVERVIEW_HIDING > 0) {
            Main.overview.disconnect(CONNECTION_IDS.OVERVIEW_HIDING);
            CONNECTION_IDS.OVERVIEW_HIDING = 0;
        }

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
