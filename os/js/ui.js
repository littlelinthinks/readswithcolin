/* =============================================================
 * READS WITH COLIN OS — UI 组件层
 * 风格：Calm / Focused / Intellectual / Professional
 *      大量留白、细线分隔、极少的颜色（墨黑 + 纸白 + 一点金）
 * ============================================================= */

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------------------- Toast ---------------------- */
export function toast(msg, type = 'ok') {
  const el = document.createElement('div');
  el.className = `rwc-toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); }, 2600);
}

/* ---------------------- 通用表单弹窗 ----------------------
 * fields: [{ name, label, type: text|textarea|select|date|number|tags|rating,
 *            options, placeholder, required, hint, half }]
 * ------------------------------------------------------ */
export function formModal({ title, subtitle, fields, values = {}, submitText = '保存', onSubmit }) {
  const overlay = document.createElement('div');
  overlay.className = 'rwc-overlay';
  const body = fields.map((f) => {
    const v = values[f.name] ?? '';
    const half = f.half ? ' half' : '';
    let input = '';
    if (f.type === 'textarea') {
      input = `<textarea name="${f.name}" rows="${f.rows || 3}" placeholder="${esc(f.placeholder || '')}">${esc(v)}</textarea>`;
    } else if (f.type === 'select') {
      input = `<select name="${f.name}">${f.options.map((o) => {
        const val = typeof o === 'string' ? o : o.value;
        const lab = typeof o === 'string' ? o : o.label;
        return `<option value="${esc(val)}" ${String(v) === String(val) ? 'selected' : ''}${o.disabled ? ' disabled' : ''}>${esc(lab)}</option>`;
      }).join('')}</select>`;
    } else if (f.type === 'rating') {
      input = `<div class="rwc-stars" data-name="${f.name}">
        ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-v="${n}" class="${Number(v) >= n ? 'on' : ''}">★</button>`).join('')}
        <input type="hidden" name="${f.name}" value="${esc(v)}">
      </div>`;
    } else {
      input = `<input type="${f.type || 'text'}" name="${f.name}" value="${esc(v)}"
        placeholder="${esc(f.placeholder || '')}" ${f.type === 'number' ? 'inputmode="numeric"' : ''}>`;
    }
    return `<label class="rwc-field${half}"><span>${esc(f.label)}${f.required ? ' <i>*</i>' : ''}</span>
      ${input}${f.hint ? `<em>${esc(f.hint)}</em>` : ''}</label>`;
  }).join('');

  overlay.innerHTML = `
    <div class="rwc-modal" role="dialog" aria-modal="true">
      <header>
        <div><h3>${esc(title)}</h3>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>
        <button class="rwc-x" aria-label="关闭">×</button>
      </header>
      <form class="rwc-form">${body}</form>
      <footer>
        <button class="rwc-btn ghost" data-act="cancel">取消</button>
        <button class="rwc-btn primary" data-act="submit">${esc(submitText)}</button>
      </footer>
    </div>`;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('in'));
  const close = () => { overlay.classList.remove('in'); setTimeout(() => overlay.remove(), 220); };
  overlay.querySelector('.rwc-x').onclick = close;
  overlay.querySelector('[data-act="cancel"]').onclick = close;
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });

  overlay.querySelectorAll('.rwc-stars').forEach((box) => {
    box.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const v = b.dataset.v;
      box.querySelector('input').value = v;
      box.querySelectorAll('button').forEach((x) => x.classList.toggle('on', Number(x.dataset.v) <= Number(v)));
    });
  });

  const submit = async () => {
    const fd = new FormData(overlay.querySelector('form'));
    const data = {};
    for (const [k, v] of fd.entries()) data[k] = typeof v === 'string' ? v.trim() : v;
    const missing = fields.filter((f) => f.required && !data[f.name]);
    if (missing.length) { toast(`请填写：${missing.map((f) => f.label).join('、')}`, 'warn'); return; }
    try {
      await onSubmit(data);
      close();
    } catch (e) { toast(e.message || '保存失败', 'warn'); }
  };
  overlay.querySelector('[data-act="submit"]').onclick = submit;
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
  });
  setTimeout(() => overlay.querySelector('input,textarea,select')?.focus(), 60);
  return { close };
}

