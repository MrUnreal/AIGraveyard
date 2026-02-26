// AIGraveyard — app.js
(async function () {
    const data = await d3.json('data.json');

    // Parse dates and compute lifespan
    const parseDate = d3.timeParse('%Y-%m-%d');
    data.forEach(d => {
        d.bornDate = parseDate(d.born);
        d.diedDate = parseDate(d.died);
        d.lifespanDays = d3.timeDay.count(d.bornDate, d.diedDate);
        d.lifespanText = formatLifespan(d.lifespanDays);
    });

    const maxLifespan = d3.max(data, d => d.lifespanDays);

    // --- Stats ---
    const statsEl = document.getElementById('stats');
    const types = d3.rollup(data, v => v.length, d => d.type);
    const shortestLived = data.reduce((a, b) => a.lifespanDays < b.lifespanDays ? a : b);

    statsEl.innerHTML = `
        <div class="stat"><span class="stat-number">${data.length}</span><span class="stat-label">Total Deaths</span></div>
        <div class="stat"><span class="stat-number">${types.get('model') || 0}</span><span class="stat-label">Models</span></div>
        <div class="stat"><span class="stat-number">${types.get('product') || 0}</span><span class="stat-label">Products</span></div>
        <div class="stat"><span class="stat-number">${shortestLived.lifespanDays}d</span><span class="stat-label">Shortest Lived</span></div>
    `;

    // --- Particles ---
    createParticles();

    // --- Render Grid ---
    let currentFilter = 'all';
    let currentSort = 'died-desc';
    let currentView = 'grid';

    renderGrid(data);

    // --- Filter Buttons ---
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderCurrentView();
        });
    });

    // --- Sort ---
    document.getElementById('sort-select').addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderCurrentView();
    });

    // --- View Toggle ---
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;
            renderCurrentView();
        });
    });

    // --- Modal ---
    const modal = document.getElementById('modal');
    modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    function renderCurrentView() {
        const filtered = filterAndSort(data);
        if (currentView === 'grid') {
            document.getElementById('graveyard').classList.remove('hidden');
            document.getElementById('timeline-view').classList.add('hidden');
            renderGrid(filtered);
        } else {
            document.getElementById('graveyard').classList.add('hidden');
            document.getElementById('timeline-view').classList.remove('hidden');
            renderTimeline(filtered);
        }
    }

    function filterAndSort(data) {
        let filtered = currentFilter === 'all' ? [...data] : data.filter(d => d.type === currentFilter);
        switch (currentSort) {
            case 'died-desc': filtered.sort((a, b) => b.diedDate - a.diedDate); break;
            case 'died-asc': filtered.sort((a, b) => a.diedDate - b.diedDate); break;
            case 'lifespan-asc': filtered.sort((a, b) => a.lifespanDays - b.lifespanDays); break;
            case 'lifespan-desc': filtered.sort((a, b) => b.lifespanDays - a.lifespanDays); break;
            case 'name': filtered.sort((a, b) => a.name.localeCompare(b.name)); break;
        }
        return filtered;
    }

    function renderGrid(items) {
        const container = document.getElementById('graveyard');
        container.innerHTML = '';

        items.forEach((item, i) => {
            const card = document.createElement('div');
            card.className = 'tombstone';
            card.dataset.type = item.type;
            card.style.animationDelay = `${i * 0.05}s`;

            const bornStr = d3.timeFormat('%b %Y')(item.bornDate);
            const diedStr = d3.timeFormat('%b %Y')(item.diedDate);

            card.innerHTML = `
                <div class="tombstone-rip">✝</div>
                <div class="tombstone-header">
                    <span class="tombstone-name">${item.name}</span>
                    <span class="tombstone-type" data-type="${item.type}">${item.type}</span>
                </div>
                <div class="tombstone-company">${item.company}</div>
                <div class="tombstone-dates">
                    ${bornStr} <span class="cross">✝</span> ${diedStr}
                </div>
                <div class="tombstone-lifespan">${item.lifespanText}</div>
                <p class="tombstone-description">${item.description}</p>
                <div class="tombstone-cause">💀 ${item.cause}</div>
            `;

            card.addEventListener('click', () => openModal(item));
            container.appendChild(card);
        });
    }

    function renderTimeline(items) {
        const container = document.getElementById('timeline-view');
        container.innerHTML = '';

        // Sort by death date for timeline
        const sorted = [...items].sort((a, b) => b.diedDate - a.diedDate);
        const grouped = d3.group(sorted, d => d.diedDate.getFullYear());

        for (const [year, yearItems] of grouped) {
            const yearDiv = document.createElement('div');
            yearDiv.className = 'timeline-year';
            yearDiv.innerHTML = `<div class="timeline-year-label">${year}</div>`;

            yearItems.forEach(item => {
                const div = document.createElement('div');
                div.className = 'timeline-item';
                div.innerHTML = `
                    <div class="timeline-date">${d3.timeFormat('%b %d')(item.diedDate)}</div>
                    <div class="timeline-content">
                        <h3>${item.name} <span class="tombstone-type" data-type="${item.type}" style="font-size:0.55rem">${item.type}</span></h3>
                        <p>${item.company} &middot; ${item.lifespanText}</p>
                    </div>
                `;
                div.addEventListener('click', () => openModal(item));
                yearDiv.appendChild(div);
            });

            container.appendChild(yearDiv);
        }
    }

    function openModal(item) {
        const body = modal.querySelector('.modal-body');
        const bornStr = d3.timeFormat('%B %d, %Y')(item.bornDate);
        const diedStr = d3.timeFormat('%B %d, %Y')(item.diedDate);
        const lifespanPct = Math.min(100, (item.lifespanDays / maxLifespan) * 100);

        body.innerHTML = `
            <span class="tombstone-type" data-type="${item.type}">${item.type}</span>
            <h2 class="tombstone-name" style="margin-top:12px">${item.name}</h2>
            <div class="tombstone-company">${item.company}</div>
            <div class="tombstone-dates">
                ${d3.timeFormat('%b %Y')(item.bornDate)} <span class="cross">✝</span> ${d3.timeFormat('%b %Y')(item.diedDate)}
            </div>
            <div class="tombstone-lifespan">Lived ${item.lifespanText} (${item.lifespanDays} days)</div>
            <div class="modal-lifespan-bar">
                <div class="modal-lifespan-fill" style="width: 0%"></div>
            </div>
            <p style="font-size:0.75rem;color:var(--text-dim);text-align:center;margin-bottom:16px">
                Born: ${bornStr} &nbsp;|&nbsp; Died: ${diedStr}
            </p>
            <p class="tombstone-description">${item.description}</p>
            <div class="tombstone-cause">💀 ${item.cause}</div>
            ${item.link ? `<a class="modal-link" href="${item.link}" target="_blank" rel="noopener">Learn more →</a>` : ''}
        `;

        modal.classList.remove('hidden');

        // Animate lifespan bar
        requestAnimationFrame(() => {
            body.querySelector('.modal-lifespan-fill').style.width = `${lifespanPct}%`;
        });
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    function formatLifespan(days) {
        if (days < 7) return `${days} day${days !== 1 ? 's' : ''}`;
        if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) !== 1 ? 's' : ''}`;
        if (days < 365) {
            const months = Math.floor(days / 30);
            return `${months} month${months !== 1 ? 's' : ''}`;
        }
        const years = Math.floor(days / 365);
        const rem = Math.floor((days % 365) / 30);
        if (rem === 0) return `${years} year${years !== 1 ? 's' : ''}`;
        return `${years}y ${rem}m`;
    }

    function createParticles() {
        const container = document.getElementById('particles');
        for (let i = 0; i < 25; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${60 + Math.random() * 40}%`;
            particle.style.width = particle.style.height = `${2 + Math.random() * 4}px`;
            particle.style.animationDuration = `${6 + Math.random() * 8}s`;
            particle.style.animationDelay = `${Math.random() * 10}s`;
            container.appendChild(particle);
        }
    }
})();
