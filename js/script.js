"use strict";

/* ════════════════════════════════════════════
   CONFIGURAÇÕES
════════════════════════════════════════════ */
const CONFIG = {
    whatsappNumber: "5517991415758",
    // Horário de funcionamento: Quinta a Domingo das 18h às 23h
    schedule: [
        { day: 4, open: 18, close: 23 },  // Quinta
        { day: 5, open: 18, close: 23 },  // Sexta
        { day: 6, open: 18, close: 23 },  // Sábado
        { day: 0, open: 18, close: 23 },  // Domingo
    ]
};

/* ════════════════════════════════════════════
   ADICIONAIS / ACRÉSCIMOS
════════════════════════════════════════════ */
const ADDONS = [
    { name: "Champignon", price: 3.00 },
    { name: "Bacon Extra", price: 3.00 },
    { name: "Catupiry", price: 5.00 },
    { name: "Talher + Guardanapo", price: 3.00 }
];

/* ════════════════════════════════════════════
   ESTADO
════════════════════════════════════════════ */
let cart = loadCart();
let pendingOrderData = null;

/* ════════════════════════════════════════════
   REFERÊNCIAS DOM
════════════════════════════════════════════ */
const cartModal    = document.getElementById("cartModal");
const addonsModal  = document.getElementById("addonsModal");
const confirmModal = document.getElementById("confirmModal");

const cartItemsEl  = document.getElementById("cart-items");
const subtotalEl   = document.getElementById("subtotal");
const totalEl      = document.getElementById("total");
const cartCountEl  = document.getElementById("cart-count");

/* ════════════════════════════════════════════
   UTILITÁRIOS
════════════════════════════════════════════ */
function fmt(value) {
    return "R$ " + value.toFixed(2).replace(".", ",");
}

function saveCart() {
    try { sessionStorage.setItem("bizis_cart", JSON.stringify(cart)); } catch(_) {}
}

function loadCart() {
    try { return JSON.parse(sessionStorage.getItem("bizis_cart")) || []; } catch(_) { return []; }
}

/* ════════════════════════════════════════════
   TOAST
════════════════════════════════════════════ */
function showToast(msg, type = "success") {
    const colors = {
        success: { bg:"#1a3326", border:"#CC8800", color:"#FFE0A3", icon:"✓" },
        error:   { bg:"#3b1c1c", border:"#CC6600", color:"#FFC2A3", icon:"!" },
        info:    { bg:"#1a1f2a", border:"#CC8800", color:"#FFE0A3", icon:"i" },
    };
    const c = colors[type] || colors.success;
    const t = document.createElement("div");
    t.style.cssText = `
        display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:12px;
        background:${c.bg};border:1px solid ${c.border};color:${c.color};
        font-size:0.88em;font-weight:600;font-family:'Inter',sans-serif;
        box-shadow:0 8px 24px rgba(0,0,0,0.5);
        opacity:0;transform:translateX(24px);
        transition:all 0.3s cubic-bezier(0.4,0,0.2,1);
        pointer-events:none;max-width:300px;
    `;
    t.innerHTML = `<span style="font-size:1em;font-weight:900">${c.icon}</span> ${msg}`;
    document.getElementById("toast-container").appendChild(t);
    requestAnimationFrame(() => requestAnimationFrame(() => {
        t.style.opacity = "1"; t.style.transform = "translateX(0)";
    }));
    setTimeout(() => {
        t.style.opacity = "0"; t.style.transform = "translateX(24px)";
        setTimeout(() => t.remove(), 320);
    }, 2800);
}

/* ════════════════════════════════════════════
   STATUS BAR — verifica horário
════════════════════════════════════════════ */
function updateStatusBar() {
    const bar  = document.getElementById("status-bar");
    const text = document.getElementById("status-text");
    const now  = new Date();
    const day  = now.getDay();
    const hour = now.getHours();

    let isOpen = false;
    for (const s of CONFIG.schedule) {
        if (s.day === day && hour >= s.open && hour < s.close) {
            isOpen = true;
            break;
        }
    }

    if (isOpen) {
        bar.className = "status-bar open";
        text.textContent = "🟢 ABERTO AGORA • Quinta a Domingo das 18h às 23h";
    } else {
        bar.className = "status-bar closed";
        text.textContent = "🔴 FECHADO • Abrimos Quinta a Domingo das 18h às 23h";
    }
}

