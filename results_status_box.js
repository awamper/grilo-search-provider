const St = imports.gi.St;
const Lang = imports.lang;
const Main = imports.ui.main;
const Params = imports.misc.params;
const Tweener = imports.ui.tweener;

const ResultsStatusBox = new Lang.Class({
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
