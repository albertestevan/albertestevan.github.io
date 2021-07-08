let FAClient = null;
let map = null;
let infoWindow = null;
let markers = [];
let searchResultsMarkers = [];
let currentSearchIndex = null;

const SERVICE = {
  name: "FreeAgentService",
  appletId: `aHR0cHM6Ly9hbGJlcnRlc3RldmFuLmdpdGh1Yi5pby8=`,
  googleKey: "AIzaSyATIFag-8_neL5KSwtuoRVwFb8wmaK2UBA",
};

const MAP_DEFAULT = {
  zoom: 5,
  minZoom: 2,
  center: { lat: 36.778259, lng: -119.417931 },
  mapTypeControl: false,
  streetViewControl: false,
};

var form = document.getElementById("form");
form.addEventListener("submit", searchMap);

// Initialize FAAppletClient
async function startupService() {
  FAClient = new FAAppletClient({
    appletId: SERVICE.appletId,
  });
}

// Get all customers from the customers app
function getAllCustomers() {
  return new Promise((resolve, reject) => {
    let customerInfo = {
      entity: "customer",
    };

    FAClient.listEntityValues(customerInfo, (customers) => {
      let allCust = [];
      customers.forEach((customer) => {
        allCust.push({
          id: customer.id,
          name: customer.field_values.customer_field0.value,
          location: customer.field_values.customer_field1.value,
        });
      });
      resolve(allCust);
    });
  });
}

// Get a customer's latitude and longitude coordinates from location string using Google Geocoding API
function getCustomerLatLng(customer) {
  return new Promise((resolve, reject) => {
    fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${customer.location.replace(
        /\s/g,
        "+"
      )}&key=${SERVICE.googleKey}`
    )
      .then((response) => response.json())
      .then((data) => {
        customer["position"] = data.results[0].geometry.location;
        resolve(customer);
      });
  });
}

// Get all customer's latitude and longitude coordinates from location string
async function getCustomersLatLng(allCust) {
  promises = [];
  allCust.forEach((c) => {
    promises.push(getCustomerLatLng(c));
  });
  return await Promise.all(promises);
}

// Initialize and app and add markers for all customers
async function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: MAP_DEFAULT.zoom,
    minZoom: MAP_DEFAULT.minZoom,
    center: MAP_DEFAULT.center,
    mapTypeControl: MAP_DEFAULT.mapTypeControl,
    streetViewControl: MAP_DEFAULT.streetViewControl,
  });

  let allCustomers = await getAllCustomers();
  allCustomers = await getCustomersLatLng(allCustomers);

  // Create an info window to share between markers.
  infoWindow = new google.maps.InfoWindow();

  allCustomers.forEach(({ id, name, location, position }, i) => {
    const marker = new google.maps.Marker({
      position,
      map,
      title: name,
      optimized: false,
    });
    // Add a click listener for each marker, and set up the info window and navigation.
    marker.addListener("click", () => {
      infoWindow.close();
      infoWindow.setContent(marker.getTitle());
      infoWindow.open(marker.getMap(), marker);

      FAClient.navigateTo(`/customer/view/${id}`);
    });

    //add the markers to an array
    markers.push(marker);
  });
}

//search functionality in maps applet
function searchMap(event) {
  event.preventDefault();
  const inputName = document.getElementById("name").value;

  //check if input is empty or only contains whitespace
  if (
    inputName == null ||
    inputName.replace(/^\s+/, "").replace(/\s+$/, "") === ""
  ) {
    return;
  }
  let isFound = false;
  searchResultsMarkers = [];
  infoWindow.close();

  //iterate the markers to search
  markers.forEach((marker, i) => {
    if (marker.getTitle().toLowerCase().includes(inputName.toLowerCase())) {
      if (!isFound) {
        infoWindow.close();
        infoWindow.setContent(marker.getTitle());
        infoWindow.open(marker.getMap(), marker);

        map.setCenter(marker.position);
        map.setZoom(12);
        isFound = true;
      }
      searchResultsMarkers.push(marker);
    }
  });
  currentSearchIndex = 0;

  //display error
  if (!isFound) {
    document.getElementById("error").style.display = "block";
    document.getElementById("resultsCount").innerHTML = ``;
  }
  //display count element
  else {
    document.getElementById("error").style.display = "none";
    document.getElementById(
      "resultsCount"
    ).innerHTML = `1 of ${searchResultsMarkers.length} Results`;
  }

  //display prev next buttons if multiple results exists
  searchResultsMarkers.length > 1
    ? (document.getElementById("prevNextButtons").style.display = "flex")
    : (document.getElementById("prevNextButtons").style.display = "none");
}

//prev button handler
function prev() {
  if (currentSearchIndex - 1 >= 0) {
    let marker = searchResultsMarkers[currentSearchIndex - 1];
    infoWindow.close();
    infoWindow.setContent(marker.getTitle());
    infoWindow.open(marker.getMap(), marker);
    currentSearchIndex -= 1;
    document.getElementById("resultsCount").innerHTML = `${
      currentSearchIndex + 1
    } of ${searchResultsMarkers.length} Results`;
  }
}

//next button handler
function next() {
  if (currentSearchIndex + 1 < searchResultsMarkers.length) {
    let marker = searchResultsMarkers[currentSearchIndex + 1];
    infoWindow.close();
    infoWindow.setContent(marker.getTitle());
    infoWindow.open(marker.getMap(), marker);
    currentSearchIndex += 1;
    document.getElementById("resultsCount").innerHTML = `${
      currentSearchIndex + 1
    } of ${searchResultsMarkers.length} Results`;
  }
}
