const sources = require("../data/sources.json");

const processAgency = require("./agency.js");
const processLocation = require("./location.js");
const processRocket = require("./rocket.js");

function processLaunch(launch) {
	const statuses = ["NO-GO for launch", "GO for launch", "To Be Determined", "Launch successful", "Launch failed", "Hold", "In Flight", "Partial Failure"];

	launch.statuscode = launch.status;
	launch.status = statuses[launch.statuscode] || statuses[0];

	launch.img = null;
	launch.name = launch.name.split("|")[0] + "|" + launch.name.split("|")[1].split(" (")[0];
	launch.mission = launch.name.split("| ")[1].replace("SpX ", "");
	launch.tolaunch = Math.floor((Date.parse(launch.net) - Date.now()) / 1000);
	launch.description =
		launch.failreason ||
		launch.holdreason ||
		(launch.missions && launch.missions[0] && launch.missions[0].description) ||
		"";

	//verbose

	if (launch.missions && launch.missions[0]) {
		launch.mission = launch.missions[0].name.split(" (")[0];
		launch.name = launch.rocket.name + " | " + launch.mission;
	}

	if (
		(launch.lsp && typeof launch.lsp === "object") ||
		(launch.rocket && launch.rocket.agencies) ||
		(launch.location && launch.location.pads)
	) {
		launch.agency = processAgency(
			launch.lsp ||
			launch.rocket.agencies[0] ||
			(launch.location.pads[0] && launch.location.pads[0].agencies[0])
		);
		delete launch.lsp;
	}

	if (launch.rocket) {
		launch.rocket = processRocket(launch.rocket);
	}

	if (launch.location) {
		launch.location = processLocation(launch.location);
	}
	return launch;
}

module.exports = processLaunch;