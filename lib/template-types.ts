// Template Types for Agent Forge Template Gallery

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  icon: string;
  systemPrompt: string;
  sampleConversation: Message[];
  suggestedKnowledgeBase: string[];
  capabilities: string[];
  popularity: number;
  featured: boolean;
  createdAt?: string;
}

export type TemplateCategory =
  | 'customer-service'
  | 'sales'
  | 'healthcare'
  | 'ecommerce'
  | 'hr-internal'
  | 'real-estate'
  | 'financial'
  | 'hospitality';

export interface CategoryInfo {
  id: TemplateCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'customer-service',
    name: 'Customer Service',
    description: 'Support, FAQ, Returns, Onboarding, Feedback',
    icon: 'Headphones',
    color: 'blue',
  },
  {
    id: 'sales',
    name: 'Sales',
    description: 'Lead Qualification, Demo Booking, Outbound',
    icon: 'TrendingUp',
    color: 'green',
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    description: 'Appointments, Intake, Reminders, Triage',
    icon: 'Heart',
    color: 'red',
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Product Finder, Orders, Recommendations',
    icon: 'ShoppingCart',
    color: 'purple',
  },
  {
    id: 'hr-internal',
    name: 'HR & Internal',
    description: 'IT Help, HR FAQ, Scheduling, Onboarding',
    icon: 'Users',
    color: 'cyan',
  },
  {
    id: 'real-estate',
    name: 'Real Estate',
    description: 'Property Search, Showings, Mortgage',
    icon: 'Home',
    color: 'amber',
  },
  {
    id: 'financial',
    name: 'Financial',
    description: 'Billing, Collections, Advisory, Fraud',
    icon: 'DollarSign',
    color: 'emerald',
  },
  {
    id: 'hospitality',
    name: 'Hospitality',
    description: 'Reservations, Concierge, Room Service',
    icon: 'Utensils',
    color: 'pink',
  },
];

export type SortOption = 'popularity' | 'newest' | 'alphabetical';

export interface TemplateFilters {
  category: TemplateCategory | 'all';
  search: string;
  tags: string[];
  sortBy: SortOption;
  featuredOnly: boolean;
}
