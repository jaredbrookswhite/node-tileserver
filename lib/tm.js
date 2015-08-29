var _ = require('underscore');
var url = require('url');
var path = require('path');
var mapnik = require('mapnik');
var pg = require('pg');
//var applog = require('./log')
var pg_connection = require('../pg_connection')

var tm = {};

// Load maps from database
tm.pg_query = function(query, callback) {
    pg.connect(pg_connection, function(err, client, done) {
        if(err) callback(err);
        client.query(query, function(err, result) {
            //release pg client
            done();
            if(err) callback(err);
            
            callback(null, result);
        });
    });
}

tm.config = function(opts, callback) {
    if (!opts) return tm._config;

    tm._config = _(opts).defaults(tm._config);

    // Register default fonts.
    mapnik.register_fonts(path.dirname(require.resolve('mapbox-studio-pro-fonts')), { recurse: true });
    mapnik.register_fonts(path.dirname(require.resolve('mapbox-studio-default-fonts')), { recurse: true });

    // Register default plugins. Used for font rendering.
    mapnik.register_default_input_plugins();

    // Set up logging with rotation after 10e6 bytes.
/*  
    todo: update logs to use postgres 
    applog(tm.config().log, 10e6, function(err) {
        if (err && callback) return callback(err);
        if (err) throw err;
        // Compact db.
        tm.dbcompact(tm.config().db, function(err, db) {
            if (err && callback) return callback(err);
            if (err) throw err;
            tm.dbmigrate(db);
            tm.db = db;
        });
    });*/
    tm.pg_client = new pg.Client(pg_connection);   
    tm.pg_client.connect();
    
    var handleSources = function(err, pg_sources) {
        if (err) callback(err);
        tm.pg_sources = pg_sources;
        if (callback) return callback();    
    };
    var handleStyles = function(err, pg_styles) {
        if (err) callback(err);
        tm.pg_styles = pg_styles;
        tm.pg_query('SELECT * from map_sources', handleSources);
    };
    
    tm.pg_query('SELECT * from map_styles', handleStyles);
        
  //  return tm._config;
};
/*

todo: update logs to use postgres
// Run migrations on a node-dirty database.
tm.dbmigrate = function(db) {
    switch(db.get('version')) {
        case 3:
        case 2:
        case 1:
            db.set('version', 4);
            db.set('history', _(db.get('history')||{}).reduce(function(memo, list, type) {
                if (type !== 'style' && type !== 'source') return memo;
                list.forEach(function(id) {
                    var uri = url.parse(id);
                    if (uri.protocol === 'mapbox:' && uri.protocol.indexOf(':///') === -1) {
                        memo.push(!uri.pathname ? id.replace('://', ':///') : id);
                    } else if (!uri.protocol) {
                        memo.push('tm' + type + '://' + uri.pathname);
                    } else {
                        memo.push(id);
                    }
                });
                return memo;
            }, []));
            break;
        case undefined:
            db.set('version', 4);
            break;
    }
};

// Compact a node-dirty database. Works by loading an old instance of the db,
// copying all docs into memory, deleting the old db and writing a new one
// in its place.
tm.dbcompact = function(filepath, callback) {
    var olddb = {};
    fs.exists(filepath, function(exists) {
        // If the db does not exist, no need to compact.
        return exists ? readold() : finish();
    });
    // Read the old db into memory.
    function readold() {
        var old = dirty(filepath);
        old.on('error', function(err) { console.warn('tm.dbcompact: ' + err.toString()); });
        old.once('read_close', compact);
        old.once('load', function() {
            old.forEach(function(k,v) { olddb[k] = v; });
            old.close();
            if (!Object.keys(olddb).length) return finish();
        });
    }
    // Build compacted db from old docs.
    function compact() {
        var db = dirty(filepath + '.compacted');
        for (var k in olddb) db.set(k, olddb[k]);
        db.once('write_close', swap);
        db.once('drain', function() { db.close(); });
    }
    // Rename compacted db over old db.
    function swap() {
        fs.rename(filepath + '.compacted', filepath, function(err) {
            if (err) return callback(err);
            return finish();
        });
    }
    function finish() {
        var db = dirty(filepath);
        db.once('load', function() {
            return callback(null, db);
        });
    }
};


// Filter keys out of an object that are not present in defaults.
tm.filterkeys = function(data, defaults) {
    return _(data).reduce(function(memo,v,k) {
        if (!(k in defaults)) return memo;
        memo[k] = v;
        return memo;
    }, {})
};

// Return an object with sorted keys, ignoring case.
tm.sortkeys = function(obj) {
    try {
        return obj.map(tm.sortkeys);
    } catch(e) {};
    try {
        return Object.keys(obj).sort(function(a, b) {
            a = a.toLowerCase();
            b = b.toLowerCase();
            if (a === 'id') return -1;
            if (b === 'id') return 1;
            if (a > b) return 1;
            if (a < b) return -1;
            return 0;
        }).reduce(function(memo, key) {
            memo[key] = tm.sortkeys(obj[key]);
            return memo;
        }, {});
    } catch(e) { return obj };
};
*/
// Named projections.
tm.srs = {
    'WGS84': '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs',
    '900913': '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0.0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over'
};
tm.extent = {
    'WGS84': '-180,-85.0511,180,85.0511',
    '900913': '-20037508.34,-20037508.34,20037508.34,20037508.34'
};
// Reverse the above hash to allow for srs name lookups.
tm.srsname = {};
for (name in tm.srs) tm.srsname[tm.srs[name]] = name;

