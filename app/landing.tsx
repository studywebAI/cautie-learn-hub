'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BrainCircuit,
  BookOpen,
  Zap,
  ArrowRight,
  Check,
  Play,
  Sparkles,
  BarChart3,
  Users,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: 'easeOut' },
  },
};

const floatVariants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

const gradientVariants = {
  animate: {
    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: 'ease-in-out',
    },
  },
};

const pulseVariants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'ease-in-out',
    },
  },
};

const features = [
  {
    icon: BrainCircuit,
    title: 'AI-Powered Quiz Generator',
    description: 'Create intelligent quizzes from any content. Our AI understands your material and generates contextual questions.',
  },
  {
    icon: BookOpen,
    title: 'Smart Flashcards',
    description: 'Transform notes into interactive flashcards. Spaced repetition ensures you remember everything.',
  },
  {
    icon: Zap,
    title: 'Instant Notes',
    description: 'Turn research into organized notes with AI-powered summaries and key point extraction.',
  },
  {
    icon: BarChart3,
    title: 'Progress Analytics',
    description: 'Visualize learning patterns. Get insights on what works best for you.',
  },
];

const stats = [
  { number: '10K+', label: 'Active Learners' },
  { number: '500K+', label: 'Quizzes Created' },
  { number: '2M+', label: 'Study Sessions' },
];

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/20 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#7f8962] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg">Cautie</span>
          </div>
          <div className="hidden md:flex gap-8 text-sm">
            <a href="#features" className="hover:text-[#7f8962] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[#7f8962] transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-[#7f8962] transition-colors">Pricing</a>
          </div>
          <Link
            href="/auth"
            className="px-6 py-2 rounded-lg bg-[#7f8962] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-4 relative overflow-hidden">
        {/* Animated background gradient */}
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(circle at 20% 50%, #7f8962 0%, transparent 50%)',
          }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity }}
        />

        {/* Floating orbs */}
        <motion.div
          className="absolute top-20 right-10 w-72 h-72 bg-gradient-to-r from-[#7f8962]/20 to-transparent rounded-full blur-3xl"
          variants={floatVariants}
          animate="animate"
        />

        <motion.div
          className="absolute -bottom-20 -left-20 w-96 h-96 bg-gradient-to-r from-blue-500/10 to-transparent rounded-full blur-3xl"
          variants={floatVariants}
          animate="animate"
          transition={{ delay: 1 }}
        />

        <div className="relative mx-auto max-w-4xl">
          <motion.div
            className="text-center space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="inline-block">
              <div className="px-4 py-2 rounded-full border border-[#7f8962]/30 bg-[#7f8962]/5 text-sm font-medium">
                ✨ The future of learning is here
              </div>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-5xl md:text-7xl font-bold tracking-tight"
            >
              Learn Smarter,
              <br />
              <span className="bg-gradient-to-r from-[#7f8962] to-blue-500 bg-clip-text text-transparent">
                Not Harder
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              AI-powered learning tools that adapt to your pace. Quiz, flashcards, notes, mindmaps, timelines—all powered by intelligent algorithms.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex gap-4 justify-center pt-4"
            >
              <Link
                href="/auth"
                className="px-8 py-3 rounded-lg bg-[#7f8962] text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2 group"
              >
                Start Learning Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="px-8 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors flex items-center gap-2">
                <Play className="w-4 h-4" />
                Watch Demo
              </button>
            </motion.div>
          </motion.div>

          {/* Hero image animation */}
          <motion.div
            className="mt-16 rounded-2xl border border-border/40 bg-gradient-to-b from-muted/50 to-background p-1 overflow-hidden"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <div className="bg-background rounded-xl p-8 h-96 relative overflow-hidden">
              {/* Animated demo cards */}
              <motion.div
                className="absolute top-4 left-4 w-40 h-24 rounded-lg bg-gradient-to-br from-[#7f8962]/20 to-transparent border border-[#7f8962]/30 p-4"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3 }}
              >
                <div className="text-xs font-semibold mb-2">📝 Quiz Generator</div>
                <div className="space-y-1">
                  <div className="h-2 bg-[#7f8962]/30 rounded w-full" />
                  <div className="h-2 bg-[#7f8962]/20 rounded w-2/3" />
                </div>
              </motion.div>

              <motion.div
                className="absolute bottom-4 right-4 w-40 h-24 rounded-lg bg-gradient-to-br from-blue-500/20 to-transparent border border-blue-500/30 p-4"
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 3, delay: 1 }}
              >
                <div className="text-xs font-semibold mb-2">📊 Analytics</div>
                <div className="space-y-1">
                  <div className="h-2 bg-blue-500/30 rounded w-full" />
                  <div className="h-2 bg-blue-500/20 rounded w-1/2" />
                </div>
              </motion.div>

              <motion.div
                className="absolute top-1/3 left-1/2 -translate-x-1/2 w-48 h-28 rounded-lg bg-gradient-to-br from-amber-500/20 to-transparent border border-amber-500/30 p-4"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 4 }}
              >
                <div className="text-xs font-semibold mb-2">✨ Mindmap</div>
                <div className="grid grid-cols-3 gap-1">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-2 bg-amber-500/20 rounded" />
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-border/20">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {stats.map((stat, idx) => (
              <motion.div key={idx} variants={itemVariants} className="text-center">
                <motion.div
                  className="text-4xl md:text-5xl font-bold text-[#7f8962] mb-2"
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.2 }}
                  viewport={{ once: true }}
                >
                  {stat.number}
                </motion.div>
                <div className="text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4">
        <div className="mx-auto max-w-7xl">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Powerful Tools for Every Learner</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to learn more effectively, powered by AI
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="group relative rounded-2xl border border-border/40 bg-gradient-to-br from-muted/50 to-background p-8 hover:border-[#7f8962]/50 transition-all duration-300"
              >
                <motion.div
                  className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#7f8962]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                />
                <div className="relative">
                  <div className="w-12 h-12 rounded-lg bg-[#7f8962]/10 flex items-center justify-center mb-4 group-hover:bg-[#7f8962]/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-[#7f8962]" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                  <motion.div
                    className="mt-4 flex items-center gap-2 text-[#7f8962] font-medium text-sm"
                    initial={{ x: 0 }}
                    whileHover={{ x: 5 }}
                  >
                    Learn more <ArrowRight className="w-4 h-4" />
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-4 bg-muted/30">
        <div className="mx-auto max-w-7xl">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in seconds. No setup required.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Upload', desc: 'Your content' },
              { step: '2', title: 'AI Analyzes', desc: 'Your material' },
              { step: '3', title: 'Generate', desc: 'Learning tools' },
              { step: '4', title: 'Study', desc: 'And improve' },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
              >
                <motion.div
                  className="aspect-square rounded-2xl border border-border/40 bg-gradient-to-br from-muted/50 to-background flex flex-col items-center justify-center relative"
                  whileHover={{ scale: 1.05, borderColor: '#7f8962' }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <motion.div
                    className="w-16 h-16 rounded-full bg-[#7f8962]/10 flex items-center justify-center mb-4"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, delay: idx * 0.3, repeat: Infinity }}
                  >
                    <span className="text-2xl font-bold text-[#7f8962]">{item.step}</span>
                  </motion.div>
                  <h3 className="font-semibold text-lg">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </motion.div>
                {idx < 3 && (
                  <motion.div
                    className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-[#7f8962] to-transparent"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    transition={{ delay: 0.5 + idx * 0.1 }}
                    viewport={{ once: true }}
                  />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 relative overflow-hidden">
        <motion.div
          className="absolute inset-0 opacity-50"
          style={{
            background: 'radial-gradient(circle at 50% 50%, #7f8962 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity }}
        />

        <div className="relative mx-auto max-w-4xl text-center">
          <motion.h2
            className="text-5xl md:text-6xl font-bold mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Ready to transform your learning?
          </motion.h2>

          <motion.p
            className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            viewport={{ once: true }}
          >
            Join thousands of learners who are already studying smarter with Cautie.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Link
              href="/auth"
              className="inline-block px-8 py-4 rounded-lg bg-[#7f8962] text-white font-semibold hover:opacity-90 transition-opacity text-lg"
            >
              Start Free Now
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/20 py-12 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#7f8962]" />
                <span className="font-semibold">Cautie</span>
              </div>
              <p className="text-sm text-muted-foreground">Learn smarter with AI</p>
            </div>
            {['Features', 'Pricing', 'About', 'Contact'].map((item) => (
              <div key={item}>
                <h4 className="font-semibold mb-4">{item}</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a href="#" className="hover:text-foreground transition-colors">Link 1</a></li>
                  <li><a href="#" className="hover:text-foreground transition-colors">Link 2</a></li>
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
