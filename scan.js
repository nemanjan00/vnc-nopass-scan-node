var rfb = require('rfb2');

var readline = require('readline');
var fs = require('fs');

var scanner = {
	ipList: [],

	threadMax: 50,
	threadCounter: 0,

	next: function(){
		if(scanner.ipList.length == 0){
			setTimeout(function(){
				process.exit(0);
			}, 5000);
		}

		if(scanner.ipList.length > 0 && scanner.threadCounter < scanner.threadMax){
			scanner.test(scanner.ipList.pop());
		}
	},

	threadInc: function(){
		scanner.threadCounter++;
		scanner.next();
	},
	threadDec: function(){
		scanner.threadCounter--;
		scanner.next();
	},

	start: function(){
		var lineReader = readline.createInterface({
			input: fs.createReadStream('ip.txt')
		});

		lineReader.on('line', function (line) {
			scanner.ipList.push(line);
		});

		lineReader.on('close', function(){
			scanner.next();
		});
	},
	test: function(ip){
		var p = new Promise(function(resolve, reject) {
			scanner.threadInc();

			var r = rfb.createConnection({
				host: ip,
				port: 5900,
				password: ''
			});

			r.on('connect', function() {
				var title = r.title;

				r.end();
				resolve({ip: ip, title: title});
			});

			r.on('error', function(error) {
				r.end();
				reject(error);
			});
		});

		p.then(function(data){
			scanner.resolve(data.ip, data.title);
		}, function(){
			scanner.reject();
		});

		setTimeout(function(){
			r.end();
			scanner.reject();
		}, 5000);
	},
	resolve: function(ip, title){
		scanner.threadDec();

		fs.appendFile('output.txt', ip+" - "+title+"\n", function (err) {});
	},
	reject: function(){
		scanner.threadDec();
	}
}

scanner.start();

process.on('uncaughtException', function (exception) {
	scanner.reject();
});

