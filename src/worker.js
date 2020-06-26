var RocketWatch = require('./server.js');
//var Notify = require('./notifications.js');

console.log("Worker initiated @ " + Date.now());


//every minute
setInterval(function () {
  console.log("1 minute loop");
  loadPrimary();
}, 2 * 60 * 1000);

//every ten minutes
setInterval(function () {

  console.log("10 minute loop");
  loadSecondary();

}, 10 * 60 * 1000);

function loadPrimary() {
  try {
    RocketWatch.loadQuery("/launch/next/4?status=1,2,5,6", function (next) {
      for (var i in next.launches) {
        //cache next 3 launches and notify if needed
        RocketWatch.loadQuery("/launch?mode=verbose&id=" + next.launches[i].id + "&format=live");
      }
    })
    RocketWatch.loadQuery("/launch?limit=4&sort=desc&mode=summary&status=3,4,7", function (prev) {
      for (var i in prev.launches) {
        RocketWatch.loadQuery("/launch?mode=verbose&id=" + prev.launches[i].id + "&format=live");
      }
    });
  } catch (e) {
    console.log(e);
  }
  console.log("primary");
}

function loadSecondary() {
  try {
    RocketWatch.loadQuery("/agency/121?mode=verbose&format=news");
    RocketWatch.loadQuery("/launch?limit=200&mode=summary&sort=desc&name=&lsp=121&format=stats", function (d) {
      for (var i in d.launches) {
        RocketWatch.loadQuery("/launch?mode=verbose&id=" + d.launches[i].id + "&format=live");
      }
    });
    RocketWatch.loadQuery("/agency/124?mode=verbose&format=news");
    RocketWatch.loadQuery("/launch?limit=200&mode=summary&sort=desc&name=&lsp=124&format=stats", function (d) {
      for (var i in d.launches) {
        RocketWatch.loadQuery("/launch?mode=verbose&id=" + d.launches[i].id + "&format=live");
      }
    });
    RocketWatch.loadQuery("/agency/115?mode=verbose&format=news");
    RocketWatch.loadQuery("/launch?limit=200&mode=summary&sort=desc&name=&lsp=115&format=stats", function (d) {
      for (var i in d.launches) {
        RocketWatch.loadQuery("/launch?mode=verbose&id=" + d.launches[i].id + "&format=live");
      }
    });
    RocketWatch.loadQuery("/agency/63?mode=verbose&format=news");
    RocketWatch.loadQuery("/launch?limit=200&mode=summary&sort=desc&name=&lsp=63&format=stats", function (d) {
      for (var i in d.launches) {
        RocketWatch.loadQuery("/launch?mode=verbose&id=" + d.launches[i].id + "&format=live");
      }
    });

    RocketWatch.loadQuery("/agency?limit=30&islsp=1&offset=0", function (d) {
      for (i = 1; (30 * i) - d.total < 30; i++) {
        RocketWatch.loadQuery("/agency?limit=30&islsp=1&offset=" + (i * 30), function (c) {
          for (var j in c.agencies) {
            RocketWatch.loadQuery("/agency/" + c.agencies[j].id + "?format=news");
          }
        });
      }
      for (var i in d.agencies) {
        RocketWatch.loadQuery("/agency/" + d.agencies[i].id + "?format=news");
      }
    });

    RocketWatch.loadQuery("/agency?limit=30&mode=verbose&islsp=1&offset=0", function (d) {
      for (i = 1; (30 * i) - d.total < 30; i++) {
        RocketWatch.loadQuery("/agency?limit=30&mode=verbose&islsp=1&offset=" + (i * 30), function (c) {
          for (var j in c.agencies) {
            RocketWatch.loadQuery("/agency/" + c.agencies[j].id + "?format=news");
          }
        });
      }
      for (var i in d.agencies) {
        RocketWatch.loadQuery("/agency/" + d.agencies[i].id + "?format=news");
      }
    });

    RocketWatch.loadQuery("/rocket?mode=verbose&limit=27&offset=0", function (d) {
      for (i = 1; (30 * i) - d.total < 30; i++) {
        RocketWatch.loadQuery("/rocket?mode=verbose&limit=27&offset=" + (i * 30), function (c) {
          for (var j in c.rockets) {
            RocketWatch.loadQuery("/rocket/" + c.rockets[j].id + "?mode=verbose");
          }
        });
      }
      for (var i in d.rockets) {
        RocketWatch.loadQuery("/rocket/" + d.rockets[i].id);
      }
    });
  } catch (e) {
    console.log(e)
  }
  console.log("secondary");
}