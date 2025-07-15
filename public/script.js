// Firebase config already initialized

async function trackOrder() {
    const id = document.getElementById('trackingInput').value.trim();
    if (!id) return alert("Please enter a valid Tracking ID");

    const resultDiv = document.getElementById('result');
    try {
        const doc = await db.collection('orders').doc(id).get();
        if (!doc.exists) {
            alert("No such order found.");
            resultDiv.style.display = "none";
            return;
        }

        const data = doc.data();
        document.getElementById('trackId').textContent = data.trackingId || id;
        document.getElementById('trackStatus').textContent = data.status || "N/A";
        document.getElementById('trackLocation').textContent = data.location || "Unknown";
        document.getElementById('trackCoords').textContent =
            (data.latitude && data.longitude) ? `${data.latitude}, ${data.longitude}` : "Not available";
        document.getElementById('trackTime').textContent = data.timestamp?.toDate().toLocaleString() || "N/A";

        resultDiv.style.display = "block";

        // Initialize map if lat & lng exist
        if (data.latitude && data.longitude) {
            initMap(data.latitude, data.longitude);
        } else {
            // If no coords, clear or hide map maybe
            if (map) {
                map.remove();
            }
            document.getElementById('map').innerHTML = "No map data available.";
        }
    } catch (err) {
        console.error("Error fetching order:", err);
        alert("Something went wrong. Check console.");
    }
}

// Admin login
function login() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const msg = document.getElementById('msg');

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            msg.innerText = '';
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('dashboard').classList.remove('hidden');
        })
        .catch(err => {
            msg.innerText = 'Login failed: ' + err.message;
        });
}

// Logout
function logout() {
    auth.signOut().then(() => {
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');
    });
}
function isValidTrackingId(id) {
    return /^[a-zA-Z0-9]{6,12}$/.test(id);
}
trackingInput.addEventListener('input', () => {
    const val = trackingInput.value.trim();
    trackBtn.disabled = !isValidTrackingId(val);
});

trackBtn.disabled = true; // disable button initially

trackBtn.addEventListener('click', async () => {
    const trackingId = trackingInput.value.trim();

    if (!isValidTrackingId(trackingId)) {
        notFoundMsg.style.display = 'block';
        notFoundMsg.textContent = 'Please enter a valid tracking ID (6-12 alphanumeric characters).';
        orderInfoDiv.style.display = 'none';
        return;
    }

    notFoundMsg.style.display = 'none';
    orderInfoDiv.style.display = 'none';

    trackBtn.textContent = 'Loading...';
    trackBtn.disabled = true;

    try {
        const docRef = db.collection('orders').doc(trackingId);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            const order = docSnap.data();

            document.getElementById('trackingId').textContent = order.trackingId;
            document.getElementById('location').textContent = order.location;
            document.getElementById('status').textContent = order.status;
            if (order.timestamp) {
                const date = order.timestamp.toDate();
                document.getElementById('lastUpdated').textContent = date.toLocaleString();
            } else {
                document.getElementById('lastUpdated').textContent = 'Not available';
            }
            if (order.latitude && order.longitude) {
                initMap(order.latitude, order.longitude);
            } else {
                // Hide map if no coordinates
                const mapDiv = document.getElementById('map');
                if (mapDiv) mapDiv.style.display = 'none';
            }


            orderInfoDiv.style.display = 'block';
            notFoundMsg.style.display = 'none';
        } else {
            orderInfoDiv.style.display = 'none';
            notFoundMsg.style.display = 'block';
            notFoundMsg.textContent = 'Order not found. Please check your tracking ID.';
        }
    } catch (error) {
        console.error('Error fetching order:', error);
        notFoundMsg.style.display = 'block';
        notFoundMsg.textContent = 'Error fetching order details. Please try again later.';
    } finally {
        trackBtn.textContent = 'Track';
        trackBtn.disabled = false;
    }
});

// Add or update order info
function addOrUpdateOrder() {
    const trackId = document.getElementById('trackId').value.trim();
    const location = document.getElementById('location').value.trim();
    const status = document.getElementById('status').value.trim();

    if (!trackId || !location || !status) {
        alert('Please fill all fields.');
        return;
    }

    db.collection('orders').doc(trackId).set({ location, status })
        .then(() => alert('Order updated successfully!'))
        .catch(err => alert('Error: ' + err.message));
}
// Global map variable to allow re-initialization
let map;  // global map variable

function initMap(lat, lng) {
    // If map already exists, remove it first
    if (map) {
        map.remove();
    }

    map = L.map('map').setView([lat, lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    L.marker([lat, lng]).addTo(map)
        .bindPopup('Current Order Location')
        .openPopup();
}
function showHistory(orderId) {
  const historyList = document.getElementById('historyList');
  historyList.innerHTML = `<li>Loading history for ${orderId}...</li>`;

  db.collection("orders")
    .doc(orderId)
    .collection("history")
    .orderBy("timestamp", "desc")
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        historyList.innerHTML = `<li>No history found for ${orderId}.</li>`;
        return;
      }

      historyList.innerHTML = "";
      snapshot.forEach(doc => {
        const data = doc.data();
        const li = document.createElement("li");
        li.textContent = `${data.status} at ${data.location} — ${timeago.format(data.timestamp.toDate())}`;
        historyList.appendChild(li);
      });
    })
    .catch(err => {
      console.error("Error loading history:", err);
      historyList.innerHTML = `<li>Error loading history.</li>`;
    });
}


