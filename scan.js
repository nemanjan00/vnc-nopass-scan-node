var rfb = require('rfb2');

var Canvas = require('canvas');
var Image = Canvas.Image;

var PNG = require('pngjs').PNG;

var follow = require('text-file-follower');
var readline = require('readline');
var fs = require('fs');

var config = {
	maxThreads: 10,
	timeOut: 20000,
	verbose: false
};

var scanner = {
	ipList: [],

	threadMax: config.maxThreads,
	threadCounter: 0,

	next: function(){
		if(scanner.ipList.length == 0 && scanner.threadCounter == 0){
			console.log("Done. Taking screenshots... ");
		}

		if(scanner.ipList.length > 0 && scanner.threadCounter < scanner.threadMax){
			if(config.verbose){
				console.log(scanner.ipList.length);
			}
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
	
	onLine: function(line){
		line = line.split(" ");

		if(line.length > 0){
			scanner.ipList.push(line[3]);
		}
		else {
			scanner.ipList.push(line[0]);
		}

		scanner.next();
	},

	start: function(){
		var lineReader = readline.createInterface({
			input: fs.createReadStream('ip.txt')
		});

		lineReader.on('line', scanner.onLine);

		lineReader.on('close', function(){
			var follower = follow('ip.txt');

			follower.on('line', function(filename, line) {
				scanner.onLine(line);
			});
		});


	},
	test: function(ip){
		var status = "init";
		var r;

		var p = new Promise(function(resolve, reject) {
			scanner.threadInc();

			var canvas;
			var ctx;

			r = rfb.createConnection({
				host: ip,
				port: 5900,
				password: ''
			});

			r.on('connect', function() {
				if(status != "valid"){
					status = "valid";

					resolve({ip: ip, title: r.title});
					scanner.threadDec();

					canvas = canvas = new Canvas(r.width, r.height);
					ctx = canvas.getContext('2d');

					ctx.fillStyle = "#000";
					ctx.fillRect(0, 0, r.width, r.height);

					r.requestUpdate(false, 0, 0, r.width, r.height);
				}
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
				if(status != "error"){
					status = "error";

					reject(error);
					r.end();
				}
			});
		});

		p.then(scanner.resolve, scanner.reject);

		setTimeout(function(){
			if(status == "init"){
				r.end();
				scanner.reject("timeout");
			}
		}, config.timeOut);
	},
	resolve: function(data){
		scanner.threadDec();

		fs.appendFile('output.txt', data.ip+" - "+data.title+"\n", function (err) {});
	},
	reject: function(error){
		if(config.verbose){
			console.log(error);
		}
		scanner.threadDec();
	}
}

scanner.start();

process.on('uncaughtException', function (exception) {
	if(config.verbose){
		console.log(exception);
	}
});

