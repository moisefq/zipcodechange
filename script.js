document.addEventListener('DOMContentLoaded', () => {
    const zipCodeInput = document.getElementById('zipCode');
    const checkButton = document.getElementById('checkButton');
    const displayPrice = document.getElementById('displayPrice');
    const statusMessage = document.getElementById('statusMessage');

    const adminZipCodeInput = document.getElementById('adminZipCode');
    const adminPriceInput = document.getElementById('adminPrice');
    const updatePriceButton = document.getElementById('updatePriceButton');
    const setDefaultPriceButton = document.getElementById('setDefaultPriceButton');
    const newDefaultPriceInput = document.getElementById('newDefaultPrice');
    const adminStatusMessage = document.getElementById('adminStatusMessage');
    const priceList = document.getElementById('priceList');

    const STORAGE_KEY = 'zipCodePrices';

    // --- Data Management Functions ---

    // Load prices from localStorage or use initial data from data.json
    async function loadPrices() {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            return JSON.parse(storedData);
        } else {
            // If no data in localStorage, fetch from data.json
            try {
                const response = await fetch('data.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const initialData = await response.json();
                // Ensure prices are numbers if they came as strings from JSON
                initialData.prices = initialData.prices.map(item => ({
                    ...item,
                    price: parseFloat(item.price) // Convert price to number
                }));
                savePrices(initialData); // Save initial data to localStorage
                return initialData;
            } catch (error) {
                console.error("Could not fetch initial price data from data.json:", error);
                // Fallback to a very basic default if data.json fails
                return {
                    defaultPrice: 10.00,
                    prices: []
                };
            }
        }
    }

    // Save prices to localStorage
    function savePrices(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        renderPriceList(); // Re-render list after saving
    }

    // --- Price Checker Logic ---

    async function updateDisplayPrice(zipCode) {
        const data = await loadPrices(); // Use await here
        const priceInfo = data.prices.find(item => item.zip === zipCode);

        if (priceInfo) {
            displayPrice.textContent = `$${priceInfo.price.toFixed(2)}`;
            displayPrice.style.color = '#28a745'; // Green for found price
            showMessage(statusMessage, `Price for ${zipCode} (${priceInfo.city}) found!`, 'success');
        } else {
            displayPrice.textContent = `$${data.defaultPrice.toFixed(2)}`;
            displayPrice.style.color = '#dc3545'; // Red for default price
            showMessage(statusMessage, `No specific price for ${zipCode}. Displaying default.`, 'error');
        }
    }

    checkButton.addEventListener('click', async () => { // Make event listener async
        const enteredZip = zipCodeInput.value.trim();
        if (enteredZip) {
            await updateDisplayPrice(enteredZip); // Use await here
        } else {
            showMessage(statusMessage, 'Please enter a zip code.', 'error');
            const data = await loadPrices(); // Ensure data is loaded for default price
            displayPrice.textContent = `$${data.defaultPrice.toFixed(2)}`;
            displayPrice.style.color = '#dc3545';
        }
    });

    // Initial display of default price
    async function initializeApp() {
        const data = await loadPrices(); // Load data initially
        updateDisplayPrice(''); // Call with empty string to show default
        renderPriceList(); // Render admin list
    }
    initializeApp();


    // --- Admin Dashboard Logic ---

    // Render the list of current prices in the dashboard
    async function renderPriceList() { // Make async to ensure data is loaded
        priceList.innerHTML = ''; // Clear existing list
        const data = await loadPrices(); // Use await here

        // Display default price first
        const defaultLi = document.createElement('li');
        defaultLi.innerHTML = `<span>Default Price:</span> <span>$${data.defaultPrice.toFixed(2)}</span>`;
        priceList.appendChild(defaultLi);

        data.prices.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${item.zip} (${item.city || 'N/A'}):</span> <span>$${item.price.toFixed(2)}</span>
                <button data-zip="${item.zip}">Delete</button>
            `;
            priceList.appendChild(li);
        });

        // Add event listeners for delete buttons
        priceList.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', async (event) => { // Make async
                const zipToDelete = event.target.dataset.zip;
                await deletePrice(zipToDelete); // Use await
            });
        });
    }

    // Add/Update a specific zip code price
    updatePriceButton.addEventListener('click', async () => { // Make async
        const zip = adminZipCodeInput.value.trim();
        const price = parseFloat(adminPriceInput.value);

        if (!zip || isNaN(price) || price < 0) {
            showMessage(adminStatusMessage, 'Please enter a valid zip code and a positive price.', 'error');
            return;
        }

        const data = await loadPrices(); // Use await
        const existingIndex = data.prices.findIndex(item => item.zip === zip);

        // For simplicity, we'll assume the city is not editable from the dashboard
        // or you'd add another input for it. Here, we'll just keep it if it exists.
        let city = '';
        if (existingIndex !== -1) {
            city = data.prices[existingIndex].city || ''; // Keep existing city
            data.prices[existingIndex].price = price;
            showMessage(adminStatusMessage, `Price for ${zip} updated to $${price.toFixed(2)}.`, 'success');
        } else {
            // If adding a new zip, we don't have city info from the dashboard
            // You might want to add an input for city in the HTML if needed.
            data.prices.push({ zip, city: 'N/A', price }); // Add with 'N/A' city
            showMessage(adminStatusMessage, `Price for ${zip} added as $${price.toFixed(2)}.`, 'success');
        }
        savePrices(data);
        adminZipCodeInput.value = '';
        adminPriceInput.value = '';
        await updateDisplayPrice(zipCodeInput.value.trim()); // Update checker if current zip was changed
    });

    // Set the global default price
    setDefaultPriceButton.addEventListener('click', async () => { // Make async
        const newDefaultPrice = parseFloat(newDefaultPriceInput.value);

        if (isNaN(newDefaultPrice) || newDefaultPrice < 0) {
            showMessage(adminStatusMessage, 'Please enter a valid positive default price.', 'error');
            return;
        }

        const data = await loadPrices(); // Use await
        data.defaultPrice = newDefaultPrice;
        savePrices(data);
        showMessage(adminStatusMessage, `Default price set to $${newDefaultPrice.toFixed(2)}.`, 'success');
        newDefaultPriceInput.value = '';
        await updateDisplayPrice(zipCodeInput.value.trim()); // Update checker with new default
    });

    // Delete a specific zip code price
    async function deletePrice(zip) { // Make async
        const data = await loadPrices(); // Use await
        data.prices = data.prices.filter(item => item.zip !== zip);
        savePrices(data);
        showMessage(adminStatusMessage, `Price for ${zip} deleted.`, 'success');
        await updateDisplayPrice(zipCodeInput.value.trim()); // Update checker if deleted zip was current
    }

    // --- Utility Functions ---

    // Show temporary status messages
    function showMessage(element, msg, type) {
        element.textContent = msg;
        element.className = `message ${type}`; // Add success/error class
        setTimeout(() => {
            element.textContent = '';
            element.className = 'message';
        }, 3000); // Message disappears after 3 seconds
    }
});
