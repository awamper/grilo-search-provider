const St = imports.gi.St;
const Lang = imports.lang;
const Signals = imports.signals;
const Clutter = imports.gi.Clutter;
const Pango = imports.gi.Pango;
const Params = imports.misc.params;
const Tweener = imports.ui.tweener;
const GLib = imports.gi.GLib;
const Main = imports.ui.main;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const PopupDialog = Me.imports.popup_dialog;
const PrefsKeys = Me.imports.prefs_keys;

const DESCRIPTION_MIN_SCALE = 0.9;
const DESCRIPTION_ANIMATION_TIME = 0.2;

const IMAGE_MAX_SCALE = 1.3;
const IMAGE_ANIMATION_TIME = 0.3;

const DUMMY_ICON_SIZE = 80;

const SOURCE_LABEL_BOTTOM_PADDING = 10;
const SOURCE_LABEL_LEFT_PADDING = 10;

const COPY_LINK_BUTTON_ANIMATION_TIME = 0.4;

const FlashLabel = new Lang.Class({
    Name: 'FlashLabel',
    Extends: PopupDialog.PopupDialog,

    _init: function(text, x, y) {
        this.parent({
            style_class: 'grilo-flash-label',
            modal: false
        });

        let label = new St.Label({
            text: text
        });
        this.actor.add_child(label);

        this._x = x;
        this._y = y;
    },

    show: function() {
        this._reposition(this._x, this._y);

        Main.uiGroup.set_child_above_sibling(this.actor, null);
        this.actor.set_pivot_point(0.5, 0.5);
        this.actor.set_scale(0.7, 0.7);
        this.actor.set_opacity(0);
        this.actor.show();

        Tweener.addTween(this.actor, {
            time: 0.4,
            scale_x: 1,
            scale_y: 1,
            opacity: 255,
            transition: 'easeInExpo',
            onComplete: Lang.bind(this, function() {
                Tweener.addTween(this.actor, {
                    delay: 0.9,
                    time: 0.4,
                    scale_x: 1.7,
                    scale_y: 1.7,
                    opacity: 0,
                    transition: 'easeInExpo',
                    onComplete: Lang.bind(this, function() {
                        this.destroy();
                    })
                });
            })
        });
    }
});

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
            real_width: 300,
            real_height: 300,
            description_height_percents: 50,
            thumbnail_loaded_animation: true,
            show_description: true
        });

        this.table = new St.Table({
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
            style_class: this.params.title_style_class
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
            height: Math.floor(
                this.params.real_height / 100 * this.params.description_height_percents
            )
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
        if(!Utils.SETTINGS.get_boolean(PrefsKeys.ALWAYS_SHOW_DESCRIPTION)) {
            this._description_box.hide();
        }

        let thumbnail_url;
        let user_thumbnails_size = Utils.SETTINGS.get_string(
            PrefsKeys.THUMBNAILS_SIZE
        );

        if(user_thumbnails_size === Utils.THUMBNAIL_SIZES.SMALL) {
            thumbnail_url = this._media.small_thumbnail;
        }
        else if(user_thumbnails_size === Utils.THUMBNAIL_SIZES.BIG) {
            thumbnail_url = this._media.big_thumbnail;
        }
        else {
            thumbnail_url = this._media.thumbnail;
        }

        if(thumbnail_url) {
            let scale_factor =
                St.ThemeContext.get_for_stage(global.stage).scale_factor;
            let texture_cache = St.TextureCache.get_default();

            this._image_actor = texture_cache.load_uri_async(
                thumbnail_url,
                this.params.real_width,
                this.params.real_height,
                scale_factor
            );
            this._image_actor.set_pivot_point(0.5, 0.5);
            this._image_actor.connect(
                'size-change',
                Lang.bind(this, this._on_thumbnail_loaded)
            );

            this._image_scroll = new Clutter.ScrollActor();
            this._image_scroll.add_child(this._image_actor);
            this._image_scroll.hide();
        }
        else {
            this._image_actor = null;
            this._image_scroll = null;
        }

        this._image_dummy = new St.Icon({
            icon_name: Utils.ICONS.IMAGE_PLACEHOLDER,
            icon_size: DUMMY_ICON_SIZE
        });
        this._image_dummy_box = new St.BoxLayout({
            style: 'background-color: white;'
        });
        this._image_dummy_box.add(this._image_dummy, {
            expand: true,
            x_align: St.Align.MIDDLE,
            y_align: St.Align.MIDDLE
        });

        let source_label_style =
            'background-color: %s;'.format(this.params.source_label_color) +
            'font-size: 10px;' +
            'color: white;' +
            'padding: 2px;';
        this._source_label = new St.Label({
            text: this.params.source_label,
            style: source_label_style
        });
        this._source_label.translation_x = SOURCE_LABEL_LEFT_PADDING;
        this._source_label.translation_y = -SOURCE_LABEL_BOTTOM_PADDING;

        this._copy_url_button = new St.Icon({
            icon_name: 'insert-link-symbolic',
            style_class: 'grilo-copy-url-button',
            style: 'background-color: %s'.format(this.params.source_label_color),
            visible: false
        });

        this.table.add(this._image_dummy_box, {
            row: 0,
            col: 0,
            x_expand: true,
            y_expand: true,
            x_fill: true,
            y_fill: true
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
        this.table.add(this._copy_url_button, {
            row: 0,
            col: 0,
            x_align: St.Align.START,
            y_align: St.Align.END,
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

        this.set_width(this.params.real_width);
        this.set_height(this.params.real_height);

        this._thumbnail_animation_id = 0;
        this.block_enter = false;
        this.block_leave = false;
    },

    _on_thumbnail_loaded: function() {
        if(this.params.thumbnail_loaded_animation) {
            this._thumbnail_animation_id = GLib.idle_add(
                GLib.PRIORITY_HIGH_IDLE,
                Lang.bind(this, this._animate_show_thumbnail)
            );
        }
        else {
            this._image_scroll.show();
            this._image_dummy_box.hide();
        }

        this.emit('thumbnail-loaded', this._image_actor);
    },

    _animate_show_thumbnail: function() {
        this._image_scroll.set_opacity(0);
        this._image_scroll.show();

        Tweener.removeTweens(this._image_scroll);
        Tweener.addTween(this._image_scroll, {
            time: IMAGE_ANIMATION_TIME,
            transition: 'easeOutQuad',
            opacity: 255,
            onComplete: Lang.bind(this, function() {
                this._image_dummy_box.hide();
                this._thumbnail_animation_id = 0;
            })
        });
    },

    _show_copy_url_button: function() {
        if(this._copy_url_button.visible) return;

        this._copy_url_button.set_opacity(0);
        this._copy_url_button.show();
        let translation_x =
            SOURCE_LABEL_LEFT_PADDING +
            this._source_label.width -
            this._copy_url_button.width;
        this._copy_url_button.translation_x = translation_x
        this._copy_url_button.translation_y = -SOURCE_LABEL_BOTTOM_PADDING;

        Tweener.removeTweens(this._copy_url_button);
        Tweener.addTween(this._copy_url_button, {
            time: COPY_LINK_BUTTON_ANIMATION_TIME,
            transition: 'easeOutQuad',
            opacity: 255,
            translation_x: translation_x + this._copy_url_button.width
        });
    },

    _hide_copy_url_button: function() {
        if(!this._copy_url_button.visible) return;

        let translation_x =
            SOURCE_LABEL_LEFT_PADDING +
            this._source_label.width;

        Tweener.removeTweens(this._copy_url_button);
        Tweener.addTween(this._copy_url_button, {
            time: COPY_LINK_BUTTON_ANIMATION_TIME,
            transition: 'easeOutQuad',
            opacity: 0,
            translation_x: translation_x - this._copy_url_button.width,
            onComplete: Lang.bind(this, function() {
                this._copy_url_button.hide();
                this._copy_url_button.set_opacity(255);
            })
        })
    },

    _on_button_press: function(actor, event) {
        if(Utils.is_pointer_inside_actor(this._copy_url_button)) {
            this._copy_url_button.add_style_pseudo_class('active');
        }
        else {
            actor.add_style_pseudo_class('active');
        }

        return Clutter.EVENT_STOP;
    },

    _on_button_release: function(actor, event) {
        if(Utils.is_pointer_inside_actor(this._copy_url_button)) {
            this.copy_url_to_clipboard();
            this._copy_url_button.remove_style_pseudo_class('active');
        }
        else {
            let button = event.get_button();
            actor.remove_style_pseudo_class('active');
            this.emit('clicked', button);
        }

        return Clutter.EVENT_STOP;
    },

    _on_enter: function() {
        if(this.block_enter) return;

        if(!Utils.SETTINGS.get_boolean(PrefsKeys.ALWAYS_SHOW_DESCRIPTION)) {
            this._show_description();
        }

        this._show_copy_url_button();
        this._zoom_thumb_in();
    },

    _on_leave: function() {
        if(this.block_leave) return;

        if(!Utils.SETTINGS.get_boolean(PrefsKeys.ALWAYS_SHOW_DESCRIPTION)) {
            this._hide_description();
        }

        this._hide_copy_url_button();
        this._zoom_thumb_out();
    },

    _zoom_thumb_in: function() {
        if(!this._image_actor) return;

        Tweener.removeTweens(this._image_actor);
        Tweener.addTween(this._image_actor, {
            time: IMAGE_ANIMATION_TIME,
            transition: 'easeOutQuad',
            scale_x: IMAGE_MAX_SCALE,
            scale_y: IMAGE_MAX_SCALE
        });
    },

    _zoom_thumb_out: function() {
        if(!this._image_actor) return;

        Tweener.removeTweens(this._image_actor);
        Tweener.addTween(this._image_actor, {
            time: IMAGE_ANIMATION_TIME,
            transition: 'easeOutQuad',
            scale_x: 1,
            scale_y: 1
        });
    },

    _show_description: function() {
        if(!this.params.show_description) return;
        if(Utils.is_blank(this._media.description)) return;
        if(this._description_box.visible) return;

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
        if(!this.params.show_description) return;
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

    copy_url_to_clipboard: function() {
        let clipboard = St.Clipboard.get_default();
        clipboard.set_text(St.ClipboardType.CLIPBOARD, this._media.external_url);

        let [x, y] = global.get_pointer();
        let animated_label = new FlashLabel(this._media.external_url, x, y);
        animated_label.show();
    },

    set_width: function(width) {
        if(this._image_actor) this._image_actor.set_width(width);
        if(this._title) this._title.set_width(width);
        if(this._description_box) this._description_box.set_width(width);
        if(this._image_dummy_box) this._image_dummy_box.set_width(width);
        this.table.set_width(width);
        this.actor.set_width(width);
    },

    set_height: function(height) {
        if(this._image_actor) this._image_actor.set_height(height);
        if(this._image_dummy_box) this._image_dummy_box.set_height(height);

        if(this._description_box) {
            this._description_box.set_height(
                Math.floor(height / 100 * this.params.description_height_percents)
            );
        }

        this.table.set_height(height);
        this.actor.set_height(height);
    },

    destroy: function() {
        if(this._thumbnail_animation_id != 0) {
            GLib.source_remove(this._thumbnail_animation_id);
            this._thumbnail_animation_id = 0;
        }

        if(this.actor) this.actor.destroy();
        this._media = null;
    },

    get media() {
        return this._media;
    },

    get width() {
        return this.table.width;
    },

    get height() {
        return this.table.height;
    },

    get real_width() {
        return this.params.real_width;
    },

    get real_height() {
        return this.params.real_height;
    }
});
Signals.addSignalMethods(ResultViewBase.prototype);
