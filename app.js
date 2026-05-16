// Default Initial Data
const defaultMenu = [
    { id: '1', name: 'Idly (2 pcs)', price: 40, image: 'assets/idly_kerala_1778077525739.png' },
    { id: '2', name: 'Kerala Puttu', price: 60, image: 'assets/puttu_kerala_1778077541120.png' },
    { id: '3', name: 'Poori Masala', price: 70, image: 'assets/poori_kerala_1778077557388.png' },
    { id: '4', name: 'Filter Coffee', price: 25, image: 'assets/coffee_kerala_1778077579421.png' },
    { id: '5', name: 'Ghee Roast Dosai', price: 80, image: 'assets/dosai_kerala_1778077596962.png' },
    { id: '6', name: 'Medu Vada (2 pcs)', price: 30, image: 'assets/vada_kerala_1778077614157.png' },
    { id: '7', name: 'Pazhampori', price: 15, image: 'assets/pazhampori_kerala_1778077641977.png' }
];

// App State
let savedMenu = null;
try {
    savedMenu = JSON.parse(localStorage.getItem('kb_menu'));
} catch (e) {
    console.error("Error parsing menu from localStorage", e);
}

let savedOrders = null;
try {
    savedOrders = JSON.parse(localStorage.getItem('kb_orders'));
} catch (e) {
    console.error("Error parsing orders from localStorage", e);
}

let state = {
    menu: (savedMenu && savedMenu.length > 0) ? savedMenu : defaultMenu,
    cart: [],
    orders: savedOrders || []
};

// Utilities
function saveState() {
    localStorage.setItem('kb_menu', JSON.stringify(state.menu));
    localStorage.setItem('kb_orders', JSON.stringify(state.orders));
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initNavigation();
    renderMenuGrid();
    renderManageMenu();
    renderReports();
    initPOSControls();
    initMenuControls();
});

// --- NAVIGATION ---
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-links li');
    const views = document.querySelectorAll('.view-section');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Update Active Link
            navLinks.forEach(n => n.classList.remove('active'));
            link.classList.add('active');

            // Show Target View
            const targetView = link.getAttribute('data-view');
            views.forEach(view => {
                view.classList.remove('active');
                if (view.id === `${targetView}-view`) {
                    view.classList.add('active');
                }
            });

            // Re-render data if necessary
            if (targetView === 'reports') renderReports();
        });
    });
}

// --- POS VIEW ---
function renderMenuGrid() {
    const grid = document.getElementById('pos-menu-grid');
    grid.innerHTML = '';

    state.menu.forEach(item => {
        const card = document.createElement('div');
        card.className = 'menu-item glass-panel';
        card.innerHTML = `
            <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/200?text=No+Image'">
            <div class="menu-item-info">
                <h3>${item.name}</h3>
                <span class="menu-item-price">₹${item.price.toFixed(2)}</span>
            </div>
        `;
        card.addEventListener('click', () => addToCart(item));
        grid.appendChild(card);
    });
}

function addToCart(item) {
    const existing = state.cart.find(i => i.id === item.id);
    if (existing) {
        existing.qty += 1;
    } else {
        state.cart.push({ ...item, qty: 1 });
    }
    renderCart();
}

function updateCartQty(id, delta) {
    const item = state.cart.find(i => i.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) {
            state.cart = state.cart.filter(i => i.id !== id);
        }
        renderCart();
    }
}

function renderCart() {
    const cartContainer = document.getElementById('cart-items');
    cartContainer.innerHTML = '';

    let subtotal = 0;

    if (state.cart.length === 0) {
        cartContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted); margin-top:2rem;">Cart is empty</p>';
    } else {
        state.cart.forEach(item => {
            subtotal += item.price * item.qty;
            const el = document.createElement('div');
            el.className = 'cart-item';
            el.innerHTML = `
                <div class="cart-item-details">
                    <h4>${item.name}</h4>
                    <p>₹${item.price.toFixed(2)} x ${item.qty}</p>
                </div>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="updateCartQty('${item.id}', -1)">-</button>
                    <span>${item.qty}</span>
                    <button class="qty-btn" onclick="updateCartQty('${item.id}', 1)">+</button>
                </div>
            `;
            cartContainer.appendChild(el);
        });
    }

    const tax = subtotal * 0.05;
    const total = subtotal + tax;

    document.getElementById('cart-subtotal').innerText = `₹${subtotal.toFixed(2)}`;
    document.getElementById('cart-tax').innerText = `₹${tax.toFixed(2)}`;
    document.getElementById('cart-total').innerText = `₹${total.toFixed(2)}`;
}

