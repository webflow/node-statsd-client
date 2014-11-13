var test = require('tape');
var setTimeout = require('timers').setTimeout;

var UDPServer = require('./lib/udp-server.js');
var StatsDClient = require('../lib/statsd-client.js');

var PORT = 8125;

test('can write gauge to client', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var client = new StatsDClient({
            host: 'localhost',
            port: PORT
        });

        client.gauge('foo', 'bar');
        server.once('message', function (msg) {
            assert.equal(msg.toString(), 'foo:bar|g');

            server.close();
            client.close();
            assert.end();
        });
    });
});

test('can write timing to client', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var client = new StatsDClient({
            host: 'localhost',
            port: PORT
        });

        client.counter('foo', 1);
        server.once('message', function (msg) {
            assert.equal(msg.toString(), 'foo:1|c');

            server.close();
            client.close();
            assert.end();
        });
    });
});

test('can write counter to client', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var client = new StatsDClient({
            host: 'localhost',
            port: PORT
        });

        client.timing('foo', 42);
        server.once('message', function (msg) {
            assert.equal(msg.toString(), 'foo:42|ms');

            server.close();
            client.close();
            assert.end();
        });
    });
});
