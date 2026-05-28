'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';

export default function Landing1() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation - inspired by Stripe/Ramp */}
      <nav className="border-b border-border/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold">Cautie</div>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <a href="#product" className="hover:text-muted-foreground transition-colors">Product</a>
            <a href="#solutions" className="hover:text-muted-foreground transition-colors">Solutions</a>
            <a href="#customers" className="hover:text-muted-foreground transition-colors">Customers</a>
            <a href="#pricing" className="hover:text-muted-foreground transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth" className="text-sm hover:text-muted-foreground transition-colors">Log in</Link>
            <Link href="/auth" className="px-4 py-2 rounded-lg bg-[#7f8962] text-white text-sm font-medium hover:opacity-90">
              Sign up free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero - Trust + CTA focused */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            Turn content into study tools instantly
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Upload notes, PDFs, or articles. Our AI generates quizzes, flashcards, mindmaps, and more in seconds. Join 10,000+ learners.
          </p>

          {/* Primary CTAs - like Stripe */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link
              href="/auth"
              className="px-6 py-3 bg-[#7f8962] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              Get started free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button className="px-6 py-3 border border-border rounded-lg hover:bg-muted/50 transition-colors font-semibold">
              Schedule demo
            </button>
          </div>

          {/* Trust badges */}
          <p className="text-sm text-muted-foreground pt-4">
            ✓ Free tier available  ✓ No credit card  ✓ Join 10,000+ learners today
          </p>
        </motion.div>

        {/* Metrics - Trust building like Ramp */}
        <div className="grid grid-cols-3 gap-8 mt-24 py-12 border-y border-border/20">
          <div>
            <div className="text-3xl font-bold text-[#7f8962]">500K+</div>
            <div className="text-sm text-muted-foreground">Study sessions created</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#7f8962]">10K+</div>
            <div className="text-sm text-muted-foreground">Active learners</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#7f8962]">98%</div>
            <div className="text-sm text-muted-foreground">Satisfaction rate</div>
          </div>
        </div>
      </section>

      {/* Use Cases - like Stripe/Ramp */}
      <section id="solutions" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold mb-12">Solutions for every learner</h2>

        <div className="space-y-12">
          {[
            {
              title: 'For Students',
              description: 'Turn class notes into study materials. Master exams faster with AI-generated quizzes and flashcards.',
              features: ['Auto-generate quizzes', 'Spaced repetition', 'Progress tracking'],
            },
            {
              title: 'For Teachers',
              description: 'Create assessment materials instantly. Generate quizzes and worksheets from curriculum content in seconds.',
              features: ['Bulk quiz generation', 'Custom difficulty levels', 'Class analytics'],
            },
            {
              title: 'For Teams',
              description: 'Onboard faster. Convert training materials into interactive learning tools for your team.',
              features: ['Team workspaces', 'Progress dashboards', 'Role-based access'],
            },
          ].map((useCase, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="border border-border/20 rounded-lg p-8"
            >
              <h3 className="text-2xl font-bold mb-3">{useCase.title}</h3>
              <p className="text-muted-foreground mb-6">{useCase.description}</p>
              <ul className="space-y-2">
                {useCase.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-[#7f8962]" />
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Customer Social Proof - mid page like all premium SaaS */}
      <section id="customers" className="bg-muted/30 py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold mb-12">Trusted by learners worldwide</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                quote: "This saved me hours every week. I went from spending 3 hours making study materials to 5 minutes.",
                author: 'Sarah M.',
                role: 'Medical student',
              },
              {
                quote: "My entire class uses it now. The quality of generated quizzes is actually better than what I used to make.",
                author: 'Prof. James L.',
                role: 'University instructor',
              },
              {
                quote: "The best part? It actually understands context. The quizzes aren't just random questions.",
                author: 'Alex K.',
                role: 'High school teacher',
              },
              {
                quote: "Free to start, incredibly powerful. Recommend this to everyone I know.",
                author: 'Jordan P.',
                role: 'Learner',
              },
            ].map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-background border border-border/20 rounded-lg p-6"
              >
                <p className="text-muted-foreground mb-4">"{testimonial.quote}"</p>
                <div>
                  <p className="font-semibold text-sm">{testimonial.author}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works - simple and clear */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold mb-12">How it works</h2>

        <div className="space-y-8">
          {[
            { num: '1', title: 'Upload', desc: 'Your notes, PDF, or article text' },
            { num: '2', title: 'AI Processes', desc: 'Analyzes and understands your content' },
            { num: '3', title: 'Generate', desc: 'Creates quizzes, cards, mindmaps, more' },
            { num: '4', title: 'Learn', desc: 'Study with tools built for your brain' },
          ].map((step, i) => (
            <div key={i} className="flex gap-6 items-start">
              <div className="text-4xl font-bold text-[#7f8962] flex-shrink-0">{step.num}</div>
              <div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing - simple section */}
      <section id="pricing" className="bg-muted/30 py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold mb-12">Simple pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                name: 'Free',
                price: '0',
                features: ['5 uploads/month', 'Basic quiz generation', 'Community support'],
                cta: 'Get started',
              },
              {
                name: 'Pro',
                price: '9',
                features: ['Unlimited uploads', 'All features', 'Priority support', 'Team access'],
                cta: 'Start free trial',
                highlight: true,
              },
            ].map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`rounded-lg p-8 border ${
                  plan.highlight
                    ? 'bg-[#7f8962]/5 border-[#7f8962]'
                    : 'border-border/20'
                }`}
              >
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="text-4xl font-bold mb-6">
                  ${plan.price}
                  <span className="text-lg text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-[#7f8962]" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth"
                  className="block text-center px-4 py-2 rounded-lg bg-[#7f8962] text-white font-semibold hover:opacity-90 transition-opacity"
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-4xl font-bold mb-6">Ready to transform learning?</h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Start free today. No credit card required. Join thousands of learners.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth"
            className="px-6 py-3 bg-[#7f8962] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Get started free
          </Link>
          <button className="px-6 py-3 border border-border rounded-lg hover:bg-muted/50 transition-colors font-semibold">
            Schedule demo
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/10 py-12 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Features</a></li>
              <li><a href="#" className="hover:text-foreground">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">About</a></li>
              <li><a href="#" className="hover:text-foreground">Blog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Docs</a></li>
              <li><a href="#" className="hover:text-foreground">Help</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Privacy</a></li>
              <li><a href="#" className="hover:text-foreground">Terms</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/10 pt-8 text-center text-sm text-muted-foreground">
          &copy; 2026 Cautie. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
