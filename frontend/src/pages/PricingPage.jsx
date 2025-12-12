import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Rocket, Check, X, Zap, Star, ArrowRight, HelpCircle,
  Users, Shield, Headphones, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PricingPage = () => {
  const [annual, setAnnual] = useState(true);

  const plans = [
    {
      name: 'Free',
      description: 'Perfect for learning and side projects',
      price: { monthly: 0, annual: 0 },
      features: [
        { name: '3 projects', included: true },
        { name: 'Basic AI assistance', included: true },
        { name: 'Community support', included: true },
        { name: '1GB storage', included: true },
        { name: 'Public projects only', included: true },
        { name: 'Advanced AI features', included: false },
        { name: 'Team collaboration', included: false },
        { name: 'Priority support', included: false },
      ],
      cta: 'Get Started',
      popular: false
    },
    {
      name: 'Pro',
      description: 'For professional developers',
      price: { monthly: 19, annual: 15 },
      features: [
        { name: 'Unlimited projects', included: true },
        { name: 'Advanced AI assistance', included: true },
        { name: 'Email support', included: true },
        { name: '50GB storage', included: true },
        { name: 'Private projects', included: true },
        { name: 'Custom themes', included: true },
        { name: 'API access', included: true },
        { name: 'Team collaboration (up to 5)', included: true },
      ],
      cta: 'Start Free Trial',
      popular: true
    },
    {
      name: 'Enterprise',
      description: 'For teams and organizations',
      price: { monthly: 49, annual: 39 },
      features: [
        { name: 'Everything in Pro', included: true },
        { name: 'Unlimited team members', included: true },
        { name: 'Priority support 24/7', included: true },
        { name: 'Unlimited storage', included: true },
        { name: 'SSO & SAML', included: true },
        { name: 'Custom integrations', included: true },
        { name: 'Dedicated account manager', included: true },
        { name: 'SLA guarantee', included: true },
      ],
      cta: 'Contact Sales',
      popular: false
    }
  ];

  const faqs = [
    {
      question: 'Can I switch plans later?',
      answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards, PayPal, and bank transfers for Enterprise plans.'
    },
    {
      question: 'Is there a free trial?',
      answer: 'Yes, Pro and Enterprise plans come with a 14-day free trial. No credit card required.'
    },
    {
      question: 'What happens to my projects if I downgrade?',
      answer: 'Your projects remain safe. You\'ll need to archive some if you exceed the free tier limits.'
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">AI IDE</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" className="text-zinc-300">Sign in</Button>
            </Link>
            <Link to="/register">
              <Button className="bg-blue-600 hover:bg-blue-700">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6">Simple, transparent pricing</h1>
          <p className="text-xl text-zinc-400 mb-10">
            Choose the plan that's right for you. All plans include a 14-day free trial.
          </p>
          
          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-full p-2">
            <span className={cn('px-4 py-2 rounded-full transition-colors', !annual && 'bg-zinc-800')}>Monthly</span>
            <Switch checked={annual} onCheckedChange={setAnnual} />
            <span className={cn('px-4 py-2 rounded-full transition-colors', annual && 'bg-zinc-800')}>
              Annual
              <span className="ml-2 text-xs text-green-400">Save 20%</span>
            </span>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={cn(
                  'relative rounded-2xl border p-8',
                  plan.popular
                    ? 'bg-gradient-to-b from-blue-500/10 to-purple-500/10 border-blue-500/50'
                    : 'bg-zinc-900/50 border-zinc-800'
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                )}
                
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-zinc-400">{plan.description}</p>
                </div>
                
                <div className="mb-6">
                  <span className="text-5xl font-bold">
                    ${annual ? plan.price.annual : plan.price.monthly}
                  </span>
                  <span className="text-zinc-500">/month</span>
                  {annual && plan.price.annual > 0 && (
                    <p className="text-sm text-zinc-500 mt-1">Billed annually</p>
                  )}
                </div>
                
                <Link to="/register">
                  <Button
                    className={cn(
                      'w-full mb-6',
                      plan.popular
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
                        : 'bg-zinc-800 hover:bg-zinc-700'
                    )}
                  >
                    {plan.cta}
                  </Button>
                </Link>
                
                <ul className="space-y-3">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-3">
                      {feature.included ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : (
                        <X className="w-5 h-5 text-zinc-600" />
                      )}
                      <span className={cn(!feature.included && 'text-zinc-600')}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-24 px-6 bg-zinc-900/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why choose AI IDE?</h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: Sparkles, title: 'AI-Powered', description: 'Advanced AI that understands your code' },
              { icon: Zap, title: 'Lightning Fast', description: '150ms average response time' },
              { icon: Shield, title: 'Secure', description: 'Enterprise-grade security' },
              { icon: Headphones, title: '24/7 Support', description: 'Always here to help' }
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 bg-zinc-800 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-7 h-7 text-blue-400" />
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-zinc-500 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently asked questions</h2>
          
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-400" />
                  {faq.question}
                </h3>
                <p className="text-zinc-400 pl-7">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to get started?</h2>
          <p className="text-xl text-zinc-400 mb-10">Join thousands of developers building with AI IDE.</p>
          <Link to="/register">
            <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 h-14 px-8 text-lg">
              Start Your Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-zinc-500 text-sm">© 2024 AI IDE Platform. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-zinc-500">
            <a href="#" className="hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:text-white">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PricingPage;
