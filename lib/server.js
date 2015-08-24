var _ = require('underscore');
var source = require('./source');
var style = require('./style');
var stats = require('./stats');
var tm = require('./tm');
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var app = express();
var carto = require('carto');
var mapnik = require('mapnik');
var MBTiles = require('mbtiles');
carto.tree.Reference.setVersion(mapnik.versions.mapnik);

app.use(bodyParser.json());
app.use(app.router);
var cache = [];

app.get('/maps/:map/:z(\\d+)/:x(\\d+)/:y(\\d+).png', style.loadStyle, cors(), tile);
app.get('/', function(req,res) {
    res.sendfile('index.html');
});


function tile(req, res, next) {
    var z = req.params.z | 0;
    var x = req.params.x | 0;
    var y = req.params.y | 0;
    var m = req.params.map;
    var cc = tm._config.cache + m + '.mbtiles';
    var scale = (req.params.scale) ? req.params.scale[1] | 0 : undefined;
    // limits scale to 4x (1024 x 1024 tiles or 288dpi) for now
    scale = scale > 4 ? 4 : scale;

    var id = req.source ? req.source.data.id : req.style.data.id;
    var source = req.style;
    var cacheback = function(err, data, headers) {
        if (err) {
            // Set errors cookie for this style.
            style.error(id, err);
            res.cookie('errors', _(style.error(id)).join('|'));
            return next(err);
        }
        cache[cc].putTile(z,x,y,data,function(err){
            if (err) console.error(verbose('putTile', err));
            done(err, data, headers);
        });
    }

    var done = function(err, data, headers) {
        if (err && err.message === 'Tilesource not loaded') {
            return res.redirect(req.path);
        } else if (err && err.message === 'Tile does not exist'){
            return source.getTile(z,x,y, cacheback);
        }
        else if (err) {
            // Set errors cookie for this style.
            style.error(id, err);
            res.cookie('errors', _(style.error(id)).join('|'));
            return next(err);
        }

        // Set drawtime/srcbytes cookies.
        stats.set(source, 'drawtime', z, data._drawtime);
        stats.set(source, 'srcbytes', z, data._srcbytes);
        res.cookie('drawtime', stats.cookie(source, 'drawtime'));
        res.cookie('srcbytes', stats.cookie(source, 'srcbytes'));

        // Clear out tile errors.
        res.cookie('errors', '');

        headers['cache-control'] = 'max-age=3600';
        res.set(headers);
        return res.send(data);
    };
    done.scale = scale;
    if (req.params.format !== 'png') done.format = req.params.format;
    if (cache[cc]){
        cache[cc].getTile(z,x,y, done);
    }
    else{
        source.getTile(z,x,y, done);
    }
}
/*
//todo: repurpose for pg-tiles
function stage(){
    for (var m in maps){
        if (maps[m].cache && maps[m].cache == true){
            new MBTiles({
                name: m,
                pathname: tm._config.cache + m + '.mbtiles',
                query: { batch: 1 }
            }, function(err, mbtiles) {
                if (err) return callback(verbose('startWriting ' + cachepath, err));
                source._mbtiles = mbtiles;
                source._mbtiles.startWriting(function(err) {
                    if (err) return console.log(err.message);
                    mbtiles._cacheStats = { hit:0, miss:1 };
                    cache[mbtiles.filename] = mbtiles;
                    console.log(mbtiles.filename + " ready")
                });
            });
        }
    }
}
stage();*/
module.exports = app;

