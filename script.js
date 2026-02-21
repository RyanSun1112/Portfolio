// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Intersection Observer for scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // add visible class for CSS transitions
            entry.target.classList.add('visible');
            // if this element is part of the generic reveal set, apply a small stagger based on its index
            if (entry.target.classList.contains('reveal')) {
                const idx = parseInt(entry.target.dataset.revealIndex) || 0;
                entry.target.style.transitionDelay = `${idx * 0.06}s`;
            }
            // add small stagger for project cards
            if (entry.target.classList.contains('project-card')) {
                const idx = Array.from(document.querySelectorAll('.project-card')).indexOf(entry.target);
                entry.target.style.transitionDelay = `${idx * 0.08}s`;
            }
            if (entry.target.classList.contains('timeline-item')) {
                const idx = Array.from(document.querySelectorAll('.timeline-item')).indexOf(entry.target);
                entry.target.style.transitionDelay = `${idx * 0.07}s`;
            }
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe elements for animation (including whole sections except the hero)
document.querySelectorAll('.about-text, .skill-category, .timeline-item, .project-card, .stat').forEach(el => {
    el.style.opacity = el.style.opacity || '0';
    el.style.transform = el.style.transform || 'translateY(30px)';
    el.style.transition = el.style.transition || 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(el);
});

// Initialize generic reveal elements for whole sections (except hero)
// This adds a `.reveal` class to each immediate child of a section's `.container`
// and observes them so they fade/translate into view with a subtle stagger.
document.querySelectorAll('section:not(.hero)').forEach(section => {
    const container = section.querySelector('.container') || section;
    const children = Array.from(container.children || []);
    children.forEach((child, i) => {
        // avoid double-adding to already-observed items
        if (!child.classList.contains('reveal') && !child.classList.contains('visible')) {
            child.classList.add('reveal');
            child.dataset.revealIndex = i;
            // ensure baseline transition styles when not present
            child.style.transition = child.style.transition || 'opacity 0.6s ease-out, transform 0.6s ease-out';
            child.style.opacity = child.style.opacity || '0';
            child.style.transform = child.style.transform || 'translateY(18px)';
            observer.observe(child);
        }
    });
});

// Typing animation for hero
function typeText(el, text, speed = 60) {
    el.textContent = '';
    let i = 0;
    const t = setInterval(() => {
        el.textContent += text.charAt(i);
        i++;
        if (i >= text.length) clearInterval(t);
    }, speed);
}

// ---- Smooth scrolling (inertial) ----
(function() {
    const smoothEl = document.getElementById('smooth-content');
    if (!smoothEl) return;

    // Disable native CSS smooth for programmatic control
    try { document.documentElement.style.scrollBehavior = 'auto'; } catch(e) {}

    let bodyHeightSet = false;
    function setBodyHeight() {
        const h = Math.max(document.body.scrollHeight, smoothEl.getBoundingClientRect().height);
        document.body.style.height = h + 'px';
        bodyHeightSet = true;
    }

    let current = 0, target = 0, ease = 0.08;
    function onScroll() { target = window.scrollY || window.pageYOffset; }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { setBodyHeight(); });

    function rafTick() {
        if (!bodyHeightSet) setBodyHeight();
        current += (target - current) * ease;
        const diff = Math.abs(target - current);
        // apply transform
        smoothEl.style.transform = `translate3d(0,${-current}px,0)`;
        requestAnimationFrame(rafTick);
    }

    // init
    setBodyHeight();
    onScroll();
    requestAnimationFrame(rafTick);
})();

const typingEl = document.querySelector('.typing');
if (typingEl) {
    const text = typingEl.dataset.text || typingEl.textContent;
    typingEl.textContent = '';
    setTimeout(() => typeText(typingEl, text, 60), 400);
}

// Parallax/interaction for robotics / PCB scene (smoothed and optimized)
const roboticsScene = document.querySelector('.robotics-scene svg');
const traces = document.querySelectorAll('.trace');
const leds = Array.from(document.querySelectorAll('.led'));
const blobs = Array.from(document.querySelectorAll('.blob'));

let mouse = { x: 0, y: 0 };
let target = { x: 0, y: 0 };
let current = { x: 0, y: 0 };
let rafId = null;
let ledPositions = [];

function updateLedPositions() {
    ledPositions = leds.map(l => {
        const r = l.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
}

window.addEventListener('load', updateLedPositions);
window.addEventListener('resize', () => {
    updateLedPositions();
});

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    target.x = (mouse.x / window.innerWidth) - 0.5;
    target.y = (mouse.y / window.innerHeight) - 0.5;
    if (!rafId) rafId = requestAnimationFrame(animateParallax);
});

