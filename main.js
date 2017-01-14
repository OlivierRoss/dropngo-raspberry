// Requires
var fs = require('fs')
var net = require('net');
var gpio = require("onoff").Gpio;

var stdin = process.stdin;
stdin.resume();
stdin.setEncoding( 'utf8' );

// Globales
var state = {
    led_rouge: {
        file: new gpio(18, 'out'),
        value: 0
    },
    led_verte: {
        file: "/dev/LEDVERTE",
        value: 0
    }
}

var codeDict = {}

// Init
var client = new net.Socket();

client.on("data", function entryPoint (data) {
	data = JSON.parse(data);
	console.log(data);
	switch (data.name) {
		case "connection":
			connected(data.payload);
			break;
		case "fulfillment":
			fulfilled(data.payload);
			break;
		default:
			//return;
	}
});

function connected (payload) {
	console.log("Connected! " + payload);
}

function fulfilled (payload) {
	console.log("Fulfilled! " + payload);
	if(!payload.nip) return;

	// Add to available codes
	codeDict[payload.nip] = true;

	// stdin shit
	var stdin = process.stdin;
	stdin.resume();
	stdin.setEncoding('utf8');

	// Read
	stdin.on('data', function( text ){
		text = text.trim();

		// Error!
		if ( text.length != 5 || codeDict[text] != true) {
			// Solid red no!
			led_on(state.led_rouge);
			setTimeout(function () {
				led_off(state.led_rouge);
				//process.exit();
			}, 5000);
		}

		// Youve got that secret key!
		else {
			// Do not ever use that code again
			delete codeDict[text];

			// Now flash!
			flash(state.led_rouge, 500);
			setTimeout(function () { // Then stop
				stopFlash(state.led_rouge);
			}, 5000);
		}
	});

}


// Exec
client.connect(4000, '52.207.77.200', function() {});

process.on('SIGINT', function(){
	state.led_rouge.file.unexport();
});

// Utils
function flash (led, pace) {
	led.flash = setInterval(function () {
		toggleLed(led);
	}, pace);
}

function toggleLed (led) {
	led.value == 1 ? led_off(led) : led_on(led);
}

function stopFlash (led) {
	clearInterval(led.flash);
	led.file.writeSync(0);
}

function led_on (led) {
	led.value = 1;
	led.file.writeSync(led.value);
}

function led_off (led) {
	led.value = 0;
	led.file.writeSync(led.value);
}