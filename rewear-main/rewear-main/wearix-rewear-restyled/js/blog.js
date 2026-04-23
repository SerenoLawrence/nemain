// ============================================================
// blog.js — Blog page: load and filter articles
// Used on: blog.html
// ============================================================

const blogGrid = document.getElementById('blogGrid');
if (!blogGrid) throw new Error('blog.js loaded on wrong page');

const blogCategoryLabels = { style: 'Style Guide', trends: 'Trends', stories: 'Brand Stories', care: 'Care Tips' };

let allPosts = [];

// ---- FILTER TABS ----
document.querySelectorAll('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const cat = tab.getAttribute('data-category');
    renderBlogPosts(cat === 'all' ? allPosts : allPosts.filter(p => p.category === cat));
  });
});

// ---- RENDER ----
function renderBlogPosts(posts) {
  if (!posts.length) { blogGrid.innerHTML = '<div class="products-loading">No articles found.</div>'; return; }
  blogGrid.innerHTML = posts.map(p => `
    <div class="blog-card" data-category="${p.category}">
      <div class="blog-image"><img src="${p.image_url}" alt="${p.title}" loading="lazy"></div>
      <div class="blog-content">
        <div class="blog-meta">
          <span class="blog-category">${blogCategoryLabels[p.category] || p.category}</span>
          <span class="blog-date">${formatDate(p.published_at)}</span>
          <span class="blog-read">${p.read_time_minutes} min read</span>
        </div>
        <h3 class="blog-title">${p.title}</h3>
        <p class="blog-excerpt">${p.excerpt}</p>
      </div>
    </div>`).join('');
}

// ---- LOAD ----
async function loadBlogPosts() {
  blogGrid.innerHTML = '<div class="products-loading">Loading articles…</div>';
  const { data, error } = await db.from('blog_posts').select('*').order('published_at', { ascending: false });
  if (error) {
    blogGrid.innerHTML = '<div class="products-loading">Could not load articles.</div>';
    showError('Failed to Load', 'Could not load articles. Please refresh.');
    console.error('[blog.js] loadBlogPosts:', error.message);
    return;
  }
  allPosts = data;
  renderBlogPosts(allPosts);
}

loadBlogPosts();
