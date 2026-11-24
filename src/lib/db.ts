import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '@/models/User';
import { ApiIntegration } from '@/models/ApiIntegration';
import { AiModuleConfig } from '@/models/AiModuleConfig';
import { PortfolioItem } from '@/models/PortfolioItem';
import { DEFAULT_AI_PROMPTS, DEFAULT_INTEGRATIONS } from '@/lib/constants';

const MONGODB_URI = process.env.MONGODB_URI || '';

interface CachedMongoose {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  seeded: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: CachedMongoose | undefined;
}

const cached: CachedMongoose = global._mongooseCache || {
  conn: null,
  promise: null,
  seeded: false,
};
global._mongooseCache = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured in .env.local');
  }

  if (cached.conn) {
    if (!cached.seeded) {
      await seedDefaultsIfNeeded();
    }
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
    });
  }

  cached.conn = await cached.promise;
  if (!cached.seeded) {
    await seedDefaultsIfNeeded();
  }
  return cached.conn;
}

async function seedDefaultsIfNeeded() {
  try {
    cached.seeded = true;

    // 1. Seed default Super Admin if no users exist yet
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const adminPassHash = await bcrypt.hash('Admin@123', 10);
      const bdePassHash = await bcrypt.hash('Bde@123', 10);

      await User.create([
        {
          workspaceId: 'nextorbit_main',
          name: 'Super Admin (NextOrbit)',
          email: 'admin@nextorbit.in',
          passwordHash: adminPassHash,
          role: 'SUPER_ADMIN',
          isActive: true,
        },
        {
          workspaceId: 'nextorbit_main',
          name: 'Sales Manager',
          email: 'manager@nextorbit.in',
          passwordHash: bdePassHash,
          role: 'SALES_MANAGER',
          isActive: true,
        },
        {
          workspaceId: 'nextorbit_main',
          name: 'BDE Executive',
          email: 'bde@nextorbit.in',
          passwordHash: bdePassHash,
          role: 'BDE',
          isActive: true,
        },
      ]);
    }

    // 2. Ensure all 8 Admin API integration slots exist
    for (const item of DEFAULT_INTEGRATIONS) {
      await ApiIntegration.updateOne(
        { workspaceId: 'nextorbit_main', provider: item.provider },
        {
          $setOnInsert: {
            workspaceId: 'nextorbit_main',
            provider: item.provider,
            label: item.label,
            category: item.category,
            description: item.description,
            docsUrl: item.docsUrl,
            dailyLimit: item.dailyLimit,
            isEnabled: false,
            status: 'UNCONFIGURED',
          },
        },
        { upsert: true }
      );
    }

    // 3. Ensure default AI module configs exist
    const modules: Array<'AUDITOR' | 'WRITER' | 'CLOSER'> = ['AUDITOR', 'WRITER', 'CLOSER'];
    for (const mod of modules) {
      await AiModuleConfig.updateOne(
        { workspaceId: 'nextorbit_main', moduleName: mod },
        {
          $setOnInsert: {
            workspaceId: 'nextorbit_main',
            moduleName: mod,
            provider: mod === 'AUDITOR' ? 'openai' : 'anthropic',
            modelName: mod === 'AUDITOR' ? 'gpt-4o-mini' : 'claude-3-5-sonnet-latest',
            systemPrompt: DEFAULT_AI_PROMPTS[mod],
            temperature: mod === 'AUDITOR' ? 0.2 : 0.55,
            isActive: true,
            followUpDays: [3, 7, 14],
          },
        },
        { upsert: true }
      );
    }

    // 4. Seed sample portfolio items if empty
    const portfolioCount = await PortfolioItem.countDocuments();
    if (portfolioCount === 0) {
      await PortfolioItem.create([
        {
          workspaceId: 'nextorbit_main',
          title: 'High-Converting Clinic Appointment & CRM Portal',
          industry: 'Healthcare / Clinic',
          serviceType: 'Website Development & Redesign',
          projectUrl: 'https://nextorbit.in/work/healthcare-crm',
          summary:
            'Redesigned a multi-location clinic website with 1.1s mobile load speed and integrated online slot booking + WhatsApp reminders.',
          resultsMetric: '+42% online patient bookings in 45 days',
          tags: ['healthcare', 'clinic', 'booking', 'crm', 'speed'],
          createdBy: 'system',
        },
        {
          workspaceId: 'nextorbit_main',
          title: 'D2C E-Commerce Storefront & Custom Order Dashboard',
          industry: 'E-commerce Business',
          serviceType: 'E-commerce Development',
          projectUrl: 'https://nextorbit.in/work/d2c-store',
          summary:
            'Built a fast headless storefront with automated Razorpay/Stripe checkout, GST invoicing, and WhatsApp order tracking.',
          resultsMetric: '2.3x faster checkout & +28% mobile conversion',
          tags: ['ecommerce', 'shopify', 'nextjs', 'checkout'],
          createdBy: 'system',
        },
        {
          workspaceId: 'nextorbit_main',
          title: 'AI Workflow Automation & Custom SaaS Analytics Hub',
          industry: 'SaaS Company',
          serviceType: 'AI Automation & Agents',
          projectUrl: 'https://nextorbit.in/work/ai-automation',
          summary:
            'Automated lead qualification, reporting dashboards, and CRM sync for a B2B services team.',
          resultsMetric: 'Saved 18+ hours/week of manual operations',
          tags: ['ai', 'saas', 'automation', 'dashboard', 'crm'],
          createdBy: 'system',
        },
      ]);
    }
  } catch (err) {
    console.warn('[LeadOrbit] Seed warning:', err);
  }
}