export function confirmModal(message, onYes) {
  const overlay = document.createElement('div');
  overlay.className = 'rwc-overlay';
  overlay.innerHTML = `<div class="rwc-modal sm">
      <header><div><h3>${esc(message)}</h3></div></header>
      <footer><button class="rwc-btn ghost" data-act="no">取消</button>
      <button class="rwc-btn danger" data-act="yes">确认删除</button></footer>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('in'));
  const close = () => { overlay.classList.remove('in'); setTimeout(() => overlay.remove(), 220); };
  overlay.querySelector('[data-act="no"]').onclick = close;
  overlay.querySelector('[data-act="yes"]').onclick = async () => { await onYes(); close(); };
}

/* ---------------------- 小组件 ---------------------- */
export const empty = (text, hint) => `<div class="rwc-empty"><p>${esc(text)}</p>${hint ? `<span>${esc(hint)}</span>` : ''}</div>`;

export const pill = (text, kind = '') => `<span class="rwc-pill ${kind}">${esc(text)}</span>`;

export function progressBar(pct) {
  return `<div class="rwc-prog"><div style="width:${Math.max(0, Math.min(100, pct || 0))}%"></div></div>`;
}

/* ---------------------- 导入进度弹窗 ---------------------- */
export function progressModal(title) {
  const overlay = document.createElement('div');
  overlay.className = 'rwc-overlay';
  overlay.innerHTML = `<div class="rwc-modal sm">
    <header><div><h3>${esc(title)}</h3></div></header>
    <div class="rwc-prog-wrap">
      <div class="rwc-prog"><div id="pp-bar"></div></div>
      <p id="pp-text" class="rwc-note">准备中…</p>
    </div>
    <footer><span class="rwc-note">导入前已自动备份，可回滚 · 请勿关闭页面</span></footer>
  </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('in'));
  return {
    update(done, total) {
      const pct = total ? Math.round((done / total) * 100) : 100;
      const bar = overlay.querySelector('#pp-bar'); if (bar) bar.style.width = pct + '%';
      const t = overlay.querySelector('#pp-text'); if (t) t.textContent = `${done} / ${total}（${pct}%）`;
    },
    close() { overlay.classList.remove('in'); setTimeout(() => overlay.remove(), 220); },
  };
}

/* ---------------------- 结果汇总弹窗 ---------------------- */
export function resultModal(title, lines) {
  const overlay = document.createElement('div');
  overlay.className = 'rwc-overlay';
  overlay.innerHTML = `<div class="rwc-modal sm">
    <header><div><h3>${esc(title)}</h3></div></header>
    <div class="rwc-result">
      ${lines.map((l) => `<div class="rwc-result-row"><b>${esc(l.k)}</b><span>${esc(l.v)}</span></div>`).join('')}
    </div>
    <footer><button class="rwc-btn primary" data-close>知道了</button></footer>
  </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('in'));
  overlay.querySelector('[data-close]').onclick = () => { overlay.classList.remove('in'); setTimeout(() => overlay.remove(), 220); };
}

/** 极简月度柱状图（纯 SVG，无第三方依赖） */
export function barChart(items, unit = '小时') {
  if (!items.length) return empty('还没有阅读记录');
  const max = Math.max(...items.map((i) => i.hours || i.count || 0), 1);
  const w = 100 / items.length;
  return `<div class="rwc-chart">
    <div class="rwc-chart-bars">
      ${items.map((i) => {
        const v = i.hours || i.count || 0;
        const h = Math.max(2, (v / max) * 100);
        return `<div class="rwc-bar-col" style="width:${w}%">
          <div class="rwc-bar-val">${v ? esc(v) : ''}</div>
          <div class="rwc-bar" style="height:${h}%" title="${esc(i.label)} ${esc(v)}${esc(unit)}"></div>
          <div class="rwc-bar-lab">${esc(i.label)}</div>
        </div>`;
      }).join('')}
    </div>
    <div class="rwc-chart-unit">单位：${esc(unit)}</div>
  </div>`;
}

/** 分类分布条 */
export function catBars(items, total) {
  if (!items.length) return empty('还没有书目');
  const max = Math.max(...items.map((i) => i.count), 1);
  return `<div class="rwc-cats">${items.slice(0, 8).map((i) => `
    <div class="rwc-cat-row">
      <span class="rwc-cat-name">${esc(i.name)}</span>
      <span class="rwc-cat-track"><span style="width:${(i.count / max) * 100}%"></span></span>
      <span class="rwc-cat-num">${i.count}</span>
    </div>`).join('')}</div>`;
}

export const fmtDate = (d) => (d ? String(d).slice(0, 10) : '—');
export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
