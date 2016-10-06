var DividingRow = "Referenced Dates";
var Months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function OrSpace(s)
{
  if (s) return s;
  return "&nbsp;";
}

function AsArray(names)
{
  var re = /\s*,\s*/;
  return names.split(re);
}

function ItemAndEffort(name)
{
  var start = name.search("\\(");
  if (start < 0) return [name,0];
  var item = name.substr(0,start);
  var num = parseInt(name.substr(start+1, name.search("\\)")-start-1));
  return [item, num];
}

function PersonAndItem(name)
{
  var start = name.search("\\(");
  if (start < 0) return [name, ""];
  var people = name.substr(0,start);
  var item = name.substr(start+1, name.search("\\)")-start-1);
  return [people, item];
}

function FromPlanAndPeople(name)
{
  var where = name.search("\\): ");
  if (where < 0) return [what];
  where += 3;
  return AsArray(name.substr(where, name.length-where));
}

function DateFromString(s)
{
  var d;
  if (s) {
    d = new Date(s);
  } else {
    d = new Date();
  }
  return d;
}

function ForDate(s)
{
  if (!s) return "--";
  return s;
}

function GetValue(where, what, instead)
{
  if (where && what in where) {
    return where[what].$t;
  }
  return instead;
}

function GetStr(where, what)
{
  if (where && what in where) {
    return where[what].$t;
  }
  return "";
}

function GetInt(where, what)
{
  var s = GetStr(where, what);
  if (!s) return 0;
  return parseInt(s);
}

function ExtractData(entries)
{
  var extracted = {};
  extracted["status"] = 0;
  extracted["description"] = "";
  
  var r, c, i;

  // All the things to collect
  var projects = [];
  var actuals = {};
  var originals = {};
  var maximums = {};
  
  var dates = [];
  var actualsDates = {};
  var originalsDates = {};
  var maximumsDates = {};
  
  var extractingProjects = true;
  for (r=0; r<entries.length; r++) {
    var en = entries[r];
    var what = GetStr(en, "gsx$overall");
    if (what == DividingRow) {
      extractingProjects = false;
      continue;
    }

    if (extractingProjects) {
      projects.push(what);
      originals[what] = [GetInt(en,"gsx$plan-span"),
                         GetStr(en,"gsx$plan-from"),
                         GetStr(en,"gsx$plan-to"),
                         GetInt(en,"gsx$plan-effort"),
                         GetStr(en,"gsx$plan-people")];
      maximums[what] = [GetInt(en,"gsx$max-span"),
                        GetStr(en,"gsx$max-from"),
                        GetStr(en,"gsx$max-to"),
                        GetInt(en,"gsx$max-effort"),
                        GetStr(en,"gsx$max-people")];
      actuals[what] = [GetInt(en,"gsx$actual-span"),
                       GetStr(en,"gsx$actual-from"),
                       GetStr(en,"gsx$actual-to"),
                       GetInt(en,"gsx$actual-effort"),
                       GetStr(en,"gsx$actual-people")];
    } else {
      dates.push(what);
      // This is how the columns align.  The actual values we want are
      // Plan-#, Plan-Items and Plan-People
      originalsDates[what] = [GetInt(en,"gsx$plan-from"),
                              GetStr(en,"gsx$plan-to"),
                              GetStr(en,"gsx$plan-people")];
      maximumsDates[what] = [GetInt(en,"gsx$max-from"),
                             GetStr(en,"gsx$max-to"),
                             GetStr(en,"gsx$max-people")];
      actualsDates[what] = [GetInt(en,"gsx$actual-from"),
                            GetStr(en,"gsx$actual-to"),
                            GetStr(en,"gsx$actual-people")];
    }
  }

  extracted["projects"] = projects;
  extracted["description"] = actuals.length;
  extracted["actuals"] = actuals;
  extracted["originals"] = originals;
  extracted["maximums"] = maximums;
  extracted["dates"] = dates;
  extracted["actualsDates"] = actualsDates;
  extracted["originalsDates"] = originalsDates;
  extracted["maximumsDates"] = maximumsDates;

  return extracted;  
}

function FindPeople(extracted)
{
  var mx = extracted["maximums"];
  var names = [];
  for (i=0; i<extracted["projects"].length; i++) {
    names = names.concat(names, FromPlanAndPeople(mx[extracted["projects"][i]][4]));
  }
  var ns = new Set(names);
  return [...ns].sort();
}

