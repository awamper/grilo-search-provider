const Lang = imports.lang;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Gio = imports.gi.Gio;
const Grl = imports.gi.Grl;
const Clutter = imports.gi.Clutter;
const Tweener = imports.ui.tweener;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const ApiKeys = Me.imports.api_keys;
const PrefsKeys = Me.imports.prefs_keys;
const ResultsView = Me.imports.results_view;
const YoutubeResultView = Me.imports.youtube_result_view;
const YoutubeMedia = Me.imports.youtube_media;
const FlickrResultView = Me.imports.flickr_result_view;
const FlickrMedia = Me.imports.flickr_media;
const VimeoResultView = Me.imports.vimeo_result_view;
const VimeoMedia = Me.imports.vimeo_media;

const CONNECTION_IDS = {
    KEY_RELEASE: 0,
    TEXT_CHANGED: 0
};

const TIMEOUT_IDS = {
    SEARCH: 0
};

const PLUGIN_IDS = {
    YOUTUBE: 'grl-youtube',
    VIMEO: 'grl-vimeo',
    FLICKR: 'grl-flickr'
};

const PLUGIN_NAMES = {};
PLUGIN_NAMES[PLUGIN_IDS.YOUTUBE] = 'YouTube';
PLUGIN_NAMES[PLUGIN_IDS.VIMEO] = 'Vimeo';
PLUGIN_NAMES[PLUGIN_IDS.FLICKR] = 'Flickr';

const MEDIAS = {};
MEDIAS[PLUGIN_IDS.YOUTUBE] = YoutubeMedia.YoutubeMedia;
MEDIAS[PLUGIN_IDS.VIMEO] = VimeoMedia.VimeoMedia;
MEDIAS[PLUGIN_IDS.FLICKR] = FlickrMedia.FlickrMedia;

const VIEWS = {};
VIEWS[PLUGIN_IDS.YOUTUBE] = YoutubeResultView.YoutubeResultView;
VIEWS[PLUGIN_IDS.VIMEO] = VimeoResultView.VimeoResultView;
VIEWS[PLUGIN_IDS.FLICKR] = FlickrResultView.FlickrResultView;

const KEYWORDS = {};
KEYWORDS[PLUGIN_IDS.YOUTUBE] = 'y';
KEYWORDS[PLUGIN_IDS.VIMEO] = 'v';
KEYWORDS[PLUGIN_IDS.FLICKR] = 'f';

const METADATA_KEYS = [
    Grl.METADATA_KEY_ID,
    Grl.METADATA_KEY_TITLE,
    Grl.METADATA_KEY_DESCRIPTION,
    Grl.METADATA_KEY_URL,
    Grl.METADATA_KEY_EXTERNAL_URL,
    Grl.METADATA_KEY_THUMBNAIL,
    Grl.METADATA_KEY_DURATION,
    Grl.METADATA_KEY_RATING,
    Grl.METADATA_KEY_AUTHOR
];

