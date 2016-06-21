var rfb = require('rfb2');

var PNG = require('pngjs').PNG;

var readline = require('readline');
var fs = require('fs');

var config = {
	maxThreads: 50,
	timeOut: 5000
};

var scanner = {
	ipList: [],

	threadMax: config.maxThreads,
	threadCounter: 0,

	next: function(){
		if(scanner.ipList.length == 0 && scanner.threadCounter == 0){
			console.log("Done. Maybe waiting for screenshots... ");
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

			var writers = 0;

			var title;
			var png;

			var r = rfb.createConnection({
				host: ip,
				port: 5900,
				password: ''
			});

			r.on('connect', function() {
				title = r.title;

				resolve({ip: ip, title: title});

				png = new PNG({width: r.width, height: r.height, colorType: 2, bgColor: {red: 0, green: 0, blue: 0}});
				r.requestUpdate(false, 0, 0, r.width, r.height);
			});

			r.on('rect', function(rect) {
				writers++;
				console.log(ip, rect);

				var max = 0;

				for(var y = 0; y < rect.height * 4; y++){
					for(var x = 0; x < rect.width; x++){
						png.data[(rect.y + y) * png.width + (rect.x + x)] = rect.data[y * rect.width + x];
						max = (rect.y + y) * png.width + (rect.x + x);
					}
				}

				writers--;

				if(writers == 0){
					png.pack().pipe(fs.createWriteStream('./images/'+ip+'.png'))
				}
			});

			r.on('error', function(error) {
				reject(error);
			});
		});

		p.then(function(data){
			scanner.resolve(data.ip, data.title);
		}, function(){
			scanner.reject();
		});

		setTimeout(function(){
			scanner.reject();
		}, config.timeOut);
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
	console.log(exception);
	scanner.reject();
});

