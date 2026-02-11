import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const width = 600;
const height = 600;
const center = { x: width / 2, y: height / 2 };
const earthRadiusPx = 40;

const numBins = 900; 

const svg = d3.select("#orbitdensity")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background", "black");

const rScale = d3.scalePow().exponent(0.45)
    .domain([0, 40000])
    .range([earthRadiusPx, (width / 2) - 50]);

d3.tsv("data/satcat.tsv").then(rawData => {
    const altitudes = rawData
        .map(d => +d.Altitude || +d.Perigee || 0)
        .filter(alt => alt > 0);

    const binGenerator = d3.bin()
        .domain(rScale.domain())
        .thresholds(numBins);

    const bins = binGenerator(altitudes);

    const color = d3.scaleSequential(d3.interpolateInferno)
    .domain([0, Math.log10(d3.max(bins, d => d.length / (d.x1 - d.x0) + 1))]);

    const arcGenerator = d3.arc()
        .startAngle(0)
        .endAngle(2 * Math.PI);

    const ringGroup = svg.append("g")
        .attr("transform", `translate(${center.x}, ${center.y})`);

    ringGroup.selectAll("path")
        .data(bins)
        .enter()
        .append("path")
        .attr("d", d => arcGenerator({
            innerRadius: rScale(d.x0),
            outerRadius: rScale(d.x1)
        }))
        .attr("fill", d => color(Math.log10((d.length / (d.x1 - d.x0)) + 1)))
        .attr("stroke", d => color(d.length / (d.x1 - d.x0)))
        .attr("stroke-width", d => d.x0 > 30000 ? 2 : 0.5)
        .attr("stroke-linejoin", "round");

    const filter = svg.append("defs")
        .append("filter")
        .attr("id", "blur");
    filter.append("feGaussianBlur")
        .attr("stdDeviation", "0.5");

    ringGroup.attr("filter", "url(#blur)");

    svg.append("circle")
        .attr("cx", center.x).attr("cy", center.y).attr("r", earthRadiusPx)
        .attr("fill", "#5384c3ff")

    const axisScale = d3.axisLeft(rScale)
        .ticks(6)
        .tickFormat(d => d === 0 ? "" : `${d} km`)
        .tickSize(4);

    const axisGroup = svg.append("g")
        .attr("class", "altitude-axis")
        .attr("transform", `translate(${center.x}, ${center.y}) rotate(0)`)
        .call(axisScale);

    axisGroup.select(".domain")
        .attr("stroke", "#666");

    axisGroup.selectAll("line")
        .attr("stroke", "#666");

    axisGroup.selectAll("text")
        .attr("fill", "#aaa")
        .attr("font-size", "11px")
        .attr("font-family", "monospace");

}).catch(err => console.error(err));