function GetOverview(extracted)
{
  var overview = "";
  var i;
  
  overview = "<table id=\"ProjectTable\">";
  overview += "<thead><tr>";
  overview += "<th>Project</th>";
  overview += "<th>Status</th>";
  overview += "<th>Effort<span class=\"Noted\"><br>(ideal/conservative)</span></th>";
  overview += "<th>Start Date<span class=\"Noted\"><br>(ideal/conservative)</span></th>";
  overview += "<th>Engineers<span class=\"Noted\"><br>(actual)</span></th>";
  overview += "<th>Overall<span class=\"Noted\"><br>(ideal)</span></th>";
  overview += "<th>Span<span class=\"Noted\"><br>(ideal/conservative)</span></th>";
  overview += "</tr></thead>";
  overview += "<tbody>";

  for (i=0; i<extracted["projects"].length; i++) {
    var p = extracted["projects"][i];
    var originals = extracted["originals"][p];
    var maximums = extracted["maximums"][p];
    var actuals = extracted["actuals"][p];
    
    overview += "<tr>";
    overview += "<td data-label=\"Project\" class=\"Projects\">" + p + "</td>";
    if (actuals[3] > 0) {
      if (actuals[3] > originals[3]) {
        if (actuals[3] > maximums[3]) {
          overview += "<td data-label=Status>" + "started, over max plan" + "</td>";
        } else {
          overview += "<td data-label=Status>" + "started, over plan, under max" + "</td>";
        }
      } else {
        overview += "<td data-label=Status>" + "started, on plan" + "</td>";
      }
    } else {
      overview += "<td data-label=Status>" + "not started" + "</td>";
    }
    overview += "<td data-label=\"Effort\">" + actuals[3] + "w (" +
    originals[3] + "/" + maximums[3] + ")</td>";

    overview += "<td data-label=\"Start Date\">" + ForDate(actuals[1]);
    if (actuals[1] != originals[1]) {
      overview += " (" + ForDate(originals[1]);
      if (originals[1] != maximums[1]) {
        overview += "/" + ForDate(maximums[1]);
      }
      overview += ")";
    }
    overview +="</td>";
    overview += "<td data-label=\"Engineers\">" + OrSpace(actuals[4]) + "</td>";
    overview += "<td data-label=\"Overall\">" + OrSpace(originals[4]) + "</td>";
    overview += "<td data-label=\"Span\">";
    var ss = originals[1];
    overview += ss.substring(0,3) + ss.substring(ss.search(",")+1,14) + " - ";
    ss = originals[2];
    overview += ss.substring(0,3) + ss.substring(ss.search(",")+1,14);
    overview += " / ";
    ss = maximums[1];
    overview += ss.substring(0,3) + ss.substring(ss.search(",")+1,14) + " - ";
    ss = maximums[2];
    overview += ss.substring(0,3) + ss.substring(ss.search(",")+1,14);
    overview += "</td>";
    overview += "</tr>";
    
  }
  overview += "</tbody></table>";

  return overview;
}

