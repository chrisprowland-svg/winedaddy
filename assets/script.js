document.querySelector('.menu')?.addEventListener('click',()=>document.querySelector('.nav-links')?.classList.toggle('open'));

document.querySelectorAll('.subscribe-form').forEach(form => form.addEventListener('submit', async event => {
  event.preventDefault();
  const status = form.querySelector('.subscribe-status');
  const button = form.querySelector('button[type="submit"]');
  status.textContent = 'Subscribing…'; button.disabled = true;
  try {
    const response = await fetch(form.action, {method: 'POST', body: new FormData(form), headers: {'accept': 'application/json'}});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Subscription failed.');
    status.textContent = result.message; form.reset();
  } catch (error) { status.textContent = error.message || 'Please try again.'; }
  finally { button.disabled = false; }
}));

const searchForm = document.querySelector('[data-search-form]');
if (searchForm) {
  const input = searchForm.querySelector('input[type="search"]');
  const results = document.querySelector('[data-search-results]');
  let index = [];
  fetch('/search-index.json').then(r => r.json()).then(data => {
    index = data; const query = new URLSearchParams(location.search).get('q') || '';
    input.value = query; if (query) renderSearch(query);
  }).catch(() => { results.innerHTML = '<p>Search is temporarily unavailable.</p>'; });
  searchForm.addEventListener('submit', event => {
    event.preventDefault(); const query = input.value.trim();
    history.replaceState(null, '', query ? `?q=${encodeURIComponent(query)}` : location.pathname); renderSearch(query);
  });
  function renderSearch(query) {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) { results.innerHTML = '<p>Enter a grape, region, style or wine question.</p>'; return; }
    const matches = index.map(item => {
      const title = item.title.toLowerCase(); const text = `${item.title} ${item.description} ${item.text}`.toLowerCase();
      const score = terms.reduce((total, term) => total + (title.includes(term) ? 4 : 0) + (text.includes(term) ? 1 : -10), 0);
      return {...item, score};
    }).filter(item => item.score >= terms.length).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, 30);
    results.innerHTML = matches.length ? `<p class="search-count">${matches.length} result${matches.length === 1 ? '' : 's'}</p>${matches.map(item => `<a class="search-result" href="${item.url}"><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.description)}</p></a>`).join('')}` : '<p>No matching articles yet. Try a broader wine term.</p>';
  }
}

function escapeHtml(value) { return value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
