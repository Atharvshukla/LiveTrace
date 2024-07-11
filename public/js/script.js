const socket = io();
let username = "";
let currentLocationMarker = null;

document.getElementById('username').addEventListener('change', (e) => {
    username = e.target.value;
    socket.emit('set-username', username);
});

if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            socket.emit("send-location", { username, latitude, longitude });
        },
        (error) => {
            console.error(error);
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }
    );
}

const map = L.map("map").setView([0, 0], 16);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "LiveTrace"
}).addTo(map);

const markers = {};
const customMarkers = {};
let geofence = { lat: 37.7749, lng: -122.4194, radius: 5000 }; // Default geofence around San Francisco
let geofenceCircle = L.circle([geofence.lat, geofence.lng], { radius: geofence.radius }).addTo(map);

function isInsideGeofence(lat, lng, geofence) {
    const distance = map.distance([lat, lng], [geofence.lat, geofence.lng]);
    return distance <= geofence.radius;
}

socket.on("receive-location", (data) => {
    const { id, username, latitude, longitude } = data;
    map.setView([latitude, longitude]);
    if (markers[id]) {
        markers[id].setLatLng([latitude, longitude]).bindPopup(`You are here: ${username}`);
    } else {
        markers[id] = L.marker([latitude, longitude]).addTo(map).bindPopup(`You are here: ${username}`);
        markers[id].on('click', () => {
            markers[id].openPopup();
        });
    }

    if (id === socket.id) {
        currentLocationMarker = markers[id];
    }

    if (isInsideGeofence(latitude, longitude, geofence)) {
        document.getElementById('geofence-alert').innerText = `${username} is inside the geofence!`;
    } else {
        document.getElementById('geofence-alert').innerText = `${username} is outside the geofence!`;
    }
});

socket.on("user-disconnected", (id) => {
    if (markers[id]) {
        map.removeLayer(markers[id]);
        delete markers[id];
    }
    if (customMarkers[id]) {
        map.removeLayer(customMarkers[id]);
        delete customMarkers[id];
    }
});

socket.on("update-status", (status) => {
    document.getElementById('status').innerHTML = status;
});

document.getElementById('set-marker').addEventListener('click', (e) => {
    e.preventDefault(); // Prevent form submission and page reload
    const lat = parseFloat(document.getElementById('lat').value);
    const lng = parseFloat(document.getElementById('lng').value);
    if (!isNaN(lat) && !isNaN(lng)) {
        if (customMarkers[socket.id]) {
            customMarkers[socket.id].setLatLng([lat, lng]).bindPopup(`Your custom marker: ${username}`);
        } else {
            customMarkers[socket.id] = L.marker([lat, lng], { icon: L.icon({ iconUrl: 'path/to/custom-marker-icon.png' }) }).addTo(map).bindPopup(`Your custom marker: ${username}`);
            customMarkers[socket.id].on('click', () => {
                customMarkers[socket.id].openPopup();
            });
        }
    }
});

document.getElementById('set-geofence').addEventListener('click', (e) => {
    e.preventDefault(); // Prevent form submission and page reload
    const lat = parseFloat(document.getElementById('geofence-lat').value);
    const lng = parseFloat(document.getElementById('geofence-lng').value);
    const radius = parseFloat(document.getElementById('geofence-radius').value);
    if (!isNaN(lat) && !isNaN(lng) && !isNaN(radius)) {
        geofence = { lat, lng, radius };
        if (geofenceCircle) {
            map.removeLayer(geofenceCircle);
        }
        geofenceCircle = L.circle([geofence.lat, geofence.lng], { radius: geofence.radius }).addTo(map);
    }
});

document.getElementById('send-message').addEventListener('click', (e) => {
    e.preventDefault(); // Prevent form submission and page reload
    const message = document.getElementById('message').value;
    socket.emit('send-message', { username, message });
});

socket.on('receive-message', (data) => {
    const messageBox = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.innerText = `${data.username}: ${data.message}`;
    messageBox.appendChild(messageElement);
});

L.Control.CurrentLocation = L.Control.extend({
    onAdd: function(map) {
        const btn = L.DomUtil.create('button');
        btn.innerHTML = '📍';
        btn.className = 'leaflet-bar leaflet-control leaflet-control-custom';
        btn.style.cursor = 'pointer';

        btn.onclick = function() {
            if (currentLocationMarker) {
                map.setView(currentLocationMarker.getLatLng(), 16);
                currentLocationMarker.openPopup();
            }
        };

        return btn;
    },

    onRemove: function(map) {

    }
});

L.control.currentLocation = function(opts) {
    return new L.Control.CurrentLocation(opts);
}

L.control.currentLocation({ position: 'bottomright' }).addTo(map);
