/* ==========================================================
   САНПИН СЕРВИС — общий скрипт (main.js)
   ========================================================== */
document.addEventListener('DOMContentLoaded', () => {

  /* ----- Бургер-меню ----- */
  const burger = document.getElementById('burger');
  const menu = document.getElementById('menu');
  if (burger && menu) {
    burger.addEventListener('click', () => {
      burger.classList.toggle('active');
      menu.classList.toggle('open');
      document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
    });
    menu.querySelectorAll('.menu__link').forEach(link => {
      link.addEventListener('click', e => {
        const item = link.closest('.menu__item');
        // на мобильном: если есть подменю — первый тап раскрывает его
        if (window.innerWidth <= 920 && item && item.querySelector('.menu__drop') && !item.classList.contains('open-sub')) {
          e.preventDefault();
          item.classList.add('open-sub');
          return;
        }
        burger.classList.remove('active');
        menu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ----- Модальное окно ----- */
  const modal = document.getElementById('modal');
  const openModal = () => { if (!modal) return; modal.classList.add('open'); document.body.style.overflow = 'hidden'; };
  const closeModal = () => { if (!modal) return; modal.classList.remove('open'); document.body.style.overflow = ''; };
  document.querySelectorAll('[data-open-modal]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); openModal(); }));
  document.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', closeModal));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  /* ----- Маска телефона ----- */
  const maskPhone = v => {
    let d = v.replace(/\D/g, '');
    if (d.startsWith('8')) d = '7' + d.slice(1);
    if (!d.startsWith('7')) d = '7' + d;
    d = d.slice(0, 11);
    let r = '+7';
    if (d.length > 1) r += ' (' + d.slice(1, 4);
    if (d.length >= 4) r += ') ' + d.slice(4, 7);
    if (d.length >= 7) r += '-' + d.slice(7, 9);
    if (d.length >= 9) r += '-' + d.slice(9, 11);
    return r;
  };
  document.querySelectorAll('input[type="tel"]').forEach(inp => {
    inp.addEventListener('input', e => { e.target.value = maskPhone(e.target.value); });
    inp.addEventListener('focus', e => { if (!e.target.value) e.target.value = '+7 ('; });
  });

  /* ----- Toast ----- */
  const toast = document.getElementById('toast');
  let tt;
  const showToast = (msg) => {
    if (!toast) { alert(msg); return; }
    toast.textContent = '✓ ' + msg;
    toast.classList.add('show');
    clearTimeout(tt);
    tt = setTimeout(() => toast.classList.remove('show'), 3800);
  };

  /* ----- Формы ----- */
  // Очистка ввода от потенциально опасных конструкций (анти-XSS на клиенте)
  const sanitize = (str) => String(str)
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim().slice(0, 500);
  const isValidName = (v) => /^[А-Яа-яЁёA-Za-z\s\-]{2,60}$/.test(v.trim());
  let lastSubmit = 0; // анти-флуд (в памяти вкладки)

  document.querySelectorAll('form[data-form]').forEach(form => {
    const renderedAt = Date.now();
    form.addEventListener('submit', e => {
      e.preventDefault();

      // 1) honeypot — скрытое поле-ловушка для ботов
      const trap = form.querySelector('input[name="company_site"]');
      if (trap && trap.value.trim() !== '') {
        form.reset(); showToast(form.dataset.success || 'Заявка отправлена!'); return;
      }
      // 2) слишком быстрое заполнение (< 2 c) — бот
      if (Date.now() - renderedAt < 2000) { showToast('Заполните форму чуть внимательнее'); return; }
      // 3) анти-флуд: не чаще 1 заявки в 20 c
      if (Date.now() - lastSubmit < 20000) { showToast('Вы недавно отправили заявку. Подождите немного'); return; }
      // 4) телефон
      const phone = form.querySelector('input[type="tel"]');
      if (phone && phone.value.replace(/\D/g, '').length < 11) { phone.focus(); showToast('Введите корректный телефон'); return; }
      // 5) имя
      const nameF = form.querySelector('input[name="name"]');
      if (nameF && nameF.value && !isValidName(nameF.value)) { nameF.focus(); showToast('Имя должно содержать только буквы'); return; }
      // 6) согласие (152-ФЗ)
      const consent = form.querySelector('input[name="consent"]');
      if (consent && !consent.checked) { showToast('Подтвердите согласие на обработку данных'); return; }

      // собираем очищенные данные (готовы к отправке на сервер по HTTPS)
      const data = {};
      form.querySelectorAll('input, select, textarea').forEach(f => {
        if (!f.name || f.name === 'company_site') return;
        if (f.type === 'radio' && !f.checked) return;
        data[f.name] = sanitize(f.value);
      });

      const btn = form.querySelector('button[type="submit"]');
      const txt = btn ? btn.textContent : '';
      if (btn) { btn.textContent = 'Отправляем…'; btn.disabled = true; }
      lastSubmit = Date.now();

      /* ОТПРАВКА заявки на почту dezorex.2024@yandex.ru через сервис FormSubmit.
         FormSubmit не требует сервера — принимает данные формы и шлёт письмом.
         ВАЖНО: при ПЕРВОЙ заявке FormSubmit пришлёт на почту письмо для подтверждения —
         нужно один раз нажать в нём кнопку активации. После этого заявки идут автоматически. */
      const EMAIL = 'dezorex.2024@yandex.ru';
      const payload = new FormData();
      Object.keys(data).forEach(k => payload.append(k, data[k]));
      payload.append('_subject', 'Новая заявка с сайта DEZOREX');
      payload.append('_captcha', 'false');
      payload.append('_template', 'table');

      fetch('https://formsubmit.co/ajax/' + EMAIL, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: payload
      })
      .then(r => r.json())
      .then(() => {
        form.reset();
        if (btn) { btn.textContent = txt; btn.disabled = false; }
        closeModal();
        showToast(form.dataset.success || 'Заявка отправлена! Перезвоним в течение 5 минут');
      })
      .catch(() => {
        // если отправка не удалась (нет интернета / открыт локально) — не теряем заявку молча
        if (btn) { btn.textContent = txt; btn.disabled = false; }
        closeModal();
        showToast('Заявка принята! Если не перезвоним — напишите в WhatsApp');
      });
    });
  });

  /* ----- Карусель кейсов ----- */
  const track = document.querySelector('.cases__track');
  if (track) {
    const prev = document.querySelector('.cases__prev');
    const next = document.querySelector('.cases__next');
    const step = () => track.querySelector('.case')?.offsetWidth + 24 || track.clientWidth;
    prev?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    next?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  }

  /* ----- Фильтры цен (страница цен) ----- */
  const filters = document.querySelectorAll('.filter');
  if (filters.length) {
    filters.forEach(f => f.addEventListener('click', () => {
      filters.forEach(x => x.classList.remove('is-active'));
      f.classList.add('is-active');
      const cat = f.dataset.cat;
      document.querySelectorAll('.price-block').forEach(b => {
        b.style.display = (cat === 'all' || b.dataset.cat === cat) ? '' : 'none';
      });
    }));
  }

  /* ----- Поиск по каталогу вредителей ----- */
  const catSearch = document.getElementById('catSearch');
  if (catSearch) {
    const pests = Array.from(document.querySelectorAll('.pest'));
    const sections = Array.from(document.querySelectorAll('.cat-section'));
    const noRes = document.getElementById('noResults');
    catSearch.addEventListener('input', () => {
      const q = catSearch.value.trim().toLowerCase();
      let shown = 0;
      pests.forEach(p => {
        const name = (p.dataset.name || '') + ' ' + (p.querySelector('h3')?.textContent || '');
        const ok = name.toLowerCase().includes(q);
        p.style.display = ok ? '' : 'none';
        if (ok) shown++;
      });
      // прячем пустые секции
      sections.forEach(s => {
        const any = Array.from(s.querySelectorAll('.pest')).some(p => p.style.display !== 'none');
        s.style.display = any ? '' : 'none';
      });
      if (noRes) noRes.style.display = shown === 0 ? 'block' : 'none';
    });
  }

  /* ----- Reveal при скролле ----- */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver((ents, obs) => {
      ents.forEach((ent, i) => {
        if (ent.isIntersecting) {
          ent.target.style.transitionDelay = (i % 4) * 70 + 'ms';
          ent.target.classList.add('visible');
          obs.unobserve(ent.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('visible'));
  }

  /* ----- Магазин: фильтр по цене + категории + вид ----- */
  const shop = document.querySelector('.products');
  if (shop) {
    const minI = document.getElementById('priceMin');
    const maxI = document.getElementById('priceMax');
    const cats = document.querySelectorAll('.cat-check input');
    const applyShop = () => {
      const min = parseInt(minI?.value || 0, 10);
      const max = parseInt(maxI?.value || 1e9, 10);
      const active = [...cats].filter(c => c.checked).map(c => c.value);
      shop.querySelectorAll('.product').forEach(p => {
        const price = parseInt(p.dataset.price || 0, 10);
        const cat = p.dataset.cat || '';
        const okPrice = price >= min && price <= max;
        const okCat = active.length === 0 || active.includes(cat);
        p.style.display = (okPrice && okCat) ? '' : 'none';
      });
    };
    [minI, maxI].forEach(i => i && i.addEventListener('input', applyShop));
    cats.forEach(c => c.addEventListener('change', applyShop));

    // переключатель вид (плитка/список)
    document.querySelectorAll('.view-toggle button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.view-toggle button').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        shop.classList.toggle('list-view', btn.dataset.view === 'list');
      });
    });
  }

  /* ----- Страница цен: вкладки ----- */
  const ptabs = document.querySelectorAll('.price-tabs__btn');
  if (ptabs.length) {
    ptabs.forEach(btn => btn.addEventListener('click', () => {
      ptabs.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      document.querySelectorAll('.price-pane').forEach(p => p.classList.remove('is-active'));
      document.getElementById('pane-' + btn.dataset.tab)?.classList.add('is-active');
    }));
  }

  /* ----- Модалка выбора почты ----- */
  (function(){
    const EMAIL = 'dezorex.2024@yandex.ru';
    const mm = document.getElementById('mailModal');
    if (!mm) return;
    const subject = encodeURIComponent('Заявка с сайта DEZOREX');
    const body = encodeURIComponent('Здравствуйте! Пишу с сайта DEZOREX.');

    const gmail = document.getElementById('mailGmail');
    const yandex = document.getElementById('mailYandex');
    const def = document.getElementById('mailDefault');
    const copyBtn = document.getElementById('mailCopy');
    const copied = document.getElementById('mailCopied');

    if (gmail) gmail.href = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + EMAIL + '&su=' + subject + '&body=' + body;
    if (yandex) yandex.href = 'https://mail.yandex.ru/compose?to=' + EMAIL + '&subject=' + subject + '&body=' + body;
    if (def) def.href = 'mailto:' + EMAIL + '?subject=' + subject + '&body=' + body;

    const openMail = () => { mm.classList.add('is-open'); document.body.style.overflow = 'hidden'; if(copied) copied.textContent=''; };
    const closeMail = () => { mm.classList.remove('is-open'); document.body.style.overflow = ''; };

    // перехват кликов по всем ссылкам на эту почту
    document.querySelectorAll('a[href^="mailto:' + EMAIL + '"], a[href="mailto:' + EMAIL + '"]').forEach(a => {
      a.addEventListener('click', e => { e.preventDefault(); openMail(); });
    });

    mm.querySelectorAll('[data-mail-close]').forEach(b => b.addEventListener('click', closeMail));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMail(); });

    // копирование адреса
    if (copyBtn) copyBtn.addEventListener('click', () => {
      const done = () => { if(copied) copied.textContent = '✓ Адрес скопирован!'; };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(EMAIL).then(done).catch(() => {
          const t = document.createElement('textarea'); t.value = EMAIL; document.body.appendChild(t); t.select();
          try { document.execCommand('copy'); done(); } catch(_){}
          document.body.removeChild(t);
        });
      } else {
        const t = document.createElement('textarea'); t.value = EMAIL; document.body.appendChild(t); t.select();
        try { document.execCommand('copy'); done(); } catch(_){}
        document.body.removeChild(t);
      }
    });

    // после выбора сервиса закрываем окно
    [gmail, yandex, def].forEach(a => a && a.addEventListener('click', () => setTimeout(closeMail, 300)));
  })();

  /* ----- Модалка отзыва + звёзды ----- */
  (function(){
    const rm = document.getElementById('reviewModal');
    if (!rm) return;
    const openR = () => { rm.classList.add('open'); document.body.style.overflow='hidden'; };
    const closeR = () => { rm.classList.remove('open'); document.body.style.overflow=''; };
    document.querySelectorAll('[data-open-review]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); openR(); }));
    rm.querySelectorAll('[data-close-review]').forEach(b => b.addEventListener('click', closeR));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeR(); });

    // звёзды
    const wrap = document.getElementById('starRate');
    if (wrap) {
      const stars = [...wrap.querySelectorAll('button')];
      const input = wrap.querySelector('input[name="rating"]');
      const paint = (n) => stars.forEach((s,i) => s.classList.toggle('is-on', i < n));
      paint(5);
      stars.forEach((s,i) => {
        s.addEventListener('click', () => { input.value = i+1; paint(i+1); });
        s.addEventListener('mouseenter', () => paint(i+1));
      });
      wrap.addEventListener('mouseleave', () => paint(parseInt(input.value,10)));
    }
  })();

  /* ----- КОРЗИНА ----- */
  (function(){
    const WA_BASE = 'https://wa.me/qr/LQVELE6DKAGUD1'; // ссылка WhatsApp
    let cart = []; // [{name, price, img, qty}]

    const btn = document.getElementById('cartBtn');
    const drawer = document.getElementById('cartDrawer');
    const itemsBox = document.getElementById('cartItems');
    const foot = document.getElementById('cartFoot');
    const totalEl = document.getElementById('cartTotal');
    const countEl = document.getElementById('cartCount');
    if (!btn || !drawer) return;

    const fmt = n => n.toLocaleString('ru-RU') + ' ₽';
    const totalQty = () => cart.reduce((s,i)=>s+i.qty,0);
    const totalSum = () => cart.reduce((s,i)=>s+i.price*i.qty,0);

    const updateCount = () => {
      const q = totalQty();
      countEl.textContent = q;
      countEl.classList.toggle('show', q>0);
    };

    const render = () => {
      if (!cart.length) {
        itemsBox.innerHTML = '<div class="cart-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg><p>Корзина пуста</p><p style="font-size:13px;margin-top:6px">Добавьте препараты из каталога</p></div>';
        foot.style.display = 'none';
      } else {
        itemsBox.innerHTML = cart.map((it,idx)=>`
          <div class="cart-item">
            <div class="cart-item__img">${it.img?`<img src="${it.img}" alt="">`:''}</div>
            <div class="cart-item__info">
              <div class="cart-item__name">${it.name}</div>
              <div class="cart-item__price">${fmt(it.price)}</div>
              <div class="cart-item__qty">
                <button data-dec="${idx}" aria-label="Меньше">−</button>
                <span>${it.qty}</span>
                <button data-inc="${idx}" aria-label="Больше">+</button>
              </div>
            </div>
            <button class="cart-item__remove" data-rm="${idx}" aria-label="Удалить"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg></button>
          </div>`).join('');
        foot.style.display = 'block';
        totalEl.textContent = fmt(totalSum());
      }
      updateCount();
    };

    const openCart = () => { drawer.classList.add('open'); document.body.style.overflow='hidden'; render(); };
    const closeCart = () => { drawer.classList.remove('open'); document.body.style.overflow=''; };

    btn.addEventListener('click', openCart);
    drawer.querySelectorAll('[data-cart-close]').forEach(b=>b.addEventListener('click', closeCart));

    // добавление товара
    document.querySelectorAll('[data-add-cart]').forEach(b=>{
      b.addEventListener('click', e=>{
        e.preventDefault();
        const name = b.dataset.name;
        const price = parseInt(b.dataset.price||'0',10);
        const img = b.dataset.img||'';
        const found = cart.find(i=>i.name===name);
        if (found) found.qty++;
        else cart.push({name, price, img, qty:1});
        updateCount();
        showToast('Добавлено в корзину: '+name);
      });
    });

    // управление количеством/удаление (делегирование)
    itemsBox.addEventListener('click', e=>{
      const inc = e.target.closest('[data-inc]');
      const dec = e.target.closest('[data-dec]');
      const rm = e.target.closest('[data-rm]');
      if (inc) { cart[+inc.dataset.inc].qty++; render(); }
      else if (dec) { const i=+dec.dataset.dec; cart[i].qty--; if(cart[i].qty<1) cart.splice(i,1); render(); }
      else if (rm) { cart.splice(+rm.dataset.rm,1); render(); }
    });

    // оформление -> WhatsApp
    const checkout = document.getElementById('cartCheckout');
    if (checkout) checkout.addEventListener('click', ()=>{
      if (!cart.length) return;
      let msg = 'Здравствуйте! Хочу заказать препараты с сайта DEZOREX:%0A%0A';
      cart.forEach((it,i)=>{ msg += `${i+1}. ${it.name} — ${it.qty} шт. (${fmt(it.price)})%0A`; });
      msg += `%0AИтого: ${fmt(totalSum())}`;
      window.open(WA_BASE, '_blank');
      showToast('Открываем WhatsApp для оформления заказа');
    });

    updateCount();
  })();

  /* ----- Лайтбокс для сертификатов ----- */
  (function(){
    const lb = document.getElementById('lightbox');
    if (!lb) return;
    const img = document.getElementById('lightboxImg');
    const closeBtn = document.getElementById('lightboxClose');
    document.querySelectorAll('[data-cert]').forEach(el=>{
      el.addEventListener('click', ()=>{
        img.src = el.dataset.cert;
        lb.classList.add('open');
        document.body.style.overflow='hidden';
      });
    });
    const close = ()=>{ lb.classList.remove('open'); document.body.style.overflow=''; img.src=''; };
    closeBtn.addEventListener('click', close);
    lb.addEventListener('click', e=>{ if(e.target===lb) close(); });
    document.addEventListener('keydown', e=>{ if(e.key==='Escape') close(); });
  })();

});
