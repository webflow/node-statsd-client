'use strict';

var Buffer = require('buffer').Buffer;
var process = require('process');

var BIND_STATE_UNBOUND = 0;
var BIND_STATE_BOUND = 2;

// no-op callback
function noop() {
}

module.exports = dgramSend;

function dgramSend(socket, buffer, offset, length, port, address, callback) {
    /*eslint complexity: [2, 15], max-statements: [2, 40] */
    /*eslint max-params: [2, 7] */

    if (!Buffer.isBuffer(buffer)) {
        throw new TypeError('First argument must be a buffer object.');
    }

    offset = offset | 0;
    if (offset < 0) {
        throw new RangeError('Offset should be >= 0');
    }

    if (offset >= buffer.length) {
        throw new RangeError('Offset into buffer too large');
    }

    // Sending a zero-length datagram is kind of pointless but it _is_
    // allowed, hence check that length >= 0 rather than > 0.
    length = length | 0;
    if (length < 0) {
        throw new RangeError('Length should be >= 0');
    }

    if (offset + length > buffer.length) {
        throw new RangeError('Offset + length beyond buffer length');
    }

    port = port | 0;
    if (port <= 0 || port > 65535) {
        throw new RangeError('Port should be > 0 and < 65536');
    }

    callback = callback || noop;

    socket._healthCheck();

    if (socket._bindState === BIND_STATE_UNBOUND) {
        socket.bind(0, null);
    }

    // If the socket hasn't been bound yet, push the outbound packet onto the
    // send queue and send after binding is complete.
    if (socket._bindState !== BIND_STATE_BOUND) {
        // If the send queue hasn't been initialized yet, do it, and install an
        // event handler that flushes the send queue after binding is done.
        if (!socket._sendQueue) {
            socket._sendQueue = [];
            socket.once('listening', function onListening() {
                // Flush the send queue.
                for (var i = 0; i < socket._sendQueue.length; i++) {
                    socket.send.apply(socket, socket._sendQueue[i]);
                    socket._sendQueue = undefined;
                }
            });
        }
        socket._sendQueue.push([
            buffer, offset, length, port, address, callback
        ]);
        return;
    }

    var ip = address;

    if (socket._handle) {
        var req = socket._handle.send(buffer, offset, length, port, ip);
        if (req) {
            req.oncomplete = afterSend;
            req.cb = callback;
        } else {
            // don't emit as error, dgram_legacy.js compatibility
            var err2 = errnoException(process._errno, 'send');
            process.nextTick(function onTick() {
                callback(err2);
            });
        }
    }
}

function afterSend(status, handle, req, buffer) {
    if (req.cb) {
        req.cb(null, buffer.length); // compatibility with dgram_legacy.js
    }
}

// TODO share with net_uv and others
function errnoException(errorno, syscall) {
    var e = new Error(syscall + ' ' + errorno);
    e.errno = e.code = errorno;
    e.syscall = syscall;
    return e;
}
