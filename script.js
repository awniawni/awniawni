import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBcpnl5e11nEIcaSvYmjEtq8KnRq60580s",
    authDomain: "backend-awni.firebaseapp.com",
    projectId: "backend-awni",
    storageBucket: "backend-awni.firebasestorage.app",
    messagingSenderId: "265922513342",
    appId: "1:265922513342:web:602aa9b33d125945a1d1ef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Wait for the DOM to fully load
window.addEventListener("load", function () {
    // Wait 4 seconds before hiding the loading screen
    setTimeout(() => {
        const loaderWrapper = document.getElementById("loader-wrapper");
        loaderWrapper.style.opacity = "0"; // Fade out effect
        loaderWrapper.style.transition = "opacity 0.5s ease"; // Smooth transition

        // Remove the loader from the DOM after fading out
        setTimeout(() => {
            loaderWrapper.style.display = "none";
        }, 500); // Match the fade-out duration
    }, 2500); // Time in milliseconds (4 seconds)
});

// Initialize Map
const map = L.map('map').setView([52.405778365234234, -3.7434381492128925], 8.4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png?lang=cym', {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let markers = [];
let calendar = null; // Declare calendar and initialize it as null
let gigs = []; // Declare gigs in the outer scope

// Define the default map view and zoom level
const defaultView = [52.405778365234234, -3.7434381492128925];
const defaultZoom = 8.4;

// Helper Functions
function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

function createCustomIcon(imagePath) {
    const imageUrl = imagePath
        ? `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${encodeURIComponent(imagePath)}?alt=media`
        : "https://via.placeholder.com/150";

    return L.divIcon({
        className: 'custom-icon',
        html: `<div class="icon-wrapper"><img src="${imageUrl}" alt="Marker Icon" /></div>`,
        iconSize: [50, 50],
        popupAnchor: [10, -25],
    });
}

function displayGigs(gigsToShow) {
    clearMarkers();
    console.log("Displaying gigs:", gigsToShow);
    
    // Update the event count
    const eventCountElement = document.getElementById("event-count");
    eventCountElement.textContent = gigsToShow.length; // Update the count to match the number of gigs displayed

    gigsToShow.forEach(gig => {
        if (!gig.location || gig.location.length !== 2 || isNaN(gig.location[0]) || isNaN(gig.location[1])) {
            console.warn(`Skipping gig with invalid location: ${gig.Teitl}`, gig.location);
            return;
        }

        // Create popup content
const popupContent = document.createElement("div");
popupContent.className = "popup-content";

const closeButton = document.createElement("button");
closeButton.className = "custom-close-button";
closeButton.innerHTML = "✖";

popupContent.appendChild(closeButton);

        popupContent.innerHTML += `
            <div class="popup-title">${gig.Teitl}</div>
            <div class="popup-detail">📍 ${gig.Lleoliad}</div>
            <div class="popup-detail">📅 ${gig.Dyddiad}</div>
            ${gig.Amser ? `<div class="popup-detail">🕓 ${gig.Amser}</div>` : ""}
            ${gig.Cost ? `<div class="popup-detail">🎟️ ${gig.Cost}</div>` : ""}
            ${gig.Linc ? `<div class="popup-detail">🖇️ <a href="${gig.Linc}" target="_blank">Linc</a></div>` : ""}
            ${gig.Neges ? `<div class="popup-message">${gig.Neges}</div>` : ""}
        </div>
    `;    
        const markerIcon = createCustomIcon(gig.Llun);

        const marker = L.marker(gig.location, { icon: markerIcon })
            .addTo(map)
            .bindPopup(popupContent, { closeButton: false });

        // Add a click event to zoom in and center the map
        marker.on("click", () => {
            const desiredZoom = 11; // Adjust this to the zoom level you want for the selected event
            const currentZoom = map.getZoom();
        
            // Only zoom in if the current zoom level is less than the desired zoom
            if (currentZoom < desiredZoom) {
                console.log(`Zooming to marker at location: ${gig.location}`);
                map.setView(gig.location, desiredZoom, { animate: true }); // Zoom to level and center on the clicked marker
            } else {
                console.log(`Already zoomed in at or above level ${desiredZoom}, just centering.`);
                map.panTo(gig.location); // Only center the map without changing zoom
            }
        
            marker.openPopup(); // Open the popup for the clicked marker
        });

        marker.on("popupopen", () => {
            const closeButton = popupContent.querySelector(".custom-close-button");
            if (closeButton) {
                closeButton.onclick = () => {
                    console.log("Custom close button clicked. Closing popup and zooming out.");
                    
                    const currentCenter = map.getCenter(); // Get the current map center
                    const zoomOutLevel = defaultZoom; // Define the zoom-out level
        
                    marker.closePopup(); // Close the popup associated with this marker
        
                    map.flyTo(currentCenter, zoomOutLevel, { 
                        animate: true,
                        duration: 0.3, 
                    }); // Stay in the same area and zoom out
                };
            }
        });        

        markers.push(marker); // Move this outside of the popupopen listener
    });
}

async function fetchGigs() {
    const gigsCollection = collection(db, "Gigs");
    const snapshot = await getDocs(gigsCollection);

    console.log("Fetched Firestore data:", snapshot.docs.map(doc => doc.data()));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return snapshot.docs.map(doc => {
        const data = doc.data();

        if (!data.LatLng || !data.Date) {
            console.warn("Skipping gig with missing LatLng or Date:", data);
            return null;
        }

        const location = data.LatLng.split(',').map(coord => parseFloat(coord.trim()));
        const parsedDate = parseDateString(data.Date);

        if (!data.Teitl || isNaN(parsedDate) || parsedDate < today) {
            console.warn("Skipping gig with invalid data:", data);
            return null;
        }

        return { id: doc.id, ...data, location, parsedDate };
    }).filter(Boolean);
}

function parseDateString(dateString) {
    try {
        const [day, month, year] = dateString.split("/").map(Number);
        return new Date(year, month - 1, day);
    } catch (error) {
        console.warn("Error parsing date:", dateString, error);
        return null;
    }
}

function isGigThisWeek(gig) {
    const today = new Date();
    const startOfWeek = new Date(today);
    const endOfWeek = new Date(today);

    const dayOfWeek = today.getDay();
    startOfWeek.setDate(today.getDate() - dayOfWeek + 1);
    endOfWeek.setDate(today.getDate() + (7 - dayOfWeek));

    return gig.parsedDate >= startOfWeek && gig.parsedDate <= endOfWeek;
}

function isGigThisMonth(gig) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    return gig.parsedDate >= startOfMonth && gig.parsedDate <= endOfMonth;
}

