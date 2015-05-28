'use strict';

var test = require('tape');
var setTimeout = require('timers').setTimeout;

var CardinalityCheck = require('../lib/cardinality-check.js');

test('can add keys', function t(assert) {
    var check = allocCheck();

    check.addKey('foo');
    check.addKey('bar');
    check.addKey('baz');

    assert.equal(check.knownKeysLength, 3);
    assert.equal(Object.keys(check.knownKeys).length, 3);

    assert.equal(check.knownKeys.foo, 1);
    assert.equal(check.knownKeys.bar, 1);
    assert.equal(check.knownKeys.baz, 1);

    check.destroy();
    assert.end();
});

test('will report in a timer', function t(assert) {
    var check = allocCheck({
        intervalTime: 5
    });
    check.bootstrap();

    check.addKey('foo');
    check.addKey('bar');
    check.addKey('bar');

    assert.equal(check.knownKeysLength, 2);

    setTimeout(function onTime() {
        var records = check.statsdClient.records;
        assert.deepEqual(records, [{
            name: 'uber-statsd-client.total-cardinality',
            value: 2
        }, {
            name: 'uber-statsd-client.total-cardinality',
            value: 2
        }]);

        check.destroy();
        assert.end();
    }, 13);
});

test('handles duplicate keys', function t(assert) {
    var check = allocCheck();

    for (var i = 0; i < 50; i++) {
        check.addKey('one');
    }

    check.addKey('two');
    check.addKey('two');
    check.addKey('three');

    assert.equal(check.knownKeysLength, 3);
    assert.equal(Object.keys(check.knownKeys).length, 3);
    assert.equal(check.knownKeys.one, 50);
    assert.equal(check.knownKeys.two, 2);
    assert.equal(check.knownKeys.three, 1);

    check.destroy();
    assert.end();
});

test('respects maximumLength', function t(assert) {
    var check = allocCheck({
        maximumLength: 10
    });

    for (var i = 0; i < 20; i++) {
        check.addKey(String(i));
    }

    assert.equal(check.knownKeysLength, 10);
    assert.equal(Object.keys(check.knownKeys).length, 10);

    for (var j = 0; j < 10; j++) {
        assert.equal(check.knownKeys[String(j)], 1);
    }

    check.destroy();
    assert.end();
});

test('can have custom statName', function t(assert) {
    var check = allocCheck({
        intervalTime: 5,
        statName: 'my-stat.total-cardinality'
    });
    check.bootstrap();

    check.addKey('foo');
    check.addKey('bar');
    check.addKey('bar');

    assert.equal(check.knownKeysLength, 2);

    setTimeout(function onTime() {
        var records = check.statsdClient.records;
        assert.deepEqual(records, [{
            name: 'my-stat.total-cardinality',
            value: 2
        }]);

        check.destroy();
        assert.end();
    }, 8);
});

function allocCheck(opts) {
    opts = opts || {};

    opts.statsdClient = {
        records: [],
        gauge: function gauge(name, value) {
            this.records.push({
                name: name,
                value: value
            });
        }
    };

    return CardinalityCheck(opts);
}
