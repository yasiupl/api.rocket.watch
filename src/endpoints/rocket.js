const agencyShortName = require("../scrape/agencyShortName.js");

function processRocket(data) {
	modelRocket = {
		id: data.id || -1,
		name: data.name || "Unknown",
		info: data.infoURL || (data.infoURLs && data.infoURLs[0]) || "",
		wiki: (data.wikiURL || "").replace("http://", "https://"),
		img: (data.imageURL || "").replace(
			"https://s3.amazonaws.com/launchlibrary/RocketImages/placeholder_1920.png",
			""
		),
		icon: (data.imageURL || "")
			.replace(
				"https://s3.amazonaws.com/launchlibrary/RocketImages/placeholder_1920.png",
				""
			)
			.replace("2560", "320")
			.replace("1920", "320")
			.replace("1440", "320")
			.replace("1280", "320")
			.replace("1440", "320")
			.replace("1080", "320")
			.replace("1024", "320")
			.replace("960", "320")
			.replace("800", "320")
			.replace("768", "320")
			.replace("720", "320")
			.replace("640", "320")
			.replace("480", "320"),
		family: {
			id: (data.family && (data.family && data.family.id)) || -1,
			name: data.familyname || (data.family && data.family.name) || "Unknown",
			agencies: data.agencies || [{
				id: -1,
				name: "Unknown"
			}]
		},
		agency: {
			id: -1,
			name: "Unknown"
		}
	};

	if (data.family) {
		data.family.agencies =
			(data.family.agencies && data.family.agencies.split(",")) || {};
		for (var i in data.family.agencies) {
			modelRocket.family.agencies[i] = {
				id: parseInt(data.family.agencies[i]) || -1,
				name: agencyShortName(data.family.agencies[i])
			};
		}
	}

	modelRocket.agency = modelRocket.family.agencies[0] || {
		id: -1,
		name: "Unknown"
	};
	return modelRocket;
}

module.exports = processRocket;