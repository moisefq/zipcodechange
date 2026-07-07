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

    // Load prices from localStorage or use initial data
    function loadPrices() {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            return JSON.parse(storedData);
        }
        // Initial default data if nothing in localStorage
        return {
            defaultPrice: 10.00,
            prices: [
                { zip: "12345", price: 15.50 },
                { zip: "67890", price: 20.00 },
                { zip: "90210", price: 12.75 },
                { zip: "00000", price: 5.00 }
            ]
        };
    }

    // Save prices to localStorage
    function savePrices(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        renderPriceList(); // Re-render list after saving
    }

    // --- Price Checker Logic ---

    function updateDisplayPrice(zipCode) {
        const data = loadPrices();
        const priceInfo = data.prices.find(item => item.zip === zipCode);

        if (priceInfo) {
            displayPrice.textContent = `$${priceInfo.price.toFixed(2)}`;
            displayPrice.style.color = '#28a745'; // Green for found price
            showMessage(statusMessage, `Price found for ${zipCode}!`, 'success');
        } else {
            displayPrice.textContent = `$${data.defaultPrice.toFixed(2)}`;
            displayPrice.style.color = '#dc3545'; // Red for default price
            showMessage(statusMessage, `No specific price for ${zipCode}. Displaying default.`, 'error');
        }
    }

    checkButton.addEventListener('click', () => {
        const enteredZip = zipCodeInput.value.trim();
        if (enteredZip) {
            updateDisplayPrice(enteredZip);
        } else {
            showMessage(statusMessage, 'Please enter a zip code.', 'error');
            displayPrice.textContent = `$${loadPrices().defaultPrice.toFixed(2)}`; // Show default if input is empty
            displayPrice.style.color = '#dc3545';
        }
    });

    // Initial display of default price
    updateDisplayPrice(''); // Call with empty string to show default

    // --- Admin Dashboard Logic ---

    // Render the list of current prices in the dashboard
    function renderPriceList() {
        priceList.innerHTML = ''; // Clear existing list
        const data = loadPrices();

        // Display default price first
        const defaultLi = document.createElement('li');
        defaultLi.innerHTML = `<span>Default Price:</span> <span>$${data.defaultPrice.toFixed(2)}</span>`;
        priceList.appendChild(defaultLi);

        data.prices.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${item.zip}:</span> <span>$${item.price.toFixed(2)}</span>
                <button data-zip="${item.zip}">Delete</button>
            `;
            priceList.appendChild(li);
        });

        // Add event listeners for delete buttons
        priceList.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', (event) => {
                const zipToDelete = event.target.dataset.zip;
                deletePrice(zipToDelete);
            });
        });
    }

    // Add/Update a specific zip code price
    updatePriceButton.addEventListener('click', () => {
        const zip = adminZipCodeInput.value.trim();
        const price = parseFloat(adminPriceInput.value);

        if (!zip || isNaN(price) || price < 0) {
            showMessage(adminStatusMessage, 'Please enter a valid zip code and a positive price.', 'error');
            return;
        }

        const data = loadPrices();
        const existingIndex = data.prices.findIndex(item => item.zip === zip);

        if (existingIndex !== -1) {
            data.prices[existingIndex].price = price;
            showMessage(adminStatusMessage, `Price for ${zip} updated to $${price.toFixed(2)}.`, 'success');
        } else {
            data.prices.push({ zip, price });
            showMessage(adminStatusMessage, `Price for ${zip} added as $${price.toFixed(2)}.`, 'success');
        }
        savePrices(data);
        adminZipCodeInput.value = '';
        adminPriceInput.value = '';
        updateDisplayPrice(zipCodeInput.value.trim()); // Update checker if current zip was changed
    });

    // Set the global default price
    setDefaultPriceButton.addEventListener('click', () => {
        const newDefaultPrice = parseFloat(newDefaultPriceInput.value);

        if (isNaN(newDefaultPrice) || newDefaultPrice < 0) {
            showMessage(adminStatusMessage, 'Please enter a valid positive default price.', 'error');
            return;
        }

        const data = loadPrices();
        data.defaultPrice = newDefaultPrice;
        savePrices(data);
        showMessage(adminStatusMessage, `Default price set to $${newDefaultPrice.toFixed(2)}.`, 'success');
        newDefaultPriceInput.value = '';
        updateDisplayPrice(zipCodeInput.value.trim()); // Update checker with new default
    });

    // Delete a specific zip code price
    function deletePrice(zip) {
        const data = loadPrices();
        data.prices = data.prices.filter(item => item.zip !== zip);
        savePrices(data);
        showMessage(adminStatusMessage, `Price for ${zip} deleted.`, 'success');
        updateDisplayPrice(zipCodeInput.value.trim()); // Update checker if deleted zip was current
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

    // Initial render of the price list when the page loads
    renderPriceList();
});
