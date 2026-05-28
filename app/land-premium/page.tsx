'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Play, Zap, Brain, BookOpen, Grid3x3, TrendingUp } from 'lucide-react';

const CautieLogoAnimated = () => (
  <motion.svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    className="w-8 h-8"
    animate={{ rotate: [0, 360] }}
    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
  >
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7f8962" />
        <stop offset="100%" stopColor="#6b7550" />
      </linearGradient>
    </defs>
    <circle cx="16" cy="16" r="6" fill="url(#grad1)" />
    {[0, 90, 180, 270].map((angle) => {
      const x = 16 + 8 * Math.cos((angle * Math.PI) / 180);
      const y = 16 + 8 * Math.sin((angle * Math.PI) / 180);
      return <circle key={angle} cx={x} cy={y} r="2.5" fill="#7f8962" opacity="0.5" />;
    })}
  </motion.svg>
);

const FloatingCard = ({ delay, color, title, children }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.8, ease: [0.23, 1, 0.320, 1] }}
    whileHover={{ y: -10, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
    className="group relative rounded-2xl border border-border/30 bg-gradient-to-br from-background to-muted/20 p-8 backdrop-blur-xl overflow-hidden"
  >
    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${color}`} />
    <div className="relative z-10">
      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${color} opacity-20 mb-4`} />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  </motion.div>
);