function SingleCalendar(gridNames, grid, extracted, where, maxIndex, singleItem, singlePerson)
{
  var calendar = "<table id=\"CalendarTable\">";
  for (i=0; i<grid.length; i++) {
    if (i % 3 == 0) {
      if (i > 0) {
        if (i > maxIndex) break;
        calendar += "</tr>";
      }
      calendar += "<tr>";
    }
    var itemsM = {};
    var itemsA = [];
    var peopleM = {};
    var peopleA = [];
    var effort = 0;
    for (j=0; j<grid[i].length; j++) {
      var ad = grid[i][j];
      if (singleItem && (extracted[where][ad][1].search(singleItem) < 0)) continue;
      if (singlePerson && (extracted[where][ad][2].search(singlePerson) < 0)) continue;
      var items = AsArray(extracted[where][ad][1]);
      
      effort += extracted[where][ad][0];

      for (k=0; k<items.length; k++) {
        var ie = ItemAndEffort(items[k]);
        if (ie[0] && (!singleItem || singleItem == ie[0])) {
          if (!(ie[0] in itemsM)) {
            if (singlePerson) {
              itemsM[ie[0]] = 1;
            } else {
              itemsM[ie[0]] = ie[1];
            }
            itemsA.push(ie[0]);
          } else {
            if (singlePerson) {
              itemsM[ie[0]] ++;
            } else {
              itemsM[ie[0]] += ie[1];
            }
          }
        }
      }
      
      var people = AsArray(extracted[where][ad][2]);
      for (k=0; k<people.length; k++) {
        var pai = PersonAndItem(people[k]);
        if (pai[0] && (!singlePerson || singlePerson == pai[0])) {
          if (!(pai[0] in peopleM)) {
            peopleM[pai[0]] = [];
            peopleA.push(pai[0]);
          }
          peopleM[pai[0]].push(pai[1]);
        }
      }
    }

    for (k in peopleM) {
      var ns = new Set(peopleM[k]);
      peopleM[k] = [...ns].sort();
      if (singleItem) {
        peopleM[k] = peopleM[k].filter(function(el,i,a) {return (el == singleItem);});
      }
    }
 
    if (singlePerson && singlePerson in peopleM) {
      effort = 0;
      //for (k=0; k<peopleM[singlePerson].length; k++) {
      //  effort += itemsM[peopleM[singlePerson][k]];
      //}
    } else if (singleItem && singleItem in itemsM) {
      effort = itemsM[singleItem];
    }

 
    calendar += "<td>" + "<span class=\"CalendarQ\">" + gridNames[i];
    if (effort) {
      calendar += " (" + effort + "w)";
    }
    calendar += "</span>";

    if (!singleItem && !singlePerson) {
      calendar += "<br><span class=\"CalendarItems\">";
      //itemsA.sort();
      for (k=0; k<itemsA.length; k++) {
        if (k > 0) {
          calendar += ", ";
        }
        calendar += itemsA[k] + "&nbsp;(" + itemsM[itemsA[k]] + "w)";
      }
      calendar += "</span>";
    }

    calendar += "<br><span class=\"CalendarPeople\">";
    peopleA.sort();
    var first = true;
    for (k=0; k<peopleA.length; k++) {
      if (peopleM[peopleA[k]].length <= 0) continue;
      if (!first) {
        calendar += ", ";
      }
      first = false;
      if (singlePerson) {
        calendar += peopleM[peopleA[k]].join([separator = ', ']);
      } else {
        calendar += peopleA[k];
        if (!singleItem) {
          calendar += "&nbsp;(" + peopleM[peopleA[k]].join([separator = ', ']) + ")";
        }
      }
    }
    calendar += "</span>";
    calendar += "</td>";
  }
  if (i % 3 == 0) {
    calendar += "</tr>";
  }
  calendar += "</table>";
  return calendar;
}

function GetGridStuff(extracted)
{
  var i, j, k;
  var calendar = "";
  // 0 is July 2016
  var gridNames = [];
  for (i=6; i<12; i++) {
    gridNames.push("2016Q" + Math.ceil((i+1)/3) + " - " + Months[i]);
  }
  for (j=2017; j<2020; j++) {
    for (i=0; i<12; i++) {
      gridNames.push(j + "Q" + Math.ceil((i+1)/3) + " - " + Months[i]);
    }
  }
  var grid = [[],[],[], [],[],[],   [],[],[], [],[],[], [],[],[], [],[],[],   [],[],[], [],[],[], [],[],[], [],[],[],  [],[],[], [],[],[], [],[],[], [],[],[]];
  
  var maxIndex = -1;
  for (i=0; i<extracted["dates"].length; i++) {
    var ad = extracted["dates"][i];
    var d = DateFromString(ad);
    var index = -1;
    if (d.getFullYear() < 2017) {
      index = d.getMonth() - 6;
    } else {
      index = 6 + 12*(d.getFullYear() - 2017) + d.getMonth();
    }
    if (index >= 0 && index < grid.length) {
      grid[index].push(ad);
      if (index > maxIndex) {
        maxIndex = index;
      }
    }
  }
  return [grid, gridNames, maxIndex];
}

