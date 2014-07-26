const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const Params = imports.misc.params;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const PrefsKeys = Me.imports.prefs_keys;

const PrefsGrid = new GObject.Class({
    Name: 'Grilo.Prefs.Grid',
    GTypeName: 'GriloPrefsGrid',
    Extends: Gtk.Grid,

    _init: function(settings, params) {
        this.parent(params);
        this._settings = settings;
        this.margin = this.row_spacing = this.column_spacing = 10;
        this._rownum = 0;
    },

    add_entry: function(text, key) {
        let item = new Gtk.Entry({
            hexpand: false
        });
        item.text = this._settings.get_string(key);
        this._settings.bind(key, item, 'text', Gio.SettingsBindFlags.DEFAULT);

        return this.add_row(text, item);
    },

    add_shortcut: function(text, settings_key) {
        let item = new Gtk.Entry({
            hexpand: false
        });
        item.set_text(this._settings.get_strv(settings_key)[0]);
        item.connect('changed', Lang.bind(this, function(entry) {
            let [key, mods] = Gtk.accelerator_parse(entry.get_text());

            if(Gtk.accelerator_valid(key, mods)) {
                let shortcut = Gtk.accelerator_name(key, mods);
                this._settings.set_strv(settings_key, [shortcut]);
            }
        }));

        return this.add_row(text, item);
    },

    add_boolean: function(text, key) {
        let item = new Gtk.Switch({
            active: this._settings.get_boolean(key)
        });
        this._settings.bind(key, item, 'active', Gio.SettingsBindFlags.DEFAULT);

        return this.add_row(text, item);
    },

    add_combo: function(text, key, list, type) {
        let item = new Gtk.ComboBoxText();

        for(let i = 0; i < list.length; i++) {
            let title = list[i].title.trim();
            let id = list[i].value.toString();
            item.insert(-1, id, title);
        }

        if(type === 'string') {
            item.set_active_id(this._settings.get_string(key));
        }
        else {
            item.set_active_id(this._settings.get_int(key).toString());
        }

        item.connect('changed', Lang.bind(this, function(combo) {
            let value = combo.get_active_id();

            if(type === 'string') {
                if(this._settings.get_string(key) !== value) {
                    this._settings.set_string(key, value);
                }
            }
            else {
                value = parseInt(value, 10);

                if(this._settings.get_int(key) !== value) {
                    this._settings.set_int(key, value);
                }
            }
        }));

        return this.add_row(text, item);
    },

    add_spin: function(label, key, adjustment_properties, type, spin_properties) {
        adjustment_properties = Params.parse(adjustment_properties, {
            lower: 0,
            upper: 100,
            step_increment: 100
        });
        let adjustment = new Gtk.Adjustment(adjustment_properties);

        spin_properties = Params.parse(spin_properties, {
            adjustment: adjustment,
            numeric: true,
            snap_to_ticks: true
        }, true);
        let spin_button = new Gtk.SpinButton(spin_properties);

        if(type !== 'int') spin_button.set_digits(2);

        let get_method = type === 'int' ? 'get_int' : 'get_double';
        let set_method = type === 'int' ? 'set_int' : 'set_double';

        spin_button.set_value(this._settings[get_method](key));
        spin_button.connect('value-changed', Lang.bind(this, function(spin) {
            let value

            if(type === 'int') value = spin.get_value_as_int();
            else value = spin.get_value();

            if(this._settings[get_method](key) !== value) {
                this._settings[set_method](key, value);
            }
        }));

        return this.add_row(label, spin_button, true);
    },

    add_row: function(text, widget, wrap) {
        let label = new Gtk.Label({
            label: text,
            hexpand: true,
            halign: Gtk.Align.START
        });
        label.set_line_wrap(wrap || false);

        this.attach(label, 0, this._rownum, 1, 1); // col, row, colspan, rowspan
        this.attach(widget, 1, this._rownum, 1, 1);
        this._rownum++;

        return widget;
    },

    add_item: function(widget, col, colspan, rowspan) {
        this.attach(
            widget,
            col || 0,
            this._rownum,
            colspan || 2,
            rowspan || 1
        );
        this._rownum++;

        return widget;
    },

    add_range: function(label, key, range_properties) {
        range_properties = Params.parse(range_properties, {
            min: 0,
            max: 100,
            step: 10,
            mark_position: 0,
            add_mark: false,
            size: 200,
            draw_value: true
        });

        let range = Gtk.Scale.new_with_range(
            Gtk.Orientation.HORIZONTAL,
            range_properties.min,
            range_properties.max,
            range_properties.step
        );
        range.set_value(this._settings.get_int(key));
        range.set_draw_value(range_properties.draw_value);

        if(range_properties.add_mark) {
            range.add_mark(
                range_properties.mark_position,
                Gtk.PositionType.BOTTOM,
                null
            );
        }

        range.set_size_request(range_properties.size, -1);

        range.connect('value-changed', Lang.bind(this, function(slider) {
            this._settings.set_int(key, slider.get_value());
        }));

        return this.add_row(label, range, true);
    },

    add_separator: function() {
        let separator = new Gtk.Separator({
            orientation: Gtk.Orientation.HORIZONTAL
        });

        this.add_item(separator, 0, 2, 1);
    },
});