/* ════════════════════════════════════════════
   RENDERIZAÇÃO DOS PRODUTOS
════════════════════════════════════════════ */
function renderProducts() {
    document.querySelectorAll(".card").forEach((card, i) => {
        const product = {
            id:          Number(card.dataset.id),
            name:        card.dataset.name,
            description: card.dataset.description || "",
            price:       parseFloat(card.dataset.price),
        };
        const hasAddons = card.dataset.hasAddons === "true";

        // Animação de entrada
        card.style.cssText += `opacity:0;transform:translateY(24px);transition:opacity 0.45s ease ${i*60}ms,transform 0.45s ease ${i*60}ms`;
        requestAnimationFrame(() => requestAnimationFrame(() => {
            card.style.opacity = "1"; card.style.transform = "translateY(0)";
        }));

        const btn = card.querySelector("button");
        if (btn) {
            btn.addEventListener("click", () =>
                hasAddons ? openAddonsModal(product) : addToCart(product)
            );
        }
    });
}

/* ════════════════════════════════════════════
   MODAL ADICIONAIS
════════════════════════════════════════════ */
function openAddonsModal(product) {
    document.getElementById("modal-product-name").textContent = product.name;
    document.getElementById("modal-base-price").textContent   = "Valor base: " + fmt(product.price);

    const list = document.getElementById("addons-list");
    list.innerHTML = "";
    list.dataset.basePrice = product.price;

    ADDONS.forEach(addon => {
        list.innerHTML += `
            <label>
                <div style="display:flex;align-items:center;gap:10px">
                    <input type="checkbox" data-name="${addon.name}" data-price="${addon.price}">
                    <span>${addon.name}</span>
                </div>
                <span style="color:#FFB347;font-weight:600;font-size:0.85em">+ ${fmt(addon.price)}</span>
            </label>
        `;
    });

    list.addEventListener("change", () => {
        const base = parseFloat(list.dataset.basePrice) || 0;
        let extra = 0;
        list.querySelectorAll("input:checked").forEach(c => extra += Number(c.dataset.price));
        document.getElementById("modal-base-price").textContent = "Total com adicionais: " + fmt(base + extra);
    });

    addonsModal.dataset.product = JSON.stringify(product);
    addonsModal.classList.add("open");
    document.body.style.overflow = "hidden";
}

function closeAddonsModal() {
    addonsModal.classList.remove("open");
    document.body.style.overflow = "";
}

function confirmAddons() {
    const product  = JSON.parse(addonsModal.dataset.product);
    const selected = [];
    let finalPrice = product.price;

    document.querySelectorAll("#addons-list input:checked").forEach(box => {
        selected.push({ name: box.dataset.name, price: Number(box.dataset.price) });
        finalPrice += Number(box.dataset.price);
    });

    addToCart({ ...product, addons: selected, finalPrice });
    closeAddonsModal();
}

/* ════════════════════════════════════════════
   CARRINHO
════════════════════════════════════════════ */
function addToCart(product) {
    const existing = cart.find(item =>
        item.id === product.id &&
        JSON.stringify(item.addons || []) === JSON.stringify(product.addons || [])
    );

    if (existing) {
        existing.quantity++;
        showToast("+" + existing.quantity + " " + product.name + " no carrinho");
    } else {
        cart.push({ ...product, quantity: 1 });
        showToast(product.name + " adicionado!");
    }

    saveCart();
    updateCart();
    animateCartBtn();

    if (cart.length === 1 && cart[0].quantity === 1) openCart();
}

function animateCartBtn() {
    const btn = document.querySelector(".cart-btn");
    if (!btn) return;
    btn.classList.remove("added");
    void btn.offsetWidth;
    btn.classList.add("added");
}

