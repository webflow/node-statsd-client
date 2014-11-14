var test = require('tape');
var setTimeout = require('timers').setTimeout;
var isIPv4 = require('net').isIPv4;

var UDPServer = require('./lib/udp-server.js');
var EphemeralSocket = require('../lib/EphemeralSocket.js');

var PORT = 8125;

test('creates a socket', function t(assert) {
    var sock = new EphemeralSocket({
        host: 'localhost',
        port: PORT
    });

    assert.equal(typeof sock.close, 'function');
    assert.equal(typeof sock.send, 'function');

    sock.close();
    assert.end();
});

test('can write to socket', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var sock = new EphemeralSocket({
            host: 'localhost',
            port: PORT
        });

        server.once('message', onMessage);
        sock.send('hello', { name: 'key' });

        function onMessage(msg) {
            var str = String(msg);
            assert.equal(str, 'hello');

            sock.close();
            server.close();
            assert.end();
        }
    });
});

test('has default ports & hosts', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var sock = new EphemeralSocket();

        server.once('message', onMessage);
        sock.send('hello', { name: 'key' });

        function onMessage(msg) {
            var str = String(msg);
            assert.equal(str, 'hello');

            sock.close();
            server.close();
            assert.end();
        }
    });
});

test('can send multiple packets', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var sock = new EphemeralSocket({
            host: 'localhost',
            port: PORT
        });
        var messages = [];

        server.on('message', onMessage);
        sock.send('hello', { name: 'key' });
        sock.send(' ', { name: 'key' });
        sock.send('world', { name: 'key' });

        function onMessage(msg) {
            messages.push(String(msg));

            if (messages.length === 3) {
                onEnd();
            }
        }

        function onEnd() {
            // UDP is unordered messages
            var str = messages.sort().join('');
            assert.equal(str, ' helloworld');

            sock.close();
            server.close();
            assert.end();
        }
    });
});

test('socket will unref', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var sock = new EphemeralSocket({
            host: 'localhost',
            port: PORT,
            socket_timeout: 10
        });

        server.once('message', onMessage);
        sock.send('hello', { name: 'key' });

        function onMessage(msg) {
            var str = String(msg);
            assert.equal(str, 'hello');

            server.close();
            assert.end();
        }
    });
});

test('can write to socket with DNS resolver', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var sock = new EphemeralSocket({
            host: 'localhost',
            port: PORT
        });
        sock.resolveDNS({});

        server.once('message', onMessage);
        sock.send('hello', { name: 'key' });

        function onMessage(msg) {
            var str = String(msg);
            assert.equal(str, 'hello');

            sock.close();
            server.close();
            assert.end();
        }
    });
});

test('DNS resolver will send IP address', function t(assert) {
    var sock = new EphemeralSocket({
        host: 'localhost',
        port: PORT,

        dgram: {
            createSocket: function () {
                var socket = {};
                socket.send = function (buf, s, e, port, host) {
                    var str = String(buf);
                    assert.equal(str, 'hello');

                    assert.ok(isIPv4(host));

                    sock.close();
                    assert.end();
                };
                socket.close = function () {};

                return socket;
            }
        }
    });

    sock.resolveDNS({
        onresolved: function () {
            sock.send('hello', { name: 'key' });
        }
    });
});
