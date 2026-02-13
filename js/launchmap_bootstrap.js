import { renderLaunchMap } from "./launchmap.js";

renderLaunchMap({
  containerSelector: "#launchmap",
  dropdownSelector: "#continent",
  csvPath: "data/satcat_with_continent.csv",
  worldTopoPath: "data/land-110m.json",
  defaultContinent: "Asia",
});
