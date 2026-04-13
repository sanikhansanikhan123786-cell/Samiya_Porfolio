import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, Renderer2, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-main-layout',
  standalone: false,
  templateUrl: './main-layout.component.html'
})
export class MainLayoutComponent implements AfterViewInit, OnDestroy {
  @ViewChild('cur', { static: true }) private cursorRef!: ElementRef<HTMLElement>;
  @ViewChild('cuf', { static: true }) private followerRef!: ElementRef<HTMLElement>;
  @ViewChild('progressBar', { static: true }) private progressBarRef!: ElementRef<HTMLElement>;

  private readonly globalRemoveListeners: Array<() => void> = [];
  private readonly domRemoveListeners: Array<() => void> = [];
  private readonly timeouts: number[] = [];
  private readonly intervals: number[] = [];
  private readonly domObservers: IntersectionObserver[] = [];
  private readonly subscriptions = new Subscription();

  private cursorRafId: number | null = null;
  private scrollRafId: number | null = null;
  private parallaxRafId: number | null = null;

  private isDesktop = false;
  private cursorInitialized = false;

  constructor(
    private readonly renderer: Renderer2,
    private readonly ngZone: NgZone,
    private readonly router: Router
  ) {}

  ngAfterViewInit(): void {
    this.isDesktop = !window.matchMedia('(max-width: 900px)').matches;

    this.ngZone.runOutsideAngular(() => {
      this.initScrollProgress();
      this.initBgParallax();

      if (this.isDesktop) {
        this.initCursorOnce();
      }

      this.refreshDomAnimations();

      this.subscriptions.add(
        this.router.events.subscribe((event) => {
          if (event instanceof NavigationEnd) {
            this.refreshDomAnimations();
          }
        })
      );
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.clearDomAnimations();

    for (const remove of this.globalRemoveListeners) {
      remove();
    }

    if (this.cursorRafId !== null) {
      window.cancelAnimationFrame(this.cursorRafId);
      this.cursorRafId = null;
    }

    if (this.scrollRafId !== null) {
      window.cancelAnimationFrame(this.scrollRafId);
      this.scrollRafId = null;
    }

    if (this.parallaxRafId !== null) {
      window.cancelAnimationFrame(this.parallaxRafId);
      this.parallaxRafId = null;
    }
  }

  private refreshDomAnimations(): void {
    this.clearDomAnimations();

    const tickId = window.setTimeout(() => {
      if (this.isDesktop && this.cursorInitialized) {
        this.bindCursorHoverTargets();
        this.bindCardSpotlight();
      }

      this.bindRevealAnimations();
      this.bindCounters();
      this.bindTypedRole();
      this.bindNavActiveSection();
    }, 0);

    this.timeouts.push(tickId);
  }

  private clearDomAnimations(): void {
    for (const remove of this.domRemoveListeners) {
      remove();
    }
    this.domRemoveListeners.length = 0;

    for (const timeoutId of this.timeouts) {
      window.clearTimeout(timeoutId);
    }
    this.timeouts.length = 0;

    for (const intervalId of this.intervals) {
      window.clearInterval(intervalId);
    }
    this.intervals.length = 0;

    for (const obs of this.domObservers) {
      obs.disconnect();
    }
    this.domObservers.length = 0;
  }

  private initCursorOnce(): void {
    if (this.cursorInitialized) {
      return;
    }
    this.cursorInitialized = true;

    const cur = this.cursorRef.nativeElement;
    const cuf = this.followerRef.nativeElement;

    let mx = 0;
    let my = 0;
    let fx = 0;
    let fy = 0;

    this.globalRemoveListeners.push(
      this.renderer.listen('document', 'mousemove', (e: MouseEvent) => {
        mx = e.clientX;
        my = e.clientY;
        this.renderer.setStyle(cur, 'left', `${mx}px`);
        this.renderer.setStyle(cur, 'top', `${my}px`);
      })
    );

    const animateFollower = () => {
      fx += (mx - fx) * 0.12;
      fy += (my - fy) * 0.12;
      this.renderer.setStyle(cuf, 'left', `${fx}px`);
      this.renderer.setStyle(cuf, 'top', `${fy}px`);
      this.cursorRafId = window.requestAnimationFrame(animateFollower);
    };
    animateFollower();
  }

  private bindCursorHoverTargets(): void {
    const cur = this.cursorRef.nativeElement;
    const cuf = this.followerRef.nativeElement;
    const hoverTargets = Array.from(document.querySelectorAll('a,button,.skill-tag,.project-card'));

    for (const el of hoverTargets) {
      this.domRemoveListeners.push(
        this.renderer.listen(el, 'mouseenter', () => {
          this.renderer.setStyle(cur, 'transform', 'translate(-50%,-50%) scale(2)');
          this.renderer.setStyle(cuf, 'opacity', '0.3');
        })
      );
      this.domRemoveListeners.push(
        this.renderer.listen(el, 'mouseleave', () => {
          this.renderer.setStyle(cur, 'transform', 'translate(-50%,-50%) scale(1)');
          this.renderer.setStyle(cuf, 'opacity', '0.5');
        })
      );
    }
  }

  private bindRevealAnimations(): void {
    const targets = Array.from(document.querySelectorAll<HTMLElement>('.reveal,.reveal-left,.reveal-right'));
    if (targets.length === 0) {
      return;
    }

    const obs = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry, index) => {
          if (!entry.isIntersecting) {
            return;
          }

          const target = entry.target as HTMLElement;
          const timeoutId = window.setTimeout(() => {
            target.classList.add('visible');
          }, index * 80);
          this.timeouts.push(timeoutId);
          observer.unobserve(target);
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    this.domObservers.push(obs);
    for (const el of targets) {
      obs.observe(el);
    }
  }

  private bindCounters(): void {
    const c1 = document.getElementById('c1');
    const c2 = document.getElementById('c2');
    if (!c1 || !c2) {
      return;
    }

    const startId = window.setTimeout(() => {
      this.counter('c1', 6);
      this.counter('c2', 6);
    }, 800);
    this.timeouts.push(startId);
  }

  private counter(id: string, target: number): void {
    const el = document.getElementById(id);
    if (!el) {
      return;
    }

    let n = 0;
    const intervalId = window.setInterval(() => {
      n += 0.15;
      if (n >= target) {
        n = target;
        window.clearInterval(intervalId);
      }
      el.textContent = `${Math.floor(n)}+`;
    }, 40);

    this.intervals.push(intervalId);
  }

  private bindTypedRole(): void {
    const roleEl = document.getElementById('typedRole');
    if (!roleEl) {
      return;
    }

    roleEl.textContent = '';
    const roleText = 'Frontend Developer · 6+ Years · Rawalpindi, Pakistan';
    let i = 0;

    const startId = window.setTimeout(() => {
      const type = () => {
        if (i < roleText.length) {
          roleEl.textContent = `${roleEl.textContent ?? ''}${roleText[i++]}`;
          const nextId = window.setTimeout(type, 35);
          this.timeouts.push(nextId);
        }
      };
      type();
    }, 700);

    this.timeouts.push(startId);
  }

  private initScrollProgress(): void {
    const bar = this.progressBarRef.nativeElement;

    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const progress = max <= 0 ? 0 : Math.min(1, Math.max(0, doc.scrollTop / max));
      this.renderer.setStyle(bar, 'transform', `scaleX(${progress})`);
    };

    update();

    let scheduled = false;
    const onScroll = () => {
      if (scheduled) {
        return;
      }
      scheduled = true;
      this.scrollRafId = window.requestAnimationFrame(() => {
        scheduled = false;
        update();
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    this.globalRemoveListeners.push(() => window.removeEventListener('scroll', onScroll));
  }

  private bindNavActiveSection(): void {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('nav .nav-links a[href^="#"]'));
    if (links.length === 0) {
      return;
    }

    const idToLink = new Map<string, HTMLAnchorElement>();
    for (const link of links) {
      const href = link.getAttribute('href') ?? '';
      const id = href.startsWith('#') ? href.slice(1) : '';
      if (id) {
        idToLink.set(id, link);
      }
    }

    const sections = Array.from(idToLink.keys())
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) {
      return;
    }

    const setActive = (activeId: string) => {
      for (const link of links) {
        link.classList.remove('active');
      }
      const activeLink = idToLink.get(activeId);
      if (activeLink) {
        activeLink.classList.add('active');
      }
    };

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) {
          return;
        }

        visible.sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0));
        const top = visible[0];
        const id = (top.target as HTMLElement).id;
        if (id) {
          setActive(id);
        }
      },
      { threshold: [0.2, 0.35, 0.5, 0.65], rootMargin: '-20% 0px -65% 0px' }
    );

    this.domObservers.push(obs);
    for (const section of sections) {
      obs.observe(section);
    }
  }

  private bindCardSpotlight(): void {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.project-card'));
    for (const card of cards) {
      this.domRemoveListeners.push(
        this.renderer.listen(card, 'mousemove', (e: MouseEvent) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          card.style.setProperty('--mx', `${x}px`);
          card.style.setProperty('--my', `${y}px`);
        })
      );

      this.domRemoveListeners.push(
        this.renderer.listen(card, 'mouseleave', () => {
          card.style.setProperty('--mx', '50%');
          card.style.setProperty('--my', '50%');
        })
      );
    }
  }

  private initBgParallax(): void {
    const canvas = document.querySelector<HTMLElement>('.bg-canvas');
    if (!canvas) {
      return;
    }

    let scrollY = window.scrollY || 0;
    let px = 0;
    let py = 0;

    const apply = () => {
      const y = scrollY * 0.06 + py * 18;
      const x = px * 18;
      this.renderer.setStyle(canvas, 'transform', `translate3d(${x}px, ${y}px, 0)`);
    };

    let scheduled = false;
    const schedule = () => {
      if (scheduled) {
        return;
      }
      scheduled = true;
      this.parallaxRafId = window.requestAnimationFrame(() => {
        scheduled = false;
        apply();
      });
    };

    const onScroll = () => {
      scrollY = window.scrollY || 0;
      schedule();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    this.globalRemoveListeners.push(() => window.removeEventListener('scroll', onScroll));

    if (this.isDesktop) {
      this.globalRemoveListeners.push(
        this.renderer.listen('document', 'mousemove', (e: MouseEvent) => {
          const nx = e.clientX / window.innerWidth - 0.5;
          const ny = e.clientY / window.innerHeight - 0.5;
          px = nx;
          py = ny;
          schedule();
        })
      );
    }

    apply();
  }
}
