var setTimeout = require('timers').setTimeout;
var Buffer = require('buffer').Buffer;
var console = require('console');
var globalDgram = require('dgram');

var DNSResolver = require('./dns-resolver.js');

function ephemeralSocket(options) {
    this.options = options || {};

    this.options.host = this.options.host || 'localhost';
    this.options.port = this.options.port || 8125;
    this.options.debug = this.options.debug || false;
    this.options.highWaterMark = this.options.highWaterMark || 100;

    // Set up re-usable socket
    this._socket = undefined; // Store the socket here
    this._dnsResolver = undefined;
    this._dgram = this.options.dgram || globalDgram;
}

/*
 * Allocate a dnsResolver to resolve the hosts to an IP.
 *
 */
ephemeralSocket.prototype.resolveDNS = function (opts) {
    this._dnsResolver = new DNSResolver(this.options.host, opts);

    this._dnsResolver.lookupHost();
};

/*
 * Close the socket, if in use and cancel the interval-check, if running.
 */
ephemeralSocket.prototype.close = function () {
    if (!this._socket) {
        return;
    }

    if (this._dnsResolver) {
        this._dnsResolver.close();
    }

    // Wait a tick or two, so any remaining stats can be sent.
    var that = this;
    setTimeout(function () {
        that._socket.close();
        that._socket = undefined;
    }, 10);
};

/*
 * Send data.
 */
ephemeralSocket.prototype.send = function (data, message) {
    // Create socket if it isn't there
    if (!this._socket) {
        this._socket = this._dgram.createSocket('udp4');
        this._socket.unref();
    }

    // Create buffer
    var buf = new Buffer(data);

    if (this.options.debug) {
        console.warn(data);
    }

    var host = this._dnsResolver && message ?
        this._dnsResolver.resolveHost(message.name) :
        this.options.host;

    if (!this._socket._sendQueue ||
        this._socket._sendQueue.length < this.options.highWaterMark
    ) {
        this._socket.send(buf, 0, buf.length,
            this.options.port, host);
    }
};

module.exports = ephemeralSocket;