export default function LandingPremium() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 150]);
  const y2 = useTransform(scrollY, [0, 500], [0, -150]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Animated cursor light */}
      <motion.div
        className="fixed w-96 h-96 rounded-full pointer-events-none opacity-20 blur-3xl"
        style={{
          background: 'radial-gradient(circle, #7f8962 0%, transparent 70%)',
          x: mousePos.x - 192,
          y: mousePos.y - 192,
        }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      />

      {/* Sticky Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 z-50 w-full border-b border-border/10 bg-background/50 backdrop-blur-2xl"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <motion.div className="flex items-center gap-3" whileHover={{ scale: 1.05 }}>
            <CautieLogoAnimated />
            <span className="text-xl font-bold bg-gradient-to-r from-[#7f8962] to-emerald-600 bg-clip-text text-transparent">
              Cautie
            </span>
          </motion.div>

          <div className="hidden md:flex items-center gap-8 text-sm">
            {['Features', 'How it works', 'Pricing'].map((item) => (
              <motion.a
                key={item}
                href="#"
                whileHover={{ color: '#7f8962' }}
                className="text-muted-foreground transition-colors"
              >
                {item}
              </motion.a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/auth"
                className="px-4 py-2 rounded-lg bg-[#7f8962] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Get started
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section with Parallax */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Parallax backgrounds */}
        <motion.div
          style={{ y: y1 }}
          className="absolute inset-0 -z-10"
        >
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-gradient-to-br from-[#7f8962]/15 to-transparent rounded-full blur-3xl" />
        </motion.div>

        <motion.div
          style={{ y: y2 }}
          className="absolute inset-0 -z-10"
        >
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-3xl" />
        </motion.div>

        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="space-y-8 text-center"
          >
            {/* Floating badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.6 }}
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="inline-block"
              >
                <div className="px-6 py-2 rounded-full border border-[#7f8962]/30 bg-[#7f8962]/5 backdrop-blur text-sm font-medium flex items-center gap-2">
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
                    ✨
                  </motion.span>
                  The future of learning is here
                </div>
              </motion.div>
            </motion.div>

            {/* Main headline with staggered animation */}
            <motion.div className="space-y-4">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="text-7xl md:text-8xl font-black leading-tight tracking-tight"
              >
                Your notes.
              </motion.h1>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="text-7xl md:text-8xl font-black leading-tight tracking-tight bg-gradient-to-r from-[#7f8962] via-emerald-500 to-blue-500 bg-clip-text text-transparent"
              >
                Infinite tools.
              </motion.h1>
            </motion.div>

            {/* Subheading */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              Transform any content into quizzes, flashcards, mindmaps, timelines. Watch your learning speed multiply.
            </motion.p>

            {/* CTA with complex animation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-6 justify-center pt-8"
            >
              <motion.div
                whileHover={{
                  scale: 1.05,
                  boxShadow: '0 20px 40px rgba(127, 137, 98, 0.3)',
                }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href="/auth"
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#7f8962] text-white font-semibold group text-lg relative overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 -translate-x-full group-hover:translate-x-full transition-all duration-700" />
                  <span className="relative">Start learning free</span>
                  <motion.span className="relative" whileHover={{ x: 4 }}>
                    <ArrowRight className="w-5 h-5" />
                  </motion.span>
                </Link>
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl border border-border bg-background hover:bg-muted/50 transition-colors font-semibold text-lg group"
              >
                <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                  <Play className="w-5 h-5 fill-current" />
                </motion.span>
                Watch demo
              </motion.button>
            </motion.div>

            {/* Trust line */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="text-sm text-muted-foreground flex items-center justify-center gap-4"
            >
              <span>✓ 10K+ learners</span>
              <span>•</span>
              <span>✓ Free forever</span>
              <span>•</span>
              <span>✓ No credit card</span>
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Features Grid with Stagger */}
      <section className="py-32 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
              className="text-5xl md:text-6xl font-black mb-4"
            >
              One upload. Infinite possibilities.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              Every tool you need to master any subject, powered by cutting-edge AI
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                delay: 0.1,
                color: 'from-[#7f8962]',
                title: 'Smart Quizzes',
                desc: 'Adaptive difficulty that learns from your answers',
              },
              {
                delay: 0.2,
                color: 'from-blue-500',
                title: 'Flashcards',
                desc: 'Spaced repetition that actually works',
              },
              {
                delay: 0.3,
                color: 'from-purple-500',
                title: 'Mindmaps',
                desc: 'Visual learning structures that stick',
              },
              {
                delay: 0.4,
                color: 'from-amber-500',
                title: 'Timelines',
                desc: 'Chronological understanding of any topic',
              },
              {
                delay: 0.5,
                color: 'from-pink-500',
                title: 'Study Notes',
                desc: 'Organized, summarized, and ready',
              },
              {
                delay: 0.6,
                color: 'from-cyan-500',
                title: 'Progress Tracking',
                desc: 'Know exactly what sticks',
              },
            ].map((feature, i) => (
              <FloatingCard key={i} {...feature}>
                {feature.desc}
              </FloatingCard>
            ))}
          </div>
        </div>
      </section>

      {/* Metrics section with counter animation */}
      <section className="py-32 px-4 bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            {[
              { end: 10, label: 'K+ Active Learners', suffix: 'K+' },
              { end: 500, label: 'K+ Study Sessions', suffix: 'K+' },
              { end: 98, label: '% Satisfaction', suffix: '%' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                viewport={{ once: true }}
              >
                <motion.div
                  className="text-6xl md:text-7xl font-black text-[#7f8962] mb-3"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 + 0.2 }}
                  viewport={{ once: true }}
                >
                  {stat.end}{stat.suffix}
                </motion.div>
                <p className="text-lg text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works - Sequential reveal */}
      <section className="py-32 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl md:text-6xl font-black mb-20 text-center"
          >
            Three steps to mastery
          </motion.h2>

          <div className="space-y-12">
            {[
              {
                num: '01',
                title: 'Upload',
                desc: 'Paste notes, PDFs, articles, or URLs. Any format works instantly.',
              },
              {
                num: '02',
                title: 'Generate',
                desc: 'AI analyzes and creates comprehensive study materials in seconds.',
              },
              {
                num: '03',
                title: 'Learn',
                desc: 'Study with scientifically-proven methods. Watch your retention multiply.',
              },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                viewport={{ once: true }}
                className="relative pl-32 py-8"
              >
                <motion.div
                  className="absolute left-0 top-0 text-7xl font-black text-[#7f8962]/30"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ delay: i * 0.15 + 0.3, duration: 2, repeat: Infinity }}
                >
                  {step.num}
                </motion.div>
                <h3 className="text-3xl font-bold mb-2">{step.title}</h3>
                <p className="text-lg text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA with gradient animation */}
      <section className="py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0">
          <motion.div
            className="absolute inset-0 opacity-20"
            animate={{
              background: [
                'radial-gradient(circle at 20% 50%, #7f8962 0%, transparent 50%)',
                'radial-gradient(circle at 80% 50%, #7f8962 0%, transparent 50%)',
                'radial-gradient(circle at 20% 50%, #7f8962 0%, transparent 50%)',
              ],
            }}
            transition={{ duration: 8, repeat: Infinity }}
          />
        </div>

        <div className="relative max-w-3xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-6xl md:text-7xl font-black mb-8"
          >
            Ready to transform your learning?
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            viewport={{ once: true }}
            className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto"
          >
            Join thousands of learners. Start free today.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link
              href="/auth"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#7f8962] text-white font-semibold text-lg group relative overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 -translate-x-full group-hover:translate-x-full transition-all duration-700" />
              <span className="relative">Start free now</span>
              <motion.span className="relative" whileHover={{ x: 4 }}>
                <ArrowRight className="w-5 h-5" />
              </motion.span>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/10 py-12 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
            {[
              { title: 'Cautie', items: ['Learn smarter with AI'] },
              { title: 'Product', items: ['Features', 'Pricing'] },
              { title: 'Company', items: ['About', 'Blog'] },
              { title: 'Resources', items: ['Docs', 'Support'] },
              { title: 'Legal', items: ['Privacy', 'Terms'] },
            ].map((col, i) => (
              <div key={i}>
                <p className="font-semibold mb-4 text-sm">{col.title}</p>
                <ul className="space-y-2">
                  {col.items.map((item, j) => (
                    <li key={j} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <a href="#">{item}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-border/10 pt-8 text-center text-sm text-muted-foreground">
            &copy; 2026 Cautie. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
