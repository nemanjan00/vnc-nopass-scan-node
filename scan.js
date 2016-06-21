var rfb = require('rfb2');

var Canvas = require('canvas');
var Image = Canvas.Image;

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

			var canvas;
			var ctx;

			var r = rfb.createConnection({
				host: ip,
				port: 5900,
				password: ''
			});

			r.on('connect', function() {
				title = r.title;

				resolve({ip: ip, title: title});

				canvas = canvas = new Canvas(r.width, r.height);
				ctx = canvas.getContext('2d');

				r.requestUpdate(false, 0, 0, r.width, r.height);
			});

			r.on('rect', function(rect) {
				png = new PNG({width: rect.width, height: rect.height});
				
				png.data = rect.data;

				var stream = png.pack();

				var bufs = [];
				stream.on('data', function(d){ bufs.push(d); });
				stream.on('end', function(){
					var buf = Buffer.concat(bufs);

					image = new Image;
					image.src = buf;

					ctx.drawImage(image, rect.x, rect.y, image.width, image.height);

					stream = canvas.pngStream();
					out = fs.createWriteStream('./images/'+ip+'.png');

					stream.pipe(out);
				});
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

