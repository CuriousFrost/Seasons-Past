/**
 * Seasons Past Landing Page
 * Scroll animations and smooth scroll functionality
 */

(function() {
    'use strict';

    // ============================================
    // Intersection Observer for Scroll Animations
    // ============================================

    const animatedElements = document.querySelectorAll('[data-animate]');

    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -100px 0px',
        threshold: 0.1
    };

    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Add staggered delay for elements in the same section
                const delay = index * 100;
                setTimeout(() => {
                    entry.target.classList.add('animate-in');
                }, delay);

                // Stop observing once animated
                animationObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all animated elements
    animatedElements.forEach(element => {
        animationObserver.observe(element);
    });

    // ============================================
    // Smooth Scroll for Anchor Links
    // ============================================

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');

            // Skip if it's just "#"
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                e.preventDefault();

                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ============================================
    // Animated Background Particles
    // ============================================

    class ParticleBackground {
        constructor(container) {
            this.container = container;
            this.particles = [];
            this.particleCount = 50;
            this.init();
        }

        init() {
            // Create floating particles
            for (let i = 0; i < this.particleCount; i++) {
                this.createParticle();
            }

            // Start animation loop
            this.animate();
        }

        createParticle() {
            const particle = document.createElement('div');
            particle.className = 'particle';

            const size = Math.random() * 4 + 1;
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const duration = Math.random() * 20 + 10;
            const delay = Math.random() * 10;

            particle.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                background: radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%);
                border-radius: 50%;
                left: ${x}%;
                top: ${y}%;
                pointer-events: none;
                animation: floatParticle ${duration}s ease-in-out ${delay}s infinite;
            `;

            this.container.appendChild(particle);
            this.particles.push(particle);
        }

        animate() {
            // Add CSS animation keyframes if not already present
            if (!document.querySelector('#particle-styles')) {
                const style = document.createElement('style');
                style.id = 'particle-styles';
                style.textContent = `
                    @keyframes floatParticle {
                        0%, 100% {
                            transform: translate(0, 0) scale(1);
                            opacity: 0.3;
                        }
                        25% {
                            transform: translate(20px, -30px) scale(1.2);
                            opacity: 0.6;
                        }
                        50% {
                            transform: translate(-10px, -50px) scale(0.8);
                            opacity: 0.4;
                        }
                        75% {
                            transform: translate(30px, -20px) scale(1.1);
                            opacity: 0.5;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
        }
    }

    // Initialize particle background
    const particleContainer = document.getElementById('particles');
    if (particleContainer) {
        new ParticleBackground(particleContainer);
    }

    // ============================================
    // Scroll Progress Indicator (optional enhancement)
    // ============================================

    function updateScrollProgress() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrollProgress = (scrollTop / scrollHeight) * 100;

        // Could be used to update a progress bar or trigger effects
        document.documentElement.style.setProperty('--scroll-progress', `${scrollProgress}%`);
    }

    window.addEventListener('scroll', updateScrollProgress, { passive: true });

    // ============================================
    // Hero Animation Enhancement
    // ============================================

    function initHeroAnimations() {
        const hero = document.querySelector('.hero');
        if (!hero) return;

        // Parallax effect on scroll
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const heroContent = hero.querySelector('.hero-content');

            if (heroContent && scrolled < window.innerHeight) {
                const opacity = 1 - (scrolled / window.innerHeight) * 0.5;
                const translateY = scrolled * 0.3;

                heroContent.style.transform = `translateY(${translateY}px)`;
                heroContent.style.opacity = opacity;
            }
        }, { passive: true });
    }

    initHeroAnimations();

    // ============================================
    // Button Ripple Effect
    // ============================================

    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                transform: scale(0);
                animation: rippleEffect 0.6s ease-out;
                pointer-events: none;
            `;

            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);

            setTimeout(() => ripple.remove(), 600);
        });
    });

    // Add ripple animation
    if (!document.querySelector('#ripple-styles')) {
        const style = document.createElement('style');
        style.id = 'ripple-styles';
        style.textContent = `
            @keyframes rippleEffect {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // ============================================
    // Feature Cards Hover Effect Enhancement
    // ============================================

    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            this.style.setProperty('--mouse-x', `${x}px`);
            this.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    // ============================================
    // Lazy Loading for Images
    // ============================================

    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    imageObserver.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }

    // ============================================
    // Console Easter Egg
    // ============================================

    console.log('%c Seasons Past ', 'background: linear-gradient(135deg, #ffd700, #ffb347); color: #0a0e27; font-size: 24px; font-weight: bold; padding: 10px 20px; border-radius: 5px;');
    console.log('%c Track Your Commander Journey ', 'color: #b0b3c1; font-size: 14px;');
    console.log('%c https://github.com/CuriousFrost/Seasons-Past ', 'color: #ffd700;');

})();