function updateCart() {
    cartItemsEl.innerHTML = "";
    let subtotal = 0, count = 0;

    if (cart.length === 0) {
        cartItemsEl.innerHTML = `
            <div style="text-align:center;padding:32px 0;color:#aaa">
                <div style="font-size:2.5em;margin-bottom:8px">🛒</div>
                <p style="font-size:0.9em">Seu carrinho está vazio</p>
            </div>`;
    }

    cart.forEach((item, idx) => {
        const itemTotal = (item.finalPrice || item.price) * item.quantity;
        subtotal += itemTotal;
        count    += item.quantity;

        const div = document.createElement("div");
        div.className = "cart-item";
        div.innerHTML = `
            <div class="cart-item-details">
                <strong>${item.quantity}x ${item.name}</strong>
                ${item.addons && item.addons.length ? `<div class="addons">+ ${item.addons.map(a=>a.name).join(", ")}</div>` : ""}
            </div>
            <div class="cart-item-controls">
                <span class="price">${fmt(itemTotal)}</span>
                <button onclick="decreaseQty(${idx})" title="Diminuir">-</button>
                <button onclick="increaseQty(${idx})" title="Aumentar">+</button>
                <button onclick="removeItem(${idx})" title="Remover" style="font-size:0.8em">X</button>
            </div>
        `;
        cartItemsEl.appendChild(div);
    });

    subtotalEl.textContent  = fmt(subtotal);
    totalEl.textContent     = fmt(subtotal);
    cartCountEl.textContent = count;
    saveCart();
}

function increaseQty(i) { cart[i].quantity++; updateCart(); }

function decreaseQty(i) {
    if (cart[i].quantity > 1) { cart[i].quantity--; }
    else { cart.splice(i, 1); }
    updateCart();
}

function removeItem(i) {
    const name = cart[i].name;
    cart.splice(i, 1);
    updateCart();
    showToast(name + " removido", "info");
}

function clearCart() {
    if (!cart.length) return;
    if (!confirm("Deseja limpar todos os itens do carrinho?")) return;
    cart = [];
    updateCart();
    showToast("Carrinho limpo", "info");
}

function openCart()   { cartModal.classList.add("open");    document.body.style.overflow = "hidden"; }
function closeCart()  { cartModal.classList.remove("open"); document.body.style.overflow = ""; }
function toggleCart() { cartModal.classList.contains("open") ? closeCart() : openCart(); }

/* ════════════════════════════════════════════
   VALIDAÇÃO DE CAMPOS
════════════════════════════════════════════ */
function setError(id, on) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.borderColor = on ? "rgba(220,80,80,0.6)" : "";
    el.style.boxShadow   = on ? "0 0 0 3px rgba(220,80,80,0.12)" : "";
    el.style.background  = on ? "rgba(220,80,80,0.06)" : "";
}

/* ════════════════════════════════════════════
   FLUXO DE PEDIDO (SEM PIX)
════════════════════════════════════════════ */
function sendOrderToWhatsApp() {
    const name    = document.getElementById("customer-name").value.trim();
    const address = document.getElementById("customer-address").value.trim();

    setError("customer-name", false);
    setError("customer-address", false);

    let err = false;
    if (!name)    { setError("customer-name", true);    showToast("Informe seu nome.", "error");     err = true; }
    if (!address) { setError("customer-address", true); if (!err) showToast("Informe o endereço.", "error"); err = true; }
    if (err) return;

    if (!cart.length) { showToast("Adicione itens ao carrinho.", "error"); return; }

    // Calcula total
    let total = 0;
    cart.forEach(item => { total += (item.finalPrice || item.price) * item.quantity; });

    // Salva dados do pedido
    pendingOrderData = {
        name,
        address,
        notes: document.getElementById("order-notes").value.trim(),
        total,
        cart: JSON.parse(JSON.stringify(cart))
    };

    closeCart();
    confirmModal.classList.add("open");
    document.body.style.overflow = "hidden";
}

