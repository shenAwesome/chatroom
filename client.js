

var Model = require('scuttlebutt/model') 
var net = require('net')

var z = new Model()
var stream = net.connect(6000)
stream.pipe(z.createStream()).pipe(stream)

z.set('msg', '');
z.on('update', function () {
    console.log('<<<' + z.get('msg'));
});


//http://nodejs.org/api/readline.html#readline_readline
var readline = require('readline');

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', function (cmd) {
    if ('exit' == cmd) rl.close(); 
    z.set('msg', cmd); 
}); 