const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const ExtensionUtils = imports.misc.extensionUtils;

const SETTINGS = getSettings();

const ICONS = {
    IMAGE_PLACEHOLDER: 'camera-photo-symbolic'
};

// https://gist.github.com/inflammable/2929362
function base58_encode(number) {
    let alphabet = '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
    let base = alphabet.length;

    if(typeof number !== 'number' || number !== parseInt(number)) {
        throw new Error('"base58_encode()" only accepts integers.');
    }

    let encoded = '';

    while(number) {
        let remainder = number % base;
        number = Math.floor(number / base);
        encoded = alphabet[remainder].toString() + encoded;
    }

    return encoded;
}

function duration_string(total_seconds) {
    let hours = parseInt(total_seconds / 3600) % 24;
    let minutes = parseInt(total_seconds / 60) % 60;
    let seconds = parseInt(total_seconds % 60, 10);

    let result_string = '%s%s%s'.format(
        hours > 0 ? (hours < 10 ? '0' + hours + ':' : hours + ':') : '',
        (minutes < 10 && hours > 0) ? '0' + minutes + ':': minutes + ':',
        seconds  < 10 ? '0' + seconds : seconds
    );

    return result_string;
}

function get_unichar(keyval) {
    let ch = Clutter.keysym_to_unicode(keyval);

    if(ch) {
        return String.fromCharCode(ch);
    }
    else {
        return false;
    }
}

function is_empty_entry(entry) {
    if(is_blank(entry.text) || entry.text === entry.hint_text) {
        return true
    }
    else {
        return false;
    }
}

function is_blank(str) {
    return (!str || /^\s*$/.test(str));
}

function starts_with(str1, str2) {
    return str1.slice(0, str2.length) == str2;
}

function ends_with(str1, str2) {
  return str1.slice(-str2.length) == str2;
}

/**
 * getSettings:
 * @schema: (optional): the GSettings schema id
 *
 * Builds and return a GSettings schema for @schema, using schema files
 * in extensionsdir/schemas. If @schema is not provided, it is taken from
 * metadata['settings-schema'].
 */
function getSettings(schema) {
    let extension = ExtensionUtils.getCurrentExtension();

    schema = schema || extension.metadata['settings-schema'];

    const GioSSS = Gio.SettingsSchemaSource;

    // check if this extension was built with "make zip-file", and thus
    // has the schema files in a subfolder
    // otherwise assume that extension has been installed in the
    // same prefix as gnome-shell (and therefore schemas are available
    // in the standard folders)
    let schemaDir = extension.dir.get_child('schemas');
    let schemaSource;
    if (schemaDir.query_exists(null))
        schemaSource = GioSSS.new_from_directory(schemaDir.get_path(),
                                                 GioSSS.get_default(),
                                                 false);
    else
        schemaSource = GioSSS.get_default();

    let schemaObj = schemaSource.lookup(schema, true);
    if (!schemaObj)
        throw new Error(
            'Schema ' + schema + ' could not be found for extension ' +
             extension.metadata.uuid + '. Please check your installation.'
        );

    return new Gio.Settings({ settings_schema: schemaObj });
}
