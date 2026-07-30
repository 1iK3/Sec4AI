(function () {
  'use strict';

  let prompts = [];
  let activeCategory = null;
  let searchQuery = '';

  const categoryLabels = {
    'direct-injection': 'Direct Injection',
    'indirect-injection': 'Indirect Injection',
    'prompt-leaking': 'Prompt Leaking',
    'jailbreak': 'Jailbreak',
    'encoding-bypass': 'Encoding Bypass',
    'context-manipulation': 'Context Manipulation',
    'risk-control': 'Risk Control',
    'language-bypass': 'Language Bypass',
    'semantic-bypass': 'Semantic Bypass',
    'multi-modal-injection': 'Multi-Modal Injection'
  };

  function init() {
    const dataEl = document.getElementById('prompts-data');
    if (dataEl) {
      try {
        prompts = JSON.parse(dataEl.textContent);
      } catch (e) {
        console.error('Failed to parse prompts data', e);
      }
    }

    updatePromptCount();
    renderCategories();
    renderCards();

    window.addEventListener('popstate', handleRoute);
    handleRoute();
  }

  function getPromptIdFromUrl() {
    var path = window.location.pathname;
    if (path.startsWith('/prompt/')) {
      return path.replace('/prompt/', '').replace(/\/$/, '').split('?')[0].split('#')[0];
    }
    return null;
  }

  function handleRoute() {
    var id = getPromptIdFromUrl();
    if (id) {
      var prompt = prompts.find(function (p) { return p.id === id; });
      if (prompt) {
        showDetail(prompt);
        return;
      }
    }
    showHome();
  }

  function navigateToPrompt(id) {
    var url = '/prompt/' + id;
    history.pushState({ promptId: id }, '', url);
    handleRoute();
  }

  function updatePromptCount() {
    const el = document.getElementById('prompt-count');
    if (el) el.textContent = prompts.length + ' prompts';
  }

  function renderCategories() {
    const container = document.getElementById('category-tags');
    if (!container) return;

    const allCategories = [...new Set(prompts.map(p => p.category))];
    const fragment = document.createDocumentFragment();

    const allBtn = document.createElement('button');
    allBtn.className = 'tag-btn active';
    allBtn.textContent = 'All';
    allBtn.dataset.category = '';
    allBtn.addEventListener('click', function () {
      setActiveCategory('');
    });
    fragment.appendChild(allBtn);

    allCategories.forEach(function (cat) {
      const label = categoryLabels[cat] || cat;
      const btn = document.createElement('button');
      btn.className = 'tag-btn';
      btn.textContent = label;
      btn.dataset.category = cat;
      btn.addEventListener('click', function () {
        setActiveCategory(cat);
      });
      fragment.appendChild(btn);
    });

    container.appendChild(fragment);
  }

  function setActiveCategory(cat) {
    activeCategory = cat;
    const btns = document.querySelectorAll('#category-tags .tag-btn');
    btns.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.category === cat);
    });
    renderCards();
  }

  function setSearchQuery(q) {
    searchQuery = q.toLowerCase().trim();
    renderCards();
  }

  function getFilteredPrompts() {
    return prompts.filter(function (p) {
      if (activeCategory && p.category !== activeCategory) return false;
      if (searchQuery) {
        const searchable = (p.title + ' ' + p.brief + ' ' + p.description + ' ' + p.prompt + ' ' + p.tags.join(' ')).toLowerCase();
        if (!searchable.includes(searchQuery)) return false;
      }
      return true;
    });
  }

  function renderCards() {
    const container = document.getElementById('card-grid');
    if (!container) return;

    const filtered = getFilteredPrompts();
    container.innerHTML = '';

    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No matching prompts found. Try different filters.</p></div>';
      return;
    }

    const fragment = document.createDocumentFragment();

    filtered.forEach(function (p) {
      const card = document.createElement('div');
      card.className = 'card fade-in';

      const tagsHtml = p.tags.map(function (t) {
        return '<span class="tag tag-' + t + '">' + escapeHtml(t) + '</span>';
      }).join('');

      const preview = escapeHtml(p.prompt.substring(0, 120));

      card.innerHTML =
        '<div class="card-tags">' +
        '<span class="tag tag-' + p.category + '">' + escapeHtml(categoryLabels[p.category] || p.category) + '</span>' +
        tagsHtml +
        '</div>' +
        '<div class="card-title">' + escapeHtml(p.title) + '</div>' +
        '<div class="card-brief">' + escapeHtml(p.brief) + '</div>' +
        '<div class="card-preview">' + preview + '</div>' +
        '<div class="card-meta">' +
        '<span class="card-category">' + escapeHtml(p.category.replace('-', ' / ')) + '</span>' +
        '<span class="card-arrow">&rarr;</span>' +
        '</div>';

      card.addEventListener('click', function () {
        navigateToPrompt(p.id);
      });

      fragment.appendChild(card);
    });

    container.appendChild(fragment);
  }

  function showHome() {
    document.getElementById('home-view').style.display = 'block';
    document.getElementById('detail-view').style.display = 'none';
    document.title = 'Sec4AI - Prompt Injection Collection';
  }

  function showDetail(prompt) {
    document.getElementById('home-view').style.display = 'none';
    const detailEl = document.getElementById('detail-view');
    detailEl.style.display = 'block';
    detailEl.scrollTop = 0;

    document.title = prompt.title + ' | Sec4AI';

    const tagsHtml = prompt.tags.map(function (t) {
      return '<span class="tag tag-' + t + '">' + escapeHtml(t) + '</span>';
    }).join('');

    detailEl.innerHTML =
      '<div class="detail-breadcrumb">' +
      '<a href="#" id="back-to-home">Home</a>' +
      '<span>&rsaquo;</span>' +
      '<span>' + escapeHtml(categoryLabels[prompt.category] || prompt.category) + '</span>' +
      '</div>' +

      '<div class="detail-header">' +
      '<div class="card-tags">' +
      '<span class="tag tag-' + prompt.category + '">' + escapeHtml(categoryLabels[prompt.category] || prompt.category) + '</span>' +
      tagsHtml +
      '</div>' +
      '<h1 class="detail-title">' + escapeHtml(prompt.title) + '</h1>' +
      '<p class="detail-description">' + escapeHtml(prompt.description) + '</p>' +
      '</div>' +

      '<div class="detail-prompt-box">' +
      '<div class="detail-prompt-header">' +
      '<span>Prompt Payload</span>' +
      '<button class="copy-btn" id="copy-prompt-btn">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
      'Copy Prompt' +
      '</button>' +
      '</div>' +
      '<div class="detail-prompt-body" id="prompt-body">' + escapeHtml(prompt.prompt) + '</div>' +
      '</div>' +

      '<div class="detail-scenario-box">' +
      '<div class="scenario-label">Scenario</div>' +
      '<div class="scenario-value">' + escapeHtml(prompt.scenario) + '</div>' +
      '</div>' +

      '<div class="detail-info-grid">' +
      '<div class="info-card">' +
      '<div class="info-label">Effect</div>' +
      '<div class="info-value">' + escapeHtml(prompt.effect) + '</div>' +
      '</div>' +
      '<div class="info-card">' +
      '<div class="info-label">Category</div>' +
      '<div class="info-value">' + escapeHtml(categoryLabels[prompt.category] || prompt.category) + '</div>' +
      '</div>' +
      '</div>' +

      '<div class="detail-url-section">' +
      '<div class="detail-url-label">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>' +
      'Share this URL for Indirect Injection Testing' +
      '</div>' +
      '<div class="url-copy-row">' +
      '<div class="url-display" id="page-url-display"></div>' +
      '<button class="btn-primary" id="copy-url-btn">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
      'Copy URL' +
      '</button>' +
      '</div>' +
      '</div>';

    const urlDisplay = document.getElementById('page-url-display');
    if (urlDisplay) {
      urlDisplay.textContent = window.location.href;
    }

    document.getElementById('back-to-home').addEventListener('click', function (e) {
      e.preventDefault();
      history.pushState({}, '', '/');
      handleRoute();
    });

    document.getElementById('copy-prompt-btn').addEventListener('click', function () {
      const body = document.getElementById('prompt-body');
      if (body) {
        copyToClipboard(body.textContent, this);
      }
    });

    document.getElementById('copy-url-btn').addEventListener('click', function () {
      copyToClipboard(window.location.href, this);
      this.textContent = 'Copied!';
      this.classList.add('copied');
      setTimeout(function () {
        this.textContent = 'Copy URL';
        this.classList.remove('copied');
      }.bind(this), 2000);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function copyToClipboard(text, btnEl) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showCopied(btnEl);
      }).catch(function () {
        fallbackCopy(text, btnEl);
      });
    } else {
      fallbackCopy(text, btnEl);
    }
  }

  function fallbackCopy(text, btnEl) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showCopied(btnEl);
    } catch (e) {
      alert('Copy failed. Please select and copy manually.');
    }
    document.body.removeChild(ta);
  }

  function showCopied(btnEl) {
    const orig = btnEl.textContent;
    btnEl.textContent = 'Copied!';
    btnEl.classList.add('copied');
    setTimeout(function () {
      btnEl.textContent = orig;
      btnEl.classList.remove('copied');
    }, 2000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  document.addEventListener('DOMContentLoaded', function () {
    init();

    var searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        setSearchQuery(this.value);
      });
    }
  });

  window.setSearchQuery = setSearchQuery;

})();
