const Storage = require("node-storage");
const getJSON = require("./js/utils.js").getJSON;
const QueryString = require("./js/utils.js").QueryString;


const config = require("../config.json");
const sources = require("./data/sources.json");
const storage = new Storage("../cache.json");

const processLaunch = require("./endpoints/launch.js");
const processAgency = require("./endpoints/agency.js");
const processRocket = require("./endpoints/rocket.js");
const processLocation = require("./endpoints/location.js");
const processPad = require("./endpoints/pad.js");

const envargs = process.argv.slice(2);

function loadQuery(query, callback) {
  callback = callback || function () { };
  var queryParams = QueryString(query);
  var query = query.replace(/(\?|&)(page=)([0-9])/g, "");
  var format = queryParams.format || "undefined";
  var mode = queryParams.mode || "undefined";

  var cache = storage.get(query);

  if (!cache || (cache && Date.now() - cache.expire > 0)) {
    if (format.match("custom")) {
      const data = require(`./data/custom/${query.split("?")[0]}.json`);
      processData(data, query, callback);
    } else {
      getJSON(config.launchlibraryURL + query).then(data => {
        if (data.status >= 500) {
          if (data) {
            console.log(query);
            console.log(
              "Failed to request, Serving cache " + format + "|" + query
            );
            callback(cache);
          } else {
            console.error(query);
            console.error("Database connection failed " + data.status);
          }
        } else {
          processData(data, query, callback);
        }
      });
    }
  } else callback(cache);
}

