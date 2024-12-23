import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBcpnl5e11nEIcaSvYmjEtq8KnRq60580s",
    authDomain: "backend-awni.firebaseapp.com",
    projectId: "backend-awni",
    storageBucket: "backend-awni.firebasestorage.app",
    messagingSenderId: "265922513342",
    appId: "1:265922513342:web:602aa9b33d125945a1d1ef"
};

// Initialize Firebase + Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Check if Firebase app initialized correctly
console.log("Firebase App Initialized:", app.name); // Should log "[DEFAULT]"

// Initialize the map
const map = L.map('map').setView([52.405778365234234, -3.7434381492128925], 8.4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png?lang=cym', {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap contributors'
    
}).addTo(map);

// Create array to store markers
let markers = [];

// Parse date string = newid format y data i fod yn js ready
function parseDateString(dateString) {
    try {
        const [day, month, year] = dateString.split("/").map(Number);
        const parsedDate = new Date(year, month - 1, day); // Month is 0-indexed in JavaScript
        if (isNaN(parsedDate)) {
            throw new Error("Invalid Date Format");
        }
        return parsedDate;
    } catch (error) {
        console.warn("Error parsing date:", dateString, error);
        return null;
    }
}

// Clear all markers from the map - handi i refresh dmel
function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

function createCustomIcon(imagePath) {
    if (!imagePath) {
        console.warn("No image path provided. Using placeholder.");
        imagePath = "https://via.placeholder.com/150";
    } else {
        // Use Firestore storage path to generate a public URL
        imagePath = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${encodeURIComponent(imagePath)}?alt=media`;
    }

    return L.divIcon({
        className: 'custom-icon',
        html: `
            <div class="icon-wrapper">
                <img src="${imagePath}" alt="Marker Icon" />
            </div>
        `,
        popupAnchor: [35, 0],
    });
}

// Function to display gigs on the map
function displayGigs(gigsToShow) {
    clearMarkers(); // Clear previous markers

    // Update the event count
    const eventCountElement = document.getElementById("event-count");
    eventCountElement.textContent = gigsToShow.length;

    gigsToShow.forEach(gig => {
        const popupContent = `
            <div class="popup-content">
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
            .bindPopup(popupContent);

        markers.push(marker);
    });
}

// Checkio os di gig yn yr wsos yma
function isGigThisWeek(gig) {
    const today = new Date();
    const startOfWeek = new Date(today);
    const endOfWeek = new Date(today);

    startOfWeek.setDate(today.getDate() - today.getDay()); // Start of the week (Sunday)
    endOfWeek.setDate(today.getDate() + (6 - today.getDay())); // End of the week (Saturday)

    console.log("Start of Week:", startOfWeek);
    console.log("End of Week:", endOfWeek);

    return gig.parsedDate >= startOfWeek && gig.parsedDate <= endOfWeek;
}

// Checkio os di gig yn y mis yma
function isGigThisMonth(gig) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    console.log("Checking gig date:", gig.parsedDate, "against", startOfMonth, "to", endOfMonth);

    return gig.parsedDate >= startOfMonth && gig.parsedDate <= endOfMonth;
}

// Checkio os di gig yn disgyn yn y range sydi'i ddewis
function filterGigsByDateRange(gigs, startDate, endDate) {
    return gigs.filter(gig => gig.parsedDate >= startDate && gig.parsedDate <= endDate);
}

// Fetch gigs from Firestore
async function fetchGigs() {
    const gigsCollection = collection(db, "Gigs");
    const snapshot = await getDocs(gigsCollection);

    console.log("Firestore Snapshot Size:", snapshot.size); // Log how many documents are retrieved
    console.log("Raw Snapshot Docs:", snapshot.docs); // Log the raw Firestore documents

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set the time to the start of today for comparison

    return snapshot.docs.map(doc => {
        const data = doc.data();
        console.log("Document Data:", data); // Log each document's data

         // Extract latitude and longitude from LatLng string
         if (!data.LatLng) {
            console.warn(`Missing LatLng for document: ${doc.id}`);
            return null;
        }
        
// Newid format y coordinates
 const location = data.LatLng.split(',').map(coord => parseFloat(coord.trim()));
console.log("Parsed Location for Document:", doc.id, location); // Debug parsed location

 // Validate LatLng
 if (location.length !== 2 || isNaN(location[0]) || isNaN(location[1])) {
     console.warn(`Invalid LatLng for document: ${doc.id} - ${data.LatLng}`);
     return null;
 }

 // Parse date
const parsedDate = parseDateString(data.Date);
console.log("Parsed Date for gig:", data.Teitl, parsedDate);
 // Skip gigs that occurred before today
 if (!data.Teitl || isNaN(parsedDate) || parsedDate < today) {
    console.warn(`Skipping gig due to invalid or past date: ${JSON.stringify(data)}`);
    return null;
}

return {
    id: doc.id,
    ...data,
    location,
    parsedDate
};
}).filter(gig => gig !== null); // Remove invalid gigs
}

