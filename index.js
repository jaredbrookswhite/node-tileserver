// Run only by vendor node.
// In an ideal world this would be run in the same process/context of
// atom-shell but there are many hurdles atm, see
// https://github.com/atom/atom-shell/issues/533

// increase the libuv threadpool size to 1.5x the number of logical CPUs.
process.env.UV_THREADPOOL_SIZE = Math.ceil(Math.max(4, require('os').cpus().length * 1.5));
process.title = 'mapbox-server';

var tm = require('./lib/tm');
var path = require('path');
var getport = require('getport');
var server;
var config = require('minimist')(process.argv.slice(2));
config.shell = config.shell || false;
config.port = 8000;
config.test = config.test || false;
config.cwd = path.resolve(config.cwd || process.env.HOME);
var logger = require('fastlog')('', 'debug', '<${timestamp}>');

if (!config.port) {
    getport(8000, 8999, configure);
} else {
    configure();
}

function configure(err, port) {
    if (err) throw err;
    config.port = config.port || port;
    tm.config(config, listen);
}

function listen(err) {
    if (err) throw err;
    server = require('./lib/server');
    if (config.shell) {
        server.listen(tm.config().port, '127.0.0.1', finish);
    } else {
        server.listen(tm.config().port, finish);
    }
}

function finish(err) {
    if (err) throw err;
    server.emit('ready');
    logger.debug('Mapbox Server @ http://localhost:'+tm.config().port+'/');
}