function GetCalendar(extracted, gridStuff, asSingleItems, asIndividuals)
{
  var i, j, k;
  var calendar = "";
  // 0 is July 2016
  
  var grid = gridStuff[0];
  var gridNames = gridStuff[1];
  var maxIndex = gridStuff[2];

  if (asIndividuals) {
    var people = FindPeople(extracted);
    for (i=0; i<people.length; i++) {
      var p = people[i];
      calendar += "<table id=\"ProjectTable\"><tr>";

      calendar += "<th width=\"34%\">" + p + "<span class=\"LargerNoted\"> (actual)</span></th>";
      calendar += "<th width=\"33%\">" + p + "<span class=\"LargerNoted\"> (ideal)</span></th>";
      calendar += "<th width=\"33%\">" + p + "<span class=\"LargerNoted\"> (conservative)</span></th></tr>";

      calendar += "<td>" + SingleCalendar(gridNames, grid, extracted, "actualsDates", maxIndex, "", p) + "</td>";
      calendar += "<td>" + SingleCalendar(gridNames, grid, extracted, "originalsDates", maxIndex, "", p) + "</td>";
      calendar += "<td>" + SingleCalendar(gridNames, grid, extracted, "maximumsDates", maxIndex, "", p) + "</td>";
      calendar += "</tr></table>";
   }
  }
  else if (asSingleItems) {
    // This is really the slowest way to do this...
    for (i=0; i<extracted["projects"].length; i++) {
      var p = extracted["projects"][i];
      calendar += "<table id=\"ProjectTable\"><tr>";

      calendar += "<th width=\"34%\">" + p + "<span class=\"LargerNoted\"> (actual)</span></th>";
      calendar += "<th width=\"33%\">" + p + "<span class=\"LargerNoted\"> (ideal) ";
      var ss = extracted["originals"][p][1];
      calendar += ss.substring(0,3) + ss.substring(ss.search(",")+1,14);
      calendar += " - ";
      ss = extracted["originals"][p][2];
      calendar += ss.substring(0,3) + ss.substring(ss.search(",")+1,14);
      calendar += "</span></th>";
      calendar += "<th width=\"33%\">" + p + "<span class=\"LargerNoted\"> (conservative) ";
      ss = extracted["maximums"][p][1];
      calendar += ss.substring(0,3) + ss.substring(ss.search(",")+1,14);
      calendar += " - ";
      ss = extracted["maximums"][p][2];
      calendar += ss.substring(0,3) + ss.substring(ss.search(",")+1,14);
      calendar += "</span></th></tr>";

      calendar += "<td>" + SingleCalendar(gridNames, grid, extracted, "actualsDates", maxIndex, p, "") + "</td>";
      calendar += "<td>" + SingleCalendar(gridNames, grid, extracted, "originalsDates", maxIndex, p, "") + "</td>";
      calendar += "<td>" + SingleCalendar(gridNames, grid, extracted, "maximumsDates", maxIndex, p, "") + "</td>";
      calendar += "</tr></table>";
    }
  } else {
    calendar += "<table id=\"ProjectTable\">";
    calendar += "<tr><th width=\"34%\">Actual</th><th width=\"33%\">Ideal</th><th width=\"33%\">Conservative</th></tr>";
    calendar += "<td>" + SingleCalendar(gridNames, grid, extracted, "actualsDates", maxIndex, "", "") + "</td>";
    calendar += "<td>" + SingleCalendar(gridNames, grid, extracted, "originalsDates", maxIndex, "", "") + "</td>";
    calendar += "<td>" + SingleCalendar(gridNames, grid, extracted, "maximumsDates", maxIndex, "", "") + "</td>";
    calendar += "</tr></table>";
  }
  return calendar;
}

function PopulatePage(extracted, whereOverview, whereCalendar,
                      wherePeople, whereDetails, whereStats)
{
  var everything = {};
  if (!("status" in extracted) || (extracted["status"] < 0)) {
    if (whereStats) {
      document.getElementById("stats").innerHTML = "There was a problem, with the status " + extracted["status"] + " and " + extracted["description"];
    }
    return;
  }

  var gridStuff = GetGridStuff(extracted);
  if (whereOverview) {
    document.getElementById(whereOverview).innerHTML =
      GetOverview(extracted);
  }
  if (whereCalendar) {
    document.getElementById(whereCalendar).innerHTML =
      GetCalendar(extracted, gridStuff, false, false);
  }
  if (wherePeople) {
    document.getElementById(wherePeople).innerHTML =
      GetCalendar(extracted, gridStuff, false, true);
  }
  if (whereDetails) {
    document.getElementById(whereDetails).innerHTML =
      GetCalendar(extracted, gridStuff, true, false);
  }
  if (whereStats) {
    document.getElementById(whereStats).innerHTML = "";
  }
}

