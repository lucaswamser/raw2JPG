var raw2JPG = {};


raw2JPG._readIFD = function (bin, data, offset, ifds, depth, prm) {
	var cnt = bin.readUshort(data, offset); offset += 2;
	var ifd = {};

	if (prm.debug) log("   ".repeat(depth), ifds.length - 1, ">>>----------------");
	for (var i = 0; i < cnt; i++) {
		var tag = bin.readUshort(data, offset); offset += 2;
		var type = bin.readUshort(data, offset); offset += 2;
		var num = bin.readUint(data, offset); offset += 4;
		var voff = bin.readUint(data, offset); offset += 4;

		var arr = [];
		//ifd["t"+tag+"-"+raw2JPG.tags[tag]] = arr;
		if (type == 1 || type == 7) { arr = new Uint8Array(data.buffer, (num < 5 ? offset - 4 : voff), num); }
		if (type == 2) {
			var o0 = (num < 5 ? offset - 4 : voff), c = data[o0], len = Math.max(0, Math.min(num - 1, data.length - o0));
			if (c < 128 || len == 0) arr.push(bin.readASCII(data, o0, len));
			else arr = new Uint8Array(data.buffer, o0, len);
		}
		if (type == 3) { for (var j = 0; j < num; j++) arr.push(bin.readUshort(data, (num < 3 ? offset - 4 : voff) + 2 * j)); }
		if (type == 4
			|| type == 13) { for (var j = 0; j < num; j++) arr.push(bin.readUint(data, (num < 2 ? offset - 4 : voff) + 4 * j)); }
		if (type == 5 || type == 10) {
			var ri = type == 5 ? bin.readUint : bin.readInt;
			for (var j = 0; j < num; j++) arr.push([ri(data, voff + j * 8), ri(data, voff + j * 8 + 4)]);
		}
		if (type == 8) { for (var j = 0; j < num; j++) arr.push(bin.readShort(data, (num < 3 ? offset - 4 : voff) + 2 * j)); }
		if (type == 9) { for (var j = 0; j < num; j++) arr.push(bin.readInt(data, (num < 2 ? offset - 4 : voff) + 4 * j)); }
		if (type == 11) { for (var j = 0; j < num; j++) arr.push(bin.readFloat(data, voff + j * 4)); }
		if (type == 12) { for (var j = 0; j < num; j++) arr.push(bin.readDouble(data, voff + j * 8)); }

		ifd["t" + tag] = arr;

		if (num != 0 && arr.length == 0) { log(tag, "unknown TIFF tag type: ", type, "num:", num); if (i == 0) return; continue; }
		if (prm.debug) log("   ".repeat(depth), tag, type, raw2JPG.tags[tag], arr);

		if (tag == 330 && ifd["t272"] && ifd["t272"][0] == "DSLR-A100") { }
		else if (tag == 330 || tag == 34665 || tag == 34853 || (tag == 50740 && bin.readUshort(data, bin.readUint(arr, 0)) < 300) || tag == 61440) {
			var oarr = tag == 50740 ? [bin.readUint(arr, 0)] : arr;
			var subfd = [];
			for (var j = 0; j < oarr.length; j++) raw2JPG._readIFD(bin, data, oarr[j], subfd, depth + 1, prm);
			if (tag == 330) ifd.subIFD = subfd;
			if (tag == 34665) ifd.exifIFD = subfd[0];
			if (tag == 34853) ifd.gpsiIFD = subfd[0];  //console.log("gps", subfd[0]);  }
			if (tag == 50740) ifd.dngPrvt = subfd[0];
			if (tag == 61440) ifd.fujiIFD = subfd[0];
		}
		if (tag == 37500 && prm.parseMN) {
			var mn = arr;
			//console.log(bin.readASCII(mn,0,mn.length), mn);
			if (bin.readASCII(mn, 0, 5) == "Nikon") ifd.makerNote = UTIF["decode"](mn.slice(10).buffer)[0];
			else if (bin.readUshort(data, voff) < 300 && bin.readUshort(data, voff + 4) <= 12) {
				var subsub = []; raw2JPG._readIFD(bin, data, voff, subsub, depth + 1, prm);
				ifd.makerNote = subsub[0];
			}
		}
	}
	ifds.push(ifd);
	if (prm.debug) log("   ".repeat(depth), "<<<---------------");
	return offset;
}


