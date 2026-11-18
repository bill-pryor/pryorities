import { drinks, featuredNames, spiritFilters } from './menu-data.js';

const state = { collection: 'engagements', spirit: 'All', query: '', savedOnly: false };
const $ = (selector) => document.querySelector(selector);
const featuredGrid = $('#featuredGrid');
const list = $('#menuList');
const filters = $('#spiritFilters');
const modal = $('#recipeModal');
const dialog = $('.recipe-dialog');
const details = $('#recipeDetails');
const search = $('#drinkSearch');
let previousFocus = null;
let selectedIndex = null;

const safeText = (text) => String(text).replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const normalize = (value) => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

let saved;
try {
  saved = new Set(JSON.parse(localStorage.getItem('pryorities-favorites-v1') || '[]'));
} catch {
  saved = new Set();
}

function saveFavorites() {
  try { localStorage.setItem('pryorities-favorites-v1', JSON.stringify([...saved])); } catch { /* Browsing still works when storage is blocked. */ }
  $('#savedCount').textContent = String(saved.size);
  if (selectedIndex !== null) {
    const button = $('#saveCurrent');
    if (button) button.textContent = saved.has(drinks[selectedIndex].name) ? '♥ Saved to your list' : '♡ Save this drink';
  }
}

function renderFeatured() {
  featuredGrid.innerHTML = featuredNames.map((name, n) => {
    const index = drinks.findIndex((drink) => drink.name === name);
    const drink = drinks[index];
    const imagePosition = drink.name === 'Old Fashioned' ? 'style="object-position:74% center"' : '';
    return `<button class="featured-card" data-drink-index="${index}" type="button" aria-label="View ${safeText(name)} recipe">
      <img src="assets/${safeText(drink.photo)}" alt="AI-generated ${safeText(name)} cocktail photograph" loading="${n === 0 ? 'eager' : 'lazy'}" ${imagePosition}>
      <span class="featured-card-detail"><small>THE HOUSE SELECTION · 0${n + 1}</small><strong>${safeText(name)}</strong><span>${safeText(drink.summary)} <b aria-hidden="true">→</b></span></span>
    </button>`;
  }).join('');
}

function renderFilters() {
  filters.innerHTML = spiritFilters.map((name) => `<button class="filter-chip ${state.spirit === name ? 'is-active' : ''}" type="button" data-spirit="${safeText(name)}" aria-pressed="${state.spirit === name}">${safeText(name)}</button>`).join('');
}

function getMatchingDrinks() {
  return drinks.map((drink, index) => ({ ...drink, index })).filter((drink) => {
    if (drink.collection !== state.collection) return false;
    if (state.spirit !== 'All' && drink.spirit !== state.spirit) return false;
    if (state.savedOnly && !saved.has(drink.name)) return false;
    if (state.query && !normalize([drink.name, drink.summary, drink.spirit, ...drink.ingredients].join(' ')).includes(normalize(state.query))) return false;
    return true;
  });
}

function renderMenu() {
  const matching = getMatchingDrinks();
  list.innerHTML = matching.map((drink, index) => `<button class="menu-row" type="button" data-drink-index="${drink.index}" aria-label="View the recipe for ${safeText(drink.name)}">
      <span class="row-number">${String(index + 1).padStart(2, '0')}</span>
      <span class="row-main"><span class="row-title">${safeText(drink.name)}</span><span class="row-summary">${safeText(drink.summary)}</span></span>
      <span class="row-spirit">${safeText(drink.spirit)}</span><span class="row-arrow" aria-hidden="true">→</span>
    </button>`).join('');
  $('#resultsLabel').textContent = `${matching.length} ${matching.length === 1 ? 'COCKTAIL' : 'COCKTAILS'}`;
  $('#emptyState').hidden = matching.length !== 0;
  renderFilters();
  saveFavorites();
}

function selectCollection(collection) {
  if (!['engagements', 'indiscretions'].includes(collection)) return;
  state.collection = collection;
  state.spirit = 'All';
  state.query = '';
  search.value = '';
  state.savedOnly = false;
  $('#favoritesToggle').setAttribute('aria-pressed', 'false');
  document.querySelectorAll('.collection-tab').forEach((button) => {
    const selected = button.dataset.collection === collection;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-selected', String(selected));
  });
  list.setAttribute('aria-labelledby', collection === 'engagements' ? 'tabEngagements' : 'tabIndiscretions');
  $('#collectionDescription').innerHTML = collection === 'engagements'
    ? '<strong>Our engagements.</strong> The thoughtfully chosen house favorites—the ones that always deserve another invitation.'
    : '<strong>Our indiscretions.</strong> A delightfully long list of good ideas. Because a well-stocked bar should leave room for a little mischief.';
  renderMenu();
}

