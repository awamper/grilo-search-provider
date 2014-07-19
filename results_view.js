const St = imports.gi.St;
const Lang = imports.lang;
const Signals = imports.signals;
const Separator = imports.ui.separator;
// const Main = imports.ui.main;

const Me = imports.misc.extensionUtils.getCurrentExtension();
// const Utils = Me.imports.utils;
// const PrefsKeys = Me.imports.prefs_keys;
const ResultViewBase = Me.imports.result_view_base;

const MessageResultView = new Lang.Class({
    Name: 'GriloMessageResultView',
    Extends: ResultViewBase.ResultViewBase,

    _init: function(message) {
        let params = {
            width: 320,
            height: 180,
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

const ResultsView = new Lang.Class({
    Name: 'GriloResultsView',

    _init: function() {
        this.actor = new St.BoxLayout({
            vertical: true,
            style_class: 'grilo-results-box'
        });

        this._table = new St.Table({
            homogeneous: false
        });
        this._separator = new Separator.HorizontalSeparator({
            style_class: 'search-section-separator'
        });

        this.actor.add(this._table);
        this.actor.add_child(this._separator.actor);
    },

    add_result: function(result) {
        let max_columns = 3;
        let row = this._table.row_count - 1;
        let column = this._table.get_n_children() % max_columns;
        if(column === 0) row++;

        this._table.add(result.actor, {
            row: row,
            col: column,
            x_expand: false,
            y_expand: false,
            x_fill: false,
            y_fill: false,
            x_align: St.Align.START,
            y_align: St.Align.MIDDLE
        });

        result.connect("clicked",
            Lang.bind(this, function() {
                this.emit("activate", result);
            })
        );
    },

    set_results: function(results) {
        this.clear();
        for(let i = 0; i < results.length; i++) this.add_result(results[i]);
    },

    clear: function() {
        this._table.destroy_all_children();
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
        this.actor.destroy();
    }
});
Signals.addSignalMethods(ResultsView.prototype);