async function processData(data, query, callback) {
  try {
    var queryParams = QueryString(query);
    var query = query.replace(/(\?|&)(page=)([0-9])/g, "");
    var format = queryParams.format || "undefined";
    var mode = queryParams.mode || "undefined";

    //default expire time is 24h
    data.expire = Date.now() + 86400000;

    // override /rocket
    for (let i in data.rockets) {
      rocket = data.rockets[i];
      rocket = processRocket(rocket);

      if (mode.match("verbose")) {
        await getJSON(
          "https://spacelaunchnow.me/3.0.0/launchers/" + rocket.id + "/?format=json"
        ).then(data => {
          if (!data.detail) {
            rocket.description = data.description || "";
            rocket.img = data.image_url;
            rocket.agency.name = data.agency.name;
            rocket.agency.abbrev = data.agency.abbrev;
            rocket.agency.shortname =
              data.agency && data.agency.name.length > 11 ?
                data.agency.abbrev :
                data.agency.name;
            rocket.agency.type = data.agency.type;
            rocket.agency.countryCode = data.agency.country_code;
            rocket.agency.countryFlag =
              config.deploymentURL + "flag/" +
              data.agency.country_code.split(",")[0].toLowerCase();
            rocket.agency.info = data.agency.info_url;
            rocket.agency.wiki = data.agency.wiki_url;
            rocket.agency.icon = data.agency.logo_url;
          }
        });
      }
      data.rockets[i] = rocket;
    }

    // override /pad
    for (let i in data.pads) {
      data.pads[i] = processPad(data.pads[i]);
    }

    // override /location
    for (var i in data.locations) {
      data.locations[i] = processLocation(data.locations[i]);
    }

    // override /agency
    for (let i in data.agencies) {
      agency = processAgency(data.agencies[i]);
      // just news

      if (format.match("news")) {
        // 1h
        data.expire = Date.now() + 600000;
        agency.news = {};

        if (agency.social.reddit) {
          await getJSON(
            "https://www.reddit.com/r/" + agency.social.reddit + ".json?limit=5"
          ).then(q => {
            agency.news.reddit = agency.news.reddit || [];
            for (var r in q.data.children) {
              agency.news.reddit.push({
                title: q.data.children[r].data.title,
                content: "",
                url: "https://www.reddit.com" + q.data.children[r].data.permalink,
                img: q.data.children[r].data.preview &&
                  q.data.children[r].data.preview.images[0].source.url ?
                  q.data.children[r].data.preview.images[0].source.url :
                  ""
              });
            }
          });
        }
      }

      if (mode.match("verbose")) {
        await getJSON(
          "https://spacelaunchnow.me/3.0.0/agencies/" + agency.id + "/?format=json"
        ).then(data => {
          agency.description = data.description || "";
          agency.icon = data.logo_url || agency.icon;
          agency.founded = data.founding_year || "Unknown";
          agency.rockets = data.launcher_list;
        });
      }

      data.agencies[i] = agency;
    }

    // override /launch
    for (let i in data.launches) {

      let launch = processLaunch(data.launches[i]);

      if (format.match("live")) {
        launch.media = {
          badge: [],
          button: [],
          audio: [],
          video: [],
          photo: [],
          tweets: [],
          info: [],
          comments: [],
          last: [],
          twitter: []
        };


        // generic info

        if (launch.probability != "-1" && [3, 4, 7].indexOf(launch.statuscode) == -1) {
          launch.media.badge.push({
            name: launch.probability + "% probability",
            desc: "Launch probability"
          });
        }

        var custom = (sources.norminal.media || []).concat(sources.custom.byMissionName[launch.mission] || [])
          .concat(sources.custom.byMissionId[launch.id] || [])
          .concat(sources.custom.byLocationID[launch.location.id] || [])
          .concat(
            sources.custom.byAgencyAbbrev[launch.agency.abbrev.toLowerCase()] || []
          );

        for (var v in custom) {
          if (
            custom[v].when == undefined ||
            (custom[v].when.match("live") && [3, 4, 7].indexOf(launch.statuscode) == -1 &&
              launch.tolaunch < 7200) ||
            (custom[v].when.match("go") && [3, 4, 7].indexOf(launch.statuscode) == -1) ||
            (custom[v].when.match("recovery") && format.match("recovery"))
          ) {
            if (custom[v].is && launch.media[custom[v].is]) {
              launch.media[custom[v].is].push(
                Object.assign({}, {
                  name: custom[v].name || "Source #" + v,
                  embed: custom[v].embed || custom[v].url,
                  share: custom[v].share || custom[v].url
                },
                  custom[v]
                )
              );
            } else {
              addSource(launch, launch,
                custom[v].name,
                custom[v].url || custom[v].embed || custom[v].share,
                function () {
                  launch.media.info.push({
                    name: custom[v].name,
                    embed: custom[v].embed || custom[v].url,
                    share: custom[v].share || custom[v].url
                  });
                }
              );
            }
          }
        }

        if (launch.agency.abbrev == "SpX") {
          // r/SpaceX API bridge

          await getJSON(
            "https://api.spacexdata.com/v2/launches" +
            (launch.tolaunch > 0 ? "/upcoming" : "") +
            "?start=" +
            (new Date(Date.parse(launch.net) - 86400000)).toISOString().split("T")[0] +
            "&final=" +
            (new Date(Date.parse(launch.net) + 86400000)).toISOString().split("T")[0]
          ).then(d => {
            var data = d[0];
            if (data) {
              if (data.reuse.core) {
                launch.media.badge.push({
                  img: "https://rocket.watch/res/reuse.png",
                  name: "Reused booster"
                });
              }
              if (data.reuse.capsule) {
                launch.media.badge.push({
                  img: "https://rocket.watch/res/reuse.png",
                  name: "Reused capsule"
                });
              }
              if (data.links.reddit_launch) {
                var id = data.links.reddit_launch
                  .split("/comments/")[1]
                  .split("/")[0];
                launch.media.comments.unshift({
                  name: "r/SpaceX Launch Thread",
                  embed: "https://reddit-stream.com/comments/" + id,
                  share: "https://reddit.com/comments/" + id
                });
              } else if (data.links.reddit_campaign) {
                var id = data.links.reddit_campaign
                  .split("/comments/")[1]
                  .split("/")[0];
                launch.media.comments.unshift({
                  name: "r/SpaceX Campaign Thread",
                  embed: "https://reddit-stream.com/comments/" + id,
                  share: "https://reddit.com/comments/" + id
                });
              }
              if (data.links.mission_patch) {
                launch.img = data.links.mission_patch;
              }
            }
          });

          // Flightclub.io bridge

          await getJSON(
            "https://api.flightclub.io/v2/mission?launchLibraryId=" + launch.id
          ).then(data => {
            if (data.length) {
              if (launch.tolaunch < 3600) {
                launch.media.video.unshift({
                  is: "video",
                  name: "Flightclub.io LIVE flight simulation",
                  embed: "https://www.flightclub.io/live?code=" + data[0].code,
                  share: "https://www.flightclub.io/live?code=" + data[0].code
                });
              }
              launch.media.video.unshift({
                is: "video",
                name: "Flightclub.io flight simulation",
                embed: "https://www.flightclub.io/result/3d?code=" + data[0].code,
                share: "https://www.flightclub.io/result/3d?code=" + data[0].code
              });
            }
          });
        }

        await getJSON(
          "https://www.reddit.com/r/" +
          (launch.agency.social.reddit || sources.norminal.reddit) +
          "/search.json?sort=relevance&restrict_sr=on&q=" + encodeURIComponent(launch.mission)
        ).then(r => {
          if (r && r.data) {
            for (var q in r.data.children) {
              if (
                !(
                  r.data.children[q].data.created_utc * 1000 <
                  Date.parse(launch.windowend)
                ) &&
                launch.statuscode == 3
              ) {
                continue;
              }
              if (r.data.children[q].data.num_comments > 0) {
                launch.media.comments.push({
                  name: "[Reddit] &nbsp; &nbsp; " + r.data.children[q].data.title,
                  embed: "https://reddit-stream.com/comments/" +
                    r.data.children[q].data.id,
                  share: "https://reddit.com/comments/" + r.data.children[q].data.id
                });
              }
              if (!r.data.children[q].data.is_self) {
                addSource(launch,
                  r.data.children[q].data.title,
                  r.data.children[q].data.url
                );
              }
            }
          }
        });

        if (launch.vidURLs.length) {
          launch.vidURLs.reverse();
          for (var v in launch.vidURLs) {
            var url = launch.vidURLs[v];
            if (url.split("?v=")[1] != undefined) {
              launch.media.video.unshift({
                name: "YouTube feed #" + v,
                embed: "https://www.youtube.com/embed/" +
                  url.split("?v=")[1] +
                  "?rel=0&autoplay=1",
                share: "https://www.youtube.com/watch?v=" + url.split("?v=")[1]
              });
            } else if (
              !url.match("/c/") &&
              !url.match("/user/") &&
              !url.match("/channel/")
            ) {
              addSource(launch, url.split("://")[1].split("/")[0], url);
            }
          }
        }


        if ([3, 4, 7].indexOf(launch.statuscode) == -1 && launch.tolaunch > 0) {
          if (launch.location.countryCode == "USA") {

            await getJSON("https://forecast.weather.gov/MapClick.php?unit=1&lat=" + launch.location.pads[0].latitude + "&lon=" + launch.location.pads[0].longitude + "&FcstType=json").then(r => {
              if (r && r.currentobservation && r.currentobservation.name) {
                launch.media.comments.push({
                  name: "[Weather] " + r.currentobservation.name + " weather forecast",
                  embed: "https://forecast.weather.gov/MapClick.php?lat=" + launch.location.pads[0].latitude + "&lon=" + launch.location.pads[0].longitude,
                  share: "https://forecast.weather.gov/MapClick.php?lat=" + launch.location.pads[0].latitude + "&lon=" + launch.location.pads[0].longitude
                });
                launch.media.comments.push({
                  name: "[Weather] " + r.currentobservation.name + " radar imagery",
                  embed: "https://radar.weather.gov/lite/N0R/" + r.location.radar.split("K")[1] + "_loop.gif",
                  share: r.credit
                });
              }
            })
          }
        }
      }

      if (format.match("stats")) {
        data.stats = data.stats || {};
        data.stats.byStatus = data.stats.byStatus || {};
        data.stats.byStatus[launch.statuscode] =
          data.stats.byStatus[launch.statuscode] || [];
        data.stats.byStatus[launch.statuscode].push(launch.id);
        data.stats.byYear = data.stats.byYear || {};

        data.rockets = data.rockets || [];
        var rocket = launch.name.split(" |")[0].replace("(?)", "");

        if (
          !data.rockets.find(function (a) {
            if (typeof a == "object") {
              return a.name.match(rocket);
            } else {
              return a.match(rocket);
            }
          }) ||
          0
        ) {
          data.rockets.push(launch.rocket || launch.name.split(" |")[0]);
        }

        //BUG: NIE MAM POJĘCIA JAK TO DZIAŁA
        var b = new Date(launch.net);
        if (!data.stats.byYear[b.getUTCFullYear()]) {
          for (
            i = b.getUTCFullYear(); i < new Date().getUTCFullYear() + 1; i++
          ) {
            data.stats.byYear[i] = data.stats.byYear[i] || {
              "1": 0,
              "2": 0,
              "3": 0,
              "4": 0
            };
            if (i == b.getUTCFullYear()) {
              data.stats.byYear[b.getUTCFullYear()][launch.statuscode]++;
            }
          }
        } else {
          data.stats.byYear[b.getUTCFullYear()][launch.statuscode]++;
        }
      }

      if (launch.tolaunch < 86400 && launch.tolaunch > -86400) {
        //10 minutes
        data.expire = Date.now() + 10 * 60 * 1000;
        if (launch.tolaunch < 3600 && launch.tolaunch > -3600) {
          //1 minute
          data.expire = Date.now() + 60 * 1000;
        }
      }
      if (query.match("/next/")) {
        data.expire = Date.now() + 60 * 1000;
      }
    }

    if (envargs.indexOf("dev") == -1) storage.put(query, data);
    callback(data);
    return data;
  } catch (error) {
    console.log(error);
  }
}


