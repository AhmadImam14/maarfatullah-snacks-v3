let cart = {};

// QUANTITY SYSTEM
function changeQty(name, price, change){

  if(!cart[name]) cart[name] = {price, qty:0};

  cart[name].qty += change;

  if(cart[name].qty < 0) cart[name].qty = 0;

  document.getElementById('qty-'+name).innerText = cart[name].qty;

  updateCart();
}

// UPDATE CART
function updateCart(){

  let items = document.getElementById('cart-items');
  let total = 0;
  let count = 0;

  items.innerHTML = '';

  for(let key in cart){

    if(cart[key].qty > 0){

      let itemTotal = cart[key].qty * cart[key].price;

      total += itemTotal;
      count += cart[key].qty;

      items.innerHTML += `<p>${key} x${cart[key].qty} - ₦${itemTotal}</p>`;
    }
  }

  document.getElementById('cart-total').innerText = total;
  document.getElementById('cart-count').innerText = count;
  document.getElementById('cart-count-2').innerText = count;
}

// CART TOGGLE
function toggleCart(){
  document.getElementById('cart-panel').classList.toggle('active');
}

// CHECKOUT
function checkout(){

  let msg = "Hello, I want to order:%0A";
  let total = 0;

  for(let key in cart){
    if(cart[key].qty > 0){
      let itemTotal = cart[key].qty * cart[key].price;
      msg += `- ${key} x${cart[key].qty} = ₦${itemTotal}%0A`;
      total += itemTotal;
    }
  }

  msg += `%0ATotal: ₦${total}`;

  window.open("https://wa.me/2347032515203?text=" + msg, "_blank");
}

document.addEventListener("click", function (event) {
  const cartPanel = document.getElementById("cart-panel");
  const cartIcon = document.querySelector(".cart-icon");
  const floatingCart = document.querySelector(".cart");

  const clickedInsideCart = cartPanel.contains(event.target);
  const clickedCartButton =
    cartIcon?.contains(event.target) || floatingCart?.contains(event.target);

  // If cart is open AND user clicks outside → close it
  if (cartPanel.classList.contains("active") && !clickedInsideCart && !clickedCartButton) {
    cartPanel.classList.remove("active");
  }
});

const modal = document.getElementById("product-modal");

function openModal(title, description, price, image) {

  document.getElementById("modal-title").textContent = title;

  document.getElementById("modal-description").textContent = description;

  document.getElementById("modal-price").textContent = price;

  document.getElementById("modal-image").src = image;

  modal.classList.add("active");
}

function closeModal() {
  modal.classList.remove("active");
}

document
  .querySelector(".close-modal")
  .addEventListener("click", closeModal);

modal.addEventListener("click", (e) => {

  if (e.target === modal) {
    closeModal();
  }

});

// DARK MODE
function toggleDarkMode(){
  document.body.classList.toggle('dark');
}

// FADE IN SCROLL
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if(entry.isIntersecting){
      entry.target.classList.add('show');
    }
  });
});

document.querySelectorAll('.fade').forEach(el => observer.observe(el));