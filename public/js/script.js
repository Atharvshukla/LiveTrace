const socket = io();
let username = "";

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


socket.on("receive-location", (data) => {
    const { id, username, latitude, longitude } = data;
    map.setView([latitude, longitude]);
    if (markers[id]) {
        markers[id].setLatLng([latitude, longitude]);
    } else {
        markers[id] = L.marker([latitude, longitude]).addTo(map).bindPopup(username);
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

document.getElementById('set-marker').addEventListener('click', () => {
    const lat = parseFloat(document.getElementById('lat').value);
    const lng = parseFloat(document.getElementById('lng').value);
    if (!isNaN(lat) && !isNaN(lng)) {
        if (customMarkers[socket.id]) {
            customMarkers[socket.id].setLatLng([lat, lng]);
        } else {
            customMarkers[socket.id] = L.marker([lat, lng], {icon: L.icon({iconUrl: 'marker.webp'})}).addTo(map).bindPopup('Custom Marker').openPopup();
        }
    }
});

document.getElementById('send-message').addEventListener('click', () => {
    const message = document.getElementById('message').value;
    socket.emit('send-message', { username, message });
});

socket.on('receive-message', (data) => {
    const messageBox = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.innerText = `${data.username}: ${data.message}`;
    messageBox.appendChild(messageElement);
});
