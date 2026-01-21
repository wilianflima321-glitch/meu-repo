/**
 * Stripe Customer Portal - Endpoint Completo
 * 
 * Permite ao usuário:
 * - Ver e atualizar método de pagamento
 * - Ver histórico de faturas
 * - Cancelar/pausar assinatura
 * - Fazer upgrade/downgrade
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireAuth } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// POST - Criar sessão do Customer Portal
export async function POST(req: NextRequest) {
  try {
    const session = requireAuth(req);
    
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Buscar usuário com Stripe Customer ID
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
      },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    let customerId = user.stripeCustomerId;
    
    // Se não tem customer, criar um
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          userId: user.id,
        },
      });
      
      customerId = customer.id;
      
      // Salvar no banco
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }
    
    // Configuração do portal
    const returnUrl = `${process.env.NEXTAUTH_URL}/billing`;
    
    // Criar sessão do portal
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
      configuration: await getOrCreatePortalConfiguration(),
    });
    
    return NextResponse.json({
      url: portalSession.url,
    });
    
  } catch (error) {
    console.error('[Stripe Portal] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}

// GET - Obter informações do portal/subscription
export async function GET(req: NextRequest) {
  try {
    const session = requireAuth(req);
    
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        plan: true,
        trialEndsAt: true,
      },
    });
    
    if (!user?.stripeCustomerId) {
      return NextResponse.json({
        hasSubscription: false,
        plan: 'free',
        canAccessPortal: false,
      });
    }
    
    // Buscar subscription ativa
    let subscription: Stripe.Subscription | null = null;
    let invoices: Stripe.Invoice[] = [];
    let paymentMethods: Stripe.PaymentMethod[] = [];
    
    if (user.stripeSubscriptionId) {
      try {
        subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      } catch (e) {
        // Subscription may have been deleted
      }
    }
    
    // Buscar últimas faturas
    try {
      const invoiceList = await stripe.invoices.list({
        customer: user.stripeCustomerId,
        limit: 10,
      });
      invoices = invoiceList.data;
    } catch (e) {
      // Ignore
    }
    
    // Buscar métodos de pagamento
    try {
      const pmList = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card',
      });
      paymentMethods = pmList.data;
    } catch (e) {
      // Ignore
    }
    
    return NextResponse.json({
      hasSubscription: !!subscription && subscription.status === 'active',
      plan: user.plan,
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        cancelAt: subscription.cancel_at,
      } : null,
      trial: user.trialEndsAt ? {
        endsAt: user.trialEndsAt,
        isActive: new Date(user.trialEndsAt) > new Date(),
        daysRemaining: Math.max(0, Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
      } : null,
      invoices: invoices.map(inv => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        amount: inv.amount_paid,
        currency: inv.currency,
        created: inv.created,
        pdfUrl: inv.invoice_pdf,
        hostedUrl: inv.hosted_invoice_url,
      })),
      paymentMethods: paymentMethods.map(pm => ({
        id: pm.id,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
        isDefault: pm.id === subscription?.default_payment_method,
      })),
      canAccessPortal: true,
    });
    
  } catch (error) {
    console.error('[Stripe Portal] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing info' },
      { status: 500 }
    );
  }
}

// Helper: Criar ou obter configuração do portal
async function getOrCreatePortalConfiguration(): Promise<string> {
  // Verificar se já existe uma configuração
  const configs = await stripe.billingPortal.configurations.list({ limit: 1 });
  
  if (configs.data.length > 0 && configs.data[0].is_default) {
    return configs.data[0].id;
  }
  
  // Criar nova configuração
  const config = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: 'Aethel Engine - Manage your subscription',
      privacy_policy_url: `${process.env.NEXTAUTH_URL}/legal/privacy`,
      terms_of_service_url: `${process.env.NEXTAUTH_URL}/legal/terms`,
    },
    features: {
      customer_update: {
        enabled: true,
        allowed_updates: ['email', 'name', 'address', 'phone', 'tax_id'],
      },
      invoice_history: {
        enabled: true,
      },
      payment_method_update: {
        enabled: true,
      },
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end',
        proration_behavior: 'none',
        cancellation_reason: {
          enabled: true,
          options: [
            'too_expensive',
            'missing_features',
            'switched_service',
            'unused',
            'customer_service',
            'too_complex',
            'low_quality',
            'other',
          ],
        },
      },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ['price', 'quantity', 'promotion_code'],
        proration_behavior: 'create_prorations',
        products: await getProductsForPortal(),
      },
    },
    default_return_url: `${process.env.NEXTAUTH_URL}/billing`,
  });
  
  return config.id;
}

// Helper: Obter produtos para o portal
async function getProductsForPortal() {
  const products = await stripe.products.list({
    active: true,
    limit: 10,
  });
  
  return products.data
    .filter(p => p.metadata.plan_type)
    .map(product => ({
      product: product.id,
      prices: product.default_price ? [product.default_price as string] : [],
    }));
}
