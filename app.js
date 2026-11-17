const referencePhotos = {
  "Nepenthes": ["nepenthes.webp", "https://www.carnivero.com/products/nepenthes-ventricosa-mt-black-peristome-x-k-car-0213", "Nepenthes ventricosa example · your variety may differ"],
  "Venus Flytrap": ["venus-flytrap.webp", "https://www.obi.at/p/5416193/venusfliegenfalle-topf-ca-9-cm-dionaea-muscipula", "Venus flytrap · Dionaea muscipula"],
  "Sundew": ["sundew.webp", "https://www.carnivero.com/", "Cape sundew example · your species may differ"],
  "Parlor Palm": ["reference-palm.webp", "https://hortology.co.uk/products/chamaedorea-elegans-parlour-palm-house-plant", "Parlor palm · Chamaedorea elegans"],
  "Baby Tears": [
    "reference-7.webp",
    "https://plantsmith.net.au/products/soleirolia-soleirolii-babies-tears-7cm-pot",
    "Soleirolia soleirolii comparison"
  ],
  "Tillandsia Caput-Medusae": [
    "reference-8.webp",
    "https://www.aquasabi.com/Tillandsia-caput-medusae-Single-plant-L",
    "Tillandsia caput-medusae"
  ],
  "Spanish Moss": [
    "reference-9.webp",
    "https://www.souqgarden.com/products/spanish-moss-tillandsia-usneoides-hanging-air-plant",
    "Spanish moss · Tillandsia usneoides"
  ],
  "Tiny Tears": [
    "reference-0.webp",
    null,
    "Tiny Tears · photo you provided"
  ],
  "Fuzzy Tradescantia": [
    "reference-1.webp",
    "https://www.etsy.com/uk/listing/763059848/tradescantia-sillamontana-white-velvet",
    "Tradescantia sillamontana"
  ],
  "Sweet Basil": [
    "reference-2.webp",
    "https://temperate.theferns.info/image/Ocimum%2Bbasilicum",
    "Sweet basil"
  ],
  "Marble Queen Pothos": [
    "reference-3.webp",
    "https://cottagefarmsdirect.com/products/marble-queen-pothos-6-pot-copy",
    "Marble Queen pothos"
  ],
  "N’Joy or Pearls and Jade Pothos": [
    "reference-4.webp",
    "https://plantaddicts.com/njoy-pothos",
    "N’Joy pothos · one possible match"
  ],
  "Golden Pothos": [
    "reference-5.webp",
    "https://gardengoodsdirect.com/products/golden-pothos",
    "Golden pothos"
  ],
  "Heartleaf Philodendron": [
    "reference-6.webp",
    "https://plantify.co.za/products/heart-leaf-philodendron",
    "Heartleaf philodendron"
  ]
};
const search = document.querySelector('#search');
const group = document.querySelector('#group');
const cards = document.querySelector('#cards');
const count = document.querySelector('#count');
for (const category of new Set(plants.map(plant => plant[1]))) {
  group.add(new Option(category, category));
}
function element(tag, content, className) {
  const node = document.createElement(tag);
  if (content) node.textContent = content;
  if (className) node.className = className;
  return node;
}
function plantCard([name, category, identity, photo, ...care]) {
  const card = element('article');
  if (photo) {
    const image = element('img', '', [9326, 9327, 9328].includes(photo) ? 'photo photo--contain' : 'photo');
    image.src = '' + photo + '.webp';
    image.alt = photo >= 9319 && photo <= 9321 ? name + ' retailer reference photo' : name;
    image.loading = 'lazy';
    card.append(image);
  }
  const body = element('div', '', 'card');
  body.append(element('p', category, 'tag'), element('h3', name), element('p', identity, 'id'));
  const details = element('dl');
  ['Light', 'Water', 'Growing setup', 'Cabinet placement', 'Temperature & humidity', 'Feeding', 'Seasonal care'].slice(0, care.length).forEach((label, index) => {
    const row = element('div');
    row.append(element('dt', label), element('dd', care[index]));
    details.append(row);
  });
  const reference = referencePhotos[name];
  if (reference) {
    const [src, source, label] = reference;
    const figure = element('figure', '', 'reference');
    const image = element('img', '', 'photo photo--contain');
    image.src = src;
    image.alt = label;
    image.loading = 'lazy';
    const caption = element('figcaption', 'Reference photo · ' + label + ' ');
    if (source) {
      const credit = element('a', 'Photo source');
      credit.href = source;
      caption.append(credit);
    }
    figure.append(image, caption);
    card.append(figure);
  }
  body.append(details);
  card.append(body);
  return card;
}
function normalize(value) {
  return value.toLowerCase().replace(/[’‘]/g, "'");
}
function render() {
  const query = normalize(search.value.trim());
  const matches = plants.filter(([name, category, identity]) =>
    (!group.value || group.value === category) &&
    normalize([name, category, identity].join(' ')).includes(query));
  count.textContent = matches.length ? matches.length + ' of ' + plants.length + ' entries' : 'No plants match these filters.';
  cards.replaceChildren(...matches.map(plantCard));
}
search.addEventListener('input', render);
group.addEventListener('change', render);
render();

