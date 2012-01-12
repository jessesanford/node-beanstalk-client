(function() {
  var Client, Connection, ResponseHandler, make_command_method, net,
    __slice = Array.prototype.slice;

  net = require('net');

  Client = {
    DEFAULT_ADDR: '127.0.0.1',
    DEFAULT_PORT: 11300,
    LOWEST_PRIORITY: 4294967295,
    connect: function(server, callback) {
      var addr, port, stream, _ref;
      if (server) _ref = server.split(':'), addr = _ref[0], port = _ref[1];
      if (!addr) addr = Client.DEFAULT_ADDR;
      if (!port) port = Client.DEFAULT_PORT;
      stream = net.createConnection(port, addr);
      stream.on('connect', function() {
        callback(false, new Connection(stream));
      });
      stream.on('error', function(err) {
        callback(err);
      });
      return stream.on('close', function(has_error) {});
    }
  };

  make_command_method = function(command_name, expected_response, sends_data) {
    return function() {
      var args, callback, data, _i;
      args = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), callback = arguments[_i++];
      args.unshift(command_name);
      if (sends_data) {
        data = args.pop();
        args.push(data.length);
      }
      this.send.apply(this, args);
      if (data) this.send(data);
      this.handlers.push([new ResponseHandler(expected_response), callback]);
    };
  };

  Connection = (function() {

    function Connection(stream) {
      var _this = this;
      this.stream = stream;
      this.buffer = '';
      this.handlers = [];
      this.stream.on('data', function(data) {
        _this.buffer += data;
        _this.try_handling_response();
      });
    }

    Connection.prototype.end = function() {
      return this.stream.end();
    };

    Connection.prototype.try_handling_response = function() {
      var callback, handler, _ref;
      _ref = this.handlers[0], handler = _ref[0], callback = _ref[1];
      if (handler != null) {
        handler.handle(this.buffer);
        if (handler.complete) {
          this.finished_handling_response();
          if (handler.success) {
            callback.call.apply(callback, [null, false].concat(__slice.call(handler.args)));
          } else {
            callback.call(null, handler.args[0]);
          }
        } else {
          handler.reset();
        }
      }
    };

    Connection.prototype.finished_handling_response = function() {
      var hp;
      this.buffer = '';
      hp = this.handlers.shift();
    };

    Connection.prototype.send = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return this.stream.write(args.join(' ') + '\r\n');
    };

    Connection.prototype.use = make_command_method('use', 'USING');

    Connection.prototype.put = make_command_method('put', 'INSERTED', true);

    Connection.prototype.watch = make_command_method('watch', 'WATCHING');

    Connection.prototype.ignore = make_command_method('ignore', 'WATCHING');

    Connection.prototype.reserve = make_command_method('reserve', 'RESERVED');

    Connection.prototype.reserve_with_timeout = make_command_method('reserve-with-timeout', 'RESERVED');

    Connection.prototype.destroy = make_command_method('delete', 'DELETED');

    Connection.prototype.release = make_command_method('release', 'RELEASED');

    Connection.prototype.bury = make_command_method('bury', 'BURIED');

    Connection.prototype.touch = make_command_method('touch', 'TOUCHED');

    Connection.prototype.peek = make_command_method('peek', 'FOUND');

    Connection.prototype.peek_ready = make_command_method('peek-ready', 'FOUND');

    Connection.prototype.peek_delayed = make_command_method('peek-delayed', 'FOUND');

    Connection.prototype.peek_buried = make_command_method('peek-buried', 'FOUND');

    Connection.prototype.kick = make_command_method('kick', 'KICKED');

    Connection.prototype.stats_job = make_command_method('stats-job', 'OK');

    Connection.prototype.stats_tube = make_command_method('stats-tube', 'OK');

    Connection.prototype.stats = make_command_method('stats', 'OK');

    return Connection;

  })();

  ResponseHandler = (function() {

    function ResponseHandler(success_code) {
      this.success_code = success_code;
      this.complete = false;
      this.success = false;
      this.args = void 0;
      this.header = void 0;
      this.body = void 0;
    }

    ResponseHandler.prototype.reset = function() {
      this.complete = false;
      this.success = false;
      this.args = void 0;
      this.header = void 0;
      this.body = void 0;
    };

    ResponseHandler.prototype.CODES_REQUIRING_BODY = {
      'RESERVED': true
    };

    ResponseHandler.prototype.handle = function(data) {
      var code, i;
      i = data.indexOf("\r\n");
      if (i >= 0) {
        this.header = data.substr(0, i);
        this.body = data.substr(i + 2);
        this.args = this.header.split(' ');
        code = this.args[0];
        if (code === this.success_code) {
          this.args.shift();
          this.success = true;
        }
        if (this.CODES_REQUIRING_BODY[code]) {
          this.parse_body();
        } else {
          this.complete = true;
        }
      }
    };

    ResponseHandler.prototype.parse_body = function() {
      var body_length;
      if (this.body != null) {
        body_length = parseInt(this.args[this.args.length - 1], 10);
        if (this.body.length === (body_length + 2)) {
          this.args.pop();
          this.args.push(this.body.substr(0, this.body.length - 2));
          this.complete = true;
        }
      }
    };

    return ResponseHandler;

  })();

  exports.Client = Client;

}).call(this);
