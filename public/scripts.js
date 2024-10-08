document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, fetching locations and chargers...');

    // Fetch locations
    fetch('/api/locations')
        .then(response => response.json())
        .then(data => {
            console.log('Locations data:', data);
            renderLocationList(data);
            setupFindLocationButton(data); // Set up the Find Closest Location button
        })
        .catch(error => console.error('Error fetching locations:', error));

    // Fetch chargers
    fetch('/api/chargers')
        .then(response => response.json())
        .then(data => {
            console.log('Chargers data:', data);
            renderChargerStatus(data);
        })
        .catch(error => console.error('Error fetching chargers:', error));
});

function renderLocationList(locations) {
    const locationsContainer = document.getElementById('locations');
    locationsContainer.innerHTML = '';

    locations.forEach(location => {
        const locationElement = document.createElement('div');
        locationElement.classList.add('location-row');
        locationElement.setAttribute('data-location-id', location.id);

        const locationInfo = `
            <div class="location-info">
                <strong>${location.name}</strong>
                <small>${location.address}</small><br><br><br>
                <small align="right">Estimated Time of Completion</small><br>
                <small align="right">Comments</small>
            </div>
        `;
        locationElement.innerHTML = locationInfo;
        locationsContainer.appendChild(locationElement);
    });
}

function renderChargerStatus(chargers) {
    chargers.forEach(charger => {
        const locationElement = document.querySelector(`[data-location-id="${charger.location_id}"]`);

        // Ensure the location element exists before appending chargers
        if (!locationElement) {
            console.error(`Location element not found for location_id: ${charger.location_id}`);
            return;
        }

        const chargerWrapper = document.createElement('div');
        chargerWrapper.classList.add('charger-wrapper');

        const chargerIcon = document.createElement('img');
        chargerIcon.classList.add('charger-icon');
        chargerIcon.src = getIconByStatus(charger.status);
        chargerIcon.alt = charger.status;

        chargerIcon.addEventListener('click', () => {
            openStatusSelection(charger, chargerIcon, chargerWrapper);
        });

        chargerWrapper.appendChild(chargerIcon);

        // Add ETC and Comments fields
        const etcInput = document.createElement('input');
        etcInput.type = 'time';
        etcInput.classList.add('etc-input');
        etcInput.value = charger.etc || '';

        const commentsInput = document.createElement('input');
        commentsInput.type = 'text';
        commentsInput.classList.add('comments-input');
        commentsInput.value = charger.additional_info || '';

        // Set the initial state of the fields based on the current status
        updateFieldStates(charger.status, etcInput, commentsInput);

        etcInput.addEventListener('change', () => {
            updateChargerField(charger.id, 'etc', etcInput.value);
        });

        commentsInput.addEventListener('blur', () => {
            updateChargerField(charger.id, 'additional_info', commentsInput.value);
        });

        chargerWrapper.appendChild(etcInput);
        chargerWrapper.appendChild(commentsInput);

        locationElement.appendChild(chargerWrapper);
    });
}

function setupFindLocationButton(locations) {
    const findLocationBtn = document.getElementById('find-location-btn');
    findLocationBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;

                const closestLocation = findClosestLocation(locations, userLat, userLon);
                highlightClosestLocation(closestLocation);
            }, handleGeolocationError);
        } else {
            alert('Geolocation is not supported by this browser.');
        }
    });
}

function findClosestLocation(locations, userLat, userLon) {
    let closestLocation = null;
    let closestDistance = Infinity;

    locations.forEach(location => {
        const distance = getDistance(userLat, userLon, location.latitude, location.longitude);
        if (distance < closestDistance) {
            closestDistance = distance;
            closestLocation = location;
        }
    });

    return closestLocation;
}

function highlightClosestLocation(location) {
    const locationElement = document.querySelector(`[data-location-id="${location.id}"]`);
    if (locationElement) {
        locationElement.scrollIntoView({ behavior: 'smooth' });
        locationElement.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)'; // Light shadow effect

        // Add a fade-out effect by removing the shadow after a delay
        setTimeout(() => {
            locationElement.style.transition = 'box-shadow 1s ease'; // Smooth transition
            locationElement.style.boxShadow = 'none'; // Remove the shadow
        }, 3000); // Remove after 3 seconds (adjust as needed)
    }
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        0.5 - Math.cos(dLat) / 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        (1 - Math.cos(dLon)) / 2;
    return R * 2 * Math.asin(Math.sqrt(a));
}

