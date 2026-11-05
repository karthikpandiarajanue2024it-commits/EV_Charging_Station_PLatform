const fetch = require('node-fetch'); // or use native fetch if node 18+
const body = `
[out:json];
area["name"="Tamil Nadu"]->.searchArea;
node["amenity"="charging_station"](area.searchArea);
out;
`;

fetch('https://overpass-api.de/api/interpreter', { 
  method: 'POST', 
  body: body 
})
.then(r => r.json())
.then(d => {
  console.log(d.elements.length + ' stations found');
  const fs = require('fs');
  fs.writeFileSync('osm_stations.json', JSON.stringify(d.elements, null, 2));
})
.catch(e => console.error(e));
