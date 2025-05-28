var debug = false;

let d2rgb = d => [d >> 16, d >> 8 & 255, d & 255];
let hsv2rgb = (h, s, v) => {
	s /= 100, v /= 100;
	const c = s * v, x = c * (1 - Math.abs(h / 60 % 2 - 1)), m = v - c;
	return (h <  60 ? [c, x, 0] :
	        h < 120 ? [x, c, 0] :
	        h < 180 ? [0, c, x] :
	        h < 240 ? [0, x, c] :
	        h < 300 ? [x, 0, c] :
	                  [c, 0, x]).map(e => Math.round(255 * (e + m)));
};
let rgb2hsv = (r, g, b) => {
	const M = Math.max(r, g, b), m = Math.min(r, g, b), d = M - m;
	return [60 * (M == m ? 0 :
	              M == r ? ((g - b) / d + 6) % 6 :
	              M == g ?  (b - r) / d + 2 :
	                        (r - g) / d + 4), M ? 100 * d / M : 0, 100 * M / 255];
};
let rgb2css = (rgb) => rgb == "clear" ? "clear" : isNaN(rgb[0]) ? "#00000001" : `rgb(${rgb.join(" ")})`;
let decPrev = 0, hexPrev = "#000000";
hue.oninput = sat.oninput = val.oninput = e => {
	hueL.innerText = "Hue: " + hue.value;
	satL.innerText = "Saturation: " + sat.value;
	valL.innerText = "Value: " + val.value;
	const rgb = hsv2rgb(hue.value, sat.value, val.value);
	color.style.backgroundColor = `rgb(${rgb.join(" ")})`;
	dec.value = decPrev = rgb[0] << 16 | rgb[1] << 8 | rgb[2];
	hex.value = "#" + rgb.map(e => e.toString(16).padStart(2, "0")).join("");
};
dec.oninput = e => {
	const rgb = d2rgb(dec.value), hsv = rgb2hsv(...rgb);
	hue.value = hsv[0];
	sat.value = hsv[1];
	val.value = hsv[2];
	hueL.innerText = "Hue: " + hue.value;
	satL.innerText = "Saturation: " + sat.value;
	valL.innerText = "Value: " + val.value;
	color.style.backgroundColor = `rgb(${rgb.join(" ")})`;
	hex.value = "#" + rgb.map(e => e.toString(16).padStart(2, "0")).join("");
};
hex.oninput = e => {
	const rgb = d2rgb(dec.value = parseInt(hex.value.replace(/^#/, ""), 16)), hsv = rgb2hsv(...rgb);
	hue.value = hsv[0];
	sat.value = hsv[1];
	val.value = hsv[2];
	hueL.innerText = "Hue: " + hue.value;
	satL.innerText = "Saturation: " + sat.value;
	valL.innerText = "Value: " + val.value;
	color.style.backgroundColor = `rgb(${rgb.join(" ")})`;
};

const canvas = document.getElementById("main");
const cw = canvas.width, ch = canvas.height;
const c = canvas.getContext("2d", {alpha: false});
c.scale(cw / 480, ch / 360), c.translate(240, 180);
const _canvas = new OffscreenCanvas(1000, 1000);
const _c = _canvas.getContext("2d");
// _c.imageSmoothingEnabled = false;
const ui = document.getElementById("ui");
const u = ui.getContext("2d");
// u.imageSmoothingEnabled = false;
let shouldUpdateUI = true;

const c0 = lineNum.getContext("2d");
const ew = lineNum.offsetWidth, eh = lineNum.offsetHeight;
lineNum.setAttribute("width", ew);
lineNum.setAttribute("height", eh);
let scrollLeft = 0;
let scrollTop = 0;
a.onscroll = () => {
	scrollLeft = a.scrollLeft;
	scrollTop = a.scrollTop;
};

const field = document.getElementById("a");
let chartData = [["#unnamed", 60, 0], ["*easy", 0]], chartDataRaw = ["#unnamed/60/0", "*easy/0"], notes = [];
let spbList = [[-Infinity, 1, 0], [Infinity, 1, 0]];
let bpsList = [[-Infinity, 1, 0], [Infinity, 1, 0]];
let spdList = [[-Infinity, 1, 0], [Infinity, 1, 0]];
let camList = [[[-Infinity, 0, 0, 0, 0, 0, 0, 0, 0, 130, -200, 0, -15, 0], [Infinity, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]];
let colList = [[-Infinity, 0, 0, 0, 0, 0, 0, 0], [Infinity, 0, 0, 0, 0, 0, 0, 0]];
let bpm = 120;
let spd = 1;
let spdMult = 3.0;
let maxCombo = 0;
let textColor = "black";
let textList = [];
let judged = new Set();
let mouseX = 0, mouseY = 0;
let buttons = [];
let mode = "3d";
const CLEAR = [null, null, null];
const easeStyle = [
	x => x,
	x => x, // 1: Linear
	x => 1 - easeStyle[3](1 - x), // 2: InSine
	x => Math.sin(Math.PI * x / 2), // 3: OutSine
	x => x < 0.5 ? easeStyle[2](2 * x) / 2 : easeStyle[3](2 * x - 1) / 2 + 0.5, // 4: InOutSine
	x => x < 0.5 ? easeStyle[3](2 * x) / 2 : easeStyle[2](2 * x - 1) / 2 + 0.5, // 5: OutInSine
	x => x * x, // 6: InQuad
	x => 1 - easeStyle[6](1 - x), // 7: OutQuad
	x => x < 0.5 ? easeStyle[6](2 * x) / 2 : easeStyle[7](2 * x - 1) / 2 + 0.5, // 8: InOutQuad
	x => x < 0.5 ? easeStyle[7](2 * x) / 2 : easeStyle[6](2 * x - 1) / 2 + 0.5, // 9: OutInQuad
	x => x * x * x, // 10: InCubic
	x => 1 - easeStyle[10](1 - x), // 11: OutCubic
	x => x < 0.5 ? easeStyle[10](2 * x) / 2 : easeStyle[11](2 * x - 1) / 2 + 0.5, // 12: InOutCubic
	x => x < 0.5 ? easeStyle[11](2 * x) / 2 : easeStyle[10](2 * x - 1) / 2 + 0.5, // 13: OutInCubic
	x => x * x * x * x, // 14: InQuart
	x => 1 - easeStyle[14](1 - x), // 15: OutQuart
	x => x < 0.5 ? easeStyle[14](2 * x) / 2 : easeStyle[15](2 * x - 1) / 2 + 0.5, // 16: InOutQuart
	x => x < 0.5 ? easeStyle[15](2 * x) / 2 : easeStyle[14](2 * x - 1) / 2 + 0.5, // 17: OutInQuart
	x => x * x * x * x * x, // 18: InQuint
	x => 1 - easeStyle[18](1 - x), // 19: OutQuint
	x => x < 0.5 ? easeStyle[18](2 * x) / 2 : easeStyle[19](2 * x - 1) / 2 + 0.5, // 20: InOutQuint
	x => x < 0.5 ? easeStyle[19](2 * x) / 2 : easeStyle[18](2 * x - 1) / 2 + 0.5, // 21: OutInQuint
	x => Math.pow(2, 10 * (x - 1)), // 22: InExpo
	x => 1 - easeStyle[22](1 - x), // 23: OutExpo
	x => x < 0.5 ? easeStyle[22](2 * x) / 2 : easeStyle[23](2 * x - 1) / 2 + 0.5, // 24: InOutExpo
	x => x < 0.5 ? easeStyle[23](2 * x) / 2 : easeStyle[22](2 * x - 1) / 2 + 0.5, // 25: OutInExpo
	x => 1 - Math.sqrt(1 - x * x), // 26: InCirc
	x => 1 - easeStyle[26](1 - x), // 27: OutCirc
	x => x < 0.5 ? easeStyle[26](2 * x) / 2 : easeStyle[27](2 * x - 1) / 2 + 0.5, // 28: InOutCirc
	x => x < 0.5 ? easeStyle[27](2 * x) / 2 : easeStyle[26](2 * x - 1) / 2 + 0.5, // 29: OutInCirc
	x => 1 - easeStyle[31](1 - x), // 30: InElastic
	x => Math.pow(2, -10 * x) * Math.sin(Math.PI * (x * 20 / 3 - 0.5)) + 1, // 31: OutElastic
	x => x < 0.5 ? easeStyle[30](2 * x) / 2 : easeStyle[31](2 * x - 1) / 2 + 0.5, // 32: InOutElastic
	x => x < 0.5 ? easeStyle[31](2 * x) / 2 : easeStyle[30](2 * x - 1) / 2 + 0.5, // 33: OutInElastic
	x => 2.70158 * x * x * x - 1.70158 * x * x, // 34: InBack
	x => 1 - easeStyle[34](1 - x), // 35: OutBack
	x => x < 0.5 ? easeStyle[34](2 * x) / 2 : easeStyle[35](2 * x - 1) / 2 + 0.5, // 36: InOutBack
	x => x < 0.5 ? easeStyle[35](2 * x) / 2 : easeStyle[34](2 * x - 1) / 2 + 0.5, // 37: OutInBack
	x => 1 - easeStyle[39](1 - x), // 38: InBounce
	x => 121 * x * x / 16 - (x < 4 / 11 ? 0 : x < 8 / 11 ? 33 * x / 4 - 3 : x < 10 / 11 ? 99 * x / 8 - 6 : 231 * x / 16 - 7.875), // 39: OutBounce
	x => x < 0.5 ? easeStyle[38](2 * x) / 2 : easeStyle[39](2 * x - 1) / 2 + 0.5, // 40: InOutBounce
	x => x < 0.5 ? easeStyle[39](2 * x) / 2 : easeStyle[38](2 * x - 1) / 2 + 0.5, // 41: OutInBounce
];
let ease = (from, to, prog, type) => {
	if (isNaN(prog) || prog <= 0) return from;
	if (prog >= 1) return to;
	type = Number(type) || 1;
	if (type < 1000) prog = (easeStyle[type] ?? (x => x))(prog);
	else { 
		let a = Math.floor(type / 100000), b = Math.floor(type / 1000) % 100, r = type % 1000 / 100;
		prog = (1 - r) * (easeStyle[a] ?? (x => x))(prog) + r * (easeStyle[b] ?? (x => x))(prog);
	}
	return from + prog * (to - from);
};
let b2t = b => {
	let i = spbList.findIndex(e => e[0] > b) - 1;
	return spbList[i][1] * b + spbList[i][2];
};
let t2b = t => {
	let i = bpsList.findIndex(e => e[0] > t) - 1;
	bpm = (bpsList[i][1] * 60).toFixed(3);
	return bpsList[i][1] * t + bpsList[i][2];
};
let t2z = t => {
	let i = spdList.findIndex(e => e[0] > t) - 1;
	spd = spdList[i][1];
	return 350 * (spdList[i][1] * t + spdList[i][2]);
};
function updateCam(t) {
	cx = cy = cz = ry = rp = rr = 0;
	camList.forEach(list => {
		let i = list.findIndex(e => e[0] > t) - 1;
		let l = list[i];
		if (t >= l[1]) {
			cx += l[8];
			cy += l[9];
			cz += l[10];
			ry += l[11];
			rp += l[12];
			rr += l[13];
		} else {
			cx += ease(l[2], l[8], (t - l[0]) / (l[1] - l[0]), l[14]);
			cy += ease(l[3], l[9], (t - l[0]) / (l[1] - l[0]), l[14]);
			cz += ease(l[4], l[10], (t - l[0]) / (l[1] - l[0]), l[14]);
			ry += ease(l[5], l[11], (t - l[0]) / (l[1] - l[0]), l[14]);
			rp += ease(l[6], l[12], (t - l[0]) / (l[1] - l[0]), l[14]);
			rr += ease(l[7], l[13], (t - l[0]) / (l[1] - l[0]), l[14]);
		}
	});
}
function updateCol(t) {
	if (debug || mode == "2d") {
		bg = _bg = "#ffffff", ln = "#dfdfdf", nt = "#6666ff";
		if (textColor == "white") shouldUpdateUI = true;
		textColor = "black", textColor2 = "white";
		return;
	}
	let l = colList.find(e => e[1] > t), m;
	bg = rgb2css(l[2]), _bg = rgb2css(l[5]);
	if (Math.max(...l[2]) > 128) {
		if (textColor == "white") shouldUpdateUI = true;
		textColor = "black", textColor2 = "white";
	} else {
		if (textColor == "black") shouldUpdateUI = true;
		textColor = "white", textColor2 = "black";
	}
	bgChange = l[1] - l[0] ? Math.max((t - l[0]) / (l[1] - l[0]), 0) : 0;
	m = [3, 4].map(e => l[e][0] == null && (l[e + 3][0] == null || t < l[0]) ? "clear" : [0, 1, 2].map(f => Math.round(ease(l[e][f] ?? l[2][f], l[e + 3][f] ?? l[5][f], (t - l[0]) / (l[1] - l[0])))));
	[ln, nt] = m.map(e => rgb2css(e));
}

function doChart() {
	try {
		chartData = field.value.split("\n").map(e => e.split(/[\/\t]/g).map(f => {
			if (f.startsWith("+")) return f;
			if (!isNaN(f)) return Number(f);
			if (f.includes(":")) {
				let a = f.split(":");
				if (a.length == 2) return a[0] / a[1];
				else return a[0] + a[1] / a[2];
			}
			return f;
		}));
		spbList = [[-Infinity, 60 / chartData[0][1], 0],
			         ...chartData.filter(e => e[0] == "bpm").map(e => [e[1], 60 / e[2], null]),
			         [Infinity, 1, 0]];
		for (let i = 1; i < spbList.length - 1; i++) spbList[i][2] = (spbList[i - 1][1] - spbList[i][1]) * spbList[i][0] + spbList[i - 1][2];
		bpsList = [[-Infinity, chartData[0][1] / 60, 0],
			         ...chartData.filter(e => e[0] == "bpm").map(e => [e[1], e[2] / 60, null]),
			         [Infinity, 1, 0]];
		for (let i = 1; i < bpsList.length - 1; i++) bpsList[i][0] = (bpsList[i][0] - bpsList[i - 1][2]) / bpsList[i - 1][1], bpsList[i][2] = (bpsList[i - 1][1] - bpsList[i][1]) * bpsList[i][0] + bpsList[i - 1][2];
		spdList = [[-Infinity, 1, 0],
			         ...chartData.filter(e => e[0] == "spd").map(e => [b2t(e[1]), e[2], null]),
			         [Infinity, 1, 0]];
		for (let i = 1; i < spdList.length - 1; i++) spdList[i][2] = (spdList[i - 1][1] - spdList[i][1]) * spdList[i][0] + spdList[i - 1][2];
		camList = [[[-Infinity, -Infinity, 0, 130, -200, 0, -15, 0, 0, 130, -200, 0, -15, 0]]];
		let cur = [0, 130, -200, 0, -15, 0];
		chartData.filter(e => typeof (e[0]) == "string" && e[0].startsWith("cam")).toSorted((a, b) => a[1] - b[1]).forEach((e, i) => {
			let t = b2t(e[1]);
			let l = camList.find(f => t >= f.at(-1)[1]) ?? (camList.push([[-Infinity, -Infinity, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]), camList.at(-1));
			let L = l.at(-1);
			switch (e[3]) {
				case "abs":
					l.push([t, b2t(e[1] + e[2]), L[8],                 L[9],                 L[10],                 L[11],                 L[12],                 L[13],
					                                     L[8] + e[4] - cur[0], L[9] + e[5] - cur[1], L[10] + e[6] - cur[2], L[11] + e[7] - cur[3], L[12] + e[8] - cur[4], L[13] + e[9] - cur[5], e[0].slice(3)]);
					cur[0] = e[4]; cur[1] = e[5]; cur[2] = e[6]; cur[3] = e[7]; cur[4] = e[8]; cur[5] = e[9];
					break;
				case "res":
					l.push([t, b2t(e[1] + e[2]), L[8],                        L[9],                              L[10],                              L[11],                        L[12],                             L[13],
					                                     L[8] + (e[4] ?? 0) - cur[0], L[9] + (e[5] ?? 0) + 130 - cur[1], L[10] + (e[6] ?? 0) - 200 - cur[2], L[11] + (e[7] ?? 0) - cur[3], L[12] + (e[8] ?? 0) - 15 - cur[4], L[13] + (e[9] ?? 0) - cur[5], e[0].slice(3)]);
					cur[0] = e[4] ?? 0; cur[1] = (e[5] ?? 0) + 130; cur[2] = (e[6] ?? 0) - 200; cur[3] = e[7] ?? 0; cur[4] = (e[8] ?? 0) - 15; cur[5] = e[9] ?? 0;
					break;
				default:
					l.push([t, b2t(e[1] + e[2]), L[8],        L[9],        L[10],        L[11],        L[12],        L[13],
					                                     L[8] + e[3], L[9] + e[4], L[10] + e[5], L[11] + e[6], L[12] + e[7], L[13] + e[8], e[0].slice(3)]);
					cur[0] += e[3]; cur[1] += e[4]; cur[2] += e[5]; cur[3] += e[6]; cur[4] += e[7]; cur[5] += e[8];
			}
		});
		camList.forEach(e => e.push([Infinity, Infinity, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
		colList = [[-Infinity, -Infinity, 0, 0, 0, [255, 255, 255], [223, 223, 223], [102, 102, 255]],
			         ...chartData.filter(e => e[0] == "col").map(e => [b2t(e[1]), b2t(e[1] + e[2]), null, null, null, e[3], e[4], e[5]]),
			         [Infinity, Infinity, null, null, null, [255, 255, 255], [223, 223, 223], [102, 102, 255]]];
		for (let i = 1; i < colList.length; i++) {
			for (let j = 0; j < 3; j++) {
				colList[i][j + 2] = colList[i - 1][j + 5];
				switch (colList[i][j + 5]) {
					case "null":
						colList[i][j + 5] = colList[i][j + 2];
						break;
					case "res":
						colList[i][j + 5] = [[255, 255, 255], [223, 223, 223], [102, 102, 255]][j];
						break;
					case "clear":
						colList[i][j + 5] = CLEAR;
						break;
					default:
						colList[i][j + 5] = d2rgb(colList[i][j + 5]);
				} 
			}
		}
		notes = [];
		let i = 0;
		chartData.forEach((e, j) => {
			if (!isNaN(e[0])) notes.push({
				z: t2z(b2t(e[0])),
				x: 50 * e[1] - 125,
				y: 0.75 * e[2],
				width: e[3] * 25 - 3,
				beat: e[0],
				link: e[4] == "null" ? [] : e.slice(4).filter(f => !isNaN(f)).map(f => typeof f == "string" ? i + Number(f) : f - 1),
				knil: [],
				id: ++i,
				lineNo: j
			});
		});
		notes.forEach(e => {
			e.link = e.link.map(f => (notes[f].knil.push(e), notes[f]));
			e.maxZ = Math.max(e.z, ...e.link.map(f => f.z));
		});
		maxCombo = notes.reduce((a, b) => a + (b.knil.length || 1), 0);
		notes.reverse().sort((a, b) => b.z - a.z);
		notes.filter(e => beat >= e.beat).forEach(e => judged.add(e));
	} catch (e) { console.error(e); }
}
localforage.getItem("chartData").then(data => {
	field.value = data || "#unnamed/100/0\n*easy/0";
	doChart();
}).catch(e => console.error(e));

field.oninput = e => {
	doChart();
	document.getElementById("save").innerText = "Save";
	window.onbeforeunload = e => (e.returnValue = "");
}

function getSilentAudioBuffer(time) {
	const FREQ = 44100;
	const duration = time * FREQ;
	const AudioContext = window.AudioContext;
	if (!AudioContext) {
		console.log("No Audio Context");
	}
	const context = new AudioContext();
	const audioBuffer = context.createBuffer(1, duration, FREQ);

	let numOfChan = audioBuffer.numberOfChannels,
		length = duration * numOfChan * 2 + 44,
		buffer = new ArrayBuffer(length),
		view = new DataView(buffer),
		channels = [],
		i,
		sample,
		offset = 0,
		pos = 0;

	// write WAVE header
	setUint32(0x46464952);
	setUint32(length - 8);
	setUint32(0x45564157);

	setUint32(0x20746d66);
	setUint32(16);
	setUint16(1);
	setUint16(numOfChan);
	setUint32(audioBuffer.sampleRate);
	setUint32(audioBuffer.sampleRate * 2 * numOfChan);
	setUint16(numOfChan * 2);
	setUint16(16);

	setUint32(0x61746164);
	setUint32(length - pos - 4);

	// write interleaved data
	for (i = 0; i < audioBuffer.numberOfChannels; i++) channels.push(audioBuffer.getChannelData(i));

	while (pos < length) {
		for (i = 0; i < numOfChan; i++) {
			// interleave channels
			sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
			sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
			view.setInt16(pos, sample, true); // write 16-bit sample
			pos += 2;
		}
		offset++; // next source sample
	}

	// create Blob
	return new Blob([buffer], { type: "audio/wav" });

	function setUint16(data) {
		view.setUint16(pos, data, true);
		pos += 2;
	}

	function setUint32(data) {
		view.setUint32(pos, data, true);
		pos += 4;
	}
}

/*
function load() {
	const reader = new FileReader();
	const file = document.getElementById("json").files[0];
	
	reader.readAsText(file);
	
	reader.onload = () => {
		localforage.setItem("chartData", (field.value = Object.values(JSON.parse(reader.result).targets[0].lists).find(e => e[0] == "譜面データ/charts")[1].join("\n")));
		doChart();
	}
	reader.onerror = () => {
		console.error(reader.error);
	}
}
*/

function save() {
	localforage.setItem("chartData", field.value).then(data => {
		const reader = new FileReader();
		reader.readAsDataURL(mInput.files[0]);
		reader.onload = () => {
			localforage.setItem("music", reader.result);
		}
		document.getElementById("save").innerText = "Saved!";
		window.onbeforeunload = null;
	});
}

let paused = true;
let time = 0;
let mInput = document.getElementById("music");
let slider = document.getElementById("time");
let speedSliderN = document.getElementById("speedN");
let speedSliderM = document.getElementById("speedM");
let music = new Audio(URL.createObjectURL(getSilentAudioBuffer(180)));
localforage.getItem("music").then(data => {
	if (data) music = new Audio(data);
	music.onloadedmetadata = e => {
		music.volume = 0.5;
		slider.value = 0;
		slider.setAttribute("max", music.duration);
	}
}).catch(e => console.error(e));

let sfxVol = 0.5;
mInput.onchange = e => {
	paused = true;
	music.pause();
	document.getElementById("control").innerText = "Play";
	music.src = URL.createObjectURL(mInput.files[0]);
	window.onbeforeunload = e => (e.returnValue = "");
};
music.onended = e => {
	paused = true;
	document.getElementById("control").innerText = "Play";
}
slider.oninput = e => {
	music.currentTime = slider.valueAsNumber + chartData[0][2] / 1000;
	beat = t2b(slider.valueAsNumber);
	notes.filter(e => beat >= e.beat).forEach(e => judged.add(e));
	_combo = combo = notes.reduce((a, b) => a + (beat >= b.beat && (b.knil.length || 1)), 0);
}
speedSliderN.oninput = e => document.getElementById("nowSpdN").innerText = "Note Speed: x" + (spdMult = speedSliderN.valueAsNumber);
speedSliderM.oninput = e => document.getElementById("nowSpdM").innerText = "Music Speed: x" + (music.playbackRate = speedSliderM.valueAsNumber);


function toggleMusic() {
	if (paused) {
		music.play();
		document.getElementById("control").innerText = "Stop";
	} else {
		music.pause();
		document.getElementById("control").innerText = "Play";
	}
	paused ^= 1;
}

window.onmousemove = e => {
	const rect = canvas.getBoundingClientRect();
	mouseX = 480 * (e.clientX - rect.left - 1) / canvas.clientWidth - 240;
	mouseY = 360 * (rect.top + 1 + canvas.clientHeight - e.clientY) / canvas.clientHeight - 180;
}

const cos = t => Math.cos(t * Math.PI / 180);
const sin = t => Math.sin(t * Math.PI / 180);

let cx = 0, cy = 130, cz = -200, pers = 400;
let ry = 0, rp = -15, rr = 0;
let bg = 0xffffff, _bg = 0xffffff, bgChange = 1, ln = 0xdfdfdf, nt = 0x6666ff;
let combo = 0, _combo = 0;
let Z = 0;
let beat = 0;
let mirror = 1;
let editor = {
	hei: 1,
	dis: 1,
	div: 4
};

function line2d(x1, y1, x2, y2, ws, we) {
	if (we == undefined) we = ws;
	if (ws < we) return line2d(x2, y2, x1, y1, we, ws);
	ws /= 2, we /= 2;
	let h = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
	c.beginPath();
	if (h <= ws - we) c.arc(x1, -y1, ws, 0, 2 * Math.PI);
	else {
		let th = -Math.atan2(y2 - y1, x2 - x1);
		let ph = Math.acos((ws - we) / h);
		c.arc(x1, -y1, ws, th + ph, th - ph);
		c.arc(x2, -y2, we, th - ph, th + ph);
	}
	c.fill();
}

function polyline2d(...p) {
	let w = p.at(-1);
	for (let i = 0; i < p.length - 2; i -= 2) line2d(p[i++], p[i++], p[i++], p[i++], w, w);
}

let transform = (x, y, z) => {
	x -= cx;
	y -= cy;
	z -= cz;
	[x, z] = [cos(ry) * x - sin(ry) * z,  sin(ry) * x + cos(ry) * z];
	[y, z] = [cos(rp) * y - sin(rp) * z,  sin(rp) * y + cos(rp) * z];
	[x, y] = [cos(rr) * x + sin(rr) * y, -sin(rr) * x + cos(rr) * y];
	return [x * mirror, -y, z];
};

let near = 1;
function line3d(x1, y1, z1, x2, y2, z2, w) {
	[x1, y1, z1] = transform(x1, y1, z1);
	[x2, y2, z2] = transform(x2, y2, z2);
	if (z1 <= near && z2 <= near) return;
	if (z1 <= near) [x1, y1, z1] = [ease(x1, x2, (near - z1) / (z2 - z1)), ease(y1, y2, (1 - z1) / (z2 - z1)), 1];
	if (z2 <= near) [x2, y2, z2] = [ease(x2, x1, (near - z2) / (z1 - z2)), ease(y2, y1, (1 - z2) / (z1 - z2)), 1];
	x1 *= pers / z1, x2 *= pers / z2;
	y1 *= pers / z1, y2 *= pers / z2;
	line2d(x1, -y1, x2, -y2, w * pers / z1, w * pers / z2);
}

function polyline3d(...p) {
	let w = p.at(-1);
	for (let i = 0; i < p.length - 4; i -= 3) line3d(p[i++], p[i++], p[i++], p[i++], p[i++], p[i++], w);
}

function text2d(str, x, y, dx, dy, s, col = "auto", g = 0, a = "ld") {
	str = String(str);
	s *= 0.16;
	dx ??= 15 * s / 16;
	c.font = `${s}px Alphanumeric, MisakiGothic`;
	c.letterSpacing = `${dx - s}px`;
	c.save();
	c.globalAlpha = 1 - g / 100;
	c.fillStyle = col == "auto" ? textColor : col;
	c.fillText(str, x - { l: 3 * s / 8, c: (15 * str.length - 3) * s / 32, r: (15 * str.length - 9) * s / 16 }[a[0]], -y + 5 * s / 16);
	c.restore();
}

function text3d(str, x, y, z, s, col, g) {
	[x, y, z] = transform(x, y, z);
	if (z <= 0) return;
	text2d(str, x * pers / z, -y * pers / z, undefined, undefined, s * pers / z, col, g, "cc");
}

function drawImageUI(n, x, y, d = 0, s = 100, col = "#000000", g = 0) {
	const img = images[n]?.[d]?.[s];
	if (img == undefined) return;
	if (col == "auto") col = textColor == "white" ? "#ffffff" : "#000000";
	img.ctx.fillStyle = col;
	img.ctx.fillRect(0, 0, img.width, img.height);
	u.globalAlpha = 1 - g / 100;
	u.drawImage(img, (x + 240) * cw / 480 - img.width / 2, (180 - y) * ch / 360 - img.height / 2);
}

function updateUI() {
	u.clearRect(-240, -180, 480, 360);
	buttons.forEach(e => {
		if (e.active) drawImageUI(e.name, e.x, e.y, e.dirA ?? e.dir, e.sizeA ?? e.size, e.colorA ?? e.color, e.ghostA ?? e.ghost);
		else drawImageUI(e.name, e.x, e.y, e.dir, e.size, e.color, e.ghost);
	});
	shouldUpdateUI = false;
}

let formatTime = t => Math.floor(t / 60) + ":" + (t % 60).toFixed(3).padStart(6, "0");
let formatBeat = t => t2b(t).toFixed(3);

/*
function addNote(i) {
	if (i > notes.length) i = notes.length + 1;
	let p = 0, n = [0, 1, 0, 1, "null"];
	if (i > 1) p = notes.find(e => e.id == i - 1).lineNo, n = Array.from(chartData[p]);
	chartData.splice(p, 0, n);
	chartData.forEach(e => {
		if (!isNaN(e[0])) {
			for (let j = 4; j < e.length; j++) {
				if (e[j] >= i) e[j]++;
			}
		}
	});
	field.value = chartData.map(e => e.join("/")).join("\n");
	field.oninput();
}
function delNote(i) {
	p = notes.find(e => e.id == i)?.lineNo;
	if (p === undefined) return;
	chartData.splice(p, 1);
	chartData.forEach(e => {
		if (!isNaN(e[0])) {
			for (let j = 4; j < e.length; j++) {
				if (e[j] == i) e.splice(j, 1), j--;
				else if (e[j] > i) e[j]--;
			}
		}
		if (e.length < 5) e.push("null");
	});
	field.value = chartData.map(e => e.join("/")).join("\n");
	field.oninput();
}
*/

function handleDownload(content, filename) {
	var blob = new Blob([ content ], { "type" : "text/plain" });
	var objectURL = window.URL.createObjectURL(blob);

	var link = document.createElement("a");
	document.body.appendChild(link);
	link.href = objectURL;
	link.download = filename;
	link.click();
	document.body.removeChild(link);
}

function exportText(u = 0.25) {
	let data =  chartData.map((e, i) => {
		if (typeof e[0] != "number") return e;
		let n = notes.find(f => f.lineNo == i);
		return e.slice(0, 4).concat(n.link.length ? n.link.map(f => f.id) : "null");
	});
	
	let cams = [[[-Infinity, 0, 0, 0, 0, 0, 0, 0]]];
	let cur = [0, 130, -200, 0, -15, 0];
	data.filter(e => typeof e[0] == "string" && e[0].startsWith("cam")).toSorted((a, b) => a[1] - b[1]).forEach((e, i) => {
		let l = cams.find(f => e[1] >= f.at(-1)[0] + f.at(-1)[1]) ?? (cams.push([[-Infinity, 0, 0, 0, 0, 0, 0, 0]]), cams.at(-1));
		let L = l.at(-1);
		let start = e[1], length = e[2], easing = e[0].slice(3);
		let dest;
		switch (e[3]) {
			case "abs":
				dest = [e[4] - cur[0], e[5] - cur[1], e[6] - cur[2], e[7] - cur[3], e[8] - cur[4], e[9] - cur[5]];
				cur[0] = e[4]; cur[1] = e[5]; cur[2] = e[6]; cur[3] = e[7]; cur[4] = e[8]; cur[5] = e[9];
				break;
			case "res":
				dest = [(e[4] ?? 0) - cur[0], (e[5] ?? 0) + 130 - cur[1], (e[6] ?? 0) - 200 - cur[2], (e[7] ?? 0) - cur[3], (e[8] ?? 0) - 15 - cur[4], (e[9] ?? 0) - cur[5]];
				cur[0] = e[4] ?? 0; cur[1] = (e[5] ?? 0) + 130; cur[2] = (e[6] ?? 0) - 200; cur[3] = e[7] ?? 0; cur[4] = (e[8] ?? 0) - 15; cur[5] = e[9] ?? 0;
				break;
			default:
				dest = [e[3], e[4], e[5], e[6], e[7], e[8]];
				cur[0] += e[3]; cur[1] += e[4]; cur[2] += e[5]; cur[3] += e[6]; cur[4] += e[7]; cur[5] += e[8];
		}
		if (easing) {
			let i = (start / u | 0) * u;
			l.push([Math.max(start, i), Math.min(start + length, i + u) - Math.max(start, i), ...dest.map(f => +ease(0, f, (i - start + u) / length, easing).toFixed(3) - +ease(0, f, (i - start) / length, easing).toFixed(3))].map(f => +f.toFixed(3)));
			for (i += u; i < start + length; i += u) l.push([Math.max(start, i), Math.min(start + length, i + u) - Math.max(start, i), ...dest.map(f => +ease(0, f, (i - start + u) / length, easing).toFixed(3) - +ease(0, f, (i - start) / length, easing).toFixed(3))].map(f => +f.toFixed(3)));
		} else l.push([start, length, ...dest]);
	});
	cams.forEach(e => e[0] == "cam");
	cams = cams.flat().toSorted((a, b) => a[1] - b[1] || a[2] - b[2]);
	let r = [cams[0]];
	for (let i = 1; i < cams.length; i++) {
		if (cams[i - 1][1] == cams[i][1] && cams[i - 1][2] == cams[i][2]) {
			let tmp = r.at(-1).map((e, j) => j < 2 ? e : e + cams[i][j]);
			r.pop();
			r.push(tmp);
		}
		else r.push(cams[i]);
	}
	data = data.filter(e => !(typeof e[0] == "string" && e[0].startsWith("cam"))).concat(r);
	handleDownload(data.map(e => e.join("/")).join("\n"), data[0][0].slice(1) + ".txt");
}

function render() {
	try {
		slider.value = time = music.currentTime - chartData[0][2] / 1000;
		document.getElementById("progT").innerText = "Time: " + formatTime(time) + " / " + formatTime(music.duration || 180);
		document.getElementById("progB").innerText = "Beat: " + formatBeat(time) + " / " + formatBeat(music.duration || 180);
		Z = t2z(time);
		beat = t2b(time);
		document.getElementById("progZ").innerText = "Z: " + Z.toFixed(3);
		updateCam(time);
		updateCol(time);
		
		c.fillStyle = bg;
		c.fillRect(-cw / 2, -ch / 2, cw, ch);
		c.fillStyle = _bg;
		c.beginPath();
		c.arc(0, 780 - 420 * bgChange, 600, 0, 2 * Math.PI);
		c.fill();
			
		combo = notes.reduce((a, b) => a + (beat >= b.beat && (b.knil.length || 1)), 0);
		if (!paused && combo > _combo) playSound("hit", sfxVol);
		_combo = combo;
		
		notes.forEach(e => {
			if (beat >= e.beat) {
				if (!judged.has(e)) {
					judged.add(e);
					e.knil.length || paused || textList.push({
						str: "auto",
						start: Date.now(),
						dur: 200,
						from: {
							x: e.x,
							y: e.y + 5,
							z: 0,
							size: 60,
							trans: 70
						},
						to: {
							x: e.x,
							y: e.y + 10,
							z: 0,
							size: 60,
							trans: 100
						}
					});
				}
			} else judged.delete(e);
		});
		
		if (mode == "3d") {
			if (ln != "clear") {
				c.fillStyle = ln;
				line3d(-100, 0, 0,
								100, 0, 0, 3);
				for (let x of [-100, -50, 0, 50, 100]) line3d(x, 0, -100, x, 0, 950, 3);
				for (let x of [-100, 100]) {
					line3d(x, 75, -100, x, 75, 950, 3)
					for (let z = -Z * spdMult % 200 + 100 - (Z < 100 && 200); z <= 950; z += 200) {
						polyline3d(x, 0,    z,
										   x, 37.5, z + 50,
										   x, 75,   z,      3);
					}
				}
			}
			
			c.fillStyle = nt;
			for (let i = 0; i < notes.length; i++) { let e = notes[i]; if (beat < e.beat && e.z - Z >= -50 / spdMult && e.z - Z <= 950 / spdMult) {
				z = e.z, l = e.x, h = e.y, w = e.width, id = e.id;
				z = spdMult * (z - Z);
				if (h != 0 && ln != "clear") {
					c.fillStyle = ln;
					line3d(l, 0, z,
								 l, h, z, 3);
				}
				if (nt != "clear") {
					c.fillStyle = nt;
					polyline3d(l - w, h, z - 6,
									   l + w, h, z - 6,
									   l + w, h, z + 6,
									   l - w, h, z + 6,
									   l - w, h, z - 6, 3);
				}
				debug && text3d(id, l, h, z, 100, "auto", 50);
			}}
			if (nt != "clear") {
				for (let i = 0; i < notes.length; i++) { let e = notes[i]; if (e.maxZ - Z >= -50 / spdMult && e.z - Z <= 950 / spdMult) {
					z = e.z, l = e.x, h = e.y, w = e.width, b = e.beat, link = e.link;
					z = spdMult * (z - Z);
					link.forEach(f => {
					_z = f.z, _l = f.x, _h = f.y, _w = f.width, _b = f.beat;
						if (beat >= _b) return;
						_z = spdMult * (_z - Z);
						if (_z - z) {
							line3d(ease(l - w, _l - _w, (beat >= b) * (0 - z) / (_z - z)), ease(h, _h, (beat >= b) * (0 - z) / (_z - z)), z * (beat < b),
										 ease(l - w, _l - _w,             (950 - z) / (_z - z)), ease(h, _h,             (950 - z) / (_z - z)), Math.min(_z, 950), 3);
							line3d(ease(l + w, _l + _w, (beat >= b) * (0 - z) / (_z - z)), ease(h, _h, (beat >= b) * (0 - z) / (_z - z)), z * (beat < b),
										 ease(l + w, _l + _w,             (950 - z) / (_z - z)), ease(h, _h,             (950 - z) / (_z - z)), Math.min(_z, 950), 3);
							if (beat >= b) line3d(ease(l - w, _l - _w, -z / (_z - z)), ease(h, _h, -z / (_z - z)), 0,
											              ease(l + w, _l + _w, -z / (_z - z)), ease(h, _h, -z / (_z - z)), 0, 3);
							if (_z > 950) line3d(ease(l - w, _l - _w, (950 - z) / (_z - z)), ease(h, _h, (950 - z) / (_z - z)), 950,
											             ease(l + w, _l + _w, (950 - z) / (_z - z)), ease(h, _h, (950 - z) / (_z - z)), 950, 3);
						} else {
							line3d(ease(l - w, _l - _w, 0), ease(h, _h, 0), z,
										 ease(l - w, _l - _w, 1), ease(h, _h, 1), z, 3);
							line3d(ease(l + w, _l + _w, 0), ease(h, _h, 0), z,
										 ease(l + w, _l + _w, 1), ease(h, _h, 1), z, 3);
						}
					});
				}}
			}
			
			if (ln != "clear") {
				c.fillStyle = ln;
				line3d(-100, 75, 0,
							  100, 75, 0, 3);
			}
			
			if (debug) {
				text2d("pos[       ,       ,       ]", -220, 110, undefined, undefined, 75, "auto", 70, "lc");
				text2d(cx.toFixed(3), -140, 110, undefined, undefined, 60, "auto", 70, "cc");
				text2d(cy.toFixed(3), -50, 110, undefined, undefined, 60, "auto", 70, "cc");
				text2d((cz + 50).toFixed(3), 40, 110, undefined, undefined, 60, "auto", 70, "cc");
				text2d("rot[       ,       ,       ]", -220, 94, undefined, undefined, 75, "auto", 70, "lc");
				text2d(ry.toFixed(3), -140, 94, undefined, undefined, 60, "auto", 70, "cc");
				text2d(rp.toFixed(3), -50, 94, undefined, undefined, 60, "auto", 70, "cc");
				text2d(rr.toFixed(3), 40, 94, undefined, undefined, 60, "auto", 70, "cc");
				text2d("bpm", -220, -142, undefined, undefined, 75, "auto", 70, "lc");
				text2d(bpm, -140, -142, undefined, undefined, 60, "auto", 70, "cc");
				text2d("spd", -220, -158, undefined, undefined, 75, "auto", 70, "lc");
				text2d(spd, -140, -158, undefined, undefined, 60, "auto", 70, "cc");
			}
			
			text3d(combo, 0, 60, 0, 160, "auto", 70);
			text3d("・" + (maxCombo ? combo / maxCombo * 1000000 : 0).toFixed(0).padStart(6, "0") + "・", 0, 37, 0, 55, "auto", 70);
			for (let i = 0; i < textList.length; i++) {
				let t = textList[i], d = Date.now();
				if (d >= t.start + t.dur) textList.splice(i--, 1);
				else text3d(t.str,
						        ease(t.from.x, t.to.x, (d - t.start) / t.dur),
						        ease(t.from.y, t.to.y, (d - t.start) / t.dur),
						        ease(t.from.z, t.to.z, (d - t.start) / t.dur),
						        ease(t.from.size, t.to.size, (d - t.start) / t.dur),
						        "auto",
						        ease(t.from.trans, t.to.trans, (d - t.start) / t.dur));
			}
			text2d(chartData[0][0].slice(1), 230, 165, undefined, undefined, 100, "auto", 70, "rc");
			text2d(chartData[1][0].slice(1), 230, 150, undefined, undefined, 100, "auto", 70, "rc");
			text2d("auto play", 200, 125, undefined, undefined, 50, "auto", 70, "cc");
		} else if (mode == "2d") {
			c.fillStyle = "#ffaaaa";
			line2d(0, -150, 200, -150, 2);
			text2d("0", 10, -140, 10, undefined, 75, "#000000", 85);
			text2d("1", 10, -130, 10, undefined, 75, "#000000", 85);
			text2d(Math.floor(1000 * Math.round(editor.div * beat) / editor.div) / 1000, 164, -140, 10, undefined, 75, "#000000", 85);
			text2d(notes.filter(e => beat >= e.beat).length + "/" + notes.length, 166, -156, undefined, undefined, 50, "#000000", 85);
			text2d("wasd,wheel", 10, -156, undefined, undefined, 60, "#888888", 65);
			for (let i = editor.div * Math.floor(beat - 33 / 90 / editor.dis); i < editor.div * Math.ceil(beat + 333 / 90 / editor.dis); i++) {
				if (i % editor.div == 0) {
					c.fillStyle = "#aaaaaa";
					line2d(-10, 90 * (i / editor.div - beat) - 150, 0, 90 * (i / editor.div - beat) - 150, 3);
					text2d(i / editor.div, -17, 90 * (i / editor.div - beat) - 150, undefined, undefined, 50, "#aaaaaa", undefined, "rc");
				} else {
					c.fillStyle = "#dddddd";
					line2d(-5, 90 * (i / editor.div - beat) - 150, 0, 90 * (i / editor.div - beat) - 150, 3);
				}
			}
			c.fillStyle = "#aaaaaa";
			for (let i = 0; i < 5; i++) line2d(50 * i, 180, 50 * i, -180, 3);
			
			c.fillStyle = nt;
			for (let i = 0; i < notes.length; i++) {
				let e = notes[i];
				if (e.beat - beat > -35 / editor.dis / 90) {
					l = e.x + 100, y = 90 * editor.dis * (e.beat - beat) - 150, h = editor.hei * e.y, w = e.width;
					if (e.beat - beat < 335 / editor.dis / 90) {
						if (e.y != 0 && ln != "clear") {
							c.fillStyle = ln;
							line2d(l, y,
										 l, y + h, 3);
						}
						if (nt != "clear") {
							c.fillStyle = nt;
							polyline2d(l - w, y + h - 3,
												 l + w, y + h - 3,
												 l + w, y + h + 3,
												 l - w, y + h + 3,
												 l - w, y + h - 3, 3);
						}
					}
					for (let j = 0; j < e.knil.length; j++) {
						let f = e.knil[j];
						if (f.beat - beat < 335 / editor.dis / 90 && nt != "clear") {
							_l = f.x + 100, _y = 90 * editor.dis * (f.beat - beat) - 150, _h = editor.hei * f.y, _w = f.width;
							c.fillStyle = nt;
							line2d(l - w, y + h, _l - _w, _y + _h, 3);
							line2d(l + w, y + h, _l + _w, _y + _h, 3);
						}
					}
				}
			}
			c.fillStyle = "#aaaaaa";
			line2d(0, 75 * editor.hei - 150, 200, 75 * editor.hei - 150, 3);
		}
		
		buttons.forEach(e => {
			let cursor = "default";
			if (Math.abs(mouseX - e.x) < e.width / 2 && Math.abs(mouseY - e.y) < e.height / 2) {
				if (!e.active) {
					playSound("hover", sfxVol);
					e.active = true;
					shouldUpdateUI = true;
				}
				cursor = e.cursor ?? "default";
			} else {
				if (e.active) {
					e.active = false;
					shouldUpdateUI = true;
				}
			}
			ui.style.cursor = cursor;
		});
		c0.setTransform(1, 0, 0, 1, 0, 0);
		c0.clearRect(0, 0, lineNum.width, lineNum.height);
		c0.fillStyle = "#eee";
		c0.translate(-scrollLeft, 0);
		c0.fillRect(0, 0, 35, lineNum.height);
		c0.fillStyle = "#aaa";
		c0.translate(0, -scrollTop);
		c0.font = "15px monospace";
		c0.textAlign = "end";
		for (let i = 0, j = 1; i < chartData.length; i++) {
			if (!isNaN(chartData[i][0])) {
				if (20 * i + 19 - scrollTop > 0 && 20 * i + 19 - scrollTop < eh) c0.fillText(j, 34, 20 * i + 19);
				j++;
			}
		}
		if (shouldUpdateUI) updateUI();
	} catch (e) { console.error(e); }
	requestAnimationFrame(render);
}

buttons.push({
	name: "back",
	x: -210,
	y: 150,
	width: 40,
	height: 40,
	size: 400,
	sizeA: 360,
	color: "auto",
	ghost: 70,
	ghostA: 50,
	cursor: "pointer",
	onclick: () => {
		if (mode == "3d") {
			mode = "2d";
			notes.sort((a, b) => b.beat - a.beat);
		} else {
			mode = "3d";
			notes.sort((a, b) => b.z - a.z);
		}
	}
});

ui.onmousedown = () => {
	buttons.forEach(e => {
		if (e.active) {
			playSound("click", sfxVol);
			e.onclick();
		}
	});
};

window.addEventListener("ready", () => requestAnimationFrame(render));
