const St = imports.gi.St;
const Lang = imports.lang;
const Signals = imports.signals;
const Clutter = imports.gi.Clutter;
const Pango = imports.gi.Pango;
const Params = imports.misc.params;
const Tweener = imports.ui.tweener;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;

const DESCRIPTION_MIN_SCALE = 0.9;
const DESCRIPTION_ANIMATION_TIME = 0.2;

const IMAGE_MIN_SCALE = 0.8;
const IMAGE_MAX_SCALE = 1.3;
const IMAGE_ANIMATION_TIME = 0.3;

const DUMMY_ICON_SIZE = 80;

const ResultViewBase = new Lang.Class({
    Name: 'ResultViewBase',

    _init: function(media, params) {
        this._media = media;
        this.params = Params.parse(params, {
            actor_style_class: '',
            table_style_class: '',
            title_style_class: '',
            description_style_class: '',
            source_label_color: '',
            source_label: '',
            width: 300,
            height: 300,
            description_height: 100,
            thumbnail_loaded_animation: true,
            show_description: true
        });

        this.table = new St.Table({
            width: this.params.width,
            height: this.params.height,
            style_class: this.params.table_style_class,
            homogeneous: false,
            track_hover: true,
            reactive: true
        });
        this.table.connect(
            'button-press-event',
            Lang.bind(this, this._on_button_press)
        );
        this.table.connect(
            'button-release-event',
            Lang.bind(this, this._on_button_release)
        );
        this.table.connect(
            'enter-event',
            Lang.bind(this, this._on_enter)
        );
        this.table.connect(
            'leave-event',
            Lang.bind(this, this._on_leave)
        );

        this.actor = new St.BoxLayout({
            style_class: this.params.actor_style_class
        });
        this.actor.connect('destroy', Lang.bind(this, this.destroy));
        this.actor.add(this.table, {
            expand: true
        });

        if(this._media === null) return;

        this._title = new St.Label({
            style_class: this.params.title_style_class,
            width: this.params.width
        });
        this._title.clutter_text.set_single_line_mode(true);
        this._title.clutter_text.set_ellipsize(Pango.EllipsizeMode.END);

        if(this._media.title) {
            this._title.set_text(this._media.title);
        }
        else {
            this._title.hide();
        }

        this._description = new St.Label();
        this._description.clutter_text.set_line_wrap(true);
        if(this._media.description) {
            this._description.set_text(this._media.description);
        }

        this._description_box = new St.BoxLayout({
            style_class: this.params.description_style_class,
            width: this.params.width,
            height: this.params.description_height
        });
        this._description_box.set_pivot_point(0.5, 0.5);
        this._description_box.add(this._description, {
            x_expand: false,
            y_expand: false,
            x_fill: false,
            y_fill: false,
            x_align: St.Align.MIDDLE,
            y_align: St.Align.MIDDLE
        });
        this._description_box.hide();

        if(this._media.thumbnail) {
            let scale_factor =
                St.ThemeContext.get_for_stage(global.stage).scale_factor;
            let texture_cache = St.TextureCache.get_default();

            this._image_actor = texture_cache.load_uri_async(
                this._media.thumbnail,
                this.params.width,
                this.params.height,
                scale_factor
            );
            this._image_actor.set_pivot_point(0.5, 0.5);
            this._image_actor.hide();
            this._image_actor.connect(
                'size-change',
                Lang.bind(this, this._on_thumbnail_loaded)
            );

            this._image_scroll = new Clutter.ScrollActor();
            this._image_scroll.add_child(this._image_actor);
        }
        else {
            this._image_actor = null;
            this._image_scroll = null;
        }

        this._image_dummy = new St.Icon({
            icon_name: Utils.ICONS.IMAGE_PLACEHOLDER,
            icon_size: DUMMY_ICON_SIZE
        });

        let source_label_style =
            'background-color: %s;'.format(this.params.source_label_color) +
            'font-size: 10px;' +
            'color: white;' +
            'padding: 2px;';
        this._source_label = new St.Label({
            text: this.params.source_label
        });
        this._source_label.set_style(source_label_style);
        this._source_label.translation_x = 10;
        this._source_label.translation_y = -10;

        this.table.add(this._image_dummy, {
            row: 0,
            col: 0,
            x_expand: true,
            y_expand: true,
            x_fill: false,
            y_fill: false
        });
        if(this._image_scroll) {
            this.table.add(this._image_scroll, {
                row: 0,
                col: 0,
                x_expand: false,
                y_expand: false,
                x_fill: false,
                y_fill: false
            });
        }
        this.table.add(this._title, {
            row: 0,
            col: 0,
            x_align: St.Align.MIDDLE,
            y_align: St.Align.START,
            x_expand: false,
            y_expand: false,
            x_fill: false,
            y_fill: false
        });
        this.table.add(this._source_label, {
            row: 0,
            col: 0,
            x_align: St.Align.START,
            y_align: St.Align.END,
            x_expand: false,
            y_expand: false,
            x_fill: false,
            y_fill: false
        });
        this.table.add(this._description_box, {
            row: 0,
            col: 0,
            x_align: St.Align.MIDDLE,
            y_align: St.Align.MIDDLE,
            x_expand: false,
            y_expand: false,
            x_fill: false,
            y_fill: false
        });
    },

    _on_thumbnail_loaded: function() {
        if(this.params.thumbnail_loaded_animation) {
            this._image_actor.set_opacity(0);
            this._image_actor.set_scale(IMAGE_MIN_SCALE, IMAGE_MIN_SCALE);
            this._image_actor.show();

            Tweener.removeTweens(this._image_actor);
            Tweener.addTween(this._image_actor, {
                time: IMAGE_ANIMATION_TIME,
                transition: 'easeOutQuad',
                scale_x: 1,
                scale_y: 1,
                opacity: 255,
                onComplete: Lang.bind(this, function() {
                    this._image_dummy.hide();
                })
            });
        }
        else {
            this._image_actor.show();
            this._image_dummy.hide();
        }

        this.emit('thumbnail-loaded', this._image_actor);
    },

    _on_button_press: function(actor, event) {
        let button = event.get_button();

        if(button === Clutter.BUTTON_PRIMARY) {
            actor.add_style_pseudo_class('active');
        }
    },

    _on_button_release: function(actor, event) {
        let button = event.get_button();
        actor.remove_style_pseudo_class('active');

        if(button === Clutter.BUTTON_PRIMARY) {
            this.emit('clicked', button);
            return;
        }
    },

    _on_enter: function() {
        this._show_description();
        this._zoom_thumb_in();
    },

    _on_leave: function() {
        this._hide_description();
        this._zoom_thumb_out();
    },

    _zoom_thumb_in: function() {
        Tweener.removeTweens(this._image_actor);
        Tweener.addTween(this._image_actor, {
            time: IMAGE_ANIMATION_TIME,
            transition: 'easeOutQuad',
            scale_x: IMAGE_MAX_SCALE,
            scale_y: IMAGE_MAX_SCALE
        });
    },

    _zoom_thumb_out: function() {
        Tweener.removeTweens(this._image_actor);
        Tweener.addTween(this._image_actor, {
            time: IMAGE_ANIMATION_TIME,
            transition: 'easeOutQuad',
            scale_x: 1,
            scale_y: 1
        });
    },

    _show_description: function() {
        if(Utils.is_blank(this._media.description)) return;
        if(this._description_box.visible) return;
        if(!this.params.show_description) return;

        this._description_box.set_opacity(0);
        this._description_box.set_scale(
            DESCRIPTION_MIN_SCALE,
            DESCRIPTION_MIN_SCALE
        );
        this._description_box.show();

        Tweener.removeTweens(this._description_box);
        Tweener.addTween(this._description_box, {
            time: DESCRIPTION_ANIMATION_TIME,
            transition: 'easeOutQuad',
            opacity: 255,
            scale_x: 1,
            scale_y: 1
        });
    },

    _hide_description: function() {
        if(!this._description_box.visible) return;

        Tweener.removeTweens(this._description_box);
        Tweener.addTween(this._description_box, {
            time: DESCRIPTION_ANIMATION_TIME,
            scale_x: DESCRIPTION_MIN_SCALE,
            scale_y: DESCRIPTION_MIN_SCALE,
            transition: 'easeOutQuad',
            opacity: 0,
            onComplete: Lang.bind(this, function() {
                this._description_box.hide();
                this._description_box.set_opacity(255);
            })
        });
    },

    set_width: function(width) {
        this._title.set_width(width);
        this._description_box.set_width(width);
        this.table.set_width(width);
    },

    set_height: function(height) {
        this.table.set_height(height);
    },

    destroy: function() {
        if(this.actor) this.actor.destroy();
        this._media = null;
    },

    get media() {
        return this._media;
    }
});
Signals.addSignalMethods(ResultViewBase.prototype);
