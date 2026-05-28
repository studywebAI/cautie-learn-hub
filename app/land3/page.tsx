'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Play, Zap } from 'lucide-react';

const floatingVariants = {
  animate: {
    y: [0, -10, 0],
    transition: { duration: 3, repeat: Infinity },
  },
};

export default function Landing3() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/10 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold">Cautie</div>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <a href="#why" className="hover:text-[#7f8962] transition-colors">Why Cautie</a>
            <a href="#features" className="hover:text-[#7f8962] transition-colors">Features</a>
            <a href="#impact" className="hover:text-[#7f8962] transition-colors">Impact</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth" className="text-sm hover:text-[#7f8962] transition-colors">Log in</Link>
            <Link href="/auth" className="px-4 py-2 rounded-lg bg-[#7f8962] text-white text-sm font-medium hover:opacity-90">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero with animations */}
      <section className="pt-32 pb-24 px-4 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#7f8962]/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-500/5 to-transparent rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8 text-center"
          >
            {/* Animated badge */}
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block px-4 py-2 rounded-full border border-[#7f8962]/30 bg-[#7f8962]/5 text-sm font-medium"
            >
              ✨ Transform learning with AI
            </motion.div>

            {/* Main headline */}
            <h1 className="text-6xl md:text-7xl font-bold leading-tight">
              Your content.
              <br />
              <span className="bg-gradient-to-r from-[#7f8962] to-emerald-600 bg-clip-text text-transparent">
                Infinite study tools.
              </span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Upload notes, PDFs, articles. Get quizzes, flashcards, mindmaps, timelines, and more—instantly powered by AI.
            </p>

            {/* CTA buttons with hover effects */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href="/auth"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-[#7f8962] text-white font-semibold hover:opacity-90 transition-opacity group text-lg"
                >
                  Start free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-border rounded-lg hover:bg-muted/30 transition-colors font-semibold text-lg group"
              >
                <Play className="w-5 h-5" />
                Watch demo
              </motion.button>
            </motion.div>

            <p className="text-sm text-muted-foreground">
              No credit card • 100% free tier • Join 10K+ learners
            </p>
          </motion.div>

          {/* Floating cards demo */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mt-20 relative h-96"
          >
            {/* Quiz card */}
            <motion.div
              variants={floatingVariants}
              animate="animate"
              className="absolute top-0 left-0 md:left-10 w-64 rounded-xl border border-[#7f8962]/30 bg-gradient-to-br from-[#7f8962]/10 to-transparent p-6 backdrop-blur"
            >
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-[#7f8962]" />
                <span className="text-xs font-semibold text-[#7f8962]">QUIZ</span>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-[#7f8962]/20 rounded-full w-full" />
                <div className="h-3 bg-[#7f8962]/20 rounded-full w-4/5" />
                <div className="h-3 bg-[#7f8962]/20 rounded-full w-3/5" />
              </div>
            </motion.div>

            {/* Flashcards */}
            <motion.div
              variants={floatingVariants}
              animate="animate"
              transition={{ delay: 1 }}
              className="absolute top-1/3 right-0 md:right-10 w-64 rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent p-6 backdrop-blur"
            >
              <div className="flex items-center gap-2 mb-4">
                <Check className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-semibold text-blue-500">FLASHCARDS</span>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-blue-500/20 rounded-full w-full" />
                <div className="h-3 bg-blue-500/20 rounded-full w-3/4" />
              </div>
            </motion.div>

            {/* Mindmap */}
            <motion.div
              variants={floatingVariants}
              animate="animate"
              transition={{ delay: 0.5 }}
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent p-6 backdrop-blur"
            >
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-amber-500">MINDMAP</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-2 bg-amber-500/20 rounded-full" />
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features grid with hover */}
      <section id="features" className="py-24 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold mb-4">Why Cautie</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to master any subject
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: 'AI-Powered',
                desc: 'Intelligent algorithms understand context, not just keywords.',
              },
              {
                title: 'Instant Generation',
                desc: 'From upload to study tools in seconds, not hours.',
              },
              {
                title: 'Multiple Formats',
                desc: 'Quizzes, flashcards, mindmaps, timelines, notes, and more.',
              },
              {
                title: 'Progress Tracking',
                desc: 'See what sticks. Know what needs more work.',
              },
              {
                title: 'Free Forever',
                desc: 'Get started for free. Upgrade when you\'re ready.',
              },
              {
                title: 'Works Everywhere',
                desc: 'Web, mobile, works with any learning material.',
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                viewport={{ once: true }}
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
                className="group relative rounded-xl border border-border/20 bg-gradient-to-br from-muted/20 to-muted/5 p-8 hover:border-[#7f8962]/50 transition-all duration-300 cursor-pointer"
              >
                <AnimatePresence>
                  {hoveredCard === i && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-gradient-to-br from-[#7f8962]/5 to-transparent rounded-xl pointer-events-none"
                    />
                  )}
                </AnimatePresence>

                <h3 className="text-xl font-semibold mb-3 relative z-10">{feature.title}</h3>
                <p className="text-muted-foreground relative z-10">{feature.desc}</p>

                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={hoveredCard === i ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#7f8962]/10 flex items-center justify-center"
                >
                  <ArrowRight className="w-4 h-4 text-[#7f8962]" />
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact section */}
      <section id="impact" className="py-24 px-4 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-bold mb-16 text-center">Real impact</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { stat: '500K+', label: 'Study sessions', icon: '📚' },
              { stat: '10K+', label: 'Active learners', icon: '👥' },
              { stat: '98%', label: 'Love it', icon: '❤️' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-5xl mb-2">{item.icon}</div>
                <div className="text-5xl font-bold text-[#7f8962] mb-2">{item.stat}</div>
                <p className="text-muted-foreground">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-center">From our users</h2>

          <div className="space-y-6">
            {[
              {
                quote: 'Changed how I study. Hours of work became minutes.',
                author: 'Sarah • Medical Student',
              },
              {
                quote: 'The quizzes it generates are better than ones I create manually.',
                author: 'Prof. James • Computer Science',
              },
              {
                quote: 'My entire class is using this now.',
                author: 'Alex • High School Teacher',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="border-l-4 border-[#7f8962] pl-6 py-2"
              >
                <p className="text-lg font-medium mb-2">"{item.quote}"</p>
                <p className="text-sm text-muted-foreground">{item.author}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-4 relative overflow-hidden text-center">
        <div className="absolute inset-0 opacity-40 bg-gradient-to-br from-[#7f8962]/20 to-transparent rounded-3xl" />

        <div className="relative max-w-3xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-6xl font-bold mb-6"
          >
            Ready?
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            viewport={{ once: true }}
            className="text-xl text-muted-foreground mb-12"
          >
            Start learning smarter today. No signup friction. No features hidden behind paywalls.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
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
      <footer className="border-t border-border/10 py-12 px-4 bg-muted/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
            {[
              { title: 'Cautie', items: ['Learn smarter with AI'] },
              { title: 'Product', items: ['Features', 'Pricing'] },
              { title: 'Company', items: ['About', 'Blog'] },
              { title: 'Resources', items: ['Docs', 'Help'] },
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
