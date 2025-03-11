(function() {
    // Function to initialize the totals calculator for any report view
    function initReportTotals() {
        // Flag to track if a calculation is already in progress
        let calculationInProgress = false;

        function calculateTotals() {
            // Check if the current route is a report view
            let currentRoute = frappe.get_route();
            if (!currentRoute || currentRoute.length < 2 || currentRoute[1] !== "List" || currentRoute[2] !== "Report") {
                console.log("Not a report view, skipping totals calculation");
                return;
            }

            // Prevent multiple simultaneous calculations
            if (calculationInProgress) {
                console.log("Calculation already in progress, skipping...");
                return;
            }

            calculationInProgress = true;

            // First scroll to the top of the data
            scrollToTop()
                .then(() => waitForDataLoad())
                .then(() => {
                    // Capture filter values
                    captureFilterValues();

                    // Process data after scrolling and loading
                    processDataAndCalculateTotals();
                })
                .catch(error => {
                    console.error("Error in calculation process:", error);
                })
                .finally(() => {
                    calculationInProgress = false;
                });
        }

        function scrollToTop() {
            return new Promise((resolve) => {
                const scrollable = document.querySelector(".dt-scrollable");
                if (!scrollable) {
                    resolve(); // No scrollable element found, continue
                    return;
                }

                console.log("Scrolling to top...");
                scrollable.scrollTop = 0;

                // Give a small delay to ensure scroll completes
                setTimeout(() => {
                    console.log("Scroll to top complete");
                    resolve();
                }, 300);
            });
        }

        function waitForDataLoad() {
            return new Promise((resolve) => {
                // Check if data rows exist
                const checkForData = () => {
                    const rows = document.querySelectorAll(".dt-scrollable .dt-row");
                    if (rows.length > 0) {
                        console.log("Data loaded, rows found:", rows.length);
                        resolve();
                    } else {
                        console.log("Waiting for data to load...");
                        setTimeout(checkForData, 200);
                    }
                };

                // Start checking
                checkForData();
            });
        }

        function processDataAndCalculateTotals() {
            let data = [];
            document.querySelectorAll(".dt-scrollable .dt-row").forEach(row => {
                let rowData = {};
                let cell2Content = row.querySelectorAll(".dt-cell")[2]?.querySelector(".dt-cell__content")?.innerText.trim() || "";
                if(cell2Content === "Totals")
                    return;

                row.querySelectorAll(".dt-cell").forEach(cell => {
                    let colIndex = cell.getAttribute("data-col-index");
                    let text = cell.querySelector(".dt-cell__content")?.innerText.trim() || "";
                    if(colIndex === "1")
                        text = "";

                    // Check if text matches a date pattern using provided regex
                    let isDatePattern = /^(?:(?:31(\/|-|\.)(?:0?[13578]|1[02]))\1|(?:(?:29|30)(\/|-|\.)(?:0?[13-9]|1[0-2])\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(\/|-|\.)0?2\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:0?[1-9]|1\d|2[0-8])(\/|-|\.)(?:(?:0?[1-9])|(?:1[0-2]))\4(?:(?:1[6-9]|[2-9]\d)?\d{2})$/.test(text);

                    // Extract numeric values while removing currency symbols and commas
                    let num = parseFloat(text.replace(/[^0-9.-]+/g, ''));
                    rowData[colIndex] = (isNaN(num) || isDatePattern) ? text : num;
                });
                data.push(rowData);
            });

            if (data.length === 0) {
                console.log("No data found after waiting. Aborting calculations.");
                return;
            }

            console.log("Page Data:", data);
            let totals = {};
            let columns = Object.keys(data[0]);
            columns.forEach(col => totals[col] = ""); // Initialize all columns
            data.forEach(row => {
                columns.forEach(col => {
                    let value = row[col];
                    if (typeof value === "number") {
                        totals[col] = (totals[col] || 0) + value;
                    }
                });
            });
            // Create a new row for totals
            let totalRow = {};
            columns.forEach(col => {
                totalRow[col] = totals[col];
            });
            // Print the new row
            console.log("Total Row:", totalRow);

            let formattedTotals = {};
            columns.forEach(col => {
                if (typeof totals[col] === "number") {
                    formattedTotals[col] = totals[col].toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });
                } else {
                    formattedTotals[col] = "";
                }
            });

            // Also log the formatted totals
            console.log("Formatted Total Row:", formattedTotals);

            // Add totals to the footer
            updateFooterWithTotals(formattedTotals);
        }

        function captureFilterValues() {
            // Find all filter inputs within the dt-header
            const filterInputs = document.querySelectorAll('.dt-header .dt-row-filter .dt-filter');

            // Object to store filter values
            const filterValues = {};

            // Loop through each filter input
            filterInputs.forEach(input => {
                // Get column index and column name
                const colIndex = input.getAttribute('data-col-index');
                const colName = input.getAttribute('data-name') || `Column ${colIndex}`;

                // Get the input value
                const value = input.value.trim();

                // Store value if it's not empty
                if (value) {
                    filterValues[colIndex] = {
                        name: colName,
                        value: value
                    };
                }
            });

            // Only log if there are active filters
            if (Object.keys(filterValues).length > 0) {
                console.log("Active Filters:", filterValues);
            }

            return filterValues;
        }

        // Debounce function to prevent multiple rapid triggers
        function debounce(func, wait) {
            let timeout;
            return function(...args) {
                const context = this;
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(context, args), wait);
            };
        }

        // Debounced version of calculateTotals
        const debouncedCalculate = debounce(calculateTotals, 500);

        function setupFilterListeners() {
            // Find all filter inputs
            const filterInputs = document.querySelectorAll('.dt-header .dt-row-filter .dt-filter');

            if (filterInputs.length === 0) {
                console.log("No filter inputs found. Will check again later.");
                setTimeout(setupFilterListeners, 1000);
                return;
            }

            // Add input event listeners to all filter inputs
            filterInputs.forEach(input => {
                // Remove any existing listeners to prevent duplicates
                input.removeEventListener('input', input._filterHandler);

                // Create and store the handler function
                input._filterHandler = function(event) {
                    const colIndex = this.getAttribute('data-col-index');
                    const colName = this.getAttribute('data-name') || `Column ${colIndex}`;
                    const value = this.value.trim();

                    console.log(`Filter updated for ${colName} (column ${colIndex}): "${value}"`);

                    // Trigger calculation when filter changes
                    debouncedCalculate();
                };

                // Add the listener
                input.addEventListener('input', input._filterHandler);
            });

            // Also listen for the filter button or filter toggle events
            const filterToggle = document.querySelector('.dt-filter-toggler, .filter-icon');
            if (filterToggle) {
                filterToggle.removeEventListener('click', filterToggle._clickHandler);
                filterToggle._clickHandler = function() {
                    console.log("Filter toggler clicked. Setting up listeners again after delay.");
                    // When filter UI is toggled, set up listeners again after a short delay
                    setTimeout(setupFilterListeners, 500);
                };
                filterToggle.addEventListener('click', filterToggle._clickHandler);
            }

            console.log(`Filter event listeners set up for ${filterInputs.length} filter inputs`);
        }

        // Listen for any data refresh or page change events
        function setupDataChangeListeners() {
            // Observe URL/route changes
            const originalPushState = window.history.pushState;
            window.history.pushState = function() {
                originalPushState.apply(this, arguments);
                console.log("Route changed, setting up listeners again");
                setTimeout(() => {
                    setupFilterListeners();
                    calculateTotals(); // Initial calculation after route change
                }, 1000);
            };

            // Observe back/forward navigation
            window.addEventListener('popstate', function() {
                console.log("Navigation occurred, setting up listeners again");
                setTimeout(() => {
                    setupFilterListeners();
                    calculateTotals(); // Initial calculation after navigation
                }, 1000);
            });

            // Try to find and observe the refresh button
            const refreshButtons = document.querySelectorAll('.refresh-icon, .primary-action, button.btn-primary');
            refreshButtons.forEach(button => {
                button.removeEventListener('click', button._refreshHandler);
                button._refreshHandler = function() {
                    console.log("Refresh action detected");
                    setTimeout(() => {
                        setupFilterListeners();
                        calculateTotals(); // Calculate after refresh
                    }, 1000);
                };
                button.addEventListener('click', button._refreshHandler);
            });
        }

        function updateFooterWithTotals(formattedTotals) {
            // Get or create the footer
            let footer = document.querySelector(".dt-footer");
            if (!footer) {
                // Create footer if it doesn't exist
                const scrollable = document.querySelector(".dt-scrollable");
                if (!scrollable) return;

                footer = document.createElement("div");
                footer.className = "dt-footer";
                scrollable.parentNode.appendChild(footer);
            }

            // Clear existing footer content
            footer.innerHTML = "";

            // Create the total row
            const totalRow = document.createElement("div");
            totalRow.className = "dt-row dt-row-totalRow";
            totalRow.setAttribute("data-is-total-row", "1");
            totalRow.setAttribute("data-row-index", "totalRow");

            // Get number of columns from the first data row
            const firstRow = document.querySelector(".dt-scrollable .dt-row");
            if (!firstRow) return;

            const columnCount = firstRow.querySelectorAll(".dt-cell").length;

            // Create cells for each column
            for (let i = 0; i < columnCount; i++) {
                const cell = document.createElement("div");
                cell.className = `dt-cell dt-cell--col-${i}`;
                cell.setAttribute("data-col-index", i.toString());
                cell.setAttribute("data-is-total-row", "1");
                cell.setAttribute("tabindex", "0");

                const content = document.createElement("div");
                content.className = `dt-cell__content dt-cell__content--col-${i}`;

                // Set content based on the column
                if (i === 1) {
                    // Column 1 is the 'Total' label
                    content.textContent = "Total";
                    content.setAttribute("title", "Total");
                } else if (formattedTotals[i] !== undefined) {
                    // Set value from formattedTotals
                    content.textContent = formattedTotals[i];
                    content.setAttribute("title", formattedTotals[i]);
                }

                const edit = document.createElement("div");
                edit.className = `dt-cell__edit dt-cell__edit--col-${i}`;

                cell.appendChild(content);
                cell.appendChild(edit);
                totalRow.appendChild(cell);
            }

            footer.appendChild(totalRow);

            // Add custom styling to make the totals row stand out
            const style = document.createElement('style');
            style.textContent = `
                .dt-row-totalRow {
                    font-weight: bold;
                    background-color: #f8f8f8;
                }
                
                .dt-row-totalRow .dt-cell {
                    border-top: 1px solid #d1d8dd;
                }
            `;
            document.head.appendChild(style);
        }

        // Watch for the appearance of the filter row
        function watchForFilterRow() {
            // Create a mutation observer to watch for changes in the DOM
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' || mutation.type === 'attributes') {
                        // Check if filter inputs are now visible
                        const filterRow = document.querySelector('.dt-row-filter');
                        if (filterRow && window.getComputedStyle(filterRow).display !== 'none') {
                            console.log("Filter row is now visible, setting up listeners");
                            setupFilterListeners();
                        }
                    }
                });
            });

            // Start observing the header area
            const header = document.querySelector('.dt-header');
            if (header) {
                observer.observe(header, { childList: true, subtree: true, attributes: true });
                console.log("Watching for filter row appearance");
            } else {
                // If header isn't found, try again later
                setTimeout(watchForFilterRow, 1000);
            }
        }

        // Set up route change monitoring
        frappe.router.on('change', function() {
            setTimeout(() => {
                let currentRoute = frappe.get_route();
                if (currentRoute && currentRoute.length >= 3 && currentRoute[1] === 'List' && currentRoute[2] === 'Report') {
                    console.log("Report view detected, initializing totals calculator");

                    // Set up filter input listeners
                    setupFilterListeners();

                    // Set up data change listeners
                    setupDataChangeListeners();

                    // Watch for filter row appearance
                    watchForFilterRow();

                    // Run the first calculation after the report has fully loaded
                    setTimeout(calculateTotals, 1500);
                }
            }, 1000);
        });

        // Initial setup if already on a report page
        let currentRoute = frappe.get_route();
        if (currentRoute && currentRoute.length >= 3 && currentRoute[1] === 'List' && currentRoute[2] === 'Report') {
            console.log("Already on a report view, initializing totals calculator");

            setTimeout(() => {
                // Set up filter input listeners
                setupFilterListeners();

                // Set up data change listeners
                setupDataChangeListeners();

                // Watch for filter row appearance
                watchForFilterRow();

                // Run the first calculation
                calculateTotals();
            }, 1500); // Longer initial delay to ensure all components are loaded
        }
    }

    // Initialize when Frappe is ready
    // frappe.ready(function() {
    //     console.log("Initializing global report totals calculator");
    //     initReportTotals();
    // });

    // Also initialize when DOM is fully loaded (as a fallback)
    $(document).ready(function() {
        console.log("Document ready, initializing global report totals calculator");
        initReportTotals();
    });
})();