raw2JPG._binBE =
{
	nextZero: function (data, o) { while (data[o] != 0) o++; return o; },
	readUshort: function (buff, p) { return (buff[p] << 8) | buff[p + 1]; },
	readShort: function (buff, p) { var a = raw2JPG._binBE.ui8; a[0] = buff[p + 1]; a[1] = buff[p + 0]; return raw2JPG._binBE.i16[0]; },
	readInt: function (buff, p) { var a = raw2JPG._binBE.ui8; a[0] = buff[p + 3]; a[1] = buff[p + 2]; a[2] = buff[p + 1]; a[3] = buff[p + 0]; return raw2JPG._binBE.i32[0]; },
	readUint: function (buff, p) { var a = raw2JPG._binBE.ui8; a[0] = buff[p + 3]; a[1] = buff[p + 2]; a[2] = buff[p + 1]; a[3] = buff[p + 0]; return raw2JPG._binBE.ui32[0]; },
	readASCII: function (buff, p, l) { var s = ""; for (var i = 0; i < l; i++) s += String.fromCharCode(buff[p + i]); return s; },
	readFloat: function (buff, p) { var a = raw2JPG._binBE.ui8; for (var i = 0; i < 4; i++) a[i] = buff[p + 3 - i]; return raw2JPG._binBE.fl32[0]; },
	readDouble: function (buff, p) { var a = raw2JPG._binBE.ui8; for (var i = 0; i < 8; i++) a[i] = buff[p + 7 - i]; return raw2JPG._binBE.fl64[0]; },

	writeUshort: function (buff, p, n) { buff[p] = (n >> 8) & 255; buff[p + 1] = n & 255; },
	writeInt: function (buff, p, n) { var a = raw2JPG._binBE.ui8; raw2JPG._binBE.i32[0] = n; buff[p + 3] = a[0]; buff[p + 2] = a[1]; buff[p + 1] = a[2]; buff[p + 0] = a[3]; },
	writeUint: function (buff, p, n) { buff[p] = (n >> 24) & 255; buff[p + 1] = (n >> 16) & 255; buff[p + 2] = (n >> 8) & 255; buff[p + 3] = (n >> 0) & 255; },
	writeASCII: function (buff, p, s) { for (var i = 0; i < s.length; i++)  buff[p + i] = s.charCodeAt(i); },
	writeDouble: function (buff, p, n) {
		raw2JPG._binBE.fl64[0] = n;
		for (var i = 0; i < 8; i++) buff[p + i] = raw2JPG._binBE.ui8[7 - i];
	}
}
raw2JPG._binBE.ui8 = new Uint8Array(8);
raw2JPG._binBE.i16 = new Int16Array(raw2JPG._binBE.ui8.buffer);
raw2JPG._binBE.i32 = new Int32Array(raw2JPG._binBE.ui8.buffer);
raw2JPG._binBE.ui32 = new Uint32Array(raw2JPG._binBE.ui8.buffer);
raw2JPG._binBE.fl32 = new Float32Array(raw2JPG._binBE.ui8.buffer);
raw2JPG._binBE.fl64 = new Float64Array(raw2JPG._binBE.ui8.buffer);