// Take list of fonts from mapnik and group by "family".
tm._fontfamilies = null;
tm.fontfamilies = function() {
    if (tm._fontfamilies) return tm._fontfamilies;

    var fonts = require('mapnik').fonts();
    fonts.sort();

    // Overrides are custom exceptions -- regexes for known font family
    // names that cannot otherwise be autodetected.
    var overrides = {
        'Call': /^Call (One|Two|Three|Four|Five|Six|Seven|Eight|Nine)/,
        'Komika': /^Komika (Hand|Parch|Title)/
    };
    // Keywords are ordered by "display priority" -- e.g. fonts
    // containing earlier words should be favored for being a preview
    // of the family as a whole.
    var keywords = [
        'medium',
        'normal',
        'regular',
        'book',
        'roman',
        'semibold',
        'demi',
        'bold',
        'caption',
        'cn',
        'cond',
        'condensed',
        'extended',
        'extrabold',
        'black',
        'heavy',
        'ultra',
        'light',
        'narrow',
        'thin',
        'extlight',
        'hairline',
        'italic',
        'oblique',
        'dash'
    ];
    var level1 = {};
    for (var i = 0; i < fonts.length; i++) {
        var overridden = false;
        for (var family in overrides) {
            if (overrides[family].test(fonts[i])) {
                level1[family] = level1[family] || [];
                level1[family].push(fonts[i]);
                overridden = true;
            }
        }
        if (overridden) continue;

        var parts = fonts[i].split(' ');
        while (parts.length) {
            var word = parts[parts.length-1];
            if (keywords.indexOf(word.toLowerCase()) === -1) break;
            parts.pop();
        }
        var family = parts.join(' ');
        level1[family] = level1[family] || [];
        level1[family].push(fonts[i]);
    }
    var level2 = {};
    for (var fam in level1) {
        if (level1[fam].length > 1) continue;

        var parts = fam.split(' ');
        if (parts.length === 1) continue;
        parts.pop();
        var family = parts.join(' ');

        level2[family] = level2[family] || [];
        level2[family].push(level1[fam][0]);
    }
    for (var fam in level1) {
        if (level1[fam].length > 1) continue;

        var parts = fam.split(' ');
        if (parts.length === 1) continue;
        parts.pop();
        var family = parts.join(' ');

        if (level2[family].length > 1) {
            delete level1[fam];
            level1[family] = level2[family];
        }
    }
    for (var k in level1) {
        if (overrides[k]) continue;
        level1[k].sort(famsort);
    }

    function famsort(a, b) {
        var ascore = 0;
        var bscore = 0;
        var aindex = -1;
        var bindex = -1;
        var aparts = a.split(' ');
        var bparts = b.split(' ');
        for (var i = 0; i < aparts.length; i++) {
            aindex = keywords.indexOf(aparts[i].toLowerCase());
            ascore += aindex >= 0 ? aindex : 0;
        }
        for (var i = 0; i < bparts.length; i++) {
            bindex = keywords.indexOf(bparts[i].toLowerCase());
            bscore += bindex >= 0 ? bindex : 0;
        }
        return ascore - bscore;
    }

    tm._fontfamilies = level1;
    return level1;
};

// Return an augmented uri object from url.parse with the pathname
// transformed into an unescaped dirname.
tm.parse = function(str) {
    var uri = url.parse(str);
    if (uri.pathname) {
        uri.dirname = unescape(uri.pathname);
        if (uri.host && uri.host.length === 1) {
            uri.dirname = uri.host + ':' + uri.dirname;
        }
        uri.dirname = tm.join(uri.dirname);
    }
    return uri;
};

// Normalize a path to use forward slashes. Primarily for sanity and
// test fixture comparison.
tm.join = function(str) {
    str = path.join.apply(path, arguments);
    str = str.split(path.sep).join('/');
    if ((/^[a-z]\:/i).test(str)) str = str[0].toLowerCase() + str.substr(1);
    return str;
};

// Return true/false depending on whether a path is absolute.
tm.absolute = function(str) {
    if (str.charAt(0) === '/') return true;
    if ((/^[a-z]\:/i).test(str)) return true;
    return false;
};

module.exports = tm;