// UI Elements - definio dmel
const thisWeekToggle = document.getElementById('this-week-toggle');
const thisMonthToggle = document.getElementById('this-month-toggle');
const toggleDatePickerButton = document.getElementById("toggle-date-picker");
const datePickerOverlay = document.getElementById("date-picker-overlay");
const datePickerContainer = document.getElementById("date-picker-container");
const applyDateRangeButton = document.getElementById("apply-date-range");
const checkIn = document.getElementById("check-in");
const checkOut = document.getElementById("check-out");
const checkInInput = document.getElementById("check-in");
const checkOutInput = document.getElementById("check-out");
const closeDatePickerButton = document.getElementById("close-date-picker");

toggleDatePickerButton.addEventListener("click", () => {
    const isHidden = !datePickerOverlay.classList.contains("active");

    if (isHidden) {
        // Show the date picker
        datePickerOverlay.classList.add("active");
        datePickerContainer.classList.add("active");

        // Uncheck "Wsos Yma" and "Mis Yma" toggles
        thisWeekToggle.checked = false;
        thisMonthToggle.checked = false;

        // Optionally reset related styles
        const thisWeekLabel = document.querySelector('label[for="this-week-toggle"]');
        const thisMonthLabel = document.querySelector('label[for="this-month-toggle"]');
        if (thisWeekLabel) thisWeekLabel.classList.remove("selected");
        if (thisMonthLabel) thisMonthLabel.classList.remove("selected");
    } else {
        // Hide the date picker
        datePickerOverlay.classList.remove("active");
        datePickerContainer.classList.remove("active");
    }
});

// Close the date picker when clicking outside of it
datePickerOverlay.addEventListener("click", (e) => {
    if (e.target === datePickerOverlay) {
        datePickerOverlay.classList.remove("active"); // Hide overlay
        datePickerContainer.classList.remove("active"); // Hide date picker
    }
});

// Close the date picker when clicking the close button
closeDatePickerButton.addEventListener("click", () => {
    datePickerOverlay.classList.remove("active"); // Hide overlay
    datePickerContainer.classList.remove("active"); // Hide date picker
});

const resetToAllGigs = async () => {
    if (!thisWeekToggle.checked && !thisMonthToggle.checked) {
        // Show all gigs when neither toggle is selected
        const allGigs = await fetchGigs();
        displayGigs(allGigs);
    }
};

// Event Listeners
if (thisWeekToggle) {
    thisWeekToggle.addEventListener('change', async () => {
        if (thisWeekToggle.checked && thisMonthToggle) {
            thisMonthToggle.checked = false; // Uncheck the other toggle
        }
        const allGigs = await fetchGigs();
        const filteredGigs = thisWeekToggle.checked ? allGigs.filter(isGigThisWeek) : allGigs;
        console.log("Filtered Gigs (This Week):", filteredGigs);
        displayGigs(filteredGigs);
    });
} else {
    console.warn("thisWeekToggle not found in the DOM.");
}

if (thisMonthToggle) {
    console.log("This Month Toggle found and ready.");
    thisMonthToggle.addEventListener('change', async () => {
        if (thisMonthToggle.checked && thisWeekToggle) {
            thisWeekToggle.checked = false; // Uncheck the "This Week" toggle
        }
        console.log("This Month Toggle changed.");
        const allGigs = await fetchGigs();
        const filteredGigs = thisMonthToggle.checked ? allGigs.filter(isGigThisMonth) : allGigs;
        console.log("Filtered Gigs for This Month:", filteredGigs);
        displayGigs(filteredGigs);
    });
} else {
    console.warn("thisMonthToggle not found in the DOM.");
}

// Add event listeners for toggles
thisWeekToggle.addEventListener("input", async () => {

    // Fetch and display gigs for "Wsos Yma"
    if (thisWeekToggle.checked) {
        const allGigs = await fetchGigs();
        const thisWeekGigs = allGigs.filter(isGigThisWeek); // Assuming isGigThisWeek filters gigs
        displayGigs(thisWeekGigs);
    }
});

document.getElementById("this-month-toggle").addEventListener("input", async () => {
    // Close the date picker
    datePickerContainer.style.display = "none";
    toggleDatePickerButton.style.display = "inline-block";

    // Fetch and display gigs for "Mis Yma"
    if (document.getElementById("this-month-toggle").checked) {
        const allGigs = await fetchGigs();
        const thisMonthGigs = allGigs.filter(isGigThisMonth); // Assuming isGigThisMonth filters gigs
        displayGigs(thisMonthGigs);
    }
});