function sendFinalToWhatsApp() {
    if (!pendingOrderData) {
        showToast("Erro ao processar pedido", "error");
        return;
    }

    const lines = [];
    lines.push("BIZIS FOODS - BATATA NO POTE GOURMET");
    lines.push("═".repeat(40));
    lines.push("");

    pendingOrderData.cart.forEach(item => {
        const price = (item.finalPrice || item.price) * item.quantity;
        lines.push(`${item.quantity}x ${item.name} — ${fmt(price)}`);
        if (item.addons && item.addons.length) {
            lines.push("   + Adicionais: " + item.addons.map(a => a.name).join(", "));
        }
    });

    lines.push("");
    lines.push("═".repeat(40));
    lines.push(`TOTAL: ${fmt(pendingOrderData.total)}`);
    lines.push("═".repeat(40));
    lines.push("");
    lines.push(`👤 Nome: ${pendingOrderData.name}`);
    lines.push(`📍 Endereço: ${pendingOrderData.address}`);
    if (pendingOrderData.notes) lines.push(`📝 Observações: ${pendingOrderData.notes}`);
    lines.push("");
    lines.push("🍟 Todos os potes acompanham batata palha!");
    lines.push("⏱️ Tempo estimado: 40-60 minutos");

    const message = encodeURIComponent(lines.join("\n"));
    window.open("https://wa.me/" + CONFIG.whatsappNumber + "?text=" + message, "_blank");

    // Limpa carrinho e dados
    cart = [];
    pendingOrderData = null;
    saveCart();
    updateCart();

    confirmModal.classList.remove("open");
    document.body.style.overflow = "";

    showToast("Pedido enviado! Aguarde confirmação.", "success");
}

/* ════════════════════════════════════════════
   BOTÃO VOLTAR AO TOPO
════════════════════════════════════════════ */
function initBackToTop() {
    const btn = document.getElementById("back-to-top");
    if (!btn) return;
    window.addEventListener("scroll", () => {
        btn.classList.toggle("visible", window.scrollY > 300);
    });
}

/* ════════════════════════════════════════════
   NAV ATIVA NO SCROLL
════════════════════════════════════════════ */
function initActiveNav() {
    const sections = document.querySelectorAll("main section[id]");
    const links    = document.querySelectorAll(".main-nav a");
    if (!sections.length || !links.length) return;

    const obs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                links.forEach(link => {
                    const active = link.getAttribute("href") === "#" + entry.target.id;
                    link.style.color = active ? "#FFB347" : "";
                });
            }
        });
    }, { rootMargin:"-40% 0px -55% 0px" });

    sections.forEach(s => obs.observe(s));
}

/* ════════════════════════════════════════════
   FECHAR MODAIS COM ESC E CLIQUE FORA
════════════════════════════════════════════ */
function initModalEvents() {
    document.addEventListener("keydown", e => {
        if (e.key !== "Escape") return;
        if (confirmModal.classList.contains("open")) { confirmModal.classList.remove("open"); document.body.style.overflow=""; }
        else if (cartModal.classList.contains("open")) closeCart();
        else if (addonsModal.classList.contains("open")) closeAddonsModal();
    });

    addonsModal.addEventListener("click", e => { if (e.target === addonsModal) closeAddonsModal(); });
    cartModal.addEventListener("click",   e => { if (e.target === cartModal)   closeCart(); });
}

/* ════════════════════════════════════════════
   LIMPAR ERROS AO DIGITAR
════════════════════════════════════════════ */
function initFieldValidation() {
    ["customer-name","customer-address"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", () => setError(id, false));
    });
}

/* ════════════════════════════════════════════
   RODAPÉ — ANO DINÂMICO
════════════════════════════════════════════ */
function initFooterYear() {
    const el = document.getElementById("footer-year");
    if (el) el.textContent = new Date().getFullYear();
}

/* ════════════════════════════════════════════
   INIT
════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
    renderProducts();
    updateCart();
    updateStatusBar();
    initBackToTop();
    initActiveNav();
    initModalEvents();
    initFieldValidation();
    initFooterYear();

    setInterval(updateStatusBar, 60000);
});