const GriloSearchProvider = new Lang.Class({
    Name: "GriloSearchProvider",

    _init: function() {
        this._configure_plugins();
        this._overview_search_results =
            Main.overview.viewSelector._searchResults;

        this._grilo_display = new ResultsView.ResultsView();
        this._grilo_display.connect(
            'activate',
            Lang.bind(this, this._on_activate)
        );

        this._n_results = 0;
        this._search_id = -1;
        this._block_search_trigger = false;
        this._new_search = true;

        CONNECTION_IDS.KEY_RELEASE =
            Main.overview._searchEntry.clutter_text.connect(
                "key-release-event",
                Lang.bind(this, this._on_key_release)
            );
        CONNECTION_IDS.TEXT_CHANGED =
            Main.overview._searchEntry.clutter_text.connect(
                "text-changed",
                Lang.bind(this, this._on_text_changed)
            );
    },

    _configure_plugins: function() {
        let youtube_config = Grl.Config.new(PLUGIN_IDS.YOUTUBE, null);
        youtube_config.set_api_key(ApiKeys.YOUTUBE_KEY);
        Grl.Registry.get_default().add_config(youtube_config, null);

        let vimeo_config = Grl.Config.new(PLUGIN_IDS.VIMEO, null);
        vimeo_config.set_api_key(ApiKeys.VIMEO_KEY);
        vimeo_config.set_api_secret(ApiKeys.VIMEO_SECRET);
        Grl.Registry.get_default().add_config(vimeo_config);

        let flickr_config = Grl.Config.new(PLUGIN_IDS.FLICKR, null);
        flickr_config.set_api_key(ApiKeys.FLICKR_KEY);
        flickr_config.set_api_secret(ApiKeys.FLICKR_SECRET);
        Grl.Registry.get_default().add_config(flickr_config);
    },

    _load_plugins: function() {
        Grl.Registry.get_default().load_plugin_by_id(PLUGIN_IDS.YOUTUBE);
        Grl.Registry.get_default().load_plugin_by_id(PLUGIN_IDS.VIMEO);
        Grl.Registry.get_default().load_plugin_by_id(PLUGIN_IDS.FLICKR);
    },

    _unload_plugins: function() {
        Grl.Registry.get_default().unload_plugin(PLUGIN_IDS.YOUTUBE);
        Grl.Registry.get_default().unload_plugin(PLUGIN_IDS.VIMEO)
        Grl.Registry.get_default().unload_plugin(PLUGIN_IDS.FLICKR);
    },

    _on_key_release: function(object, event) {
        let symbol = event.get_key_symbol();
        let entry = Main.overview._searchEntry;
        let query = this._parse_query(entry.text);
        let ch = Utils.get_unichar(symbol);

        if(symbol === Clutter.BackSpace && !Utils.is_blank(query.term)) {
            this._cancel_search();
            this._block_search_trigger = true;
            this.show_message("Enter your query");
        }
        else if(ch) {
            this._start_search(query);
        }
    },

    _on_text_changed: function() {
        if(Utils.is_empty_entry(Main.overview._searchEntry)) {
            this._cancel_search();
            this._remove_timeout();
            this._grilo_display.clear();
            this._grilo_display.hide();
            this._remove_display();
        }
    },

    _remove_timeout: function() {
        if(TIMEOUT_IDS.SEARCH > 0) {
            Mainloop.source_remove(TIMEOUT_IDS.SEARCH);
            TIMEOUT_IDS.SEARCH = 0;
        }
    },

    _parse_query: function(terms_string) {
        let keyword = Utils.SETTINGS.get_string(PrefsKeys.KEYWORD);
        let regexp_string = '(%s|%s-(.*?)) (.*)'.format(keyword, keyword);
        let grilo_query_regexp = new RegExp(regexp_string);
        let result = {
            flags: '',
            term: '',
            max_results: -1
        };
        if(!grilo_query_regexp.test(terms_string)) return result;

        let matches = grilo_query_regexp.exec(terms_string);
        let flags = matches[2];
        let term = matches[3];
        if(!Utils.is_blank(flags)) result.flags = flags.trim();

        if(!Utils.is_blank(term)) {
            term = term.trim();
            let max_results_regexp = /(.*?)\\([0-9]+)/;

            if(max_results_regexp.test(term)) {
                matches = max_results_regexp.exec(term);
                result.term = matches[1];
                result.max_results = parseInt(matches[2], 10);
            }
            else {
                result.term = term;
            }
        }

        return result;
    },

    _cancel_search: function() {
        if(this._search_id !== -1) {
            Grl.operation_cancel(this._search_id);
            this._search_id = -1;
        }
    },

    _on_search_result: function(source, id, media, remaining, u_data, error) {
        if(error) {
            log("Search failed " + error.message);
            return;
        }

        if(remaining === 0) {
            if(this._n_results === 0) {
                let nothing_found_msg =
                    'Your search did not match any documents.';
                this.show_message(nothing_found_msg);
            }

            this._search_id = -1;
        }

        if(!media) return;

        // let result = {
        //     id: media.get_id(),
        //     title: media.get_title(),
        //     duration: media.get_duration(),
        //     rating: media.get_rating(),
        //     external_url: media.get_external_url(),
        //     url: media.get_url(),
        //     description: media.get_description(),
        //     thumb: media.get_thumbnail(),
        //     cr_date: media.get_creation_date(),
        //     author: media.get_author()
        // };
        // log(JSON.stringify(result, null, '\t'));

        if(this._new_search) {
            this._n_results = 1;
            this._grilo_display.clear();
            this._new_search = false;
        }
        else {
            this._n_results++;
        }

        let source_id = media.get_source();
        let source_media = new MEDIAS[source_id](
            media,
            Lang.bind(this, this._show_result, source_id)
        );
    },

    _get_max_results: function(query) {
        let max_results;
        let max_max_results = Utils.SETTINGS.get_int(PrefsKeys.MAX_MAX_RESULTS);

        if(query.max_results > 0 && query.max_results <= max_max_results) {
            max_results = query.max_results;
        }
        else {
            max_results = Utils.SETTINGS.get_int(PrefsKeys.MAX_RESULTS);
        }

        return max_results;
    },

    _search: function(query, sources) {
        let max_results = this._get_max_results(query);

        let options_flags =
            Grl.ResolutionFlags.FAST_ONLY
            | Grl.ResolutionFlags.IDLE_RELAY;

        let options = Grl.OperationOptions.new(null);
        options.set_count(max_results);
        options.set_flags(options_flags);
        this._search_id = Grl.multiple_search(
            sources,
            query.term,
            METADATA_KEYS,
            options,
            Lang.bind(this, this._on_search_result),
            null
        );
    },

    _start_search: function(query) {
        this._n_results = 0;
        this._new_search = true;
        this._grilo_display.clear();
        this._cancel_search();
        this._remove_timeout();
        if(Utils.is_blank(query.term)) return;

        let sources = Grl.Registry.get_default().get_sources(true)
        let result_sources = [];
        let result_names = [];

        let enable_youtube = Utils.SETTINGS.get_boolean(
            PrefsKeys.ENABLE_YOUTUBE
        );
        let enable_vimeo = Utils.SETTINGS.get_boolean(
            PrefsKeys.ENABLE_VIMEO
        );
        let enable_flickr = Utils.SETTINGS.get_boolean(
            PrefsKeys.ENABLE_FLICKR
        );

        for each(let source in sources) {
            let source_id = source.get_id();

            if(query.flags) {
                if(query.flags.indexOf(KEYWORDS[source_id]) !== -1) {
                    result_sources.push(source);
                    result_names.push(PLUGIN_NAMES[source_id]);
                }
            }
            else {
                if(source_id === PLUGIN_IDS.YOUTUBE && enable_youtube) {
                    result_sources.push(source);
                    result_names.push(PLUGIN_NAMES[source_id]);
                }
                if(source_id === PLUGIN_IDS.VIMEO && enable_vimeo) {
                    result_sources.push(source);
                    result_names.push(PLUGIN_NAMES[source_id]);
                }
                if(source_id === PLUGIN_IDS.FLICKR && enable_flickr) {
                    result_sources.push(source);
                    result_names.push(PLUGIN_NAMES[source_id]);
                }
            }
        }

        this.show_message(
            'Search %s for "%s"'.format(result_names.join(', '), query.term)
        );

        TIMEOUT_IDS.SEARCH = Mainloop.timeout_add(
            Utils.SETTINGS.get_int(PrefsKeys.SEARCH_TIMEOUT),
            Lang.bind(this, function() {
                this._remove_timeout();
                this._insert_display();
                this.show_message(
                    'Searching %s for "%s"...'.format(
                        result_names.join(', '),
                        query.term
                    )
                );
                this._search(query, result_sources);
            })
        );
    },

    _show_result: function(source_media, source_id) {
        this._overview_search_results._statusBin.hide();
        this._grilo_display.show();

        let display = new VIEWS[source_id](source_media);
        this._grilo_display.add_result(display);
    },

    _animate_activation: function(result_view) {
        Main.overview.toggle();
        [x, y] = result_view.actor.get_transformed_position();
        let clone = new Clutter.Clone({
            source: result_view.actor,
            width: result_view.actor.width,
            height: result_view.actor.height,
            x: x,
            y: y
        });
        clone.set_pivot_point(0.5, 0.5);
        Main.uiGroup.add_child(clone);

        Tweener.addTween(clone, {
            opacity: 0,
            scale_x: 1.5,
            scale_y: 1.5,
            time: 0.5,
            transition: 'easeInExpo',
            onComplete: Lang.bind(this, function() {
                clone.destroy();
            })
        });
    },

    _on_activate: function(object, result_view) {
        if(!result_view.media.external_url) return;

        Gio.app_info_launch_default_for_uri(
            result_view.media.external_url,
            global.create_app_launch_context(0, -1)
        );
        this._animate_activation(result_view);
    },

    _insert_display: function() {
        let contains = this._overview_search_results._content.contains(
            this._grilo_display.actor
        );
        if(contains) this._remove_display();

        this._overview_search_results._content.insert_child_at_index(
            this._grilo_display.actor,
            0
        );
    },

    _remove_display: function() {
        let contains = this._overview_search_results._content.contains(
            this._grilo_display.actor
        );
        if(!contains) return;

        this._overview_search_results._content.remove_child(
            this._grilo_display.actor
        );
    },

    show_message: function(message) {
        this._overview_search_results._statusBin.hide();
        this._grilo_display.show();
        this._grilo_display.show_message(message);
    },

    enable: function() {
        this._load_plugins()
    },

    disable: function() {
        this._remove_timeout();

        if(CONNECTION_IDS.KEY_RELEASE > 0) {
            Main.overview._searchEntry.clutter_text.disconnect(
                CONNECTION_IDS.KEY_RELEASE
            );
            CONNECTION_IDS.KEY_RELEASE = 0;
        }
        if(CONNECTION_IDS.TEXT_CHANGED > 0) {
            Main.overview._searchEntry.clutter_text.disconnect(
                CONNECTION_IDS.TEXT_CHANGED
            );
            CONNECTION_IDS.TEXT_CHANGED = 0;
        }

        this._grilo_display.destroy();
        delete this._overview_search_results;
        this._unload_plugins();
    }
});

let grilo_search_provider = null;

function init() {
    Grl.init(null, null);
}

function enable() {
    grilo_search_provider = new GriloSearchProvider();
    grilo_search_provider.enable();
}

function disable() {
    if(grilo_search_provider !== null) {
        grilo_search_provider.disable();
        grilo_search_provider = null;
    }
}
