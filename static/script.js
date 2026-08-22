document.addEventListener("DOMContentLoaded", function () {

    /* =====================================================
       COMMON HELPERS
    ===================================================== */

    const toastContainer =
        document.getElementById("toastContainer");


    function showToast(message, type = "success") {

        if (!toastContainer) return;

        const toast = document.createElement("div");

        toast.className =
            `inventrax-toast toast-${type}`;

        toast.innerHTML = `
            <div>
                <strong>${type === "success" ? "Success" : "Notice"}</strong>
                <div>${escapeHTML(message)}</div>
            </div>
            <button class="toast-close">&times;</button>
        `;

        toastContainer.appendChild(toast);

        toast.querySelector(".toast-close")
            .addEventListener("click", () => toast.remove());

        setTimeout(() => {
            toast.remove();
        }, 4500);
    }


    function escapeHTML(value) {

        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    function money(value) {

        return new Intl.NumberFormat(
            "en-IN",
            {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 2
            }
        ).format(Number(value || 0));
    }


    function formatDate(value) {

        if (!value) return "—";

        const d = new Date(value);

        if (Number.isNaN(d.getTime())) {
            return escapeHTML(value);
        }

        return d.toLocaleString(
            "en-IN",
            {
                dateStyle: "medium",
                timeStyle: "short"
            }
        );
    }


    function todayISO() {

        const now = new Date();

        const year = now.getFullYear();

        const month = String(
            now.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            now.getDate()
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }


    async function api(url, options = {}) {

        const response = await fetch(
            url,
            {
                headers: {
                    "Content-Type": "application/json"
                },
                ...options
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Something went wrong."
            );
        }

        return data;
    }


    /* =====================================================
       NAVIGATION
    ===================================================== */

    function createUserNav() {

        const target =
            document.getElementById("appNav");

        if (!target) return;

        target.innerHTML = `

            <nav class="navbar navbar-expand-lg
                        app-navbar fixed-top">

                <div class="container-fluid px-lg-5">

                    <a class="navbar-brand brand-logo"
                       href="/stock">

                        <img
                            src="/static/images/logo.svg"
                            alt="Inventrax">

                        <span>Inventrax</span>

                    </a>


                    <button
                        class="navbar-toggler"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target="#appNavigation">

                        <i class="bi bi-list"></i>

                    </button>


                    <div
                        class="collapse navbar-collapse"
                        id="appNavigation">

                        <ul class="navbar-nav
                                   ms-auto align-items-lg-center
                                   gap-lg-3">

                            <li>
                                <a class="nav-link"
                                   href="/stock">
                                   Stock
                                </a>
                            </li>

                            <li>
                                <a class="nav-link"
                                   href="/suppliers">
                                   Suppliers
                                </a>
                            </li>

                            <li>
                                <a class="nav-link"
                                   href="/purchase-orders">
                                   Purchase Orders
                                </a>
                            </li>

                            <li>
                                <a class="nav-link"
                                   href="/sales">
                                   Sales
                                </a>
                            </li>

                            <li>
                                <a class="nav-link"
                                   href="/low-stock">
                                   Low Stock
                                </a>
                            </li>

                            <li>
                                <a class="nav-link"
                                   href="/reports">
                                   Reports
                                </a>
                            </li>

                            <li>
                                <button
                                    id="logoutButton"
                                    class="btn btn-outline-light
                                           btn-sm rounded-pill px-3">
                                    Logout
                                </button>
                            </li>

                        </ul>

                    </div>

                </div>

            </nav>
        `;

        highlightNav();

        document
            .getElementById("logoutButton")
            ?.addEventListener(
                "click",
                logout
            );
    }


    function createAdminNav() {

        const target =
            document.getElementById("adminNav");

        if (!target) return;

        target.innerHTML = `

            <nav class="navbar navbar-expand-lg
                        app-navbar admin-navbar fixed-top">

                <div class="container-fluid px-lg-5">

                    <a class="navbar-brand brand-logo"
                       href="/admin/dashboard">

                        <img
                            src="/static/images/logo.svg"
                            alt="Inventrax">

                        <span>Inventrax</span>

                        <small class="admin-label">
                            ADMIN
                        </small>

                    </a>


                    <button
                        class="navbar-toggler"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target="#adminNavigation">

                        <i class="bi bi-list"></i>

                    </button>


                    <div
                        class="collapse navbar-collapse"
                        id="adminNavigation">

                        <ul class="navbar-nav
                                   ms-auto align-items-lg-center
                                   gap-lg-3">

                            <li>
                                <a
                                    class="nav-link"
                                    href="/admin/dashboard">
                                    Dashboard
                                </a>
                            </li>

                            <li>
                                <a
                                    class="nav-link"
                                    href="/admin/users">
                                    Users
                                </a>
                            </li>

                            <li>
                                <button
                                    id="adminLogout"
                                    class="btn btn-outline-light
                                           btn-sm rounded-pill px-3">
                                    Logout
                                </button>
                            </li>

                        </ul>

                    </div>

                </div>

            </nav>
        `;

        highlightNav();

        document
            .getElementById("adminLogout")
            ?.addEventListener(
                "click",
                logout
            );
    }


    function highlightNav() {

        const current =
            window.location.pathname;

        document
            .querySelectorAll(
                ".app-navbar .nav-link"
            )
            .forEach(link => {

                const href =
                    link.getAttribute("href");

                if (href === current) {
                    link.classList.add("active");
                }

            });
    }


    async function logout() {

        try {

            const result =
                await api(
                    "/api/logout",
                    {
                        method: "POST"
                    }
                );

            sessionStorage.clear();

            window.location.href =
                result.redirect;

        } catch (error) {

            showToast(
                error.message,
                "danger"
            );
        }
    }


    createUserNav();
    createAdminNav();


    /* =====================================================
       LOGIN
    ===================================================== */

    const loginForm =
        document.getElementById("loginForm");

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                const email =
                    document
                        .getElementById("loginEmail")
                        .value
                        .trim();

                const password =
                    document
                        .getElementById("loginPassword")
                        .value;

                if (!email || !password) {

                    showToast(
                        "Please enter both fields.",
                        "danger"
                    );

                    return;
                }

                try {

                    const result =
                        await api(
                            "/api/login",
                            {
                                method: "POST",
                                body: JSON.stringify({
                                    email,
                                    password
                                })
                            }
                        );

                    window.location.href =
                        result.redirect;

                } catch (error) {

                    showToast(
                        error.message,
                        "danger"
                    );
                }
            }
        );
    }


    /* =====================================================
       REGISTER
    ===================================================== */

    const registerForm =
        document.getElementById("registerForm");

    if (registerForm) {

        registerForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                const email =
                    document
                        .getElementById("registerEmail")
                        .value
                        .trim();

                const password =
                    document
                        .getElementById("registerPassword")
                        .value;

                const confirm =
                    document
                        .getElementById("registerConfirm")
                        .value;

                if (password !== confirm) {

                    showToast(
                        "Passwords do not match.",
                        "danger"
                    );

                    return;
                }

                try {

                    await api(
                        "/api/register",
                        {
                            method: "POST",
                            body: JSON.stringify({
                                email,
                                password
                            })
                        }
                    );

                    showToast(
                        "Registration successful.",
                        "success"
                    );

                    setTimeout(() => {
                        window.location.href =
                            "/login";
                    }, 1000);

                } catch (error) {

                    showToast(
                        error.message,
                        "danger"
                    );
                }
            }
        );
    }


    /* =====================================================
       CONTACT
    ===================================================== */

    const contactForm =
        document.getElementById("contactForm");

    if (contactForm) {

        contactForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                try {

                    const result =
                        await api(
                            "/api/contact",
                            {
                                method: "POST",
                                body: JSON.stringify({
                                    name:
                                        document
                                        .getElementById(
                                            "contactName"
                                        )
                                        .value
                                        .trim(),

                                    email:
                                        document
                                        .getElementById(
                                            "contactEmail"
                                        )
                                        .value
                                        .trim(),

                                    message:
                                        document
                                        .getElementById(
                                            "contactMessage"
                                        )
                                        .value
                                        .trim()
                                })
                            }
                        );

                    showToast(
                        result.message,
                        "success"
                    );

                    contactForm.reset();

                } catch (error) {

                    showToast(
                        error.message,
                        "danger"
                    );
                }
            }
        );
    }


    /* =====================================================
       STOCK
    ===================================================== */

    let stockPage = 1;


    async function loadStock(page = 1) {

        const table =
            document.getElementById("stockTable");

        if (!table) return;

        const search =
            document
                .getElementById("stockSearch")
                ?.value
                .trim() || "";

        try {

            const data =
                await api(
                    `/api/stock?search=${encodeURIComponent(search)}&page=${page}`
                );

            stockPage = data.page;

            table.innerHTML =
                data.products.map(product => {

                    const low =
                        Number(product.quantity)
                        <=
                        Number(product.minimum_stock);

                    return `
                        <tr>

                            <td>
                                <strong>
                                    ${escapeHTML(
                                        product.product_name
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${escapeHTML(
                                    product.category
                                )}
                            </td>

                            <td>
                                ${product.quantity}
                            </td>

                            <td>
                                ${money(product.price)}
                            </td>

                            <td>
                                ${product.minimum_stock}
                            </td>

                            <td>
                                <span class="status-badge
                                    ${low ? "danger" : "success"}">
                                    ${low
                                        ? "Low Stock"
                                        : "In Stock"}
                                </span>
                            </td>

                        </tr>
                    `;

                }).join("");

            renderPagination(
                "stockPagination",
                data.page,
                data.pages,
                loadStock
            );

        } catch (error) {

            showToast(
                error.message,
                "danger"
            );
        }
    }


    document
        .getElementById("stockSearch")
        ?.addEventListener(
            "input",
            debounce(
                () => loadStock(1),
                350
            )
        );


    document
        .getElementById("stockForm")
        ?.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                const payload = {

                    product_name:
                        document
                        .getElementById(
                            "productName"
                        )
                        .value
                        .trim(),

                    category:
                        document
                        .getElementById(
                            "productCategory"
                        )
                        .value
                        .trim(),

                    quantity:
                        document
                        .getElementById(
                            "productQuantity"
                        )
                        .value,

                    price:
                        document
                        .getElementById(
                            "productPrice"
                        )
                        .value,

                    minimum_stock:
                        document
                        .getElementById(
                            "productMinimum"
                        )
                        .value
                };


                try {

                    const result =
                        await api(
                            "/api/stock",
                            {
                                method: "POST",
                                body:
                                    JSON.stringify(payload)
                            }
                        );

                    showToast(
                        result.message,
                        "success"
                    );

                    this.reset();

                    bootstrap
                        .Modal
                        .getInstance(
                            document
                            .getElementById(
                                "stockModal"
                            )
                        )
                        ?.hide();

                    loadStock(1);

                } catch (error) {

                    showToast(
                        error.message,
                        "danger"
                    );
                }
            }
        );


    /* =====================================================
       SUPPLIERS
    ===================================================== */

    async function loadSuppliers(page = 1) {

        const table =
            document.getElementById(
                "supplierTable"
            );

        if (!table) return;

        const search =
            document
                .getElementById(
                    "supplierSearch"
                )
                ?.value
                .trim() || "";

        try {

            const data =
                await api(
                    `/api/suppliers?search=${encodeURIComponent(search)}&page=${page}`
                );

            table.innerHTML =
                data.suppliers.map(item => `

                    <tr>

                        <td>
                            <strong>
                                ${escapeHTML(
                                    item.supplier_name
                                )}
                            </strong>
                        </td>

                        <td>
                            ${escapeHTML(
                                item.contact_person
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                item.email
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                item.phone
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                item.address
                            )}
                        </td>

                    </tr>

                `).join("");

            renderPagination(
                "supplierPagination",
                data.page,
                data.pages,
                loadSuppliers
            );

        } catch (error) {

            showToast(
                error.message,
                "danger"
            );
        }
    }


    document
        .getElementById(
            "supplierSearch"
        )
        ?.addEventListener(
            "input",
            debounce(
                () => loadSuppliers(1),
                350
            )
        );


    document
        .getElementById(
            "supplierForm"
        )
        ?.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                const payload = {

                    supplier_name:
                        document
                        .getElementById(
                            "supplierName"
                        )
                        .value
                        .trim(),

                    contact_person:
                        document
                        .getElementById(
                            "supplierContact"
                        )
                        .value
                        .trim(),

                    email:
                        document
                        .getElementById(
                            "supplierEmail"
                        )
                        .value
                        .trim(),

                    phone:
                        document
                        .getElementById(
                            "supplierPhone"
                        )
                        .value
                        .trim(),

                    address:
                        document
                        .getElementById(
                            "supplierAddress"
                        )
                        .value
                        .trim()
                };


                try {

                    const result =
                        await api(
                            "/api/suppliers",
                            {
                                method: "POST",
                                body:
                                    JSON.stringify(
                                        payload
                                    )
                            }
                        );

                    showToast(
                        result.message,
                        "success"
                    );

                    this.reset();

                    bootstrap
                        .Modal
                        .getInstance(
                            document
                            .getElementById(
                                "supplierModal"
                            )
                        )
                        ?.hide();

                    loadSuppliers(1);

                } catch (error) {

                    showToast(
                        error.message,
                        "danger"
                    );
                }
            }
        );


    /* =====================================================
       PURCHASE ORDERS
    ===================================================== */

    async function loadPurchaseOrders(page = 1) {

        const table =
            document.getElementById(
                "purchaseTable"
            );

        if (!table) return;

        const search =
            document
                .getElementById(
                    "purchaseSearch"
                )
                ?.value
                .trim() || "";

        try {

            const data =
                await api(
                    `/api/purchase-orders?search=${encodeURIComponent(search)}&page=${page}`
                );

            table.innerHTML =
                data.orders.map(item => `

                    <tr>

                        <td>
                            ${escapeHTML(
                                item.supplier_name
                            )}
                        </td>

                        <td>
                            <strong>
                                ${escapeHTML(
                                    item.product_name
                                )}
                            </strong>
                        </td>

                        <td>
                            ${item.quantity}
                        </td>

                        <td>
                            ${money(
                                item.unit_price
                            )}
                        </td>

                        <td>
                            ${money(
                                item.total_amount
                            )}
                        </td>

                        <td>
                            <span class="status-badge
                                ${item.status === "Received"
                                    ? "success"
                                    : item.status === "Cancelled"
                                    ? "danger"
                                    : "warning"}">
                                ${escapeHTML(
                                    item.status
                                )}
                            </span>
                        </td>

                        <td>
                            ${formatDate(
                                item.order_date
                            )}
                        </td>

                    </tr>

                `).join("");

            renderPagination(
                "purchasePagination",
                data.page,
                data.pages,
                loadPurchaseOrders
            );

        } catch (error) {

            showToast(
                error.message,
                "danger"
            );
        }
    }


    document
        .getElementById(
            "purchaseSearch"
        )
        ?.addEventListener(
            "input",
            debounce(
                () => loadPurchaseOrders(1),
                350
            )
        );


    function calculatePurchaseTotal() {

        const quantity =
            Number(
                document
                .getElementById(
                    "purchaseQuantity"
                )
                ?.value || 0
            );

        const price =
            Number(
                document
                .getElementById(
                    "purchasePrice"
                )
                ?.value || 0
            );

        const total =
            document
            .getElementById(
                "purchaseTotal"
            );

        if (total) {
            total.value =
                money(quantity * price);
        }
    }


    document
        .getElementById(
            "purchaseQuantity"
        )
        ?.addEventListener(
            "input",
            calculatePurchaseTotal
        );

    document
        .getElementById(
            "purchasePrice"
        )
        ?.addEventListener(
            "input",
            calculatePurchaseTotal
        );


    document
        .getElementById(
            "purchaseForm"
        )
        ?.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                const payload = {

                    supplier_name:
                        document
                        .getElementById(
                            "purchaseSupplier"
                        )
                        .value
                        .trim(),

                    product_name:
                        document
                        .getElementById(
                            "purchaseProduct"
                        )
                        .value
                        .trim(),

                    quantity:
                        document
                        .getElementById(
                            "purchaseQuantity"
                        )
                        .value,

                    unit_price:
                        document
                        .getElementById(
                            "purchasePrice"
                        )
                        .value,

                    status:
                        document
                        .getElementById(
                            "purchaseStatus"
                        )
                        .value
                };


                try {

                    const result =
                        await api(
                            "/api/purchase-orders",
                            {
                                method: "POST",
                                body:
                                    JSON.stringify(
                                        payload
                                    )
                            }
                        );

                    showToast(
                        result.message,
                        "success"
                    );

                    this.reset();

                    document
                        .getElementById(
                            "purchaseTotal"
                        )
                        .value = "";

                    bootstrap
                        .Modal
                        .getInstance(
                            document
                            .getElementById(
                                "purchaseModal"
                            )
                        )
                        ?.hide();

                    loadPurchaseOrders(1);

                } catch (error) {

                    showToast(
                        error.message,
                        "danger"
                    );
                }
            }
        );


    /* =====================================================
       SALES
    ===================================================== */

    async function loadSales(page = 1) {

        const table =
            document.getElementById(
                "salesTable"
            );

        if (!table) return;

        const search =
            document
                .getElementById(
                    "salesSearch"
                )
                ?.value
                .trim() || "";

        try {

            const data =
                await api(
                    `/api/sales?search=${encodeURIComponent(search)}&page=${page}`
                );

            table.innerHTML =
                data.sales.map(item => `

                    <tr>

                        <td>
                            <strong>
                                ${escapeHTML(
                                    item.product_name
                                )}
                            </strong>
                        </td>

                        <td>
                            ${item.quantity}
                        </td>

                        <td>
                            ${money(
                                item.unit_price
                            )}
                        </td>

                        <td>
                            ${money(
                                item.total_amount
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                item.sale_date
                            )}
                        </td>

                    </tr>

                `).join("");

            renderPagination(
                "salesPagination",
                data.page,
                data.pages,
                loadSales
            );

        } catch (error) {

            showToast(
                error.message,
                "danger"
            );
        }
    }


    document
        .getElementById(
            "salesSearch"
        )
        ?.addEventListener(
            "input",
            debounce(
                () => loadSales(1),
                350
            )
        );


    function calculateSalesTotal() {

        const quantity =
            Number(
                document
                .getElementById(
                    "salesQuantity"
                )
                ?.value || 0
            );

        const price =
            Number(
                document
                .getElementById(
                    "salesPrice"
                )
                ?.value || 0
            );

        const total =
            document
            .getElementById(
                "salesTotal"
            );

        if (total) {
            total.value =
                money(quantity * price);
        }
    }


    document
        .getElementById(
            "salesQuantity"
        )
        ?.addEventListener(
            "input",
            calculateSalesTotal
        );

    document
        .getElementById(
            "salesPrice"
        )
        ?.addEventListener(
            "input",
            calculateSalesTotal
        );


    document
        .getElementById(
            "salesForm"
        )
        ?.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                const payload = {

                    product_name:
                        document
                        .getElementById(
                            "salesProduct"
                        )
                        .value
                        .trim(),

                    quantity:
                        document
                        .getElementById(
                            "salesQuantity"
                        )
                        .value,

                    unit_price:
                        document
                        .getElementById(
                            "salesPrice"
                        )
                        .value
                };


                try {

                    const result =
                        await api(
                            "/api/sales",
                            {
                                method: "POST",
                                body:
                                    JSON.stringify(
                                        payload
                                    )
                            }
                        );

                    showToast(
                        result.message,
                        "success"
                    );

                    this.reset();

                    document
                        .getElementById(
                            "salesTotal"
                        )
                        .value = "";

                    bootstrap
                        .Modal
                        .getInstance(
                            document
                            .getElementById(
                                "salesModal"
                            )
                        )
                        ?.hide();

                    loadSales(1);

                } catch (error) {

                    showToast(
                        error.message,
                        "danger"
                    );
                }
            }
        );


    /* =====================================================
       LOW STOCK
    ===================================================== */

    async function loadLowStock() {

        const table =
            document.getElementById(
                "lowStockTable"
            );

        if (!table) return;

        try {

            const data =
                await api(
                    "/api/low-stock"
                );

            table.innerHTML =
                data.products.map(item => `

                    <tr>

                        <td>
                            <strong>
                                ${escapeHTML(
                                    item.product_name
                                )}
                            </strong>
                        </td>

                        <td>
                            ${escapeHTML(
                                item.category
                            )}
                        </td>

                        <td>
                            ${item.quantity}
                        </td>

                        <td>
                            ${item.minimum_stock}
                        </td>

                        <td>

                            <span class="status-badge danger">
                                Low Stock
                            </span>

                        </td>

                    </tr>

                `).join("");

        } catch (error) {

            showToast(
                error.message,
                "danger"
            );
        }
    }


    /* =====================================================
       REPORTS
    ===================================================== */

    const reportFrom =
        document.getElementById(
            "reportFrom"
        );

    const reportTo =
        document.getElementById(
            "reportTo"
        );


    if (reportFrom && reportTo) {

        const today = todayISO();

        reportFrom.value = today;
        reportTo.value = today;

        loadReports(
            today,
            today
        );
    }


    document
        .getElementById(
            "reportButton"
        )
        ?.addEventListener(
            "click",
            function () {

                const from =
                    reportFrom.value;

                const to =
                    reportTo.value;

                if (!from || !to) {

                    showToast(
                        "Select both dates.",
                        "danger"
                    );

                    return;
                }

                if (from > to) {

                    showToast(
                        "From Date cannot be after To Date.",
                        "danger"
                    );

                    return;
                }

                loadReports(
                    from,
                    to
                );
            }
        );


    async function loadReports(
        from,
        to
    ) {

        try {

            const data =
                await api(
                    `/api/reports?from_date=${from}&to_date=${to}`
                );

            document
                .getElementById(
                    "reportSales"
                )
                .textContent =
                data.sales_summary.total_sales;

            document
                .getElementById(
                    "reportRevenue"
                )
                .textContent =
                money(
                    data.sales_summary.revenue
                );

            document
                .getElementById(
                    "reportOrders"
                )
                .textContent =
                data.purchase_summary.total_orders;

            document
                .getElementById(
                    "reportRange"
                )
                .textContent =
                `${from} → ${to}`;


            document
                .getElementById(
                    "reportSalesTable"
                )
                .innerHTML =
                data.sales_records.map(item => `

                    <tr>

                        <td>
                            ${escapeHTML(
                                item.product_name
                            )}
                        </td>

                        <td>
                            ${item.quantity}
                        </td>

                        <td>
                            ${money(
                                item.unit_price
                            )}
                        </td>

                        <td>
                            ${money(
                                item.total_amount
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                item.sale_date
                            )}
                        </td>

                    </tr>

                `).join("");


            document
                .getElementById(
                    "reportPurchaseTable"
                )
                .innerHTML =
                data.purchase_records.map(item => `

                    <tr>

                        <td>
                            ${escapeHTML(
                                item.supplier_name
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                item.product_name
                            )}
                        </td>

                        <td>
                            ${item.quantity}
                        </td>

                        <td>
                            ${money(
                                item.total_amount
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                item.status
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                item.order_date
                            )}
                        </td>

                    </tr>

                `).join("");

        } catch (error) {

            showToast(
                error.message,
                "danger"
            );
        }
    }


    /* =====================================================
       ADMIN DASHBOARD
    ===================================================== */

    async function loadAdminDashboard() {

        const adminUsers =
            document.getElementById(
                "adminUsers"
            );

        if (!adminUsers) return;

        try {

            const data =
                await api(
                    "/api/admin/dashboard"
                );

            const s = data.stats;

            document
                .getElementById(
                    "adminUsers"
                )
                .textContent = s.users;

            document
                .getElementById(
                    "adminProducts"
                )
                .textContent = s.products;

            document
                .getElementById(
                    "adminInventory"
                )
                .textContent =
                money(s.inventory_value);

            document
                .getElementById(
                    "adminLowStock"
                )
                .textContent = s.low_stock;

            document
                .getElementById(
                    "adminSuppliers"
                )
                .textContent = s.suppliers;

            document
                .getElementById(
                    "adminOrders"
                )
                .textContent = s.orders;

            document
                .getElementById(
                    "adminSales"
                )
                .textContent = s.sales;

            document
                .getElementById(
                    "adminRevenue"
                )
                .textContent =
                money(s.revenue);


            document
                .getElementById(
                    "recentUsersTable"
                )
                .innerHTML =
                data.recent_users.map(user => `

                    <tr>

                        <td>
                            ${escapeHTML(
                                user.email
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                user.created_at
                            )}
                        </td>

                        <td>

                            <span class="status-badge
                                ${user.status === "Active"
                                    ? "success"
                                    : "danger"}">

                                ${escapeHTML(
                                    user.status
                                )}

                            </span>

                        </td>

                    </tr>

                `).join("");


            document
                .getElementById(
                    "recentSalesTable"
                )
                .innerHTML =
                data.recent_sales.map(item => `

                    <tr>

                        <td>
                            ${escapeHTML(
                                item.email
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                item.product_name
                            )}
                        </td>

                        <td>
                            ${money(
                                item.total_amount
                            )}
                        </td>

                    </tr>

                `).join("");


            document
                .getElementById(
                    "adminLowStockTable"
                )
                .innerHTML =
                data.low_stock_items.map(item => `

                    <tr>

                        <td>
                            ${escapeHTML(
                                item.email
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                item.product_name
                            )}
                        </td>

                        <td>
                            ${item.quantity}
                        </td>

                        <td>
                            ${item.minimum_stock}
                        </td>

                    </tr>

                `).join("");

        } catch (error) {

            showToast(
                error.message,
                "danger"
            );
        }
    }


    /* =====================================================
       ADMIN USERS
    ===================================================== */

    async function loadAdminUsers() {

        const list =
            document.getElementById(
                "userList"
            );

        if (!list) return;

        const search =
            document
                .getElementById(
                    "adminUserSearch"
                )
                ?.value
                .trim() || "";

        try {

            const data =
                await api(
                    `/api/admin/users?search=${encodeURIComponent(search)}`
                );

            document
                .getElementById(
                    "userCount"
                )
                .textContent =
                `${data.users.length} users`;


            list.innerHTML =
                data.users.map(user => `

                    <button
                        class="user-list-item"
                        data-user-id="${user.id}">

                        <div class="user-avatar">

                            <i class="bi bi-person"></i>

                        </div>

                        <div class="user-main">

                            <strong>
                                ${escapeHTML(
                                    user.email
                                )}
                            </strong>

                            <small>
                                Registered
                                ${formatDate(
                                    user.created_at
                                )}
                            </small>

                        </div>

                        <i class="bi bi-chevron-right"></i>

                    </button>

                `).join("");


            list
                .querySelectorAll(
                    ".user-list-item"
                )
                .forEach(button => {

                    button.addEventListener(
                        "click",
                        function () {

                            loadAdminUserDetails(
                                this.dataset.userId
                            );

                        }
                    );

                });

        } catch (error) {

            showToast(
                error.message,
                "danger"
            );
        }
    }


    async function loadAdminUserDetails(
        userId
    ) {

        const panel =
            document.getElementById(
                "selectedUserPanel"
            );

        if (!panel) return;

        try {

            const data =
                await api(
                    `/api/admin/users/${userId}`
                );

            const user =
                data.user;


            panel.innerHTML = `

                <div class="selected-user-header">

                    <div class="user-avatar large">

                        <i class="bi bi-person"></i>

                    </div>

                    <div>

                        <span class="eyebrow">
                            USER PROFILE
                        </span>

                        <h3>
                            ${escapeHTML(
                                user.email
                            )}
                        </h3>

                    </div>

                </div>


                <div class="user-info-grid">

                    <div>
                        <span>EMAIL</span>
                        <strong>
                            ${escapeHTML(
                                user.email
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>ROLE</span>
                        <strong>
                            ${escapeHTML(
                                user.role
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>REGISTERED</span>
                        <strong>
                            ${formatDate(
                                user.created_at
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>LAST LOGIN</span>
                        <strong>
                            ${formatDate(
                                user.last_login
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>STATUS</span>
                        <strong>
                            ${escapeHTML(
                                user.status
                            )}
                        </strong>
                    </div>

                    <div>
                        <span>PASSWORD</span>
                        <strong>
                            Protected
                        </strong>
                    </div>

                </div>


                <div class="detail-section">

                    <h4>
                        Products
                    </h4>

                    <div class="table-responsive">

                        <table class="table modern-table">

                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Category</th>
                                    <th>Qty</th>
                                    <th>Price</th>
                                </tr>
                            </thead>

                            <tbody>

                                ${data.products.map(
                                    item => `

                                    <tr>

                                        <td>
                                            ${escapeHTML(
                                                item.product_name
                                            )}
                                        </td>

                                        <td>
                                            ${escapeHTML(
                                                item.category
                                            )}
                                        </td>

                                        <td>
                                            ${item.quantity}
                                        </td>

                                        <td>
                                            ${money(
                                                item.price
                                            )}
                                        </td>

                                    </tr>

                                `
                                ).join("")}

                            </tbody>

                        </table>

                    </div>

                </div>


                <div class="detail-section">

                    <h4>
                        Purchase Orders
                    </h4>

                    <div class="table-responsive">

                        <table class="table modern-table">

                            <thead>

                                <tr>

                                    <th>Supplier</th>
                                    <th>Product</th>
                                    <th>Qty</th>
                                    <th>Total</th>
                                    <th>Status</th>

                                </tr>

                            </thead>

                            <tbody>

                                ${data.orders.map(
                                    item => `

                                    <tr>

                                        <td>
                                            ${escapeHTML(
                                                item.supplier_name
                                            )}
                                        </td>

                                        <td>
                                            ${escapeHTML(
                                                item.product_name
                                            )}
                                        </td>

                                        <td>
                                            ${item.quantity}
                                        </td>

                                        <td>
                                            ${money(
                                                item.total_amount
                                            )}
                                        </td>

                                        <td>
                                            ${escapeHTML(
                                                item.status
                                            )}
                                        </td>

                                    </tr>

                                `
                                ).join("")}

                            </tbody>

                        </table>

                    </div>

                </div>


                <div class="detail-section">

                    <h4>
                        Sales
                    </h4>

                    <div class="table-responsive">

                        <table class="table modern-table">

                            <thead>

                                <tr>

                                    <th>Product</th>
                                    <th>Qty</th>
                                    <th>Total</th>
                                    <th>Date</th>

                                </tr>

                            </thead>

                            <tbody>

                                ${data.sales.map(
                                    item => `

                                    <tr>

                                        <td>
                                            ${escapeHTML(
                                                item.product_name
                                            )}
                                        </td>

                                        <td>
                                            ${item.quantity}
                                        </td>

                                        <td>
                                            ${money(
                                                item.total_amount
                                            )}
                                        </td>

                                        <td>
                                            ${formatDate(
                                                item.sale_date
                                            )}
                                        </td>

                                    </tr>

                                `
                                ).join("")}

                            </tbody>

                        </table>

                    </div>

                </div>


                <div class="detail-section">

                    <h4>
                        Low Stock
                    </h4>

                    <div class="table-responsive">

                        <table class="table modern-table">

                            <thead>

                                <tr>

                                    <th>Product</th>
                                    <th>Quantity</th>
                                    <th>Minimum</th>

                                </tr>

                            </thead>

                            <tbody>

                                ${data.low_stock.map(
                                    item => `

                                    <tr>

                                        <td>
                                            ${escapeHTML(
                                                item.product_name
                                            )}
                                        </td>

                                        <td>
                                            ${item.quantity}
                                        </td>

                                        <td>
                                            ${item.minimum_stock}
                                        </td>

                                    </tr>

                                `
                                ).join("")}

                            </tbody>

                        </table>

                    </div>

                </div>

            `;

        } catch (error) {

            showToast(
                error.message,
                "danger"
            );
        }
    }


    document
        .getElementById(
            "adminUserSearch"
        )
        ?.addEventListener(
            "input",
            debounce(
                loadAdminUsers,
                350
            )
        );


    /* =====================================================
       PAGINATION
    ===================================================== */

    function renderPagination(
        elementId,
        current,
        total,
        callback
    ) {

        const element =
            document.getElementById(
                elementId
            );

        if (!element) return;

        if (total <= 1) {

            element.innerHTML = "";

            return;
        }

        let html = "";

        html += `
            <button
                class="page-button"
                ${current === 1 ? "disabled" : ""}
                data-page="${current - 1}">
                Previous
            </button>
        `;

        const start =
            Math.max(
                1,
                current - 2
            );

        const end =
            Math.min(
                total,
                current + 2
            );

        for (
            let i = start;
            i <= end;
            i++
        ) {

            html += `
                <button
                    class="page-button
                    ${i === current ? "active" : ""}"
                    data-page="${i}">
                    ${i}
                </button>
            `;
        }

        html += `
            <button
                class="page-button"
                ${current === total ? "disabled" : ""}
                data-page="${current + 1}">
                Next
            </button>
        `;

        element.innerHTML = html;

        element
            .querySelectorAll(
                ".page-button"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    function () {

                        const page =
                            Number(
                                this.dataset.page
                            );

                        if (
                            page >= 1 &&
                            page <= total
                        ) {

                            callback(page);
                        }

                    }
                );

            });
    }


    /* =====================================================
       SESSION STORAGE
    ===================================================== */

    function saveTemporaryForm(
        formId,
        fields
    ) {

        const form =
            document.getElementById(
                formId
            );

        if (!form) return;

        fields.forEach(id => {

            const element =
                document.getElementById(id);

            if (!element) return;

            const key =
                `inventrax_${formId}_${id}`;

            const saved =
                sessionStorage.getItem(key);

            if (
                saved !== null &&
                !element.value
            ) {
                element.value = saved;
            }

            element.addEventListener(
                "input",
                function () {

                    sessionStorage.setItem(
                        key,
                        element.value
                    );

                }
            );

        });
    }


    saveTemporaryForm(
        "stockForm",
        [
            "productName",
            "productCategory",
            "productQuantity",
            "productPrice",
            "productMinimum"
        ]
    );


    saveTemporaryForm(
        "supplierForm",
        [
            "supplierName",
            "supplierContact",
            "supplierEmail",
            "supplierPhone",
            "supplierAddress"
        ]
    );


    saveTemporaryForm(
        "purchaseForm",
        [
            "purchaseSupplier",
            "purchaseProduct",
            "purchaseQuantity",
            "purchasePrice"
        ]
    );


    saveTemporaryForm(
        "salesForm",
        [
            "salesProduct",
            "salesQuantity",
            "salesPrice"
        ]
    );


    /* =====================================================
       DEBOUNCE
    ===================================================== */

    function debounce(
        callback,
        delay
    ) {

        let timer;

        return function (...args) {

            clearTimeout(timer);

            timer =
                setTimeout(
                    () => callback.apply(
                        this,
                        args
                    ),
                    delay
                );
        };
    }


    /* =====================================================
       INITIAL PAGE LOADS
    ===================================================== */

   loadStock();
loadSuppliers();
loadPurchaseOrders();
loadSales();
loadLowStock();


// =========================================================
// ADMIN PAGE INITIALIZATION
// =========================================================

// Admin Dashboard
// Only run when the dashboard actually exists on the page.

if (document.getElementById("adminUsers")) {

    loadAdminDashboard();

}


// Admin User Management
// Only run when the user-management page exists.

if (document.getElementById("userList")) {

    loadAdminUsers();

}
});