raw2JPG._binLE =
{
	nextZero: raw2JPG._binBE.nextZero,
	readUshort: function (buff, p) { return (buff[p + 1] << 8) | buff[p]; },
	readShort: function (buff, p) { var a = raw2JPG._binBE.ui8; a[0] = buff[p + 0]; a[1] = buff[p + 1]; return raw2JPG._binBE.i16[0]; },
	readInt: function (buff, p) { var a = raw2JPG._binBE.ui8; a[0] = buff[p + 0]; a[1] = buff[p + 1]; a[2] = buff[p + 2]; a[3] = buff[p + 3]; return raw2JPG._binBE.i32[0]; },
	readUint: function (buff, p) { var a = raw2JPG._binBE.ui8; a[0] = buff[p + 0]; a[1] = buff[p + 1]; a[2] = buff[p + 2]; a[3] = buff[p + 3]; return raw2JPG._binBE.ui32[0]; },
	readASCII: raw2JPG._binBE.readASCII,
	readFloat: function (buff, p) { var a = raw2JPG._binBE.ui8; for (var i = 0; i < 4; i++) a[i] = buff[p + i]; return raw2JPG._binBE.fl32[0]; },
	readDouble: function (buff, p) { var a = raw2JPG._binBE.ui8; for (var i = 0; i < 8; i++) a[i] = buff[p + i]; return raw2JPG._binBE.fl64[0]; },

	writeUshort: function (buff, p, n) { buff[p] = (n) & 255; buff[p + 1] = (n >> 8) & 255; },
	writeInt: function (buff, p, n) { var a = raw2JPG._binBE.ui8; raw2JPG._binBE.i32[0] = n; buff[p + 0] = a[0]; buff[p + 1] = a[1]; buff[p + 2] = a[2]; buff[p + 3] = a[3]; },
	writeUint: function (buff, p, n) { buff[p] = (n >>> 0) & 255; buff[p + 1] = (n >>> 8) & 255; buff[p + 2] = (n >>> 16) & 255; buff[p + 3] = (n >>> 24) & 255; },
	writeASCII: raw2JPG._binBE.writeASCII
}

raw2JPG._decode = function (buff, prm) {
	if (prm == null) prm = { parseMN: false, debug: false };  // read MakerNote, debug
	var data = new Uint8Array(buff), offset = 0;

	var id = raw2JPG._binBE.readASCII(data, offset, 2); offset += 2;
	var bin = id == "II" ? raw2JPG._binLE : raw2JPG._binBE;
	var num = bin.readUshort(data, offset); offset += 2;

	var ifdo = bin.readUint(data, offset); offset += 4;
	var ifds = [];
	while (true) {
		var noff = raw2JPG._readIFD(bin, data, ifdo, ifds, 0, prm);
		ifdo = bin.readUint(data, noff);
		if (ifdo == 0 || noff == 0) break;
	}
	return ifds;
}

function getStart(ifds) {
	if (ifds[0].subIFD && ifds[0].subIFD[0].t513) {
		return ifds[0].subIFD[0].t513
	} else if (ifds[0].t513) {
		return ifds[0].t513[0]
	} else if (ifds[0].t273) {
		return ifds[0].t273[0]
	}
}

raw2JPG._getPreviewLengthBytes = function (ifds) {
	if (ifds[0].subIFD && ifds[0].subIFD[0].t514) {
		return ifds[0].subIFD[0].t514
	} else if (ifds[0].t514) {
		return ifds[0].t514[0]
	} else if (ifds[0].t279) {
		return ifds[0].t279[0]
	}
}

raw2JPG._getPreviewStartBytes = function (ifds) {
	if (ifds[0].subIFD && ifds[0].subIFD[0].t513) {
		return ifds[0].subIFD[0].t513
	} else if (ifds[0].t513) {
		return ifds[0].t513[0]
	} else if (ifds[0].t273) {
		return ifds[0].t273[0]
	}
}


raw2JPG.convert = function (data) {
	return new Promise((resolv, reject) => {
		let ifds = raw2JPG._decode(data)
		let start = raw2JPG._getPreviewStartBytes(ifds)
		let end = start + raw2JPG._getPreviewLengthBytes(ifds)
		var jpg = data.slice(start, end);
		return resolv(jpg)
	})
}