function initPOSControls() {
    // Clear Cart
    document.getElementById('btn-clear-cart').addEventListener('click', () => {
        state.cart = [];
        renderCart();
    });

    // Pay Now Modal
    const modal = document.getElementById('payment-modal');
    document.getElementById('btn-pay-now').addEventListener('click', () => {
        if (state.cart.length === 0) return alert("Cart is empty!");
        
        const total = parseFloat(document.getElementById('cart-total').innerText.replace('₹', ''));
        document.getElementById('payment-total').innerText = `₹${total.toFixed(2)}`;
        
        // Generate generic UPI QR (using generic UPI format)
        const qrcodeContainer = document.getElementById('qrcode');
        qrcodeContainer.innerHTML = '';
        new QRCode(qrcodeContainer, {
            text: `upi://pay?pa=merchant@upi&pn=Hareesh%20Restaurant&am=${total}&cu=INR`,
            width: 200,
            height: 200,
            colorDark : "#1b4332",
            colorLight : "#ffffff",
        });

        modal.classList.add('active');
    });

    document.getElementById('close-payment').addEventListener('click', () => {
        modal.classList.remove('active');
    });

    // Complete Payment
    document.getElementById('btn-complete-payment').addEventListener('click', () => {
        const total = parseFloat(document.getElementById('cart-total').innerText.replace('₹', ''));
        const order = {
            id: 'ORD-' + generateId().toUpperCase(),
            date: new Date().toISOString(),
            items: [...state.cart],
            total: total
        };
        state.orders.unshift(order); // Add to beginning
        saveState();
        
        state.cart = [];
        renderCart();
        modal.classList.remove('active');
        
        // Refresh reports if open
        renderReports();
        alert('Payment completed successfully!');
    });

    // Print Bill
    document.getElementById('btn-print-bill').addEventListener('click', () => {
        if (state.cart.length === 0) return alert("Cart is empty!");
        printReceipt();
    });
}

function printReceipt() {
    const rDate = document.getElementById('receipt-date');
    const rItems = document.getElementById('receipt-items');
    
    rDate.innerText = new Date().toLocaleString();
    rItems.innerHTML = '';
    
    state.cart.forEach(item => {
        const row = document.createElement('div');
        row.className = 'receipt-item-row';
        row.innerHTML = `<span>${item.name} x${item.qty}</span> <span>₹${(item.price * item.qty).toFixed(2)}</span>`;
        rItems.appendChild(row);
    });

    document.getElementById('receipt-subtotal').innerText = document.getElementById('cart-subtotal').innerText;
    document.getElementById('receipt-tax').innerText = document.getElementById('cart-tax').innerText;
    document.getElementById('receipt-total').innerText = document.getElementById('cart-total').innerText;

    window.print();
}

// --- MANAGE MENU VIEW ---
function initMenuControls() {
    document.getElementById('add-menu-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('item-name').value;
        const price = parseFloat(document.getElementById('item-price').value);
        const image = document.getElementById('item-image').value || 'https://via.placeholder.com/200?text=No+Image';

        const newItem = {
            id: generateId(),
            name, price, image
        };

        state.menu.push(newItem);
        saveState();
        renderMenuGrid(); // Update POS
        renderManageMenu(); // Update table
        e.target.reset();
    });
}

function renderManageMenu() {
    const tbody = document.getElementById('manage-menu-tbody');
    tbody.innerHTML = '';

    state.menu.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/50?text=Img'"></td>
            <td>${item.name}</td>
            <td>₹${item.price.toFixed(2)}</td>
            <td>
                <button class="action-btn" onclick="deleteMenuItem('${item.id}')" title="Delete">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

// Expose delete to window for inline onclick
window.deleteMenuItem = function(id) {
    if(confirm("Are you sure you want to delete this item?")) {
        state.menu = state.menu.filter(i => i.id !== id);
        saveState();
        renderMenuGrid();
        renderManageMenu();
    }
};

window.updateCartQty = updateCartQty; // Expose for inline onclick

// --- REPORTS VIEW ---
function renderReports() {
    const totalRevenue = state.orders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = state.orders.length;

    document.getElementById('total-revenue-display').innerText = `₹${totalRevenue.toFixed(2)}`;
    document.getElementById('total-orders-display').innerText = totalOrders;

    const tbody = document.getElementById('reports-tbody');
    tbody.innerHTML = '';

    if (state.orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--text-muted)">No orders yet</td></tr>';
        return;
    }

    state.orders.forEach(order => {
        const tr = document.createElement('tr');
        const itemsStr = order.items.map(i => `${i.name} (${i.qty})`).join(', ');
        tr.innerHTML = `
            <td>#${order.id}</td>
            <td>${new Date(order.date).toLocaleString()}</td>
            <td>${itemsStr}</td>
            <td style="font-weight:600; color:var(--primary-dark)">₹${order.total.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });
}