function animateParallax() {
    rafId = null;
    // smooth interpolation
    current.x += (target.x - current.x) * 0.12;
    current.y += (target.y - current.y) * 0.12;

    if (roboticsScene) {
        roboticsScene.style.transform = `translate3d(${current.x * 12}px, ${current.y * 8}px, 0)`;
    }

    // Slowly adjust trace animation duration for subtle movement
    const speedFactor = 1.0 + (1 - Math.abs(current.x)) * 1.0; // between 1 and 2
    const desiredDuration = Math.max(1.6, 4.2 / speedFactor);
    traces.forEach(t => {
        const prev = parseFloat(t.style.animationDuration) || 0;
        if (Math.abs(prev - desiredDuration) > 0.05) t.style.animationDuration = `${desiredDuration}s`;
    });

    // LED pulsing using cached positions (avoids layout thrash)
    leds.forEach((led, idx) => {
        const pos = ledPositions[idx];
        if (!pos) return;
        const dx = mouse.x - pos.x;
        const dy = mouse.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 140) led.classList.add('pulse'); else led.classList.remove('pulse');
    });

    // blob parallax (smoothed)
    blobs.forEach((b, i) => {
        const factor = 8 + i * 4;
        const rx = current.x * factor;
        const ry = current.y * factor;
        const rot = current.x * factor * 2;
        b.style.transform = `translate3d(${rx}px, ${ry}px, 0) rotate(${rot}deg)`;
    });

    // continue animating if not yet at target (keeps movement smooth)
    if (Math.abs(target.x - current.x) > 0.001 || Math.abs(target.y - current.y) > 0.001) {
        rafId = requestAnimationFrame(animateParallax);
    }
}

// Active nav link highlighting
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');

    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.style.color = 'var(--text)';
        if (link.getAttribute('href').slice(1) === current) {
            link.style.color = 'var(--accent)';
        }
    });
});

// Form submission handling
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const name = this.querySelector('input[type="text"]').value;
        const email = this.querySelector('input[type="email"]').value;
        const message = this.querySelector('textarea').value;
        
        // Create mailto link
        const mailtoLink = `mailto:your.email@example.com?subject=Contact from ${name}&body=${encodeURIComponent(message)}%0A%0AFrom: ${email}`;
        
        // Open mailto
        window.location.href = mailtoLink;
        
        // Reset form
        this.reset();
    });
}

// Parallax effect on hero section
// Keep hero title visually stable: removed scroll-driven translate that
// previously moved `.hero-content` on window scroll. If you want a
// different effect (e.g., sticky header), we can add that later.

// Mobile nav menu toggle (if needed in future)
// This is prepared for mobile menu functionality
const createMobileMenu = () => {
    const navContainer = document.querySelector('.nav-container');
    const navMenu = document.querySelector('.nav-menu');
    
    if (window.innerWidth <= 768) {
        // Mobile menu logic can be added here
    }
};

window.addEventListener('resize', createMobileMenu);
createMobileMenu();

// Code block animation
const codeBlock = document.querySelector('.code-block');
if (codeBlock) {
    const codeLines = codeBlock.querySelectorAll('.code-line');
    codeLines.forEach((line, index) => {
        line.style.opacity = '0';
        line.style.animation = `fadeInUp 0.5s ease-out ${0.5 + index * 0.1}s forwards`;
    });
}

// Hover effects for interactive elements
document.querySelectorAll('.btn, .project-card, .skill-tag, .contact-item').forEach(el => {
    el.addEventListener('mouseenter', function() {
        this.style.transform = this.style.transform || 'scale(1)';
    });
});

// Stagger animation for stats
const stats = document.querySelectorAll('.stat');
stats.forEach((stat, index) => {
    stat.style.animationDelay = `${index * 0.1}s`;
});

// Smooth header blur effect on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.pageYOffset > 50) {
        navbar.style.backdropFilter = 'blur(15px)';
        navbar.style.boxShadow = '0 2px 20px rgba(0,0,0,0.08)';
    } else {
        navbar.style.backdropFilter = 'blur(10px)';
        navbar.style.boxShadow = 'none';
    }
});

// Blob movement is handled inside the rAF-based `animateParallax` to avoid
// multiple mousemove listeners and layout thrash.

console.log('Welcome to my portfolio! Feel free to explore and get in touch.');
