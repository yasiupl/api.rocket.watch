const config = require("../../config.json");
const processAgency = require("./agency.js");

function processPad(data) {
	modelPad = {
		id: data.id || -1,
		locationId: data.locationid,
		padType: data.padType,
		latitude: data.latitude,
		longitude: data.longitude,
		retired: data.retired,
		name: data.name || "Unknown",
		info: data.infoURL || (data.infoURLs && data.infoURLs[0]) || "",
		wiki: (data.wikiURL || "").replace("http://", "https://"),
		map: "https://www.google.com/maps/embed/v1/place?key=" +
			config.keys.google +
			"&maptype=satellite&q=" +
			data.latitude +
			"," +
			data.longitude,
		img: config.deploymentURL + "map/?zoom=16&maptype=satellite&size=256x256&scale=1&center=" +
			data.latitude +
			"," +
			data.longitude,
		icon: config.deploymentURL + "map/?zoom=16&maptype=satellite&size=128x128&scale=1&center=" +
			data.latitude +
			"," +
			data.longitude,
		agency: {
			id: -1,
			name: "Unknown"
		}
	};
	if (data.agencies && typeof data.agencies[0] === "object") {
		//modelPad.agencies = data.agencies;
		modelPad.agency = processAgency(data.agencies[0]);
	}
	return modelPad;
}

module.exports = processPad;