const GriloSearchProviderPrefsWidget = new GObject.Class({
    Name: 'GriloSearchProvider.Prefs.Widget',
    GTypeName: 'GriloSearchProviderPrefsWidget',
    Extends: Gtk.Box,

    _init: function (params) {
        this.parent(params);
        this.set_orientation(Gtk.Orientation.VERTICAL);

        let main = this._get_main_page();
        let sources = this._get_sources_page();

        let stack = new Gtk.Stack({
            transition_type: Gtk.StackTransitionType.SLIDE_LEFT_RIGHT,
            transition_duration: 500
        });
        let stack_switcher = new Gtk.StackSwitcher({
            margin_left: 5,
            margin_top: 5,
            margin_bottom: 5,
            margin_right: 5,
            stack: stack
        });

        stack.add_titled(main.page, main.name, main.name);
        stack.add_titled(sources.page, sources.name, sources.name);

        this.add(stack_switcher);
        this.add(stack);
    },

    _get_main_page: function() {
        let name = 'Main';
        let page = new PrefsGrid(Utils.SETTINGS);

        let keyword = page.add_entry(
            'Keyword:',
            PrefsKeys.KEYWORD
        );

        let search_on_enter = page.add_boolean(
            'Press <Enter> to search:',
            PrefsKeys.SEARCH_ON_ENTER
        );
        search_on_enter.connect('notify::active',
            Lang.bind(this, function(s) {
                let active = s.get_active();
                delay.set_sensitive(!active);
            })
        );

        let adjustment_properties = {
            lower: 100,
            upper: 5000,
            step_increment: 100
        };
        let delay = page.add_spin(
            'Search delay time(ms):',
            PrefsKeys.SEARCH_TIMEOUT,
            adjustment_properties,
            'int'
        );
        delay.set_sensitive(!Utils.SETTINGS.get_boolean(PrefsKeys.SEARCH_ON_ENTER));

        adjustment_properties.lower = 1;
        adjustment_properties.upper = Utils.SETTINGS.get_int(
            PrefsKeys.MAX_MAX_RESULTS
        );
        adjustment_properties.step_increment = 1;
        let max_results = page.add_spin(
            'Max results:',
            PrefsKeys.MAX_RESULTS,
            adjustment_properties,
            'int'
        );

        page.add_boolean(
            'Remember last search:',
            PrefsKeys.REMEMBER_LAST_SEARCH
        );

        let sizes = [];
        for each(let size in Utils.THUMBNAIL_SIZES) {
            sizes.push({
                title: size,
                value: size
            });
        }
        page.add_combo(
            'Thumbnails size:',
            PrefsKeys.THUMBNAILS_SIZE,
            sizes,
            'string'
        );

        page.add_boolean(
            'Always show description:',
            PrefsKeys.ALWAYS_SHOW_DESCRIPTION
        );

        let result = {
            name: name,
            page: page
        };
        return result;
    },

    _get_sources_page: function() {
        let name = 'Sources';
        let page = new PrefsGrid(Utils.SETTINGS);

        page.add_boolean(
            'YouTube:',
            PrefsKeys.ENABLE_YOUTUBE
        );
        page.add_boolean(
            'Vimeo:',
            PrefsKeys.ENABLE_VIMEO
        );
        page.add_boolean(
            'Flickr:',
            PrefsKeys.ENABLE_FLICKR
        );

        let result = {
            name: name,
            page: page
        };
        return result;
    }
});

function init() {
    // nothing
}

function buildPrefsWidget() {
    let widget = new GriloSearchProviderPrefsWidget();
    widget.show_all();

    return widget;
}
