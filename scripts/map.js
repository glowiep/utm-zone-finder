$(document).ready(function() {
  let latitude = 0;
  let longitude = 0;
  let description = '';

  // This sets up the leafmap object
  const map = L.map('map').setView([latitude, longitude], 0);
  
  // Add MapTiler
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 29,
    minZoom: 2,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    crossOrigin: true
  }).addTo(map);

  // Will bounce back when scrolling off the map
  map.setMaxBounds([[-90,-180], [90,180]]);

  // Add zoom control with your options
  map.zoomControl.setPosition('topright');

  // Add scale bar
  L.control.scale().addTo(map);

  // create the geocoding control and add it to the map
  const searchControl = L.esri.Geocoding.geosearch({
    useMapBounds: false,
    expanded: true,
    zoomToResult: false,
    position: 'topleft',
    collapseAfterResult: true,
    placeholder: 'Search Address or Place'
  }).addTo(map);


  /**
   * Determines if a point falls within a UTM zone polygon.
   * Sets the UTM Zone found for the point as determinedUTMZone.
   * @returns {string} This function returns the determinedUTMZone for the point.
   */
  const isMarkerInsidePolygon = function() {
    // Creates a Point Feature from a Position.
    const pt = turf.point([longitude, latitude]);
    UTMZones.features.forEach(currentUTMZonePoly => {
      // multiPolygon - Creates a Feature based on a coordinate array
      poly = turf.multiPolygon(currentUTMZonePoly.geometry.coordinates);

      // Takes a Point and a Polygon or MultiPolygon and determines if the point resides inside the polygon.
      const found = turf.booleanPointInPolygon(pt, poly);
      
      if (found) {
        return determinedUTMZone = currentUTMZonePoly.properties.UTMZone;
      }
    });
  };
  isMarkerInsidePolygon();

  // Initialize lastClickedPoly layer
  let lastClickedPoly = null;

  /**
   * Highlight feature on map when clicked.
   * @param { event } e
   */
  const highlightFeature = function(e) {
    const layer = e.target;

    layer.setStyle({
      weight: 5,
      color: '#2DFDFF',
      fillOpacity: 0.25
    });

    layer.bringToFront();

    if (lastClickedPoly && lastClickedPoly.feature.properties.UTMZone != layer.feature.properties.UTMZone) {
      geojson.resetStyle(lastClickedPoly);
    }

    lastClickedPoly = layer;
  };


  /**
   * The style option to style all polygons the same way
   * @param {object} feature
   * @returns Polygon features with the defined style options.
   */
  const styler = function(feature) {
    return {
      fillColor: 'light blue',
      weight: 0.5,
      opacity: 1,
      color: 'black',
      fillOpacity: 0.25
    };
  };


  /**
   * The onEachFeature option is a function that gets called on each feature before adding it to a GeoJSON layer.
   * A common reason to use this option is to attach a popup to features when they are clicked.
   * @param {Polygon} feature
   * @param {} layer
   */
  const onEachFeature = function(feature, layer) {
    layer.on({
      click: highlightFeature
    });
    if (feature.properties) {
      layer.bindPopup('UTM Zone: ' + feature.properties.UTMZone);
    }
  };
  

  /* GeoJSON objects are added to the map via a GeoJSON layer */
  let geojson = L.geoJson(UTMZones, {
    style: styler,
    onEachFeature: onEachFeature
  }).addTo(map);


  // Empty layer group to store results
  let results = L.layerGroup().addTo(map);


  // Listen for the results event and add every result to the map
  searchControl.on("results", function(data) {
    console.log(data);
    for (let i = data.results.length - 1; i >= 0; i--) {
      description = data.results[i].properties.LongLabel;
      longitude = data.results[i].properties.DisplayX;
      latitude = data.results[i].properties.DisplayY;
      isMarkerInsidePolygon();
      markers = L.marker([latitude, longitude]).addTo(results)
        .bindPopup(description + '<br><br>UTM Zone: ' + determinedUTMZone, { autoClose: false })
        .openPopup();
    }
  });


  // Clear selected features on map
  $("#clearAllButton").on("click", function() {
    results.clearLayers();
    map.closePopup();
    geojson.resetStyle();
    map.setView([0, 0], 2);
    map.fitBounds(bounds);
  });
 

  // Focus map on UTMZones feature upon refresh
  const bounds = geojson.getBounds();
  map.fitBounds(bounds);
});