function handleGeolocationError(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            alert('Location permission was denied. Please enable location access and try again.');
            break;
        case error.POSITION_UNAVAILABLE:
            alert('Location information is unavailable. Please try again later.');
            break;
        case error.TIMEOUT:
            alert('The request to get your location timed out. Please try again.');
            break;
        case error.UNKNOWN_ERROR:
        default:
            alert('An unknown error occurred while retrieving your location.');
            break;
    }
}

function openStatusSelection(charger, chargerIcon, chargerWrapper) {
    const statusPopup = document.createElement('div');
    statusPopup.classList.add('status-popup');

    const statuses = [
        { name: 'available', icon: '/images/available.png' },
        { name: 'in use', icon: '/images/in-use.png' },
        { name: 'occupied but not charging by Tesla', icon: '/images/not-charging.png' },
        { name: 'occupied by non Tesla', icon: '/images/not-tesla.png' },
        { name: 'faulty', icon: '/images/faulty.png' }
    ];

    statuses.forEach(status => {
        const statusOptionWrapper = document.createElement('div');
        statusOptionWrapper.classList.add('status-option-wrapper');

        const statusIcon = document.createElement('img');
        statusIcon.src = status.icon;
        statusIcon.classList.add('status-option');

        const statusText = document.createElement('span');
        statusText.classList.add('status-text');
        statusText.textContent = status.name;

        statusOptionWrapper.appendChild(statusIcon);
        statusOptionWrapper.appendChild(statusText);

        statusOptionWrapper.addEventListener('click', () => {
            updateChargerStatus(charger.id, status.name);
            chargerIcon.src = status.icon;

            // Get the ETC and Comments input elements
            const etcInput = chargerWrapper.querySelector('.etc-input');
            const commentsInput = chargerWrapper.querySelector('.comments-input');

            // Update the fields' states based on the selected status
            updateFieldStates(status.name, etcInput, commentsInput);

            if (status.name === 'available') {
                // Clear ETC and comments when status is set to available
                etcInput.value = '';
                commentsInput.value = '';
                updateChargerField(charger.id, 'etc', '');
                updateChargerField(charger.id, 'additional_info', '');
            }

            document.body.removeChild(statusPopup);
        });

        statusPopup.appendChild(statusOptionWrapper);
    });

    document.body.appendChild(statusPopup);

    const rect = chargerIcon.getBoundingClientRect();
    statusPopup.style.top = `${rect.bottom + window.scrollY}px`;
    statusPopup.style.left = `${rect.left + window.scrollX}px`;

    // Close the pop-up if clicking outside
    document.addEventListener('click', (event) => {
        if (!statusPopup.contains(event.target) && event.target !== chargerIcon) {
            document.body.removeChild(statusPopup);
        }
    }, { once: true });
}

function updateFieldStates(status, etcInput, commentsInput) {
    if (status === 'in use') {
        etcInput.disabled = false;
        commentsInput.disabled = false;
    } else if (status === 'occupied but not charging by Tesla' || status === 'occupied by non Tesla' || status === 'faulty') {
        etcInput.disabled = true;
        commentsInput.disabled = false;
    } else if (status === 'available') {
        etcInput.disabled = true;
        commentsInput.disabled = true;
    }
}

function updateChargerStatus(id, status) {
    fetch(`/api/chargers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => console.log('Charger status updated successfully:', data))
    .catch(error => console.error('Error updating charger status:', error));
}

function updateChargerField(id, field, value) {
    const payload = {};
    payload[field] = value;

    fetch(`/api/chargers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => console.log(`${field} updated successfully:`, data))
    .catch(error => console.error(`Error updating ${field}:`, error));
}

function getIconByStatus(status) {
    switch (status) {
        case 'available':
            return '/images/available.png';
        case 'in use':
            return '/images/in-use.png';
        case 'occupied but not charging by Tesla':
            return '/images/not-charging.png';
        case 'occupied by non Tesla':
            return '/images/not-tesla.png';
        case 'faulty':
            return '/images/faulty.png';
        default:
            return '/images/tesla.png';
    }
}
