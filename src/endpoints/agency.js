const sources = require("../data/sources.json");
const config = require("../../config.json");
const agencyType = require("../scrape/agencyType.js");

function processAgency(data) {
	var data = data || {};
	modelAgency = {
		id: data.id || -1,
		name: data.name || "Unknown",
		abbrev: (data.abbrev && data.abbrev.split("-")[0]) || "UNK",
		shortname: data.name && data.name.length > 11 ? data.abbrev : data.name || "UNK",
		description: "",
		founded: "",
		type: agencyType(data.type),
		typeCode: data.type || -1,
		islsp: data.islsp || 0,
		countryCode: data.countryCode || "UNK",
		countryFlag: config.deploymentURL + "flag/" +
			data.countryCode.split(",")[0].toLowerCase(),
		info: data.infoURL || (data.infoURLs && data.infoURLs[0]) || "",
		wiki: (data.wikiURL || "").replace("http://", "https://"),
		icon: data.infoURL || (data.infoURLs && data.infoURLs[0]) ?
			config.deploymentURL + "logo/" + (data.infoURL || data.infoURLs[0]) :
			"",
	};
	if (!data) return modelAgency;
	if (modelAgency.countryCode.split(",").length > 1) {
		modelAgency.countryCode = agencyType(modelAgency.typeCode);
		modelAgency.countryFlag = "https://rocket.watch/res/multinational.png";
	}
	modelAgency.social = {};
	modelAgency.social.youtube = (
		data.infoURLs.find(function (a) {
			return a.match("youtube.com/channel/");
		}) || ""
	).split("youtube.com/channel/")[1];
	modelAgency.social.facebook = (
		data.infoURLs.find(function (a) {
			return a.match("facebook.com/");
		}) || ""
	).split("facebook.com/")[1];
	modelAgency.social.twitter = (
		data.infoURLs.find(function (a) {
			return a.match("twitter.com/");
		}) || ""
	).split("twitter.com/")[1];
	modelAgency.social.reddit =
		sources.company[modelAgency.abbrev.toLowerCase()] &&
		sources.company[modelAgency.abbrev.toLowerCase()].reddit;

	return modelAgency;
}

module.exports = processAgency;