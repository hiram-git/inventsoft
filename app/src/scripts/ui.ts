/**
 * UI Animations & Utilities — global module loaded by AdminLayout.
 * Exposes `window.ui` for use in any inline script or page.
 */
import { gsap } from 'gsap';

// ─── Types ────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface UI {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  btnLoading: (btn: HTMLButtonElement, text?: string) => () => void;
}

// ─── Toast system ─────────────────────────────────────────────────────────────
function toast(message: string, type: ToastType = 'success', duration = 3500) {
  const container = document.getElementById('ui-toasts');
  if (!container) return;

  const palette: Record<ToastType, { bg: string; icon: string }> = {
    success: { bg: '#16a34a', icon: 'check_circle' },
    error:   { bg: '#dc2626', icon: 'error'         },
    warning: { bg: '#f59e0b', icon: 'warning'        },
    info:    { bg: '#2563eb', icon: 'info'           },
  };
  const { bg, icon } = palette[type];

  const el = document.createElement('div');
  el.className = 'ui-toast';
  el.innerHTML = `
    <span class="material-icons-round" style="color:${bg};font-size:20px">${icon}</span>
    <span class="ui-toast-msg">${message}</span>
    <button class="ui-toast-close" aria-label="Cerrar">
      <span class="material-icons-round" style="font-size:16px">close</span>
    </button>`;

  container.appendChild(el);

  gsap.fromTo(el,
    { x: 80, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.35, ease: 'power3.out' }
  );

  const dismiss = () => {
    if (!el.isConnected) return;
    gsap.to(el, {
      x: 80, opacity: 0, duration: 0.25, ease: 'power2.in',
      onComplete: () => el.remove(),
    });
  };

  el.querySelector('.ui-toast-close')!.addEventListener('click', dismiss);
  setTimeout(dismiss, duration);
}

// ─── Button loading state ─────────────────────────────────────────────────────
function btnLoading(btn: HTMLButtonElement, text = 'Procesando…'): () => void {
  const orig = btn.innerHTML;
  const origWidth = btn.offsetWidth;
  btn.style.minWidth = `${origWidth}px`;
  btn.disabled = true;
  btn.innerHTML = `<span class="ui-spinner material-icons-round">refresh</span> ${text}`;
  gsap.to(btn, { scale: 0.97, duration: 0.1 });
  return () => {
    btn.disabled = false;
    btn.innerHTML = orig;
    btn.style.minWidth = '';
    gsap.to(btn, { scale: 1, duration: 0.15, ease: 'back.out(2)' });
  };
}

// ─── Page entrance animations ─────────────────────────────────────────────────
function initEntranceAnimations() {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
  const header = document.querySelector<HTMLElement>('.page-header');
  if (header) tl.from(header, { opacity: 0, y: -14, duration: 0.35 }, 0);
  const cards = document.querySelectorAll<HTMLElement>('.card');
  if (cards.length) tl.from(cards, { opacity: 0, y: 18, duration: 0.4, stagger: 0.07 }, 0.05);
}

// ─── Button ripple ────────────────────────────────────────────────────────────
function initRipple() {
  document.addEventListener('click', (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.btn');
    if (!btn || (btn as HTMLButtonElement).disabled) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.5;
    const ripple = document.createElement('span');
    ripple.style.cssText = `position:absolute;pointer-events:none;border-radius:50%;width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px;background:rgba(255,255,255,0.28);`;
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(ripple);
    gsap.fromTo(ripple, { scale: 0, opacity: 1 }, { scale: 1, opacity: 0, duration: 0.55, ease: 'power2.out', onComplete: () => ripple.remove() });
  });
}

// ─── Auto loading on form submit ──────────────────────────────────────────────
function initFormLoading() {
  document.querySelectorAll<HTMLFormElement>('form[method="POST"]:not([data-no-loading])').forEach(form => {
    form.addEventListener('submit', () => {
      const submit = form.querySelector<HTMLButtonElement>('[type="submit"]');
      if (submit) btnLoading(submit);
    });
  });
}

// ─── Input focus micro-animation ─────────────────────────────────────────────
function initInputFocus() {
  document.querySelectorAll<HTMLElement>('.form-control').forEach(input => {
    input.addEventListener('focus', () => gsap.to(input, { scale: 1.012, duration: 0.2 }));
    input.addEventListener('blur',  () => gsap.to(input, { scale: 1,     duration: 0.2 }));
  });
}

// ─── DataTable: search + pagination ──────────────────────────────────────────
function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); }) as T;
}

function pageRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  if (current > 3) out.push('…');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) out.push(i);
  if (current < total - 2) out.push('…');
  out.push(total);
  return out;
}

