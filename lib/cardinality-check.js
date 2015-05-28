'use strict';

var setInterval = require('timers').setInterval;
var clearInterval = require('timers').clearInterval;
var assert = require('assert');

var DEFAULT_INTERVAL_TIME = 10 * 1000;
var DEFAULT_STAT_NAME = 'uber-statsd-client.total-cardinality';
var DEFAULT_MAXIMUM_LENGTH = Infinity;

module.exports = CardinalityCheck;

function CardinalityCheck(options) {
    if (!(this instanceof CardinalityCheck)) {
        return new CardinalityCheck(options);
    }

    var self = this;

    assert(options && options.statsdClient,
        'CardinalityCheck needs options.statsdClient');

    self.statsdClient = options.statsdClient;
    self.intervalTime = options.intervalTime ||
        DEFAULT_INTERVAL_TIME;
    self.statName = options.statName ||
        DEFAULT_STAT_NAME;
    self.maximumLength = 'maximumLength' in options ?
        options.maximumLength : DEFAULT_MAXIMUM_LENGTH;

    self.interval = null;
    self.knownKeys = Object.create(null);
    self.knownKeysLength = 0;
    self.full = false;
}

CardinalityCheck.prototype.bootstrap = function bootstrap() {
    var self = this;

    self.interval = setInterval(onReport, self.intervalTime);
    self.interval.unref();

    function onReport() {
        self._reportCardinality();
    }
};

CardinalityCheck.prototype.addKey = function addKey(key) {
    var self = this;

    if (typeof self.knownKeys[key] === 'number') {
        self.knownKeys[key]++;
        return;
    }

    if (self.full) {
        return;
    }

    self.knownKeys[key] = 1;
    self.knownKeysLength++;

    if (self.knownKeysLength >= self.maximumLength) {
        self.full = true;
    }
};

CardinalityCheck.prototype._reportCardinality =
function _reportCardinality() {
    var self = this;

    self.statsdClient.gauge(self.statName, self.knownKeysLength);
};

CardinalityCheck.prototype.destroy = function destroy() {
    var self = this;

    clearInterval(self.interval);
};