// Handle Dewis Dyddiada button
toggleDatePickerButton.addEventListener("click", async () => {
    const isHidden = datePickerContainer.style.display === "none";
    datePickerContainer.style.display = isHidden ? "block" : "none";

    // Uncheck "Wsos Yma" and "Mis Yma" toggles when the date picker is shown
    if (isHidden) {
        document.getElementById("this-week-toggle").checked = false;
        document.getElementById("this-month-toggle").checked = false;

        // Show all gigs by default
        const allGigs = await fetchGigs();
        displayGigs(allGigs);
    }

    if (!isHidden) {
        // Reset to show all gigs when hiding
        const allGigs = await fetchGigs();
        displayGigs(allGigs);
    }
});

// Add event listeners for toggles
thisWeekToggle.addEventListener("input", resetToAllGigs);
thisMonthToggle.addEventListener("input", resetToAllGigs);

closeDatePickerButton.addEventListener("click", () => {
    datePickerContainer.style.display = "none"; // Hide the date picker
    toggleDatePickerButton.style.display = "inline-block"; // Show the toggle button
});

applyDateRangeButton.addEventListener("click", async () => {
    if (!checkIn.value || !checkOut.value) {
        alert("Please select both a start and end date.");
        return;
    }

    const startDate = new Date(checkIn.value);
    const endDate = new Date(checkOut.value);

    if (endDate <= startDate) {
        alert("The end date must be after the start date.");
        return;
    }

    const allGigs = await fetchGigs();
    const filteredGigs = filterGigsByDateRange(allGigs, startDate, endDate);
    if (filteredGigs.length === 0) {
        alert("No gigs found within the selected date range.");
    }
    displayGigs(filteredGigs);
});

    checkIn.addEventListener("change", () => {
        if (checkIn.value) {
            checkOut.min = checkIn.value; // Prevent choosing an earlier end date
        }
    });
    
    checkOut.addEventListener("change", () => {
        if (checkOut.value && new Date(checkOut.value) <= new Date(checkIn.value)) {
            alert("End date must be after the start date.");
            checkOut.value = ""; // Reset invalid selection
        }
    });

    const clearDateFilterButton = document.getElementById("clear-date-filter");

    clearDateFilterButton.addEventListener("click", async () => {
        // Clear the date inputs
        document.getElementById("check-in").value = "";
        document.getElementById("check-out").value = "";
    
        // Keep the date picker open and ensure no gigs are filtered by date
        const allGigs = await fetchGigs();
        displayGigs(allGigs);
    });

// Function to update the Dewis Dyddiada button style when filter is applied
function updateDatePickerButtonStyleOnApply() {
    const isActive = isDateRangeSelected();
    if (isActive) {
        toggleDatePickerButton.classList.add("active"); // Add active style
        addClearButton(); // Add the clear button
    } else {
        toggleDatePickerButton.classList.remove("active"); // Remove active style
        const clearButton = document.getElementById("clear-date-button");
        if (clearButton) {
            clearButton.remove(); // Remove the clear button
        }
    }
}

// Add event listener to the "Dewis" button (apply the date range filter)
applyDateRangeButton.addEventListener("click", () => {
    const checkIn = document.getElementById("check-in").value;
    const checkOut = document.getElementById("check-out").value;

    if (!checkIn || !checkOut) {
        alert("Please select both a start and end date.");
        return;
    }

    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);

    if (endDate <= startDate) {
        alert("The end date must be after the start date.");
        return;
    }

    // Apply the filter
    fetchGigs().then((allGigs) => {
        const filteredGigs = filterGigsByDateRange(allGigs, startDate, endDate);
        if (filteredGigs.length === 0) {
            alert("No gigs found within the selected date range.");
        }
        displayGigs(filteredGigs);

        // Update the button style after applying the filter
        updateDatePickerButtonStyleOnApply();
    });
});

// Add listener for the clear date filter button
clearDateFilterButton.addEventListener("click", () => {
    document.getElementById("check-in").value = ""; // Clear check-in
    document.getElementById("check-out").value = ""; // Clear check-out

    // Reset the button style since the filter is cleared
    toggleDatePickerButton.classList.remove("active");
});

// Function to handle clearing the date range
function clearDateFilter() {
    // Clear date inputs
    document.getElementById("check-in").value = "";
    document.getElementById("check-out").value = "";

    // Reset gigs to show all
    fetchGigs().then(displayGigs);

    // Reset the button style
    toggleDatePickerButton.classList.remove("active");

    // Remove the clear button inside the Dewis Dyddiada button
    const clearButton = document.getElementById("clear-date-button");
    if (clearButton) {
        clearButton.remove();
    }
}

