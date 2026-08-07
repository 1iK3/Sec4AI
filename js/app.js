(function () {
  'use strict';

  let prompts = [];
  let activeCategory = null;
  let searchQuery = '';

  const SITE_URL = 'https://sec4ai.vercel.app';

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
    document.addEventListener('keydown', handleKeydown);
    handleRoute();
  }

  // ===== URL routing =====

  function isRawMode() {
    return window.location.pathname.startsWith('/raw/');
  }

  function getUrlPrefix() {
    return isRawMode() ? '/raw/' : '/prompt/';
  }

  /**
   * Parse the prompt path segment. Supports:
   *   - Legacy: <id>                      -> { seq: null, id }
   *   - New:    <seq>-<id>                -> { seq: N, id }
   */
  function parsePathId() {
    var path = window.location.pathname;
    var prefixes = ['/raw/', '/prompt/'];
    for (var i = 0; i < prefixes.length; i++) {
      if (path.startsWith(prefixes[i])) {
        var seg = path.replace(prefixes[i], '').replace(/\/$/, '').split('?')[0].split('#')[0];
        var m = seg.match(/^(\d+)-(.+)$/);
        if (m) return { seq: parseInt(m[1], 10), id: m[2] };
        return { seq: null, id: seg };
      }
    }
    return null;
  }

  function getPromptById(id) {
    return prompts.find(function (p) { return p.id === id; });
  }

  function getPromptBySeq(seq) {
    return (seq >= 1 && seq <= prompts.length) ? prompts[seq - 1] : null;
  }

  function handleRoute() {
    var parsed = parsePathId();
    if (parsed && parsed.id) {
      var prompt = getPromptById(parsed.id);
      // If id alone didn't match, try resolving by sequence number
      if (!prompt && parsed.seq) {
        prompt = getPromptBySeq(parsed.seq);
      }
      if (prompt) {
        var canonical = '/' + (isRawMode() ? 'raw' : 'prompt') + '/' + promptSeqUrl(prompt);
        // Normalize URL: ensure the sequence number matches the actual position
        if (window.location.pathname !== canonical) {
          history.replaceState({}, '', canonical);
        }
        if (isRawMode()) {
          showRaw(prompt);
        } else {
          showDetail(prompt);
        }
        return;
      }
    }
    showHome();
  }

  function promptSeqUrl(prompt) {
    var idx = prompts.indexOf(prompt);
    return (idx + 1) + '-' + prompt.id;
  }

  function navigateToPrompt(prompt) {
    var url = '/prompt/' + promptSeqUrl(prompt);
    history.pushState({ promptId: prompt.id, raw: false }, '', url);
    handleRoute();
  }

  function navigateToSeq(seq) {
    var prompt = getPromptBySeq(seq);
    if (!prompt) return;
    navigateToPrompt(prompt);
  }

  function currentPromptIndex() {
    var parsed = parsePathId();
    if (!parsed || !parsed.id) return -1;
    var idx = prompts.findIndex(function (p) { return p.id === parsed.id; });
    return idx;
  }

  // ===== Keyboard navigation =====

  function handleKeydown(e) {
    // Only navigate when viewing a detail page and not typing in an input
    if (document.getElementById('detail-view').style.display !== 'block') return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    var idx = currentPromptIndex();
    if (idx < 0) return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (idx > 0) navigateToPrompt(prompts[idx - 1]);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (idx < prompts.length - 1) navigateToPrompt(prompts[idx + 1]);
    }
  }

  // ===== Home rendering =====

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
        navigateToPrompt(p);
      });

      fragment.appendChild(card);
    });

    container.appendChild(fragment);
  }

  function showHome() {
    document.getElementById('home-view').style.display = 'block';
    document.getElementById('detail-view').style.display = 'none';
    document.title = 'Prompt Injection Collection | Sec4AI';
    setMetaForHome();
  }

  // ===== Detail view =====

  function showDetail(prompt) {
    document.getElementById('home-view').style.display = 'none';
    const detailEl = document.getElementById('detail-view');
    detailEl.style.display = 'block';
    detailEl.scrollTop = 0;

    var idx = prompts.indexOf(prompt);
    var prevPrompt = idx > 0 ? prompts[idx - 1] : null;
    var nextPrompt = idx < prompts.length - 1 ? prompts[idx + 1] : null;

    const tagsHtml = prompt.tags.map(function (t) {
      return '<span class="tag tag-' + t + '">' + escapeHtml(t) + '</span>';
    }).join('');

    detailEl.innerHTML =
      '<div class="detail-breadcrumb">' +
      '<a href="/" id="back-to-home">Home</a>' +
      '<span>&rsaquo;</span>' +
      '<span>' + escapeHtml(categoryLabels[prompt.category] || prompt.category) + '</span>' +
      '<span class="breadcrumb-index">#' + (idx + 1) + ' / ' + prompts.length + '</span>' +
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
      'Indirect Injection Test URL' +
      '</div>' +
      '<div class="url-copy-row">' +
      '<div class="url-display" id="page-url-display"></div>' +
      '<button class="btn-primary" id="copy-url-btn">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
      'Copy URL' +
      '</button>' +
      '</div>' +
      '</div>' +

      '<nav class="detail-pager" aria-label="Prompt navigation">' +
      (prevPrompt
        ? '<a class="pager-link pager-prev" href="/prompt/' + promptSeqUrl(prevPrompt) + '" rel="prev">' +
          '<span class="pager-arrow">&larr;</span>' +
          '<span class="pager-body"><span class="pager-label">Previous</span><span class="pager-title">' + escapeHtml(prevPrompt.title) + '</span></span>' +
          '</a>'
        : '<span class="pager-link pager-prev disabled"><span class="pager-arrow">&larr;</span><span class="pager-body"><span class="pager-label">Previous</span><span class="pager-title">No previous</span></span></span>') +
      (nextPrompt
        ? '<a class="pager-link pager-next" href="/prompt/' + promptSeqUrl(nextPrompt) + '" rel="next">' +
          '<span class="pager-body"><span class="pager-label">Next</span><span class="pager-title">' + escapeHtml(nextPrompt.title) + '</span></span>' +
          '<span class="pager-arrow">&rarr;</span>' +
          '</a>'
        : '<span class="pager-link pager-next disabled"><span class="pager-body"><span class="pager-label">Next</span><span class="pager-title">No next</span></span><span class="pager-arrow">&rarr;</span></span>') +
      '</nav>';

    var rawUrl = window.location.origin + '/raw/' + promptSeqUrl(prompt);
    const urlDisplay = document.getElementById('page-url-display');
    if (urlDisplay) urlDisplay.textContent = rawUrl;

    document.getElementById('copy-prompt-btn').addEventListener('click', function () {
      const body = document.getElementById('prompt-body');
      if (body) copyToClipboard(body.textContent, this);
    });

    document.getElementById('copy-url-btn').addEventListener('click', function () {
      copyToClipboard(rawUrl, this);
      this.textContent = 'Copied!';
      this.classList.add('copied');
      setTimeout(function () {
        this.textContent = 'Copy URL';
        this.classList.remove('copied');
      }.bind(this), 2000);
    });

    // Attach pager link handlers for SPA navigation (prevent full reload)
    var pagerLinks = detailEl.querySelectorAll('.pager-link[href]');
    pagerLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        history.pushState({}, '', this.getAttribute('href'));
        handleRoute();
      });
    });

    document.title = prompt.title + ' | Sec4AI';
    setMetaForDetail(prompt, idx);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ===== Raw view (mimics a normal webpage) =====

  function showRaw(prompt) {
    document.getElementById('home-view').style.display = 'none';
    const detailEl = document.getElementById('detail-view');
    detailEl.style.display = 'block';
    detailEl.scrollTop = 0;
    document.title = prompt.title;

    // Render like a plain article page: title + body paragraphs, no security hints
    var paragraphs = prompt.prompt.split(/\n{2,}/);
    var bodyHtml = paragraphs.map(function (para) {
      var trimmed = para.trim();
      if (!trimmed) return '';
      if (/^(#|##|###|####)/.test(trimmed)) {
        var level = trimmed.match(/^(#+)/)[1].length;
        var text = trimmed.replace(/^#+\s*/, '').replace(/\s+#+$/, '');
        var tag = 'h' + Math.min(level + 1, 4);
        return '<' + tag + '>' + escapeHtml(text) + '</' + tag + '>';
      }
      if (/^[-*] /.test(trimmed)) {
        var items = trimmed.split(/\n(?=[-*] )/).map(function (li) {
          return '<li>' + escapeHtml(li.replace(/^[-*] /, '')) + '</li>';
        }).join('');
        return '<ul>' + items + '</ul>';
      }
      if (/^\d+\. /.test(trimmed)) {
        var oitems = trimmed.split(/\n(?=\d+\. )/).map(function (li) {
          return '<li>' + escapeHtml(li.replace(/^\d+\. /, '')) + '</li>';
        }).join('');
        return '<ol>' + oitems + '</ol>';
      }
      if (trimmed.startsWith('```')) {
        return '<pre><code>' + escapeHtml(trimmed.replace(/^```+\w*\s*\n?|```+$/g, '')) + '</code></pre>';
      }
      return '<p>' + escapeHtml(trimmed) + '</p>';
    }).join('');

    detailEl.innerHTML =
      '<article class="raw-article">' +
      '<h1 class="raw-article-title">' + escapeHtml(prompt.title) + '</h1>' +
      '<div class="raw-article-meta">' +
      '<span>Reference #' + (prompts.indexOf(prompt) + 1) + '</span>' +
      '<span>' + escapeHtml(categoryLabels[prompt.category] || prompt.category) + '</span>' +
      '</div>' +
      '<div class="raw-article-body">' + bodyHtml + '</div>' +
      '</article>';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ===== SEO helpers =====

  function setMetaTag(attr, name, content) {
    var el = document.querySelector('meta[' + attr + '="' + name + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function setLink(rel, href) {
    var el = document.querySelector('link[rel="' + rel + '"]');
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  }

  function setMetaForHome() {
    setMetaTag('name', 'description', 'Explore ' + prompts.length + ' curated prompt injection and indirect prompt injection payloads for AI security testing, red teaming, and defense evaluation.');
    setMetaTag('name', 'keywords', 'prompt injection, indirect prompt injection, LLM security, AI security, prompt injection payloads, jailbreak prompts, AI red team');
    setLink('canonical', SITE_URL + '/');
    setMetaTag('property', 'og:type', 'website');
    setMetaTag('property', 'og:title', 'Prompt Injection Collection | Sec4AI');
    setMetaTag('property', 'og:description', 'A comprehensive, categorized collection of prompt injection payloads for AI security testing.');
    setMetaTag('property', 'og:url', SITE_URL + '/');
    setMetaTag('name', 'twitter:title', 'Prompt Injection Collection | Sec4AI');
    setMetaTag('name', 'twitter:description', 'A comprehensive, categorized collection of prompt injection payloads for AI security testing.');
  }

  function setMetaForDetail(prompt, idx) {
    var desc = (prompt.brief || prompt.description || '').substring(0, 155);
    var url = SITE_URL + '/prompt/' + promptSeqUrl(prompt);
    var rawUrl = SITE_URL + '/raw/' + promptSeqUrl(prompt);

    setMetaTag('name', 'description', desc);
    setMetaTag('name', 'keywords', 'prompt injection, ' + prompt.category.replace('-', ' ') + ', ' + prompt.tags.join(', '));
    setLink('canonical', url);
    setMetaTag('property', 'og:type', 'article');
    setMetaTag('property', 'og:title', prompt.title + ' | Sec4AI');
    setMetaTag('property', 'og:description', desc);
    setMetaTag('property', 'og:url', url);
    setMetaTag('name', 'twitter:title', prompt.title + ' | Sec4AI');
    setMetaTag('name', 'twitter:description', desc);

    // JSON-LD Article schema for the detail page
    var ld = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: prompt.title,
      description: desc,
      url: url,
      keywords: ['prompt injection', prompt.category].concat(prompt.tags).join(', '),
      datePublished: '2026-07-30',
      author: { '@type': 'Organization', name: 'Sec4AI' },
      mainEntityOfPage: url,
      about: {
        '@type': 'Thing',
        name: 'Prompt Injection Payload'
      },
      alternateName: rawUrl
    };
    var script = document.getElementById('ld-json');
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'ld-json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(ld);
  }

  // ===== Utilities =====

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