async function addSource(launch, name, url, fallback) {
  url = (url || "").replace("http://", "https://");

  if (url.match(".reddit.com/r/")) {
    launch.media.comments.push({
      name: "[Reddit] &nbsp; &nbsp; " + name,
      embed: "https://reddit-stream.com/comments/" +
        (url.split("/comments/")[1] || url),
      share: "https://reddit.com/comments/" +
        (url.split("/comments/")[1] || url)
    });
  } else {
    if (url.match("reddit.com/live/")) {
      launch.media.comments.push({
        name: "[Reddit] &nbsp; &nbsp; " + name,
        embed: "https://www.redditmedia.com/live/" +
          url.split("reddit.com/live/")[1].split("/")[0] +
          "/embed",
        share: url
      });
    } else {
      if (
        url.match("youtube.com") ||
        url.match("livestream.com") ||
        url.match("dailymotion.com") ||
        (url.match("streamable.com") &&
          !url.match("streamable.com/s/")) ||
        url.match(".mp4")
      ) {
        launch.media.video.unshift({
          name: "[YouTube] " + name,
          embed: url
            .replace("/watch?v=", "/embed/")
            .replace("youtu.be/", "youtube.com/embed/")
            .replace(
              "www.dailymotion.com/video/",
              "www.dailymotion.com/embed/video/"
            )
            .replace("streamable.com/", "streamable.com/s/")
            .split("&")[0],
          share: url
        });
      } else {
        if (url.match("imgur.com")) {
          launch.media.photo.push({
            name: "[Imgur] &nbsp; &nbsp; " + name,
            embed: "https://imgur.com/" +
              url
                .match(
                  /(https?:\/\/(?:i\.|)imgur\.com(?:\/(?:a|gallery)|)\/(.*?)(?:[#\/].*|$))/
                )[2]
                .split(".")[0] +
              "/embed",
            share: url
          });
        } else {
          if (url.match(".mp3")) {
            launch.media.audio.push({
              name: name,
              embed: url
            });
          } else {
            if (url.match(".twitter.com/")) {
              if (
                !url.match("/status/") && [3, 4, 7].indexOf(launch.statuscode) == -1
              ) {
                launch.media.twitter.push({
                  name: name || "Twitter",
                  url: url
                });
              } else {
                launch.media.tweets.push({
                  name: "[Tweet] &nbsp; &nbsp; " + name,
                  embed: "https://projects.yasiu.pl/twitterembed/?url=" +
                    url,
                  share: url
                });
              }
            } else {
              if (url.match("archive.org/details/")) {
                launch.media.video.push({
                  name: "[Video]  WebArchive.org footage",
                  embed: url.replace(
                    "archive.org/details/",
                    "archive.org/embed/"
                  ),
                  share: url
                });
              } else if(typeof fallback === "function") fallback();
            }
          }
        }
      }
    }
  }
};

module.exports = loadQuery;