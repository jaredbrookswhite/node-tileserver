var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var url = require('url');
var tm = require('./tm');
var Vector = require('tilelive-vector');
var tilelive = require('tilelive');
var upload = require('mapbox-upload');
var cache = {};

module.exports = style;
var maps;

function style(arg, callback) {
    if (!maps)
        maps = fs.readdirSync(tm._config.maps);
    if (arg[0] != '.' && maps.indexOf(arg + '.tm2') != -1){
        var id = path.join(tm._config.maps, arg + '.tm2', 'project.xml');
        if (cache[id]) return callback(null, cache[id]);
        var xml = fs.readFileSync(id, 'utf-8');
        var opts = {};
        opts.id = id;
        opts.xml = xml;
        style.refresh(opts, callback);
    }
    else
        callback(new Error('Map Not Defined'));
};

style.loadStyle = function(req, res, next) {
    style(url.format(req.params.map), function(err, s) {
        if (err) return next(err);
        req.style = s;
        next();
    });
};

// Load or refresh the relevant source using specified data.
style.refresh = function(data, callback) {
    var id = data.id;
    var uri = tm.parse(data.id);
    var xml = data.xml;
    var opts = {};
    opts.xml = xml;
    opts.base = uri.dirname;
    new Vector(opts, done);

    function done(err, p) {
        if (err) return callback(err);
        cache[id] = cache[id] || p;
        cache[id].xml = xml;
        cache[id].data = data;
        cache[id].data.fonts = cache[id]._map.fonts();
        cache[id].stats = {};
        cache[id].errors = [];
        return callback(null, cache[id]);
    }
};

// Set or get tile serving errors.
style.error = function(id, err) {
    if (!cache[id]) return false;
    cache[id].errors = cache[id].errors || [];
    if (err && cache[id].errors.indexOf(err.message) === -1) {
        cache[id].errors.push(err.message);
    }
    return cache[id].errors;
};
