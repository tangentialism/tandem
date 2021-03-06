(function() {
  var EventEmitter, FileError, Tandem, TandemFile, async, _, _atomic, _getDeltaSince, _getLoadedVersion,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ = require('lodash');

  async = require('async');

  EventEmitter = require('events').EventEmitter;

  Tandem = require('tandem-core');

  _atomic = function(fn) {
    return async.until((function(_this) {
      return function() {
        return _this.locked === false;
      };
    })(this), (function(_this) {
      return function(callback) {
        return setTimeout(callback, 100);
      };
    })(this), (function(_this) {
      return function() {
        _this.locked = true;
        return fn(function() {
          return _this.locked = false;
        });
      };
    })(this));
  };

  _getLoadedVersion = function(callback) {
    return this.cache.range('history', 0, 1, (function(_this) {
      return function(err, range) {
        if (err != null) {
          return callback(err);
        }
        if (range.length > 0) {
          return callback(null, JSON.parse(range[0]).version - 1);
        } else {
          return callback(null, -1);
        }
      };
    })(this));
  };

  _getDeltaSince = function(version, callback) {
    if (version < 0) {
      return callback(new FileError("Negative version", this));
    }
    if (version === 0) {
      return callback(null, this.head, this.version);
    }
    if (version === this.version) {
      return callback(null, Tandem.Delta.getIdentity(this.head.endLength), this.version);
    }
    return this.getHistory(version, (function(_this) {
      return function(err, deltas) {
        var delta, firstHist;
        if (err != null) {
          return callback(err);
        }
        if (deltas.length === 0) {
          return callback(new FileError("No version " + version + " in history", _this));
        }
        firstHist = deltas.shift();
        delta = _.reduce(deltas, function(delta, hist) {
          return delta.compose(hist);
        }, firstHist);
        return callback(null, delta, _this.version);
      };
    })(this));
  };

  FileError = (function(_super) {
    __extends(FileError, _super);

    function FileError(message, file) {
      var _ref, _ref1, _ref2, _ref3;
      this.message = message;
      this.version = file.version;
      this.versionLoaded = file.versionLoaded;
      this.head = {
        startLength: (_ref = file.head) != null ? _ref.startLength : void 0,
        endLength: (_ref1 = file.head) != null ? _ref1.endLength : void 0,
        opsLength: (_ref2 = file.head) != null ? (_ref3 = _ref2.ops) != null ? _ref3.length : void 0 : void 0
      };
    }

    return FileError;

  })(Error);

  TandemFile = (function(_super) {
    __extends(TandemFile, _super);

    TandemFile.events = {
      UPDATE: 'update'
    };

    function TandemFile(id, head, version, options, callback) {
      this.id = id;
      this.head = head;
      this.version = version;
      this.versionSaved = version;
      this.cache = _.isFunction(options.cache) ? new options.cache(this.id) : options.cache;
      this.lastUpdated = Date.now();
      this.locked = false;
      async.waterfall([
        (function(_this) {
          return function(callback) {
            return _getLoadedVersion.call(_this, callback);
          };
        })(this), (function(_this) {
          return function(cacheVersion, callback) {
            if (cacheVersion === -1) {
              _this.versionLoaded = _this.version;
              return callback(null, []);
            } else {
              _this.versionLoaded = cacheVersion;
              return _this.getHistory(_this.version, callback);
            }
          };
        })(this)
      ], (function(_this) {
        return function(err, deltas) {
          if (err == null) {
            _.each(deltas, function(delta) {
              _this.head = _this.head.compose(delta);
              return _this.version += 1;
            });
          }
          return callback(err, _this);
        };
      })(this));
    }

    TandemFile.prototype.close = function(callback) {
      return this.cache.del('history', callback);
    };

    TandemFile.prototype.getHistory = function(version, callback) {
      return this.cache.range('history', version - this.versionLoaded, (function(_this) {
        return function(err, range) {
          var deltas;
          if (err != null) {
            return callback(err);
          }
          deltas = _.map(range, function(changeset) {
            return Tandem.Delta.makeDelta(JSON.parse(changeset).delta);
          });
          return callback(null, deltas);
        };
      })(this));
    };

    TandemFile.prototype.isDirty = function() {
      return this.version !== this.versionSaved;
    };

    TandemFile.prototype.sync = function(version, callback) {
      return _getDeltaSince.call(this, version, callback);
    };

    TandemFile.prototype.transform = function(delta, version, callback) {
      if (version < this.versionLoaded) {
        return callback(new FileError("No version in history", this));
      }
      return this.getHistory(version, (function(_this) {
        return function(err, deltas) {
          if (err != null) {
            return callback(err);
          }
          delta = _.reduce(deltas, function(delta, hist) {
            return delta.transform(hist, true);
          }, delta);
          return callback(null, delta, _this.version);
        };
      })(this));
    };

    TandemFile.prototype.update = function(delta, version, callback) {
      var changeset;
      changeset = {};
      return _atomic.call(this, (function(_this) {
        return function(done) {
          return async.waterfall([
            function(callback) {
              return _this.transform(delta, version, callback);
            }, function(delta, version, callback) {
              if (_this.head.canCompose(delta)) {
                changeset = {
                  delta: delta,
                  version: _this.version + 1
                };
                return _this.cache.push('history', JSON.stringify(changeset), callback);
              } else {
                return callback(new FileError('Cannot compose deltas', _this));
              }
            }, function(length, callback) {
              _this.head = _this.head.compose(changeset.delta);
              _this.version += 1;
              return callback(null);
            }
          ], function(err, delta, version) {
            _this.lastUpdated = Date.now();
            callback(err, changeset.delta, changeset.version);
            _this.emit(TandemFile.events.UPDATE, changeset.delta, changeset.version);
            return done();
          });
        };
      })(this));
    };

    return TandemFile;

  })(EventEmitter);

  module.exports = TandemFile;

}).call(this);