function initDataTables() {
  document.querySelectorAll<HTMLTableElement>('table[data-searchable]').forEach(table => {
    const pageSize = parseInt(table.dataset.pageSize ?? '20');
    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    // Auto-detect empty-state row: single cell spanning multiple columns
    const allTbodyRows = Array.from(tbody.querySelectorAll<HTMLTableRowElement>('tr'));
    const emptyRow = allTbodyRows.find(r => r.cells.length === 1 && r.cells[0].colSpan > 1) ?? null;
    const dataRows = allTbodyRows.filter(r => r !== emptyRow);

    let filteredRows = [...dataRows];
    let currentPage = 1;

    // Mark parent card so CSS can remove its padding and go full-bleed
    table.closest<HTMLElement>('.card')?.classList.add('card--table');

    // ── Toolbar (search bar) — styled with Tailwind v4 ───────────────────────
    const toolbar = document.createElement('div');
    toolbar.className = [
      'flex items-center justify-between gap-4 flex-wrap',
      'px-6 py-4',
      'border-b border-border bg-card',
    ].join(' ');
    toolbar.innerHTML = `
      <span class="dt-info text-sm text-muted font-medium"></span>
      <div class="dt-search-box flex items-center gap-2
                  border border-border rounded-[var(--radius)]
                  px-3 py-2 bg-card min-w-64
                  transition-all duration-200
                  focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary-light">
        <span class="material-icons-round text-muted pointer-events-none select-none"
              style="font-size:18px">search</span>
        <input type="text"
               class="dt-search flex-1 min-w-0 border-0 outline-none bg-transparent
                      text-sm text-[var(--text)] font-[inherit]
                      placeholder:text-muted"
               placeholder="Buscar…" autocomplete="off" />
        <button class="dt-clear flex items-center bg-transparent border-0 p-1 rounded
                       text-muted transition-colors hover:text-danger hover:bg-red-50"
                title="Limpiar búsqueda" style="display:none">
          <span class="material-icons-round" style="font-size:16px">close</span>
        </button>
      </div>`;
    table.parentElement!.insertBefore(toolbar, table);

    // ── Footer (pagination) — styled with Tailwind v4 ────────────────────────
    const footer = document.createElement('div');
    footer.className = 'dt-footer flex items-center justify-end px-6 py-3.5 border-t border-border bg-card';
    table.after(footer);

    const infoEl   = toolbar.querySelector<HTMLElement>('.dt-info')!;
    const searchEl = toolbar.querySelector<HTMLInputElement>('.dt-search')!;
    const clearBtn = toolbar.querySelector<HTMLButtonElement>('.dt-clear')!;

    function render() {
      const total      = filteredRows.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      currentPage      = Math.min(currentPage, totalPages);
      const start      = (currentPage - 1) * pageSize;
      const end        = Math.min(start + pageSize, total);

      // Rows visibility
      dataRows.forEach(r => (r.style.display = 'none'));
      filteredRows.slice(start, end).forEach(r => (r.style.display = ''));
      if (emptyRow) emptyRow.style.display = total === 0 ? '' : 'none';

      // Info text
      infoEl.innerHTML = total === 0
        ? 'Sin resultados'
        : `Mostrando <strong>${start + 1}–${end}</strong> de <strong>${total}</strong>`;

      // Pagination buttons
      if (totalPages <= 1) { footer.innerHTML = ''; return; }

      // Shared Tailwind classes for page buttons — Tailwind v4 scans these strings
      const btnBase = [
        'dt-page-btn',
        'min-w-9 h-9 px-3',
        'border rounded-[var(--radius)]',
        'text-sm font-medium font-[inherit]',
        'inline-flex items-center justify-center',
        'transition-all duration-150 leading-none cursor-pointer',
        'disabled:opacity-40 disabled:cursor-not-allowed',
      ].join(' ');
      const btnActive  = 'bg-primary text-white border-primary font-semibold';
      const btnDefault = 'bg-card text-[var(--text)] border-border hover:bg-primary-light hover:border-primary hover:text-primary';
      const btnNav     = 'bg-card text-muted border-border hover:bg-primary-light hover:border-primary hover:text-primary';

      const btns = pageRange(currentPage, totalPages).map(p =>
        p === '…'
          ? `<span class="min-w-8 text-center text-muted text-sm select-none">…</span>`
          : `<button class="${btnBase} ${p === currentPage ? btnActive : btnDefault}" data-p="${p}">${p}</button>`
      );
      footer.innerHTML = `
        <div class="dt-pages flex items-center gap-1">
          <button class="${btnBase} ${btnNav}" data-p="prev" ${currentPage === 1 ? 'disabled' : ''}>
            <span class="material-icons-round" style="font-size:18px">chevron_left</span>
          </button>
          ${btns.join('')}
          <button class="${btnBase} ${btnNav}" data-p="next" ${currentPage === totalPages ? 'disabled' : ''}>
            <span class="material-icons-round" style="font-size:18px">chevron_right</span>
          </button>
        </div>`;

      footer.querySelectorAll<HTMLButtonElement>('[data-p]').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = btn.dataset.p!;
          if (p === 'prev') currentPage = Math.max(1, currentPage - 1);
          else if (p === 'next') currentPage = Math.min(totalPages, currentPage + 1);
          else currentPage = parseInt(p);
          render();
          table.closest('.card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      });
    }

    function filter() {
      const q = searchEl.value.toLowerCase().trim();
      filteredRows = q
        ? dataRows.filter(r => r.textContent!.toLowerCase().includes(q))
        : [...dataRows];
      currentPage = 1;
      clearBtn.style.display = q ? '' : 'none';
      render();
    }

    searchEl.addEventListener('input', debounce(filter, 200));
    clearBtn.addEventListener('click', () => { searchEl.value = ''; filter(); searchEl.focus(); });

    render(); // initial
  });
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
const ui: UI = { toast, btnLoading };
(window as any).ui = ui;

document.addEventListener('DOMContentLoaded', () => {
  initEntranceAnimations();
  initRipple();
  initFormLoading();
  initInputFocus();
  initDataTables();
});
