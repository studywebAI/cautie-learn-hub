'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Brain, BookMarked, BarChart3, Zap } from 'lucide-react';

export default function Landing2() {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      title: 'Quiz Generator',
      description: 'Upload content. Get intelligent quizzes instantly.',
      icon: Brain,
      demo: 'Quiz Demo',
      color: 'from-[#7f8962]',
    },
    {
      title: 'Flashcards',
      description: 'Smart spaced repetition learning cards.',
      icon: BookMarked,
      demo: 'Flashcard Demo',
      color: 'from-blue-500',
    },
    {
      title: 'Progress Analytics',
      description: 'See exactly what you\'ve learned.',
      icon: BarChart3,
      demo: 'Analytics Demo',
      color: 'from-purple-500',
    },
    {
      title: 'Mindmaps',
      description: 'Visual learning structures from any text.',
      icon: Zap,
      demo: 'Mindmap Demo',
      color: 'from-amber-500',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation - clean Linear style */}
      <nav className="border-b border-border/20 sticky top-0 z-40 bg-background/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="text-xl font-bold">Cautie</div>
          <div className="hidden md:flex items-center gap-12 text-sm">
            <a href="#features" className="hover:text-muted-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-muted-foreground transition-colors">How it works</a>
            <a href="#testimonials" className="hover:text-muted-foreground transition-colors">Testimonials</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth" className="text-sm hover:text-muted-foreground transition-colors">Log in</Link>
            <Link
              href="/auth"
              className="px-4 py-2 rounded-lg bg-[#7f8962] text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5"
            >
              Sign up
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero - Clean and focused */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl"
        >
          <h1 className="text-6xl md:text-7xl font-bold leading-tight mb-6">
            Study smarter, not harder
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
            Convert your notes into comprehensive study materials in seconds. Quizzes, flashcards, mindmaps, and more—all powered by AI.
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#7f8962] text-white font-semibold hover:opacity-90 transition-opacity group text-lg"
          >
            Start free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </section>

      {/* Feature showcase - Interactive like Linear */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-5xl font-bold mb-16">Everything you need to learn</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          {/* Feature list */}
          <div className="space-y-4">
            {features.map((feature, i) => (
              <motion.button
                key={i}
                onClick={() => setActiveFeature(i)}
                className={`w-full text-left p-6 rounded-lg border transition-all ${
                  activeFeature === i
                    ? 'border-[#7f8962] bg-[#7f8962]/5'
                    : 'border-border/20 hover:border-border/50'
                }`}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <feature.icon className="w-5 h-5 text-[#7f8962]" />
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.button>
            ))}
          </div>

          {/* Demo area */}
          <motion.div
            key={activeFeature}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-xl border border-border/20 bg-gradient-to-br from-muted/30 to-muted/10 p-12 flex items-center justify-center min-h-96"
          >
            <div className="text-center">
              <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${features[activeFeature].color} to-transparent opacity-20 mx-auto mb-4`} />
              <p className="text-lg font-semibold">{features[activeFeature].demo}</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                {features[activeFeature].description}
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works - Sequential */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-5xl font-bold mb-16">How it works</h2>

        <div className="space-y-12">
          {[
            {
              step: '1',
              title: 'Upload your content',
              description: 'Paste notes, upload a PDF, or link an article. Any format works.',
            },
            {
              step: '2',
              title: 'AI learns your material',
              description: 'Our system analyzes and understands the core concepts in minutes.',
            },
            {
              step: '3',
              title: 'Generate study tools',
              description: 'Get quizzes, flashcards, mindmaps, and more instantly.',
            },
            {
              step: '4',
              title: 'Learn and master',
              description: 'Study with tools proven to improve retention and understanding.',
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="flex gap-8 items-start"
            >
              <div className="text-5xl font-bold text-[#7f8962]/40 flex-shrink-0 w-16">{item.step}</div>
              <div className="pt-2">
                <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                <p className="text-lg text-muted-foreground">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-5xl font-bold mb-16">Loved by learners</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              quote: 'I used to spend hours making study materials. Now it takes minutes.',
              author: 'Sarah Chen',
              role: 'Medical Student',
            },
            {
              quote: 'The quality of the generated questions is honestly better than what I made manually.',
              author: 'Prof. Marcus Johnson',
              role: 'Computer Science Professor',
            },
            {
              quote: 'My entire study group switched to this. It\'s a complete game changer.',
              author: 'Alex Rodriguez',
              role: 'Graduate Student',
            },
          ].map((testimonial, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="border border-border/20 rounded-lg p-8 bg-muted/30"
            >
              <p className="text-lg text-foreground mb-6">"{testimonial.quote}"</p>
              <div>
                <p className="font-semibold">{testimonial.author}</p>
                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA - prominent */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <h2 className="text-5xl font-bold mb-6">Ready to start learning?</h2>
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
          Join thousands of students and teachers who study smarter with Cautie.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth"
            className="px-8 py-4 rounded-lg bg-[#7f8962] text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 group text-lg"
          >
            Get started free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <button className="px-8 py-4 border border-border rounded-lg hover:bg-muted/30 transition-colors font-semibold text-lg">
            Schedule a demo
          </button>
        </div>

        <p className="text-sm text-muted-foreground mt-8">
          Free forever tier available. No credit card required.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/10 py-12 px-4 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
            <div>
              <p className="font-semibold mb-4">Cautie</p>
              <p className="text-sm text-muted-foreground">Learn smarter with AI.</p>
            </div>
            <div>
              <p className="font-semibold mb-4 text-sm">Product</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Features</a></li>
                <li><a href="#" className="hover:text-foreground">Pricing</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-4 text-sm">Company</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">About</a></li>
                <li><a href="#" className="hover:text-foreground">Blog</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-4 text-sm">Resources</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Docs</a></li>
                <li><a href="#" className="hover:text-foreground">Help</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-4 text-sm">Legal</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/10 pt-8 text-center text-sm text-muted-foreground">
            &copy; 2026 Cautie. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
