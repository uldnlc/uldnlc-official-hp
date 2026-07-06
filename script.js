document.addEventListener("DOMContentLoaded", function() {

    // =========================================================
    // 1. テキストデコーディング演出 (TextScramble)
    // =========================================================
    class TextScramble {
        constructor(el) {
            this.el = el;
            this.chars = '!<>-_\\/[]{}—=+*^?#________'; 
            this.update = this.update.bind(this);
        }
        setText(newText) {
            const oldText = this.el.innerText;
            const length = Math.max(oldText.length, newText.length);
            const promise = new Promise((resolve) => this.resolve = resolve);
            this.queue = [];
            for (let i = 0; i < length; i++) {
                const from = oldText[i] || '';
                const to = newText[i] || '';
                const start = Math.floor(Math.random() * 40);
                const end = start + Math.floor(Math.random() * 40);
                this.queue.push({ from, to, start, end });
            }
            cancelAnimationFrame(this.frameRequest);
            this.frame = 0;
            this.update();
            return promise;
        }
        update() {
            let output = '';
            let complete = 0;
            for (let i = 0, n = this.queue.length; i < n; i++) {
                let { from, to, start, end, char } = this.queue[i];
                if (this.frame >= end) { complete++; output += to; }
                else if (this.frame >= start) {
                    if (!char || Math.random() < 0.28) { char = this.randomChar(); this.queue[i].char = char; }
                    output += `<span class="dud">${char}</span>`;
                } else { output += from; }
            }
            this.el.innerHTML = output;
            if (complete === this.queue.length) { this.resolve(); }
            else { this.frameRequest = requestAnimationFrame(this.update); this.frame++; }
        }
        randomChar() { return this.chars[Math.floor(Math.random() * this.chars.length)]; }
    }

    // =========================================================
    // 2. 慣性スクロール & パララックス (ロジック統合版)
    // =========================================================
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasIO = 'IntersectionObserver' in window;
    
    if (typeof Lenis !== 'undefined' && !prefersReducedMotion) {
        window.lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smooth: true, direction: 'vertical' });
        function raf(time) { window.lenis.raf(time); requestAnimationFrame(raf); }
        requestAnimationFrame(raf);
        
        const orb1 = document.querySelector('.orb-1');
        const orb2 = document.querySelector('.orb-2');
        const orb3 = document.querySelector('.orb-3');
        const visibleContainers = new Set();

        if (hasIO) {
            const parallaxObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) { visibleContainers.add(entry.target); } 
                    else { visibleContainers.delete(entry.target); }
                });
            }, { rootMargin: "100px 0px" });
            document.querySelectorAll('.identity-img-container').forEach(c => parallaxObserver.observe(c));
        }

        let isTicking = false;
        window.lenis.on('scroll', (e) => {
            if (!isTicking) {
                window.requestAnimationFrame(() => {
                    const scrollY = e.scroll;
                    if(orb1) orb1.style.transform = `translateY(${scrollY * 0.2}px)`;
                    if(orb2) orb2.style.transform = `translateY(${scrollY * 0.5}px)`;
                    if(orb3) orb3.style.transform = `translateY(${scrollY * 0.1}px)`;
                    
                    if (window.innerWidth > 768 && hasIO) {
                        visibleContainers.forEach(container => {
                            const img = container.querySelector('.identity-img');
                            if (img) {
                                const rect = container.getBoundingClientRect();
                                const containerTop = rect.top + scrollY;
                                const containerHeight = rect.height;
                                const relativeScroll = (scrollY + window.innerHeight / 2) - (containerTop + containerHeight / 2);
                                img.style.transform = `translateY(${relativeScroll * 0.15}px)`;
                            }
                        });
                    }
                    isTicking = false;
                });
                isTicking = true;
            }
        });
    }

    // =========================================================
    // 3. カスタムカーソル
    // =========================================================
    const cursor = document.getElementById('cursor');
    const follower = document.getElementById('cursor-follower');
    if (cursor && follower && window.innerWidth > 768 && !prefersReducedMotion) {
        let mouseX = 0, mouseY = 0, followerX = 0, followerY = 0;
        document.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; cursor.style.left = mouseX + 'px'; cursor.style.top = mouseY + 'px'; });
        function animateFollower() { followerX += (mouseX - followerX) * 0.1; followerY += (mouseY - followerY) * 0.1; follower.style.left = followerX + 'px'; follower.style.top = followerY + 'px'; requestAnimationFrame(animateFollower); }
        animateFollower();
        const links = document.querySelectorAll('a, button, input, textarea, select, .hamburger');
        links.forEach(link => { link.addEventListener('mouseenter', () => follower.classList.add('hovered')); link.addEventListener('mouseleave', () => follower.classList.remove('hovered')); });
    }

    // =========================================================
    // 4. ローディング & ページ遷移 (★url.href正規化・完全版)
    // =========================================================
    const loader = document.getElementById('loading');
    if (loader) { setTimeout(() => loader.classList.add('loaded'), 2000); }

    const curtain = document.querySelector('.transition-curtain');
    window.addEventListener('pageshow', (event) => { if (event.persisted && curtain) { curtain.classList.add('is-open'); } });
    setTimeout(() => { if (curtain) curtain.classList.add('is-open'); }, 100);

    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('auxclick', (e) => { return; }); // ミドルクリック等を尊重

        link.addEventListener('click', function(e) {
            if (e.defaultPrevented || e.button !== 0) return; // 左クリック以外は除外

            const hrefAttr = (this.getAttribute('href') || '').trim();
            if (!hrefAttr) return;
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            if (this.hasAttribute('download')) return;
            if (this.getAttribute('target') === '_blank') return;
            if (hrefAttr.startsWith('#') || hrefAttr.startsWith('mailto:') || hrefAttr.startsWith('tel:') || hrefAttr.startsWith('javascript:')) return;

            let url;
            try {
                // ブラウザにURLを解析させ、同一サイト内かを判定
                url = new URL(hrefAttr, window.location.href);
                if (url.origin !== window.location.origin) return;
            } catch (_) { return; }

            e.preventDefault(); 
            if (curtain) curtain.classList.remove('is-open'); 
            // 修正：正規化された url.href を使用することでリンクミスを防ぐ
            setTimeout(() => { window.location.href = url.href; }, 800);
        });
    });

    // =========================================================
    // 5. ハンバーガーメニュー (★外側フォーカス閉じ追加)
    // =========================================================
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        let startX, startY;
        const getFocusable = () => Array.from(navMenu.querySelectorAll('a[href], button:not([disabled])'))
            .filter(el => !el.hasAttribute('disabled'))
            .filter(el => el.offsetParent !== null && el.getClientRects().length);

        const openMenu = () => {
            hamburger.classList.add('active'); navMenu.classList.add('active');
            document.body.classList.add('no-scroll'); hamburger.setAttribute('aria-expanded', 'true');
            setTimeout(() => (getFocusable()[0] || hamburger).focus(), 0);
        };

        const closeMenu = () => {
            hamburger.classList.remove('active'); navMenu.classList.remove('active');
            document.body.classList.remove('no-scroll'); hamburger.setAttribute('aria-expanded', 'false');
            hamburger.focus();
        };

        const toggleMenu = () => navMenu.classList.contains('active') ? closeMenu() : openMenu();

        hamburger.addEventListener('click', toggleMenu);
        hamburger.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMenu(); } });

        // 外側クリックで閉じる (座標保存型でドラッグ事故を防止)
        document.addEventListener('pointerdown', (e) => {
            if (!navMenu.classList.contains('active')) return;
            startX = e.clientX; startY = e.clientY;
        });
        document.addEventListener('pointerup', (e) => {
            if (!navMenu.classList.contains('active')) return;
            const diffX = Math.abs(e.clientX - startX);
            const diffY = Math.abs(e.clientY - startY);
            if (diffX > 10 || diffY > 10) return; 
            if (navMenu.contains(e.target) || hamburger.contains(e.target)) return;
            closeMenu();
        });

        // ★追加: フォーカスがメニュー外へ移動したら閉じる (究極のUX)
        document.addEventListener('focusin', (e) => {
            if (navMenu.classList.contains('active') && !navMenu.contains(e.target) && !hamburger.contains(e.target)) {
                closeMenu();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (!navMenu.classList.contains('active')) return;
            if (e.key === 'Escape') { e.preventDefault(); closeMenu(); return; }
            if (e.key === 'Tab') {
                const focusable = getFocusable();
                if (!focusable.length) return;
                const first = focusable[0], last = focusable[focusable.length - 1];
                if (!navMenu.contains(document.activeElement)) { e.preventDefault(); first.focus(); return; }
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        });

        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => { if (navMenu.classList.contains('active')) closeMenu(); });
        });
    }

    // =========================================================
    // 6. フェードイン & ビデオ制御 (★IO非対応環境でのビデオ保証)
    // =========================================================
    if (!hasIO) {
        document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
    } else {
        const fadeObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    if (entry.target.tagName === 'H1' && !prefersReducedMotion) { 
                        new TextScramble(entry.target).setText(entry.target.innerText); 
                    }
                    fadeObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });
        document.querySelectorAll('.fade-in').forEach(el => fadeObserver.observe(el));
    }

    // ビデオ制御：IOの有無に関わらず適切に実行
    const video = document.getElementById("bg-video");
    const heroSection = document.getElementById("hero-section");
    if (video && heroSection) {
        if (!hasIO) {
            // ★修正：IO非対応ブラウザでも即座にビデオを再生させる
            video.play().catch(e=>e);
        } else {
            const videoObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => { if (entry.isIntersecting) { if (video.paused) video.play().catch(e=>e); } else { if (!video.paused) video.pause(); } });
            }, { threshold: 0.1 });
            videoObserver.observe(heroSection);
        }
    }

    // =========================================================
    // 8. RECRUIT プロローグ
    // =========================================================
    const prologue = document.getElementById('recruit-prologue');
    const prologueText = document.getElementById('prologue-text');
    if (prologue && prologueText) {
        if (window.lenis) window.lenis.stop();
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            prologueText.style.visibility = 'visible';
            const textNodes = [];
            function walk(node) { if (node.nodeType === 3 && node.nodeValue.trim() !== '') { textNodes.push({ node, text: node.nodeValue }); node.nodeValue = ''; } else { node.childNodes.forEach(walk); } }
            walk(prologueText);
            const cursorNode = document.createElement('span'); cursorNode.className = 'tw-cursor'; cursorNode.textContent = '_';
            let nIdx = 0, cIdx = 0;
            function type() {
                if (prologue.classList.contains('is-hidden')) return;
                if (nIdx < textNodes.length) {
                    const obj = textNodes[nIdx]; obj.node.parentNode.insertBefore(cursorNode, obj.node.nextSibling);
                    if (cIdx < obj.text.length) {
                        let c = obj.text.charAt(cIdx); obj.node.nodeValue += c; cIdx++;
                        prologue.scrollTop = prologue.scrollHeight;
                        let d = 45; if (c === '。') d = 600; else if ('、()（）'.includes(c)) d = 250;
                        setTimeout(type, d);
                    } else { nIdx++; cIdx = 0; setTimeout(type, 300); }
                } else {
                    cursorNode.style.display = 'none';
                    setTimeout(() => {
                        const act = document.getElementById('prologue-action');
                        if (act) { act.style.display = 'flex'; setTimeout(() => { act.classList.add('is-visible'); prologue.scrollTo({ top: prologue.scrollHeight, behavior: 'smooth' }); }, 50); }
                    }, 1000);
                }
            }
            type();
        }, 1500);
        document.querySelector('.prologue-skip')?.addEventListener('click', endP);
        document.querySelector('.prologue-close-btn')?.addEventListener('click', endP);
        document.querySelector('.prologue-cta-btn')?.addEventListener('click', endP);
        function endP() { prologue.classList.add('is-hidden'); if (window.lenis) window.lenis.start(); document.body.style.overflow = ''; }
    }

    // =========================================================
    // 9. CONTACT フォーム処理
    // =========================================================
    const contactForm = document.getElementById('contactForm');
    const btnConfirm = document.getElementById('btn-confirm');
    const btnBack = document.getElementById('btn-back');
    const stepInput = document.getElementById('form-input-step');
    const stepConfirm = document.getElementById('form-confirm-step');
    const formStatus = document.getElementById('form-status');

    btnConfirm?.addEventListener('click', () => {
        if (contactForm.reportValidity()) {
            document.getElementById('conf-name').textContent = document.getElementById('name').value;
            document.getElementById('conf-email').textContent = document.getElementById('email').value;
            document.getElementById('conf-tel').textContent = document.getElementById('tel').value || '未記入';
            const cat = document.getElementById('category');
            document.getElementById('conf-category').textContent = cat.options[cat.selectedIndex].text;
            document.getElementById('conf-message').textContent = document.getElementById('message').value;
            stepInput.style.display = 'none'; stepConfirm.style.display = 'block';
            window.scrollTo({ top: contactForm.offsetTop - 100, behavior: 'smooth' });
        }
    });
    btnBack?.addEventListener('click', () => { stepConfirm.style.display = 'none'; stepInput.style.display = 'block'; if(formStatus) formStatus.classList.remove('show'); });

    contactForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        const btnS = document.getElementById('btn-submit');
        const fd = new FormData(this);
        
        btnS.innerText = 'SENDING...'; 
        btnS.style.pointerEvents = 'none';
        btnS.disabled = true;
        
        if(formStatus) { formStatus.textContent = '送信処理中...'; formStatus.className = 'form-status show'; }

        fetch("https://formspree.io/f/xaqdyqno", { method: "POST", body: fd, headers: { 'Accept': 'application/json' } })
        .then(res => {
            if (res.ok) {
                if(formStatus) { formStatus.textContent = 'お問い合わせを受け付けました。3営業日以内にご連絡いたします。'; formStatus.className = 'form-status success show'; }
                contactForm.reset();
                btnS.innerText = 'SENT';
                btnS.style.pointerEvents = 'auto';
                btnS.disabled = false;

                setTimeout(() => { 
                    btnS.innerText = 'SEND MESSAGE'; 
                    stepConfirm.style.display = 'none'; 
                    stepInput.style.display = 'block';
                    if(formStatus) formStatus.classList.remove('show');
                    window.scrollTo({ top: contactForm.offsetTop - 100, behavior: 'smooth' });
                }, 4000);
            } else { throw new Error('Server Error'); }
        }).catch(error => {
            if(formStatus) { formStatus.textContent = '通信エラーが発生しました。時間をおいて再度お試しください。'; formStatus.className = 'form-status error show'; }
            btnS.innerText = 'SEND MESSAGE'; btnS.style.pointerEvents = 'auto'; btnS.disabled = false;
        });
    });

    // =========================================================
    // 10. Cinematic & Playful Enhancements
    // =========================================================

    // --- A-1: レターボックス化スクロール（トップのみ） ---
    const heroSec = document.getElementById('hero-section');
    const lbTop = document.querySelector('.letterbox-bar.top');
    const lbBottom = document.querySelector('.letterbox-bar.bottom');
    if (heroSec && lbTop && lbBottom) {
        const updateLetterbox = () => {
            const h = heroSec.offsetHeight;
            const y = window.scrollY;
            // 前半35%で閉じる
            const close = Math.min(1, Math.max(0, y / (h * 0.35)));
            const eased = 1 - Math.pow(1 - close, 3); // easeOutCubic
            lbTop.style.transform = `scaleY(${eased})`;
            lbBottom.style.transform = `scaleY(${eased})`;
            // ヒーローを抜けたらフェードアウト
            const fade = Math.min(1, Math.max(0, (y - h * 0.55) / (h * 0.2)));
            lbTop.style.opacity = String(1 - fade);
            lbBottom.style.opacity = String(1 - fade);
        };
        window.addEventListener('scroll', updateLetterbox, { passive: true });
        updateLetterbox();
    }

    // --- A-2: RECタイムコード（24fps・NEGAモード中は逆走） ---
    let negaActive = false;
    const tcDigits = document.querySelector('.hero-timecode .tc-digits');
    if (tcDigits) {
        const fps = 24;
        const pad = n => String(n).padStart(2, '0');
        let vt = 0;
        let lastTick = performance.now();
        setInterval(() => {
            const now = performance.now();
            const dt = (now - lastTick) / 1000;
            lastTick = now;
            vt = Math.max(0, vt + (negaActive ? -dt * 3 : dt));
            const f = Math.floor((vt % 1) * fps);
            const s = Math.floor(vt) % 60;
            const m = Math.floor(vt / 60) % 60;
            const h = Math.floor(vt / 3600);
            tcDigits.textContent = `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
        }, 1000 / fps);
    }

    // --- B-1: マグネティックボタン（ホバー環境のみ） ---
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        const magnets = document.querySelectorAll('.nav-menu a, .submit-btn, .back-btn, .recruit-entry-btn, .view-btn, .view-all');
        const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
        magnets.forEach(el => {
            // inline要素はtransformが効かないため補正
            if (getComputedStyle(el).display === 'inline') el.style.display = 'inline-block';
            el.addEventListener('mousemove', (e) => {
                const r = el.getBoundingClientRect();
                const x = clamp((e.clientX - (r.left + r.width / 2)) * 0.45, -24, 24);
                const y = clamp((e.clientY - (r.top + r.height / 2)) * 0.55, -14, 14);
                el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
            });
            el.addEventListener('mouseleave', () => {
                el.style.transform = 'translate(0px, 0px)';
            });
        });
    }

    // --- C-1: 行単位テキストリベール ---
    document.querySelectorAll('.line-reveal').forEach(el => {
        const parts = el.innerHTML.split(/<br\s*\/?>/i);
        el.innerHTML = parts.map((seg, i) => {
            const content = seg.trim() === '' ? '&nbsp;' : seg;
            return `<span class="rl"><span class="rl-inner" style="transition-delay:${(i * 0.07).toFixed(2)}s">${content}</span></span>`;
        }).join('');
        const revealObs = new IntersectionObserver((entries) => {
            entries.forEach(en => {
                if (en.isIntersecting) {
                    el.classList.add('revealed');
                    revealObs.unobserve(el);
                }
            });
        }, { threshold: 0.15 });
        // 遷移の幕が開いてから監視開始（幕裏での再生を防ぐ）
        setTimeout(() => revealObs.observe(el), 1000);
    });

    // --- D-1: 隠しリール（トップのULDNLCロゴタイトルを5回クリック） ---
    function openSecretReel() {
        if (document.querySelector('.secret-reel')) return;
        const ov = document.createElement('div');
        ov.className = 'secret-reel';
        ov.innerHTML = `
            <video src="movie.mp4" autoplay loop playsinline></video>
            <div class="sr-caption"><p>Secret Reel &mdash; you found it.</p></div>
            <button type="button" class="sr-close" aria-label="閉じる">&times;</button>`;
        document.body.appendChild(ov);
        requestAnimationFrame(() => ov.classList.add('show'));
        const v = ov.querySelector('video');
        v.muted = false;
        v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
        const closeReel = () => {
            ov.classList.remove('show');
            setTimeout(() => ov.remove(), 600);
            document.removeEventListener('keydown', onEsc);
        };
        const onEsc = (e) => { if (e.key === 'Escape') closeReel(); };
        ov.querySelector('.sr-close').addEventListener('click', closeReel);
        ov.addEventListener('click', (e) => { if (e.target === ov) closeReel(); });
        document.addEventListener('keydown', onEsc);
    }
    const heroTitle = document.querySelector('.hero-text-wrapper h1');
    if (heroTitle) {
        let secretClicks = 0;
        let secretTimer = null;
        heroTitle.addEventListener('click', () => {
            secretClicks++;
            clearTimeout(secretTimer);
            secretTimer = setTimeout(() => { secretClicks = 0; }, 2500);
            if (secretClicks >= 5) {
                secretClicks = 0;
                openSecretReel();
            }
        });
    }

    // --- D-4: コンソールメッセージ ---
    console.log('%cULDNLC %c CREATIVE BEYOND LIMITS', 'font-size:18px; letter-spacing:6px; color:#fff; background:#000; padding:10px 6px 10px 18px;', 'font-size:10px; letter-spacing:3px; color:#888; background:#000; padding:10px 18px 10px 6px;');
    console.log('We see you. 一緒に作りませんか？ → https://uldnlc.studio/recruit.html');
    console.log('P.S. このサイトには隠しコマンドが眠っています。まずは REC から。');

    // =========================================================
    // 11. Hidden Commands (Easter Eggs)
    // =========================================================

    // --- E-1: カチンコ「SCENE 0」（RECタイムコードをクリック） ---
    const tcWrap = document.querySelector('.hero-timecode');
    if (tcWrap) {
        tcWrap.addEventListener('click', () => {
            if (document.querySelector('.clapper-overlay')) return;
            const take = parseInt(localStorage.getItem('uldnlc_take') || '0', 10) + 1;
            localStorage.setItem('uldnlc_take', String(take));
            const ov = document.createElement('div');
            ov.className = 'clapper-overlay';
            ov.innerHTML = `
                <div class="clapper">
                    <div class="clapper-stick"></div>
                    <div class="clapper-board">
                        <span class="cl-scene">SCENE 0</span>
                        <span class="cl-take">TAKE ${take}</span>
                        <p class="cl-note">every project starts at scene 0.</p>
                    </div>
                </div>`;
            document.body.appendChild(ov);
            requestAnimationFrame(() => ov.classList.add('show'));
            setTimeout(() => ov.classList.add('clap'), 450);
            setTimeout(() => {
                ov.classList.remove('show');
                setTimeout(() => ov.remove(), 500);
            }, 2500);
        });
    }

    // --- E-2: ネガ反転「THE NEGATIVE」（"NEGA"と入力 / ロゴ長押し） ---
    function triggerNega() {
        if (negaActive) return;
        negaActive = true;
        const ov = document.createElement('div');
        ov.className = 'nega-overlay';
        document.body.appendChild(ov);
        requestAnimationFrame(() => ov.classList.add('show'));
        setTimeout(() => {
            ov.classList.remove('show');
            negaActive = false;
            setTimeout(() => ov.remove(), 1300);
        }, 10000);
    }
    let negaBuf = '';
    document.addEventListener('keydown', (e) => {
        if (e.target.matches('input, textarea, select')) return;
        negaBuf = (negaBuf + e.key.toLowerCase()).slice(-8);
        if (negaBuf.endsWith('nega')) { negaBuf = ''; triggerNega(); }
    });
    const logoWrap = document.querySelector('header .logo');
    if (logoWrap) {
        let pressTimer = null;
        logoWrap.addEventListener('touchstart', () => { pressTimer = setTimeout(triggerNega, 900); }, { passive: true });
        ['touchend', 'touchmove', 'touchcancel'].forEach(ev =>
            logoWrap.addEventListener(ev, () => clearTimeout(pressTimer), { passive: true })
        );
    }

    // --- E-3: エンドロール（フッターの©を3回クリック） ---
    function openCredits() {
        if (document.querySelector('.end-credits')) return;
        const ov = document.createElement('div');
        ov.className = 'end-credits';
        ov.innerHTML = `
            <div class="ec-roll">
                <p class="ec-role">CAST</p><p class="ec-name">You</p>
                <p class="ec-role">DIRECTED BY</p><p class="ec-name">ULDNLC</p>
                <p class="ec-role">SPECIAL THANKS</p><p class="ec-name">All Creators &amp; Culture</p>
                <p class="ec-fin">THANK YOU FOR WATCHING</p>
                <a class="ec-cta" href="contact.html">Your story is next. &mdash; CONTACT &rarr;</a>
            </div>
            <button type="button" class="ec-close" aria-label="閉じる">&times;</button>`;
        document.body.appendChild(ov);
        requestAnimationFrame(() => ov.classList.add('show'));
        const closeEC = () => {
            ov.classList.remove('show');
            setTimeout(() => ov.remove(), 600);
            document.removeEventListener('keydown', onEcEsc);
        };
        const onEcEsc = (e) => { if (e.key === 'Escape') closeEC(); };
        ov.querySelector('.ec-close').addEventListener('click', closeEC);
        document.addEventListener('keydown', onEcEsc);
        ov.querySelector('.ec-roll').addEventListener('animationend', () => setTimeout(closeEC, 600));
    }
    document.querySelectorAll('footer p:last-of-type').forEach(copyEl => {
        let ecClicks = 0;
        let ecTimer = null;
        copyEl.addEventListener('click', () => {
            ecClicks++;
            clearTimeout(ecTimer);
            ecTimer = setTimeout(() => { ecClicks = 0; }, 1500);
            if (ecClicks >= 3) { ecClicks = 0; openCredits(); }
        });
    });

    // --- E-4: 深夜モード「STILL SHOOTING.」（0時〜4時） ---
    const hourNow = new Date().getHours();
    if (hourNow >= 0 && hourNow < 4) {
        const heroTag = document.querySelector('.hero-text-wrapper p');
        if (heroTag) heroTag.textContent = 'STILL SHOOTING.';
        document.querySelector('.tc-rec')?.classList.add('fast');
    }

    // --- E-7: DECK OF ULDNLC（RECRUITのタイトルを5回クリック） ---
    function openCardDraw() {
        if (document.querySelector('.card-draw-overlay')) return;
        // スート＝資質の系統、数字＝その現れ方。♠A・♠Q・♣7は既存メンバーのため除外
        const cardMeanings = {
            '♠': { // SPADE — ビジョン・開拓
                '2': '誰かの半歩先を歩き、道を示す人。',
                '3': '見えない未来を、企画に変える人。',
                '4': '揺らがない軸で、方向を定める人。',
                '5': '常識を疑い、新しい道を選ぶ人。',
                '6': '先を読みながら、仲間を導く人。',
                '7': '誰も気づかない兆しを見抜く人。',
                '8': '決めたら迷わず、突き進む人。',
                '9': '逆境でこそ、静かに燃える人。',
                '10': '描いた未来を、現実に着地させる人。',
                'J': '怖いもの知らずの、開拓者。',
                'K': '全員の未来を背負う覚悟を持つ人。'
            },
            '♥': { // HEART — 情熱・人を動かす
                'A': '熱の源。いるだけで場が動き出す人。',
                '2': '想いを重ね、心を通わせる人。',
                '3': '感情を、表現に変える人。',
                '4': '誰かの居場所になれる人。',
                '5': '心のままに、飛び込める人。',
                '6': '想いを受け取り、返せる人。',
                '7': '自分の「好き」を信じ抜く人。',
                '8': '熱量で周りを巻き込む人。',
                '9': '想いを最後まで諦めない人。',
                '10': '愛したものを、届けきる人。',
                'J': 'まっすぐな衝動で走る人。',
                'Q': '美しさで人の心を掴む人。',
                'K': '深い愛情でチームを包む人。'
            },
            '♦': { // DIAMOND — 技術・精度・美
                'A': '磨けば光る、原石そのもの。',
                '2': '細部の違和感に気づける人。',
                '3': '手を動かして、形にする人。',
                '4': '精度を積み重ね、信頼を作る人。',
                '5': '技術で冒険できる人。',
                '6': '品質を安定させ、支える人。',
                '7': '誰よりも深く、こだわり抜く人。',
                '8': '効率と美しさを両立する人。',
                '9': '完成度の最後の1%を詰める人。',
                '10': '技を極め、価値に変える人。',
                'J': '新しい道具と技術を使いこなす人。',
                'Q': '審美眼で全体の質を引き上げる人。',
                'K': '職人の誇りで全体を束ねる人。'
            },
            '♣': { // CLUB — 繋ぐ・場・文化
                'A': '人が集まる理由になる人。',
                '2': '出会いを化学反応に変える人。',
                '3': '遊びから文化を生み出す人。',
                '4': 'チームの土台を支える人。',
                '5': '新しい場に飛び込み、輪を広げる人。',
                '6': '信頼で人を繋ぎとめる人。',
                '8': '場の熱を一気に広げる人。',
                '9': 'コミュニティを育て続ける人。',
                '10': '文化を形として残す人。',
                'J': 'フットワークで場を沸かせる人。',
                'Q': '空気を読み、場を整える人。',
                'K': '文化を守り、育てる長。'
            }
        };
        const suitInfo = {
            '♠': { name: 'SPADE', red: false },
            '♥': { name: 'HEART', red: true },
            '♦': { name: 'DIAMOND', red: true },
            '♣': { name: 'CLUB', red: false }
        };
        // 残り49枚のデッキを構築
        const deck = [];
        Object.keys(cardMeanings).forEach(s => {
            Object.keys(cardMeanings[s]).forEach(rank => {
                deck.push({ s, rank, text: cardMeanings[s][rank], ...suitInfo[s] });
            });
        });
        const ov = document.createElement('div');
        ov.className = 'card-draw-overlay';
        ov.innerHTML = `
            <p class="cd-lead">DECK OF ULDNLC<br><span>私たちは、仲間をトランプのカードで表現します。<br>カードをタップして、あなたの一枚を。</span></p>
            <div class="draw-card">
                <div class="draw-card-inner">
                    <div class="dc-face dc-back">
                        <span class="dc-back-suits">♠ ♥ ♦ ♣</span>
                        <span class="dc-back-logo">ULDNLC</span>
                    </div>
                    <div class="dc-face dc-front">
                        <span class="dc-corner tl"></span>
                        <span class="dc-suit"></span>
                        <span class="dc-rank"></span>
                        <span class="dc-corner br"></span>
                    </div>
                </div>
            </div>
            <div class="cd-result">
                <p class="cd-suit-name"></p>
                <p class="cd-meaning"></p>
                <div class="cd-actions">
                    <button type="button" class="cd-again">もう一度引く</button>
                    <a href="contact.html" class="cd-entry">この一枚を持って ENTRY &rarr;</a>
                </div>
            </div>
            <button type="button" class="ec-close cd-close" aria-label="閉じる">&times;</button>`;
        document.body.appendChild(ov);
        requestAnimationFrame(() => ov.classList.add('show'));
        const card = ov.querySelector('.draw-card');
        const front = ov.querySelector('.dc-front');
        const result = ov.querySelector('.cd-result');
        const deal = () => {
            const card52 = deck[Math.floor(Math.random() * deck.length)];
            front.classList.toggle('red', card52.red);
            ov.querySelector('.dc-suit').textContent = card52.s;
            ov.querySelector('.dc-rank').textContent = card52.rank;
            ov.querySelectorAll('.dc-corner').forEach(c => { c.innerHTML = `${card52.rank}<br>${card52.s}`; });
            ov.querySelector('.cd-suit-name').textContent = `${card52.s} ${card52.name} — ${card52.rank}`;
            ov.querySelector('.cd-meaning').textContent = card52.text;
            // 引いたカードを記録（問い合わせフォームに同封される）
            sessionStorage.setItem('uldnlc_drawn_card', `${card52.s} ${card52.name} — ${card52.rank}`);
        };
        card.addEventListener('click', () => {
            if (card.classList.contains('flipped')) return;
            deal();
            card.classList.add('flipped');
            result.classList.add('show');
        });
        ov.querySelector('.cd-again').addEventListener('click', () => {
            card.classList.remove('flipped');
            result.classList.remove('show');
        });
        const closeCD = () => {
            ov.classList.remove('show');
            setTimeout(() => ov.remove(), 500);
            document.removeEventListener('keydown', onCdEsc);
        };
        const onCdEsc = (e) => { if (e.key === 'Escape') closeCD(); };
        ov.querySelector('.cd-close').addEventListener('click', closeCD);
        document.addEventListener('keydown', onCdEsc);
    }
    if (document.title.includes('RECRUIT')) {
        const recruitTitle = document.querySelector('.page-title h1');
        if (recruitTitle) {
            recruitTitle.style.userSelect = 'none';
            recruitTitle.style.webkitUserSelect = 'none';
            let drawClicks = 0;
            let drawTimer = null;
            recruitTitle.addEventListener('click', () => {
                drawClicks++;
                clearTimeout(drawTimer);
                drawTimer = setTimeout(() => { drawClicks = 0; }, 2500);
                if (drawClicks >= 5) { drawClicks = 0; openCardDraw(); }
            });
        }
    }

    // --- E-7b: 引いたカードを問い合わせに同封（隠しコマンド発見者の判別用） ---
    const drawnCard = sessionStorage.getItem('uldnlc_drawn_card');
    if (contactForm && drawnCard) {
        const hiddenCard = document.createElement('input');
        hiddenCard.type = 'hidden';
        hiddenCard.name = 'drawn_card';
        hiddenCard.value = `${drawnCard}（DECK OF ULDNLC 発見者）`;
        contactForm.appendChild(hiddenCard);
        // 確認画面にもCARD行を表示（応募者にも「同封される」ことが伝わる）
        const confList = document.querySelector('.confirm-list');
        if (confList) {
            const cardDt = document.createElement('dt');
            cardDt.textContent = 'CARD';
            const cardDd = document.createElement('dd');
            cardDd.textContent = drawnCard;
            confList.appendChild(cardDt);
            confList.appendChild(cardDd);
        }
    }

    // --- E-6: RECのモールス信号（たまに"ULDNLC"を刻む） ---
    const recDot = document.querySelector('.tc-rec');
    if (recDot) {
        const MORSE_ULDNLC = '..- .-.. -.. -. .-.. -.-.'; // U L D N L C
        const msSleep = ms => new Promise(r => setTimeout(r, ms));
        const unit = 140;
        let morsePlaying = false;
        async function playMorse() {
            if (morsePlaying || negaActive) return;
            morsePlaying = true;
            recDot.style.animation = 'none';
            for (const ch of MORSE_ULDNLC) {
                if (ch === '.') {
                    recDot.style.opacity = '1'; await msSleep(unit);
                    recDot.style.opacity = '0.12'; await msSleep(unit);
                } else if (ch === '-') {
                    recDot.style.opacity = '1'; await msSleep(unit * 3);
                    recDot.style.opacity = '0.12'; await msSleep(unit);
                } else {
                    await msSleep(unit * 2); // 文字間
                }
            }
            recDot.style.opacity = '';
            recDot.style.animation = '';
            morsePlaying = false;
        }
        setTimeout(playMorse, 12000);
        setInterval(playMorse, 45000);
    }
});
