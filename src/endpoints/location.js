const config = require("../../config.json");

function processLocation(data) {
	const countryCode = data.countrycode ||
		(data.pads[0] && data.pads[0].agencies &&
			data.pads[0].agencies[0] &&
			data.pads[0].agencies[0].countryCode) || "UNK";
	modelLocation = {
		id: data.id || -1,
		name: data.name || "Unknown",
		countryCode: countryCode,
		countryFlag: config.deploymentURL + "flag/" +
			countryCode.split(",")[0].toLowerCase(),
		map: "https://www.google.com/maps/embed/v1/place?key=" +
			config.keys.google +
			"&maptype=satellite&q=Launch+Centre+" +
			data.name.replace(" ", "+"),
		img: config.deploymentURL + "map/?zoom=16&maptype=satellite&size=128x128&scale=1&center=Launch+Centre+" +
			data.name.replace(" ", "+"),
		info: data.infoURL || (data.infoURLs && data.infoURLs[0]) || "",
		wiki: (data.wikiURL || "").replace("http://", "https://"),
		pads: data.pads
	};
	return modelLocation;
}

module.exports = processLocation;