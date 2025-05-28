window.images = {};
window.sounds = {};
let loaded = 0;

function loadImage(url, name, ...ds) {
	window.images[name] = {};
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.responseType = 'blob';
	xhr.onload = function() {
		createImageBitmap(xhr.response).then(bitmap => {
			ds.forEach(([dir, siz]) => {
				const sheet = new OffscreenCanvas(20 * bitmap.width, 20 * bitmap.height);
				const s = sheet.getContext("2d", {willReadFrequently: true});
				s.imageSmoothingEnabled = false;
				s.save();
				s.translate(10 * bitmap.width, 10 * bitmap.height);
				s.scale(siz / 100, siz / 100);
				s.rotate(Math.PI * dir / 180);
				s.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
				s.restore();
				s.globalCompositeOperation = "source-in";
				sheet.ctx = s;
				window.images[name][dir] ??= {};
				window.images[name][dir][siz] = sheet;
			});
			bitmap.close();
			if (++loaded == toLoad) window.dispatchEvent(new Event("ready"));
		});
	};
	xhr.send();
}

// Fix up prefixing
window.AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new AudioContext();
function loadSound(url, name) {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.responseType = 'arraybuffer';
	xhr.onload = function() {
		context.decodeAudioData(xhr.response, function(buffer) {
			if (!buffer) {
				console.error('Error decoding file data: ' + url);
				return;
			}
			window.sounds[name] = buffer;
			if (++loaded == toLoad) window.dispatchEvent(new Event("ready"));
		});
	};
	xhr.send();
}

function playSound(name, volume = 1) {  
	var source = context.createBufferSource();  // creates a sound source
	source.buffer = sounds[name];               // tell the source which sound to play
	var gainNode = context.createGain();        // Create a gain node
	source.connect(gainNode);                   // Connect the source to the gain node
	gainNode.connect(context.destination);      // Connect the gain node to the destination
	gainNode.gain.value = volume;               // Set the volume
	source.start(0);                            // play the source at the deisred time 0=now
}

let toLoad = 4;
loadImage("images/BACKicon.png", "back", [0, 400], [0, 360]);
loadSound("sounds/hitnotes.wav", "hit");
loadSound("sounds/button_over.wav", "hover");
loadSound("sounds/button_push.wav", "click");
