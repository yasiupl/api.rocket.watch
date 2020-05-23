const request = require("request");

function QueryString(url, callback) {
	var g = {};
	var l = (url && url.split("?")[1]) || "";
	var k = l.split("&");
	for (var m = 0; m < k.length; m++) {
	  var j = k[m].split("=");
	  if (typeof g[j[0]] === "undefined") {
		g[j[0]] = decodeURIComponent(j[1]);
	  } else {
		if (typeof g[j[0]] === "string") {
		  var h = [g[j[0]], decodeURIComponent(j[1])];
		  g[j[0]] = h;
		} else {
		  g[j[0]].push(decodeURIComponent(j[1]));
		}
	  }
	}
	if (callback) callback(g);
	return g;
  }
  
  function getJSON(url) {
	return new Promise((resolve, reject) => {
	  request({
		url: url,
		json: true,
		headers: {
		  'User-Agent': 'rocket.watch'
		}
	  },
		function (error, response, body) {
		  if (error) reject(error);
		  resolve(body);
		}
	  );
	});
  }
  
  module.exports = {
	getJSON: getJSON,
	QueryString: QueryString
  };