// Requires
var fs = require('fs')
var net = require('net');
var gpio = require("onoff").Gpio;

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
led_on(state.led_rouge);
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
			return;
	}
});

function connected (payload) {
	console.log("Connected! " + payload);
}

function fulfilled (payload) {
	console.log("Fulfilled! " + payload);
	if(!payload.nip) return;

	// Add to available codes
	console.log("Payload : ",  payload);
	codeDict[payload.nip] = true;

	// stdin shit
	var stdin = process.stdin;
	stdin.resume();
	stdin.setEncoding('utf8');

	// Read
	stdin.on('data', function( text ){
		text = text.trim();

		// Door was open
		if(state.led_rouge.value == 0) {
			led_on(state.led_rouge);
		}
		// Door closed + Error!
		else if ( text.length != 5 || codeDict[text] != true) {
			// Solid red no!
			led_on(state.led_rouge);
			setTimeout(function () {
				led_off(state.led_rouge);
				//process.exit();
			}, 5000);
		}

		// Door closed + Youve got that secret key!
		else {
	console.log("Payload else : ",  payload);
			// Send new nip
			sendClientNip(payload);

			// Do not ever use that code again
			delete codeDict[text];

			// Now unlock
			led_off(state.led_rouge);
			// Now flash!
			//flash(state.led_rouge, 500);
			//setTimeout(function () { // Then stop
		//		stopFlash(state.led_rouge);
		//	}, 5000);
		}
	});
}

function sendClientNip (payload) {
	console.log("Payload send: ",  payload);
    var nip = Math.floor(Math.random() * 90000 + 9999);
	console.log("NIP : " + nip);
    codeDict[nip] = true;
    client.write(JSON.stringify({name: "pickup", payload: {nip: nip, notify: payload.notify}}));
}


// Exec
client.connect(4000, '52.207.77.200', function() {});
led_on(state.led_rouge);

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
