///<reference path='misc/node.d.ts' />
///<reference path='misc/express.d.ts' />
var express = require('express');

var App = (function () {
    function App() {
        this.routes = {
            '/': function (req, res) {
                res.setHeader('Content-Type', 'text/html');
                res.send("hello world");
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

        var ipaddress = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";
        var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
        app.listen(port, ipaddress, function () {
            console.log('%s: Node server started on %s:%d ...', new Date(), ipaddress, port);
        });
    };
    return App;
})();
exports.App = App;
//# sourceMappingURL=App.js.map