function resetFilters() {
    console.log("Resetting filters to show all gigs...");
    chooseDatesButton.textContent = "🗓️ Dewis dyddia'";
    closeButton.style.display = "none";
    if (calendar) {
        calendar.clear();
    }
    displayGigs(gigs);
}

// Declare variables in a shared scope
let chooseDatesButton;
let closeButton;
let thisWeekToggle;
let thisMonthToggle;

document.addEventListener("DOMContentLoaded", async () => {
    // Initialize DOM elements
    chooseDatesButton = document.querySelector("#choose-dates-toggle");
    closeButton = document.querySelector(".clear-dates-button");
    thisWeekToggle = document.querySelector("#this-week-toggle");
    thisMonthToggle = document.querySelector("#this-month-toggle");

    closeButton.addEventListener("click", resetFilters);

    gigs = await fetchGigs(); // Assign gigs once during initialization
    displayGigs(gigs);

    // Toggles for "This Week" and "This Month"
    thisWeekToggle.addEventListener("change", () => {
        if (thisWeekToggle.checked) {
            thisMonthToggle.checked = false; // Uncheck "This Month"
            const filteredGigs = gigs.filter(isGigThisWeek);
            displayGigs(filteredGigs);
        } else {
            displayGigs(gigs);
        }
    });
    
    thisMonthToggle.addEventListener("change", () => {
        if (thisMonthToggle.checked) {
            thisWeekToggle.checked = false; // Uncheck "This Week"
            const filteredGigs = gigs.filter(isGigThisMonth);
            displayGigs(filteredGigs);
        } else {
            displayGigs(gigs);
        }
    });

    chooseDatesButton.addEventListener("click", () => {
        thisWeekToggle.checked = false;
        thisMonthToggle.checked = false;
    });

    calendar = flatpickr("#choose-dates-toggle", {
        mode: "range",
        dateFormat: "d-m-Y",
        minDate: "today",
        locale: {
            firstDayOfWeek: 1,
            weekdays: {
                shorthand: ["Sul", "Llun", "Maw", "Mer", "Iau", "Gwe", "Sad"],
                longhand: [
                    "Dydd Sul",
                    "Dydd Llun",
                    "Dydd Mawrth",
                    "Dydd Mercher",
                    "Dydd Iau",
                    "Dydd Gwener",
                    "Dydd Sadwrn",
                ],
            },
            months: {
                shorthand: [
                    "Ion",
                    "Chwe",
                    "Maw",
                    "Ebr",
                    "Mai",
                    "Meh",
                    "Gor",
                    "Awst",
                    "Medi",
                    "Hyd",
                    "Tach",
                    "Rhag",
                ],
                longhand: [
                    "Ionawr",
                    "Chwefror",
                    "Mawrth",
                    "Ebrill",
                    "Mai",
                    "Mehefin",
                    "Gorffennaf",
                    "Awst",
                    "Medi",
                    "Hydref",
                    "Tachwedd",
                    "Rhagfyr",
                ],
            },
        },
        onClose: async (selectedDates) => {
            if (!selectedDates.length) {
                resetFilters();
                return;
            }    

            chooseDatesButton.textContent =
                selectedDates.length === 1
                    ? `📅 ${selectedDates[0].toLocaleDateString()}`
                    : `📅 ${selectedDates[0].toLocaleDateString()} - ${selectedDates[1].toLocaleDateString()}`;

            closeButton.style.display = "inline-block";

            const filteredGigs = gigs.filter((gig) =>
                selectedDates.length === 1
                    ? gig.parsedDate.toDateString() === selectedDates[0].toDateString()
                    : gig.parsedDate >= selectedDates[0] && gig.parsedDate <= selectedDates[1]
            );

            displayGigs(filteredGigs);
        },
    });

    closeButton.addEventListener("click", resetFilters);
 });

