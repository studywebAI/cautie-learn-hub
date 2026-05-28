'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Play,
  CheckCircle2,
  Zap,
  Brain,
  BookMarked,
  BarChart3,
  Users,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

const CautieLogoMark = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" className="w-8 h-8">
    {/* Brain neural network style logo */}
    <defs>
      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7f8962" />
        <stop offset="100%" stopColor="#6b7550" />
      </linearGradient>
    </defs>
    {/* Central circle */}
    <circle cx="16" cy="16" r="6" fill="url(#logoGrad)" />
    {/* Connected nodes */}
    <circle cx="8" cy="10" r="3" fill="#7f8962" opacity="0.6" />
    <circle cx="24" cy="10" r="3" fill="#7f8962" opacity="0.6" />
    <circle cx="8" cy="22" r="3" fill="#7f8962" opacity="0.6" />
    <circle cx="24" cy="22" r="3" fill="#7f8962" opacity="0.6" />
    {/* Connecting lines */}
    <line x1="11" y1="12" x2="14" y2="14" stroke="#7f8962" strokeWidth="1.5" opacity="0.4" />
    <line x1="21" y1="12" x2="18" y2="14" stroke="#7f8962" strokeWidth="1.5" opacity="0.4" />
    <line x1="11" y1="20" x2="14" y2="18" stroke="#7f8962" strokeWidth="1.5" opacity="0.4" />
    <line x1="21" y1="20" x2="18" y2="18" stroke="#7f8962" strokeWidth="1.5" opacity="0.4" />
  </svg>
);

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/10 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <CautieLogoMark />
            <span className="font-bold text-xl tracking-tight">Cautie</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
            <Link href="/auth" className="px-6 py-2 rounded-lg bg-[#7f8962] text-white text-sm font-medium hover:opacity-90 transition-opacity">
              Get started free
            </Link>
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="md:hidden border-t border-border/10 bg-background/95"
            >
              <div className="px-4 py-4 space-y-4">
                <a href="#features" className="block text-sm hover:text-[#7f8962]">Features</a>
                <a href="#how" className="block text-sm hover:text-[#7f8962]">How it works</a>
                <a href="#testimonials" className="block text-sm hover:text-[#7f8962]">Testimonials</a>
                <div className="pt-4 border-t border-border/10 space-y-3">
                  <Link href="/auth" className="block text-sm text-muted-foreground">Sign in</Link>
                  <Link href="/auth" className="block text-center px-4 py-2 rounded-lg bg-[#7f8962] text-white text-sm font-medium">
                    Get started free
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Gradient orbs background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#7f8962]/10 to-transparent rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-500/5 to-transparent rounded-full blur-3xl -z-10" />

        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6 text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-block"
            >
              <div className="px-4 py-2 rounded-full border border-[#7f8962]/30 bg-[#7f8962]/5 text-sm font-medium text-[#7f8962] flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Powered by AI. Built for learning.
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-6xl md:text-7xl font-bold tracking-tight leading-tight"
            >
              Turn any content into
              <br />
              <span className="bg-gradient-to-r from-[#7f8962] via-green-600 to-emerald-600 bg-clip-text text-transparent">
                powerful study tools
              </span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              Upload your notes, PDFs, or articles. Our AI instantly generates quizzes, flashcards, mindmaps, and more. Learn smarter in seconds, not hours.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
            >
              <Link
                href="/auth"
                className="px-8 py-4 rounded-lg bg-[#7f8962] text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 group"
              >
                Start learning free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="px-8 py-4 rounded-lg border border-border hover:bg-muted/30 transition-colors font-semibold flex items-center justify-center gap-2">
                <Play className="w-5 h-5" />
                Watch demo
              </button>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="pt-8 text-sm text-muted-foreground space-y-2"
            >
              <p>✓ Free to start • ✓ No credit card • ✓ Join 10,000+ learners</p>
            </motion.div>
          </motion.div>

          {/* Hero visual */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-16 relative"
          >
            <div className="relative rounded-2xl border border-border/20 bg-gradient-to-b from-muted/20 to-muted/5 p-1 overflow-hidden shadow-2xl">
              <div className="bg-background rounded-xl p-8 aspect-video relative overflow-hidden flex items-center justify-center">
                {/* Demo dashboard mockup */}
                <div className="w-full h-full space-y-4">
                  {/* Top bar */}
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#7f8962]" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                  </div>

                  {/* Content cards */}
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    {[
                      { title: 'Quiz', color: 'from-[#7f8962]' },
                      { title: 'Flashcards', color: 'from-blue-500' },
                      { title: 'Mindmap', color: 'from-amber-500' },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        className={`h-24 rounded-lg bg-gradient-to-br ${item.color} to-transparent opacity-20`}
                        animate={{ y: [0, -4, 0] }}
                        transition={{ delay: i * 0.2, duration: 2, repeat: Infinity }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 bg-muted/20">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Your complete study toolkit</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to master any subject, powered by AI
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: Brain,
                title: 'AI Quiz Generator',
                desc: 'Create intelligent quizzes from any content. Adaptive difficulty learns from your answers.',
                color: 'from-[#7f8962]',
              },
              {
                icon: BookMarked,
                title: 'Smart Flashcards',
                desc: 'Transform text into flashcards with spaced repetition. Remember what matters.',
                color: 'from-blue-500',
              },
              {
                icon: Zap,
                title: 'Instant Notes',
                desc: 'Organize and summarize content automatically. Never miss a key point.',
                color: 'from-amber-500',
              },
              {
                icon: BarChart3,
                title: 'Progress Tracking',
                desc: 'Visualize your learning journey. See what sticks and what needs work.',
                color: 'from-purple-500',
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group relative rounded-xl border border-border/40 bg-background p-8 hover:border-[#7f8962]/50 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} to-transparent opacity-10 group-hover:opacity-20 transition-opacity flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-6 h-6 text-transparent bg-gradient-to-r ${feature.color} bg-clip-text`} />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 px-4">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Three steps to better learning</h2>
            <p className="text-lg text-muted-foreground">Get started in minutes</p>
          </motion.div>

          <div className="space-y-8">
            {[
              { step: '1', title: 'Upload', desc: 'Your notes, PDFs, articles, or any text' },
              { step: '2', title: 'Generate', desc: 'AI creates quizzes, flashcards, and more instantly' },
              { step: '3', title: 'Learn', desc: 'Study with tools designed for your brain' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.2 }}
                viewport={{ once: true }}
                className="flex gap-6 md:gap-12 items-start"
              >
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-[#7f8962]/10 border-2 border-[#7f8962] flex items-center justify-center">
                    <span className="text-2xl font-bold text-[#7f8962]">{item.step}</span>
                  </div>
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
                  <p className="text-lg text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof / Stats */}
      <section className="py-16 px-4 bg-muted/20 border-t border-b border-border/20">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { stat: '10,000+', label: 'Active learners' },
              { stat: '500,000+', label: 'Study sessions' },
              { stat: '98%', label: 'Satisfaction rate' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="text-4xl font-bold text-[#7f8962] mb-2">{item.stat}</div>
                <div className="text-muted-foreground">{item.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-[#7f8962]/20 to-transparent rounded-3xl" />
        <div className="relative mx-auto max-w-2xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl md:text-6xl font-bold mb-6"
          >
            Ready to transform your learning?
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            viewport={{ once: true }}
            className="text-xl text-muted-foreground mb-8"
          >
            Start free today. No credit card required.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-[#7f8962] text-white font-semibold hover:opacity-90 transition-opacity group text-lg"
            >
              Get started free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/20 py-12 px-4 bg-muted/30">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CautieLogoMark />
                <span className="font-bold text-lg">Cautie</span>
              </div>
              <p className="text-sm text-muted-foreground">Learn smarter with AI-powered study tools.</p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'FAQ'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers'] },
              { title: 'Legal', links: ['Privacy', 'Terms', 'Contact'] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="font-semibold mb-4 text-sm">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-border/20 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2026 Cautie. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
