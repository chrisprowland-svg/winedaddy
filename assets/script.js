document.querySelector('.menu')?.addEventListener('click',event=>{const links=document.querySelector('.nav-links');links?.classList.toggle('open');event.currentTarget.setAttribute('aria-expanded',String(links?.classList.contains('open')))});
document.querySelectorAll('.nav-group').forEach(group => group.addEventListener('toggle', () => {
  if (!group.open) return;
  document.querySelectorAll('.nav-group[open]').forEach(other => { if (other !== group) other.open = false; });
}));
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  document.querySelectorAll('.nav-group[open]').forEach(group => { group.open = false; });
  const links = document.querySelector('.nav-links');
  links?.classList.remove('open');
  const menu = document.querySelector('.menu');
  menu?.setAttribute('aria-expanded', 'false');
});

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

const guideFilter = document.querySelector('[data-guide-filter]');
if (guideFilter) {
  const cards = [...document.querySelectorAll('[data-guide-grid] .guide-card')];
  const empty = document.querySelector('[data-empty-state]');
  guideFilter.addEventListener('input', event => {
    const query = event.target.value.trim().toLowerCase();
    let visible = 0;
    for (const card of cards) {
      const show = !query || card.textContent.toLowerCase().includes(query);
      card.hidden = !show;
      if (show) visible += 1;
    }
    if (empty) empty.hidden = visible !== 0;
  });
}

const fundamentalsFilter = document.querySelector('[data-fundamentals-filter]');
if (fundamentalsFilter) {
  const items = [...document.querySelectorAll('[data-fundamentals-item]')];
  const groups = [...document.querySelectorAll('[data-fundamentals-group]')];
  const empty = document.querySelector('[data-fundamentals-empty]');
  for (const group of groups) group.open = location.hash === `#${group.id}`;
  fundamentalsFilter.addEventListener('input', event => {
    const query = event.target.value.trim().toLowerCase();
    let visible = 0;
    for (const item of items) {
      item.hidden = Boolean(query) && !item.textContent.toLowerCase().includes(query);
      if (!item.hidden) visible += 1;
    }
    for (const group of groups) {
      const hasMatch = [...group.querySelectorAll('[data-fundamentals-item]')].some(item => !item.hidden);
      group.hidden = Boolean(query) && !hasMatch;
      group.open = Boolean(query) ? hasMatch : location.hash === `#${group.id}`;
    }
    if (empty) empty.hidden = visible !== 0;
  });
}

const regionFilter = document.querySelector('[data-region-filter]');
if (regionFilter) {
  const groups = [...document.querySelectorAll('[data-region-country]')];
  const otherCards = [...document.querySelectorAll('[data-region-ungrouped]')];
  const empty = document.querySelector('[data-region-empty]');
  for (const group of groups) group.open = false;
  regionFilter.addEventListener('input', event => {
    const query = event.target.value.trim().toLowerCase();
    let visible = 0;
    for (const group of groups) {
      const matches = [...group.querySelectorAll('[data-region-item]')].filter(item => !query || item.textContent.toLowerCase().includes(query));
      group.hidden = Boolean(query) && !group.textContent.toLowerCase().includes(query);
      group.open = Boolean(query) && !group.hidden;
      for (const item of group.querySelectorAll('li')) item.hidden = Boolean(query) && !item.textContent.toLowerCase().includes(query);
      if (!group.hidden) visible += matches.length || 1;
    }
    for (const card of otherCards) {
      card.hidden = Boolean(query) && !card.textContent.toLowerCase().includes(query);
      if (!card.hidden) visible += 1;
    }
    if (empty) empty.hidden = visible !== 0;
  });
}

const grapeFilter = document.querySelector('[data-grape-filter]');
if (grapeFilter) {
  const items = [...document.querySelectorAll('[data-grape-item]')];
  const pathGroups = [...document.querySelectorAll('[data-grape-path]')];
  const directorySections = [...document.querySelectorAll('[data-grape-directory-section]')];
  const countryGroups = [...document.querySelectorAll('[data-grape-country]')];
  const letterGroups = [...document.querySelectorAll('[data-grape-letter]')];
  const empty = document.querySelector('[data-grape-empty]');
  for (const path of pathGroups) path.open = location.hash === `#${path.id}`;
  for (const section of directorySections) section.open = location.hash === `#${section.id}`;
  for (const country of countryGroups) country.open = false;
  grapeFilter.addEventListener('input', event => {
    const query = event.target.value.trim().toLowerCase();
    let visible = 0;
    for (const item of items) {
      item.hidden = Boolean(query) && !item.textContent.toLowerCase().includes(query);
      if (!item.hidden) visible += 1;
    }
    for (const path of pathGroups) {
      const hasMatch = [...path.querySelectorAll('[data-grape-item]')].some(item => !item.hidden);
      path.hidden = Boolean(query) && !hasMatch;
      path.open = Boolean(query) ? hasMatch : location.hash === `#${path.id}`;
    }
    for (const section of directorySections) section.open = Boolean(query) || location.hash === `#${section.id}`;
    for (const group of countryGroups) {
      const hasMatch = [...group.querySelectorAll('[data-grape-item]')].some(item => !item.hidden);
      group.hidden = Boolean(query) && !hasMatch;
      group.open = Boolean(query) && hasMatch;
    }
    for (const group of letterGroups) group.hidden = Boolean(query) && ![...group.querySelectorAll('[data-grape-item]')].some(item => !item.hidden);
    if (empty) empty.hidden = visible !== 0;
  });
}

const processFilter = document.querySelector('[data-process-filter]');
if (processFilter) {
  const items = [...document.querySelectorAll('[data-process-item]')];
  const processGroups = [...document.querySelectorAll('[data-process-group]')];
  const letterGroups = [...document.querySelectorAll('[data-process-letter]')];
  const empty = document.querySelector('[data-process-empty]');
  for (const group of processGroups) group.open = false;
  processFilter.addEventListener('input', event => {
    const query = event.target.value.trim().toLowerCase();
    let visible = 0;
    for (const item of items) {
      item.hidden = Boolean(query) && !item.textContent.toLowerCase().includes(query);
      if (!item.hidden) visible += 1;
    }
    for (const group of processGroups) {
      const hasMatch = [...group.querySelectorAll('[data-process-item]')].some(item => !item.hidden);
      group.hidden = Boolean(query) && !hasMatch;
      group.open = Boolean(query) && hasMatch;
    }
    for (const group of letterGroups) group.hidden = Boolean(query) && ![...group.querySelectorAll('[data-process-item]')].some(item => !item.hidden);
    if (empty) empty.hidden = visible !== 0;
  });
}
