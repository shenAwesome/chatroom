///<reference path='type/node/node.d.ts' />
///<reference path='type/express/express.d.ts' />
///<reference path='type/socket.io/socket.io.d.ts' />
///<reference path='type/lodash/lodash.d.ts' />
var express = require('express');

var _ = require('lodash');

var App = (function () {
    function App() {
        this.routes = {
            '/': function (req, res) {
                res.setHeader('Content-Type', 'text/html');
                res.send("<h1>hello world</h1>");
            },
            'sync': function (req, res) {
            }
        };
    }
    App.prototype.start = function () {
        var app = express();
        app.use(express.compress());
        app.use(express.static(__dirname + '/public'));

        function shutdown(sig) {
            if (typeof sig === "string") {
                console.log('%s: Received %s - terminating sample app ...', new Date(), sig);
                process.exit(1);
            }
            console.log('%s: Node server stopped.', new Date());
        }
        ;

        process.on('exit', shutdown);

        [
            'SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
            'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function (element, index, array) {
            process.on(element, function () {
                shutdown(element);
            });
        });

        for (var r in this.routes) {
            app.get(r, this.routes[r]);
        }

        var server = require('http').Server(app);
        var io = require('socket.io')(server);
        var sockets = [];
        function newMsg(data) {
            sockets.forEach(function (s) {
                s.emit('news', data);
            });
        }

        io.on('connection', function (socket) {
            console.log('a user connected');
            newMsg('a new user joined, current users =' + sockets.length);
            sockets.push(socket);
            socket.emit('news', 'Welcome to the chat room, please change your display name at the left-bottom.There are ' + sockets.length + ' users online');

            socket.on('disconnect', function () {
                console.log('user disconnected');
                _.remove(sockets, socket);
            });

            socket.on('msg', function (data) {
                newMsg(data);
            });
        });

        var ipaddress = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";
        var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
        server.listen(port, ipaddress, function () {
            console.log('%s: Node server started on %s:%d ...', new Date(), ipaddress, port);
        });
    };
    return App;
})();
exports.App = App;
