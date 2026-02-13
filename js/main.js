import { renderLaunchMap } from "./launchmap.js";
//for launchmap
renderLaunchMap({
  containerSelector: "#launchmap",
  dropdownSelector: "#continent",
  csvPath: "data/satcat_with_continent.csv",
  worldTopoPath: "data/land-110m.json",
  defaultContinent: "Asia",
});
