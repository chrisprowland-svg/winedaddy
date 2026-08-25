const components = new Map([
  ['VIS-009', '<figure class="learning-visual" id="vis-009"><div class="wd-explainer wd-component wd-component--label_explainer" role="group" aria-labelledby="VIS-009-title" aria-describedby="VIS-009-summary"><p class="wd-explainer__eyebrow">WineDaddy quick explainer</p><p class="wd-explainer__title" id="VIS-009-title">How to read a wine label</p><p class="wd-explainer__intro">Separate identity, origin and practical facts from branding and marketing language.</p><div class="wd-component__items"><section class="wd-component__item wd-component__item--primary" data-key="producer-brand"><p class="wd-component__number" aria-hidden="true">1</p><p class="wd-component__item-title">Producer or brand</p><p class="wd-component__description">Identifies the maker, business or commercial range—but these may be different names.</p></section><section class="wd-component__item wd-component__item--neutral" data-key="vintage"><p class="wd-component__number" aria-hidden="true">2</p><p class="wd-component__item-title">Vintage</p><p class="wd-component__description">Generally the grape-harvest year, not the bottling or release year.</p><p class="wd-component__value">2024</p></section><section class="wd-component__item wd-component__item--primary" data-key="variety-blend"><p class="wd-component__number" aria-hidden="true">3</p><p class="wd-component__item-title">Variety or blend</p><p class="wd-component__description">Names the grape when stated. Some wines name several varieties or none.</p><p class="wd-component__value">Shiraz</p></section><section class="wd-component__item wd-component__item--secondary" data-key="region-gi"><p class="wd-component__number" aria-hidden="true">4</p><p class="wd-component__item-title">Region or GI</p><p class="wd-component__description">Describes claimed grape origin. It is not a quality score.</p><p class="wd-component__value">Yarra Valley</p></section><section class="wd-component__item wd-component__item--neutral" data-key="practical-details"><p class="wd-component__number" aria-hidden="true">5</p><p class="wd-component__item-title">Practical details</p><p class="wd-component__description">Alcohol, volume and standard drinks describe different things. Check the whole package.</p><p class="wd-component__value">13.5% alc/vol · 750 mL</p></section></div><p class="wd-explainer__summary" id="VIS-009-summary"><span>Remember</span><strong>A label is a starting point—not a quality guarantee.</strong></p></div><figcaption>Read facts before flourish. This fictional label is explanatory, not a compliance template.</figcaption></figure>']
]);

export function renderVisualComponents(html) {
  return html.replace(/<!--\s*VISUAL:(VIS-\d{3})\s*-->/g, (_, visualId) => {
    const component = components.get(visualId);
    if (!component) throw new Error(`Unknown visual component: ${visualId}`);
    return component;
  });
}

export function hasVisualComponent(visualId) {
  return components.has(visualId);
}
