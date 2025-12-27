import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * SparkParticles - Magical particle effect for portal absorption
 *
 * Features:
 * - Particles spawn around portal rim
 * - Curve inward toward center with gravity pull
 * - Fade and shrink as they approach center
 * - GPU-accelerated canvas rendering for 60fps performance
 *
 * Visual Style: Magic + Cosmic blend
 * - Violet (#a855f7), Cyan (#22d3ee), White sparkles
 * - Curved trajectories (not straight lines)
 * - Smooth fade-out
 */

class SparkParticleEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: true });
        this.particles = [];
        this.width = canvas.width;
        this.height = canvas.height;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        this.isActive = false;
        this.animationFrame = null;
        this.spawnTimer = null;
    }

    start() {
        if (this.isActive) return;
        this.isActive = true;

        // Initial burst
        this.spawnBurst(15);

        // Continuous spawning while active
        this.spawnTimer = setInterval(() => {
            if (this.isActive) {
                this.spawnBurst(3);
            }
        }, 100);

        this.animate();
    }

    stop() {
        this.isActive = false;
        if (this.spawnTimer) {
            clearInterval(this.spawnTimer);
            this.spawnTimer = null;
        }
        // Let existing particles finish naturally
    }

    spawnBurst(count) {
        const rimRadius = Math.min(this.width, this.height) * 0.4; // Spawn at portal rim

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spawnRadius = rimRadius + (Math.random() - 0.5) * 20; // Slight variation

            // Spawn position on rim
            const spawnX = this.centerX + Math.cos(angle) * spawnRadius;
            const spawnY = this.centerY + Math.sin(angle) * spawnRadius;

            // Initial velocity - slight outward, then gravity pulls inward
            const speed = Math.random() * 0.5 + 0.2;
            const outwardAngle = angle + (Math.random() - 0.5) * 0.3; // Slight randomness

            this.particles.push({
                x: spawnX,
                y: spawnY,
                vx: Math.cos(outwardAngle) * speed,
                vy: Math.sin(outwardAngle) * speed,
                life: 1.0,
                maxLife: Math.random() * 0.3 + 0.7, // 0.7 - 1.0 seconds
                color: this.getRandomColor(),
                size: Math.random() * 2.5 + 1.5, // 1.5 - 4px
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.1
            });
        }
    }

    getRandomColor() {
        const colors = [
            { r: 168, g: 85, b: 247 },   // Violet
            { r: 34, g: 211, b: 238 },   // Cyan
            { r: 255, g: 255, b: 255 },  // White
            { r: 147, g: 51, b: 234 }    // Purple
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    animate = () => {
        if (!this.canvas) return;

        this.ctx.clearRect(0, 0, this.width, this.height);

        // Update and render particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // Calculate distance and angle to center
            const dx = this.centerX - p.x;
            const dy = this.centerY - p.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            // Gravity pull toward center (stronger as particle gets closer)
            const gravity = 0.15 * (1 - distance / (this.width * 0.5));
            p.vx += Math.cos(angle) * gravity;
            p.vy += Math.sin(angle) * gravity;

            // Apply velocity with damping (creates curve effect)
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.98;
            p.vy *= 0.98;

            // Rotation
            p.rotation += p.rotationSpeed;

            // Life decay
            p.life -= 0.016 / p.maxLife; // ~60fps normalized

            // Remove dead particles
            if (p.life <= 0 || distance < 10) {
                this.particles.splice(i, 1);
                continue;
            }

            // Render particle
            this.renderParticle(p, distance);
        }

        // Continue animation if active or particles remain
        if (this.isActive || this.particles.length > 0) {
            this.animationFrame = requestAnimationFrame(this.animate);
        } else {
            this.animationFrame = null;
        }
    }

    renderParticle(p, distance) {
        const alpha = p.life * 0.9; // Fade based on life
        const size = p.size * p.life; // Shrink as it approaches center

        this.ctx.save();
        this.ctx.globalAlpha = alpha;

        // Glow effect
        const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 2);
        gradient.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha * 0.5})`);
        gradient.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, size * 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Core bright dot
        this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, size * 0.5, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    resize(width, height) {
        this.width = this.canvas.width = width;
        this.height = this.canvas.height = height;
        this.centerX = width / 2;
        this.centerY = height / 2;
    }

    destroy() {
        this.stop();
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        this.particles = [];
    }
}

export default function SparkParticles({ active = false }) {
    const canvasRef = useRef(null);
    const engineRef = useRef(null);

    // Initialize engine
    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        engineRef.current = new SparkParticleEngine(canvas);

        // Handle resize
        const handleResize = () => {
            if (canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                engineRef.current?.resize(rect.width, rect.height);
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            engineRef.current?.destroy();
        };
    }, []);

    // Control active state
    useEffect(() => {
        if (!engineRef.current) return;

        if (active) {
            engineRef.current.start();
        } else {
            engineRef.current.stop();
        }
    }, [active]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 10 }}
        />
    );
}

SparkParticles.propTypes = {
    active: PropTypes.bool
};