function renderRecipe(index) {
  selectedIndex = index;
  const drink = drinks[index];
  const photo = drink.photo
    ? `<div class="recipe-photo"><img src="assets/${safeText(drink.photo)}" alt="AI-generated photograph of ${safeText(drink.name)}"></div>`
    : `<div class="recipe-photo recipe-no-photo"><span>P.</span><span>Made to be<br>enjoyed.</span></div>`;
  const badge = drink.review ? ' · RECIPE TO CONFIRM' : '';
  const note = drink.note || (drink.review ? 'Proportions shown are a starting point pending final house approval.' : '');
  details.innerHTML = `<div class="recipe-layout">${photo}<div class="recipe-copy">
    <p class="recipe-kicker">${drink.collection === 'engagements' ? 'PRYOR ENGAGEMENTS' : 'PRYOR INDISCRETIONS'}${badge}</p>
    <h2 id="modalTitle">${safeText(drink.name)}</h2><p class="recipe-subtitle">${safeText(drink.summary)}</p>
    <div class="recipe-meta"><span>${safeText(drink.spirit)}</span>${drink.house ? '<span>House favorite</span>' : ''}${drink.review ? '<span>Draft recipe</span>' : ''}</div>
    <h3>The pour</h3><ul class="ingredients-list">${drink.ingredients.map((item) => `<li>${safeText(item)}</li>`).join('')}</ul>
    <h3>The ritual</h3><p class="recipe-method">${safeText(drink.method)}</p>
    ${drink.garnish ? `<p class="recipe-method" style="margin-top:10px"><strong>Garnish:</strong> ${safeText(drink.garnish)}</p>` : ''}
    ${note ? `<p class="recipe-note"><strong>${drink.review ? 'For the next menu edit:' : 'From the house:'}</strong> ${safeText(note)}</p>` : ''}
    <div class="recipe-actions"><button type="button" id="saveCurrent">${saved.has(drink.name) ? '♥ Saved to your list' : '♡ Save this drink'}</button><button type="button" id="copyRecipe">Copy recipe →</button></div>
  </div></div>`;
  $('#saveCurrent').addEventListener('click', () => {
    if (saved.has(drink.name)) saved.delete(drink.name); else saved.add(drink.name);
    saveFavorites();
    if (state.savedOnly) renderMenu();
  });
  $('#copyRecipe').addEventListener('click', async () => {
    const recipeText = `${drink.name} — Pryorities\n\n${drink.ingredients.join('\n')}\n\n${drink.method}${drink.garnish ? `\nGarnish: ${drink.garnish}` : ''}`;
    const button = $('#copyRecipe');
    try { await navigator.clipboard.writeText(recipeText); button.textContent = 'Copied ✓'; }
    catch { button.textContent = 'Copy unavailable'; }
    setTimeout(() => { if (button.isConnected) button.textContent = 'Copy recipe →'; }, 2400);
  });
}

function openRecipe(index) {
  if (!Number.isInteger(index) || index < 0 || index >= drinks.length) return;
  previousFocus = document.activeElement;
  renderRecipe(index);
  modal.hidden = false;
  document.body.classList.add('modal-open');
  dialog.scrollTop = 0;
  $('#closeModal').focus();
}

function closeRecipe() {
  modal.hidden = true;
  document.body.classList.remove('modal-open');
  selectedIndex = null;
  if (previousFocus && previousFocus.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
}

function surpriseMe() {
  const favorites = drinks.map((drink, index) => ({ drink, index })).filter((item) => item.drink.collection === 'engagements');
  const selected = favorites[Math.floor(Math.random() * favorites.length)];
  openRecipe(selected.index);
}

document.addEventListener('click', (event) => {
  const drinkButton = event.target.closest('[data-drink-index]');
  if (drinkButton) openRecipe(Number(drinkButton.dataset.drinkIndex));
  const spiritButton = event.target.closest('[data-spirit]');
  if (spiritButton) { state.spirit = spiritButton.dataset.spirit; renderMenu(); }
  const collectionButton = event.target.closest('[data-collection]');
  if (collectionButton) selectCollection(collectionButton.dataset.collection);
});

document.querySelectorAll('#heroSurprise, #headerSurprise').forEach((button) => button.addEventListener('click', surpriseMe));
$('#closeModal').addEventListener('click', closeRecipe);
$('#modalBackdrop').addEventListener('click', closeRecipe);
$('#clearFilters').addEventListener('click', () => {
  state.spirit = 'All'; state.query = ''; state.savedOnly = false; search.value = '';
  $('#favoritesToggle').setAttribute('aria-pressed', 'false'); renderMenu();
});
$('#favoritesToggle').addEventListener('click', () => {
  state.savedOnly = !state.savedOnly;
  $('#favoritesToggle').setAttribute('aria-pressed', String(state.savedOnly));
  renderMenu();
});
search.addEventListener('input', () => { state.query = search.value.trim(); renderMenu(); });
document.addEventListener('keydown', (event) => {
  if (modal.hidden) return;
  if (event.key === 'Escape') { closeRecipe(); return; }
  if (event.key !== 'Tab') return;
  const focusable = [...dialog.querySelectorAll('button:not([disabled]), a[href], input:not([disabled])')];
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});

$('#engagementsCount').textContent = String(drinks.filter((drink) => drink.collection === 'engagements').length);
$('#indiscretionsCount').textContent = String(drinks.filter((drink) => drink.collection === 'indiscretions').length);
renderFeatured();
renderMenu();
