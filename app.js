const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const listings = [];
const categories = [
  { slug: 'notes', label: 'Notes' },
  { slug: 'tutoring', label: 'Tutoring' }
];

function getNumericPrice(value) {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'free') {
    return 0;
  }
  const cleaned = text.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function renderCategoryPage(categoryLabel, routePath, search, minPrice, maxPrice, res) {
  const searchValue = (search || '').trim();
  const searchTerm = searchValue.toLowerCase();
  const min = getNumericPrice(minPrice);
  const max = getNumericPrice(maxPrice);

  const categoryListings = listings.filter((item) => item.category === categoryLabel);
  const filteredListings = categoryListings.filter((item) => {
    const title = (item.title || '').toLowerCase();
    const module = (item.module || '').toLowerCase();
    const tutor = (item.tutor || '').toLowerCase();
    const description = (item.description || '').toLowerCase();

    const searchMatch =
      !searchTerm ||
      title.includes(searchTerm) ||
      module.includes(searchTerm) ||
      tutor.includes(searchTerm) ||
      description.includes(searchTerm);

    const priceValue = getNumericPrice(item.price);
    const minMatch = Number.isFinite(min) ? Number.isFinite(priceValue) && priceValue >= min : true;
    const maxMatch = Number.isFinite(max) ? Number.isFinite(priceValue) && priceValue <= max : true;

    return searchMatch && minMatch && maxMatch;
  });

  res.render('marketplacepage', {
    listings: filteredListings,
    search: searchValue,
    minPrice: Number.isFinite(min) ? min : '',
    maxPrice: Number.isFinite(max) ? max : '',
    currentCategory: categoryLabel,
    routePath,
    categories
  });
}

app.get('/', (req, res) => {
  res.redirect('/notes');
});

app.get('/notes', (req, res) => {
  renderCategoryPage(
    'Notes',
    '/notes',
    req.query.search,
    req.query.minPrice,
    req.query.maxPrice,
    res
  );
});

app.get('/tutoring', (req, res) => {
  renderCategoryPage(
    'Tutoring',
    '/tutoring',
    req.query.search,
    req.query.minPrice,
    req.query.maxPrice,
    res
  );
});

app.post('/add', (req, res) => {
  const title = (req.body.title || '').trim();
  const description = (req.body.description || '').trim();
  const price = (req.body.price || '').trim();
  const module = (req.body.module || '').trim();
  const tutor = (req.body.tutor || '').trim();
  const category = req.body.category === 'Tutoring' ? 'Tutoring' : 'Notes';
  const returnTo = req.body.returnTo || '/notes';

  if (title && description && price && module && tutor) {
    listings.push({
      id: Date.now().toString(),
      title,
      description,
      price,
      module,
      tutor,
      category
    });
  }

  res.redirect(returnTo);
});

app.post('/delete', (req, res) => {
  const id = req.body.id;
  const returnTo = req.body.returnTo || '/notes';

  if (id) {
    const index = listings.findIndex((item) => item.id === id);
    if (index !== -1) {
      listings.splice(index, 1);
    }
  }

  res.redirect(returnTo);
});

app.listen(port, () => {
  console.log(`Marketplace app listening at http://localhost:${port}`);
});
