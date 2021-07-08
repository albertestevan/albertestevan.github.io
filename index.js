let map;
let infoWindow = null;
let markers = [];
let searchResultsMarkers = [];
let currentSearchIndex = null;
let FAClient = null;

const SERVICE = {
    name: 'FreeAgentService',
    appletId: `aHR0cHM6Ly9hbGJlcnRlc3RldmFuLmdpdGh1Yi5pby8=`,
    googleKey: 'AIzaSyATIFag-8_neL5KSwtuoRVwFb8wmaK2UBA'
};
  
async function startupService() {

    FAClient = new FAAppletClient({
        appletId: SERVICE.appletId,
    });

}

function getAllCustomers() {
    return new Promise((resolve, reject) => {
        let customerInfo = {
            entity: 'customer',
        };
    
        FAClient.listEntityValues(customerInfo,(customers) => {
            console.log(customers);
    
            let allCust = []
            customers.forEach((customer) => {
                const cust = {
                    id: customer.id, 
                    name: customer.field_values.customer_field0.value, 
                    location: customer.field_values.customer_field1.value
                };
                allCust.push(cust)
            });
            resolve(allCust)
        });
    })
}


function getCustomerLatLng(customer) {
    return new Promise((resolve, reject) => {
        fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${customer.location.replace(/\s/g, '+')}&key=${SERVICE.googleKey}`)
        .then(response => response.json())
        .then(data => {
            customer["position"] = data.results[0].geometry.location
            resolve(customer)
        });
    })
}

async function getCustomersLatLng(allCust) {
        promises = []
        allCust.forEach(c => {
            promises.push(getCustomerLatLng(c))
        })
        return await Promise.all(promises)
}


// Initialize and app and add markers for all customers
async function initMap() {
    console.log("initMap")
    map = new google.maps.Map(document.getElementById("map"), {
      zoom: 5,
      minZoom: 2,
      center: { lat: 36.778259, lng: -119.417931 },
      mapTypeControl: false,
      streetViewControl: false,
    });

    let allCustomers = await getAllCustomers();
    allCustomers = await getCustomersLatLng(allCustomers)

    // Create an info window to share between markers.
    infoWindow = new google.maps.InfoWindow();
    
    allCustomers.forEach(({ id, name, location, position }, i) => {
        const marker = new google.maps.Marker({
          position,
          map,
          title: name,
          optimized: false,
        });
        // Add a click listener for each marker, and set up the info window.
        marker.addListener("click", () => {
          infoWindow.close();
          infoWindow.setContent(marker.getTitle());
          infoWindow.open(marker.getMap(), marker);

          FAClient.navigateTo(`/customer/view/${id}`)

        });

        //add the markers to an array
        markers.push(marker);
    });
}  
  

function searchMap(event) {
    event.preventDefault();
    const inputName = document.getElementById("name").value;

    if (inputName == nul || inputName.trim().length == 0) {
        return;
    }

    let isFound = false;
    searchResultsMarkers = [];

    //
    infoWindow.close();

    markers.forEach((marker, i) => {
        if (marker.getTitle().includes(inputName)) {
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

    !isFound ? (document.getElementById('error').style.display = "block",  document.getElementById("resultsCount").innerHTML = ``) : 
    (document.getElementById('error').style.display = "none", document.getElementById("resultsCount").innerHTML = `1 of ${searchResultsMarkers.length} Results`);
    (searchResultsMarkers.length > 1) ? document.getElementById("prevNextButtons").style.display = "flex" : document.getElementById("prevNextButtons").style.display = "none";

    console.log("searchResultsMarkers", searchResultsMarkers.length);
}

function prev() {

    if (currentSearchIndex - 1 >= 0) {

        searchResultsMarkers.forEach((marker, i) => {
            if (i == currentSearchIndex - 1) {
                infoWindow.closes();
                infoWindow.setContent(marker.getTitle());
                infoWindow.open(marker.getMap(), marker);
    
                map.setCenter(marker.position);
                map.setZoom(12);

                currentSearchIndex = i;
            }
        });

        document.getElementById("resultsCount").innerHTML = `${currentSearchIndex + 1} of ${searchResultsMarkers.length} Results`;
        console.log("update", currentSearchIndex);
    }
}

function next() {

    if (currentSearchIndex + 1 < searchResultsMarkers.length) {

        searchResultsMarkers.forEach((marker, i) => {
            if (i == currentSearchIndex + 1) {
                infoWindow.close();
                infoWindow.setContent(marker.getTitle());
                infoWindow.open(marker.getMap(), marker);
    
                map.setCenter(marker.position);
                map.setZoom(12);

                currentSearchIndex = i;
            }
        });
        document.getElementById("resultsCount").innerHTML = `${currentSearchIndex + 1} of ${searchResultsMarkers.length} Results`;
        console.log("update", currentSearchIndex);
    }
}