var _ = require('underscore');
var fs = require('fs');
var tm = require('./tm');
var path = require('path');
var MBTiles = require('mbtiles');
var Bridge = require('tilelive-bridge');
var tilelive = require('tilelive');

var cache = {};

module.exports = source;
tilelive.protocols['tmsource:'] = source;
tilelive.protocols['pgtiles:'] = source;

function source(arg, callback) {
    if (arg) {
        var sourceType = arg.href.split('//')[0];
        var id = path.join(tm._config.maps, arg.host, '/');
        if (cache[id]) return callback(null, cache[id]);
        switch (sourceType) {
            case 'pgtiles:':
                new MBTiles(tm._config.geo_data + arg.host, callback);
                break;
            default :
                var opts = {};
                opts.id = id;
                opts.xml = fs.readFileSync(path.join(id, 'data.xml')  , 'utf-8');
                source.refresh(opts, callback);
                break;
        }
    }
}

// Load or refresh the relevant source using specified data + xml.
source.refresh = function(rawdata, callback) {
    var id = rawdata.id;
    var uri = tm.parse(rawdata.id);
    var opts = {};
    opts.xml = rawdata.xml;
    opts.base = uri.dirname;
    new Bridge(opts, loaded);
    function loaded(err, p) {
        if (err) return callback(err);
        cache[id] = cache[id] || p;
        cache[id].xml = rawdata.xml;
        callback(null, cache[id]);
    }
};

// Set or get tile serving errors.
source.error = function(id, err) {
    if (!cache[id]) return false;
    cache[id].errors = cache[id].errors || [];
    if (err && cache[id].errors.indexOf(err.message) === -1) {
        cache[id].errors.push(err.message);
    }
    return cache[id].errors;
};