// Function to add a clear button inside the Dewis Dyddiada button
function addClearButton() {
    if (!document.getElementById("clear-date-button")) {
        // Style the parent button to use flexbox
        toggleDatePickerButton.style.display = "flex";
        toggleDatePickerButton.style.alignItems = "center";
        toggleDatePickerButton.style.justifyContent = "space-between";

        const clearButton = document.createElement("button");
        clearButton.id = "clear-date-button";
        clearButton.style.cssText = `
            background: none;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Add the hover effect
        clearButton.addEventListener("mouseover", () => {
            clearButton.style.transform = "scale(1.1)";
            clearButton.style.opacity = "0.8";
        });
        clearButton.addEventListener("mouseout", () => {
            clearButton.style.transform = "scale(1)";
            clearButton.style.opacity = "1";
        });

        // Add the CloseButton.png image
        const clearButtonImage = document.createElement("img");
        clearButtonImage.src = "images/CloseButton.png"; // Update the path if needed
        clearButtonImage.alt = "Clear Date Range";
        clearButtonImage.style.cssText = `
            width: 30px;
            height: 30px;
        `;

        clearButton.appendChild(clearButtonImage);

        // Attach the clear filter functionality
        clearButton.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent parent button from triggering
            clearDateFilter();
        });

        // Append the clear button inside the Dewis Dyddiada button
        toggleDatePickerButton.appendChild(clearButton);
    }
}

// Add event listener to the "Dewis" button (apply the date range filter)
applyDateRangeButton.addEventListener("click", () => {
    const checkIn = document.getElementById("check-in").value;
    const checkOut = document.getElementById("check-out").value;

    if (!checkIn || !checkOut) {
        alert("Please select both a start and end date.");
        return;
    }

    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);

    if (endDate <= startDate) {
        alert("The end date must be after the start date.");
        return;
    }

    // Apply the filter
    fetchGigs().then((allGigs) => {
        const filteredGigs = filterGigsByDateRange(allGigs, startDate, endDate);
        if (filteredGigs.length === 0) {
            alert("No gigs found within the selected date range.");
        }
        displayGigs(filteredGigs);

        // Update the button style and add the clear button
        updateDatePickerButtonStyleOnApply();
    });
});

// Add listener for the clear date filter button
clearDateFilterButton.addEventListener("click", () => {
    clearDateFilter();
});

// Function to check if date range filter is active
function isDateRangeSelected() {
    const checkIn = document.getElementById("check-in").value;
    const checkOut = document.getElementById("check-out").value;

    return checkIn && checkOut; // Returns true if both dates are selected
}

const applyToggleAnimations = (toggle, label) => {
    toggle.addEventListener("change", () => {
        if (toggle.checked) {
            label.classList.add("selected", "animate");

            // Trigger the animation manually by restarting it
            label.classList.remove("animate");
            void label.offsetWidth; // Trigger reflow
            label.classList.add("animate");
        } else {
            label.classList.remove("selected", "animate");
        }
    });
};

// Attach animations to specific toggles
const thisWeekLabel = document.querySelector("label[for='this-week-toggle']");
const thisMonthLabel = document.querySelector("label[for='this-month-toggle']");

applyToggleAnimations(thisWeekToggle, thisWeekLabel);
applyToggleAnimations(thisMonthToggle, thisMonthLabel);

const clearDateRangeWhenToggleSelected = () => {
    // Function to clear the date range filter
    const clearDateRange = () => {
        document.getElementById("check-in").value = ""; // Clear check-in date
        document.getElementById("check-out").value = ""; // Clear check-out date
        toggleDatePickerButton.classList.remove("active"); // Remove active state

        // Remove the clear button if it exists
        const clearButton = document.getElementById("clear-date-button");
        if (clearButton) {
            clearButton.remove();
        }
    };

    // Add listeners to the Wsos Yma and Mis Yma toggles
    thisWeekToggle.addEventListener("change", () => {
        if (thisWeekToggle.checked) {
            clearDateRange(); // Clear date range filter
        }
    });

    thisMonthToggle.addEventListener("change", () => {
        if (thisMonthToggle.checked) {
            clearDateRange(); // Clear date range filter
        }
    });
};

// Call the function to add the behavior
clearDateRangeWhenToggleSelected();

// Initial load: Fetch and display all gigs on the map
(async () => {
    try {
        const allGigs = await fetchGigs(); // Fetch all gigs from Firestore
        displayGigs(allGigs); // Display all gigs on the map
    } catch (error) {
        console.error("Error loading gigs on initial load:", error);
    }
})();