import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'FAQ | Agent Forge — AI Agent Builder Questions Answered',
  description: 'Frequently asked questions about Agent Forge: pricing, voice & phone capabilities, features, comparisons to Botpress/Voiceflow/Vapi, and how to get started building AI agents.',
  openGraph: {
    title: 'Agent Forge FAQ — Your Questions Answered',
    description: 'Everything you need to know about Agent Forge: pricing, voice capabilities, integrations, comparisons, and getting started.',
    url: 'https://agent-forge.app/faq',
  },
  alternates: {
    canonical: '/faq',
  },
};

interface FaqItem {
  question: string;
  answer: string;
  answerJsx: React.ReactNode;
}

interface FaqSection {
  title: string;
  items: FaqItem[];
}

const faqSections: FaqSection[] = [
  {
    title: 'General',
    items: [
      {
        question: 'What is Agent Forge?',
        answer: 'Agent Forge is a no-code AI agent builder that lets businesses create, deploy, and manage voice and text AI agents without writing code. You describe what you need in plain English, and Agent Forge generates a production-ready agent that can handle phone calls, web chat, WhatsApp, Slack, Discord, SMS, and email. Plans start at $79/month with a 14-day free trial.',
        answerJsx: (
          <p>Agent Forge is a no-code AI agent builder that lets businesses create, deploy, and manage voice and text AI agents without writing code. You describe what you need in plain English, and Agent Forge generates a production-ready agent that can handle phone calls, web chat, WhatsApp, Slack, Discord, SMS, and email. <Link href="/pricing" className="text-orange-500 hover:text-orange-400">Plans start at $79/month</Link> with a 14-day free trial.</p>
        ),
      },
      {
        question: 'How does Agent Forge work?',
        answer: 'Agent Forge uses a three-step process: (1) Describe your agent in plain English — tell it what you need (customer support, sales qualifier, appointment scheduler, etc.), (2) Agent Forge\'s AI generates a complete agent with the right logic, personality, and knowledge, (3) Deploy with one click to your website, phone number, or messaging channels. The entire process takes about 60 seconds.',
        answerJsx: (
          <p>Agent Forge uses a three-step process: (1) Describe your agent in plain English — tell it what you need (customer support, sales qualifier, appointment scheduler, etc.), (2) Agent Forge&apos;s AI generates a complete agent with the right logic, personality, and knowledge, (3) Deploy with one click to your website, phone number, or messaging channels. The entire process takes about 60 seconds. <Link href="/build" className="text-orange-500 hover:text-orange-400">Try it now</Link>.</p>
        ),
      },
      {
        question: 'Who is Agent Forge for?',
        answer: 'Agent Forge is built for businesses that want AI agents without hiring engineers. Common users include small businesses automating customer support, agencies building agents for clients, sales teams qualifying leads, healthcare practices handling patient intake, and restaurants managing orders and reservations. No technical skills are required.',
        answerJsx: (
          <p>Agent Forge is built for businesses that want AI agents without hiring engineers. Common users include small businesses automating customer support, agencies building agents for clients, sales teams qualifying leads, healthcare practices handling patient intake, and restaurants managing orders and reservations. No technical skills are required. <Link href="/features" className="text-orange-500 hover:text-orange-400">See all features</Link>.</p>
        ),
      },
      {
        question: 'Is Agent Forge free?',
        answer: 'Agent Forge offers a 14-day free trial on all plans with no credit card required. After the trial, paid plans start at $79/month (Starter), $249/month (Professional), and $799/month (Enterprise). There is no permanent free tier.',
        answerJsx: (
          <p>Agent Forge offers a 14-day free trial on all plans with no credit card required. After the trial, paid plans start at $79/month (Starter), $249/month (Professional), and $799/month (Enterprise). There is no permanent free tier. <Link href="/pricing" className="text-orange-500 hover:text-orange-400">View pricing details</Link>.</p>
        ),
      },
    ],
  },
  {
    title: 'Voice & Phone',
    items: [
      {
        question: 'Can Agent Forge make phone calls?',
        answer: 'Yes. Agent Forge has native voice capabilities, including inbound and outbound phone calls. Every plan includes dedicated phone numbers (1 on Starter, 5 on Professional, unlimited on Enterprise) and voice minutes (100-2,000/month depending on plan). Your AI agent can answer calls, make outbound calls, and run batch calling campaigns.',
        answerJsx: (
          <p>Yes. Agent Forge has native voice capabilities, including inbound and outbound phone calls. Every plan includes dedicated phone numbers (1 on Starter, 5 on Professional, unlimited on Enterprise) and voice minutes (100-2,000/month depending on plan). Your AI agent can answer calls, make outbound calls, and run batch calling campaigns. <Link href="/features" className="text-orange-500 hover:text-orange-400">Explore voice features</Link>.</p>
        ),
      },
      {
        question: 'Does Agent Forge include phone numbers?',
        answer: 'Yes. Phone numbers are included in every Agent Forge plan at no extra cost. Starter includes 1 phone number, Professional includes 5, and Enterprise includes unlimited phone numbers. This is different from most competitors where phone integration requires third-party services like Twilio at additional cost.',
        answerJsx: (
          <p>Yes. Phone numbers are included in every Agent Forge plan at no extra cost. Starter includes 1 phone number, Professional includes 5, and Enterprise includes unlimited phone numbers. This is different from most competitors where phone integration requires third-party services like Twilio at additional cost. <Link href="/pricing" className="text-orange-500 hover:text-orange-400">Compare plans</Link>.</p>
        ),
      },
      {
        question: 'What is TTS voice cloning in Agent Forge?',
        answer: 'TTS (Text-to-Speech) voice cloning is an Enterprise feature that lets you create a custom AI voice for your agents. You provide audio samples, and Agent Forge generates a synthetic voice that matches your brand\'s sound. This means your AI agents don\'t have to use generic AI voices — they can sound uniquely like your company.',
        answerJsx: (
          <p>TTS (Text-to-Speech) voice cloning is an Enterprise feature that lets you create a custom AI voice for your agents. You provide audio samples, and Agent Forge generates a synthetic voice that matches your brand&apos;s sound. This means your AI agents don&apos;t have to use generic AI voices — they can sound uniquely like your company. <Link href="/pricing" className="text-orange-500 hover:text-orange-400">See Enterprise plan</Link>.</p>
        ),
      },
      {
        question: 'Can Agent Forge agents handle both voice and text?',
        answer: 'Yes. Every Agent Forge agent can operate across voice and text channels simultaneously. The same agent that answers phone calls can also handle web chat, WhatsApp messages, Slack conversations, and email — all from a single configuration. You don\'t need separate agents for different channels.',
        answerJsx: (
          <p>Yes. Every Agent Forge agent can operate across voice and text channels simultaneously. The same agent that answers phone calls can also handle web chat, WhatsApp messages, Slack conversations, and email — all from a single configuration. You don&apos;t need separate agents for different channels. <Link href="/build" className="text-orange-500 hover:text-orange-400">Build a multi-channel agent</Link>.</p>
        ),
      },
    ],
  },
  {
    title: 'Pricing & Plans',
    items: [
      {
        question: 'How much does Agent Forge cost?',
        answer: 'Agent Forge offers three plans: Starter at $79/month (1 agent, 1K conversations, 100 voice minutes, 1 phone number), Professional at $249/month (5 agents, 10K conversations, 500 voice minutes, 5 phone numbers), and Enterprise at $799/month (unlimited agents and conversations, 2,000 voice minutes, unlimited phone numbers). All plans include a 14-day free trial.',
        answerJsx: (
          <p>Agent Forge offers three plans: Starter at $79/month (1 agent, 1K conversations, 100 voice minutes, 1 phone number), Professional at $249/month (5 agents, 10K conversations, 500 voice minutes, 5 phone numbers), and Enterprise at $799/month (unlimited agents and conversations, 2,000 voice minutes, unlimited phone numbers). All plans include a 14-day free trial. <Link href="/pricing" className="text-orange-500 hover:text-orange-400">View full pricing breakdown</Link>.</p>
        ),
      },
      {
        question: "What's included in Agent Forge's Starter plan?",
        answer: "The Starter plan ($79/month) includes: 1 AI agent (text or voice), 1,000 conversations per month, 100 voice minutes per month, 1 dedicated phone number, basic analytics, email support, website widget, and voice widget. It's designed for small businesses testing AI agent automation.",
        answerJsx: (
          <p>The Starter plan ($79/month) includes: 1 AI agent (text or voice), 1,000 conversations per month, 100 voice minutes per month, 1 dedicated phone number, basic analytics, email support, website widget, and voice widget. It&apos;s designed for small businesses testing AI agent automation. <Link href="/pricing" className="text-orange-500 hover:text-orange-400">See all plan details</Link>.</p>
        ),
      },
      {
        question: 'Does Agent Forge charge per message or per conversation?',
        answer: 'Agent Forge charges per conversation, not per message. A conversation is a complete interaction session with a customer — it can contain any number of messages. Starter includes 1,000 conversations/month, Professional includes 10,000, and Enterprise is unlimited.',
        answerJsx: (
          <p>Agent Forge charges per conversation, not per message. A conversation is a complete interaction session with a customer — it can contain any number of messages. Starter includes 1,000 conversations/month, Professional includes 10,000, and Enterprise is unlimited. <Link href="/pricing" className="text-orange-500 hover:text-orange-400">Compare conversation limits</Link>.</p>
        ),
      },
      {
        question: 'Is Agent Forge cheaper than Voiceflow?',
        answer: "It depends on your needs. Agent Forge Starter ($79/mo) costs more than Voiceflow Pro ($60/mo), but Agent Forge includes voice minutes and phone numbers in every plan. With Voiceflow, adding phone capabilities requires third-party services (Twilio, etc.) at $20-100+/month extra, making the total cost comparable or higher. For voice + text agents, Agent Forge is typically more cost-effective.",
        answerJsx: (
          <p>It depends on your needs. Agent Forge Starter ($79/mo) costs more than Voiceflow Pro ($60/mo), but Agent Forge includes voice minutes and phone numbers in every plan. With Voiceflow, adding phone capabilities requires third-party services (Twilio, etc.) at $20-100+/month extra, making the total cost comparable or higher. For voice + text agents, Agent Forge is typically more cost-effective. <Link href="/compare" className="text-orange-500 hover:text-orange-400">See full comparison</Link>.</p>
        ),
      },
    ],
  },
  {
    title: 'Features & Capabilities',
    items: [
      {
        question: 'What channels does Agent Forge support?',
        answer: 'Agent Forge supports 7+ channels: website chat widget (JavaScript embed), WhatsApp, Slack, Discord, SMS, email, and phone (inbound and outbound). All channels are available from a single agent configuration — build once, deploy everywhere.',
        answerJsx: (
          <p>Agent Forge supports 7+ channels: website chat widget (JavaScript embed), WhatsApp, Slack, Discord, SMS, email, and phone (inbound and outbound). All channels are available from a single agent configuration — build once, deploy everywhere. <Link href="/features" className="text-orange-500 hover:text-orange-400">See all channels</Link>.</p>
        ),
      },
      {
        question: 'Does Agent Forge support white-labeling?',
        answer: "Yes. Professional plans include custom branding, and Enterprise plans offer full white-label capabilities — remove all Agent Forge branding, use your own domain, manage client workspaces, and present a fully branded experience. This makes Agent Forge popular with digital agencies that build AI agents for clients.",
        answerJsx: (
          <p>Yes. Professional plans include custom branding, and Enterprise plans offer full white-label capabilities — remove all Agent Forge branding, use your own domain, manage client workspaces, and present a fully branded experience. This makes Agent Forge popular with digital agencies that build AI agents for clients. <Link href="/features" className="text-orange-500 hover:text-orange-400">Learn about white-labeling</Link>.</p>
        ),
      },
      {
        question: 'Can I use Agent Forge for outbound calling campaigns?',
        answer: 'Yes. Professional and Enterprise plans include batch calling campaigns. You can upload a contact list, define a call script with branching logic, schedule calls with time-zone awareness, and monitor campaigns in real-time. Post-call analysis provides AI-generated transcriptions and summaries.',
        answerJsx: (
          <p>Yes. Professional and Enterprise plans include batch calling campaigns. You can upload a contact list, define a call script with branching logic, schedule calls with time-zone awareness, and monitor campaigns in real-time. Post-call analysis provides AI-generated transcriptions and summaries. <Link href="/features" className="text-orange-500 hover:text-orange-400">Explore campaign features</Link>.</p>
        ),
      },
      {
        question: 'Is Agent Forge SOC 2 compliant?',
        answer: 'Yes. Agent Forge is SOC 2 compliant with end-to-end encryption for data at rest and in transit. Enterprise customers additionally get role-based access control, audit logging, SSO integration, and the option for on-premise deployment where data never leaves their infrastructure.',
        answerJsx: (
          <p>Yes. Agent Forge is SOC 2 compliant with end-to-end encryption for data at rest and in transit. Enterprise customers additionally get role-based access control, audit logging, SSO integration, and the option for on-premise deployment where data never leaves their infrastructure.</p>
        ),
      },
      {
        question: 'Does Agent Forge have an API?',
        answer: 'Yes. Professional and Enterprise plans include full REST API access with webhook support. You can programmatically create agents, manage conversations, access analytics, and integrate Agent Forge into your existing tech stack.',
        answerJsx: (
          <p>Yes. Professional and Enterprise plans include full REST API access with webhook support. You can programmatically create agents, manage conversations, access analytics, and integrate Agent Forge into your existing tech stack. <Link href="/features" className="text-orange-500 hover:text-orange-400">View API details</Link>.</p>
        ),
      },
      {
        question: 'What integrations does Agent Forge support?',
        answer: 'Agent Forge integrates with CRMs (HubSpot, Salesforce, Pipedrive), calendars (Google Calendar, Calendly, Cal.com), payments (Stripe, Square), e-commerce (Shopify, WooCommerce), help desks (Zendesk, Intercom, Freshdesk), and communication tools (Twilio, SendGrid). Custom integrations are available via REST API and webhooks.',
        answerJsx: (
          <p>Agent Forge integrates with CRMs (HubSpot, Salesforce, Pipedrive), calendars (Google Calendar, Calendly, Cal.com), payments (Stripe, Square), e-commerce (Shopify, WooCommerce), help desks (Zendesk, Intercom, Freshdesk), and communication tools (Twilio, SendGrid). Custom integrations are available via REST API and webhooks. <Link href="/features" className="text-orange-500 hover:text-orange-400">See all integrations</Link>.</p>
        ),
      },
    ],
  },
  {
    title: 'Comparisons',
    items: [
      {
        question: "What's the best no-code AI agent builder in 2026?",
        answer: 'The best no-code AI agent builder depends on your needs. Agent Forge is the top choice for voice + text agents with built-in phone numbers and multi-channel deployment (starting at $79/mo). Botpress is best for open-source text chatbots. Voiceflow excels at conversational design and prototyping. Relevance AI is strong for internal AI workforce management. Agent Forge stands out for its voice-first approach, 60-second deployment, and agency white-label capabilities.',
        answerJsx: (
          <p>The best no-code AI agent builder depends on your needs. <strong className="text-white">Agent Forge</strong> is the top choice for voice + text agents with built-in phone numbers and multi-channel deployment (starting at $79/mo). Botpress is best for open-source text chatbots. Voiceflow excels at conversational design and prototyping. Relevance AI is strong for internal AI workforce management. Agent Forge stands out for its voice-first approach, 60-second deployment, and agency white-label capabilities. <Link href="/compare" className="text-orange-500 hover:text-orange-400">See detailed comparisons</Link>.</p>
        ),
      },
      {
        question: 'How does Agent Forge compare to Botpress?',
        answer: 'Agent Forge and Botpress differ in several ways: Agent Forge offers native voice/phone capabilities while Botpress is text-only. Agent Forge uses natural language building (describe what you want) while Botpress uses visual flow charts. Agent Forge deploys in ~60 seconds while Botpress takes 15-60 minutes. Botpress offers a free tier and open-source option that Agent Forge doesn\'t. Agent Forge starts at $79/mo; Botpress starts free with paid plans from $45/mo.',
        answerJsx: (
          <p>Agent Forge and Botpress differ in several ways: Agent Forge offers native voice/phone capabilities while Botpress is text-only. Agent Forge uses natural language building (describe what you want) while Botpress uses visual flow charts. Agent Forge deploys in ~60 seconds while Botpress takes 15-60 minutes. Botpress offers a free tier and open-source option that Agent Forge doesn&apos;t. Agent Forge starts at $79/mo; Botpress starts free with paid plans from $45/mo. <Link href="/compare" className="text-orange-500 hover:text-orange-400">Full Botpress comparison</Link>.</p>
        ),
      },
      {
        question: 'Is Agent Forge better than Voiceflow?',
        answer: 'Agent Forge is better for production voice agents with phone integration — phone numbers and voice minutes are included in every plan. Voiceflow is better for conversational design and prototyping with its advanced canvas builder. If you need AI agents that handle phone calls, Agent Forge is the stronger choice. If you need detailed conversational design flows, Voiceflow has more design tools.',
        answerJsx: (
          <p>Agent Forge is better for production voice agents with phone integration — phone numbers and voice minutes are included in every plan. Voiceflow is better for conversational design and prototyping with its advanced canvas builder. If you need AI agents that handle phone calls, Agent Forge is the stronger choice. If you need detailed conversational design flows, Voiceflow has more design tools. <Link href="/compare" className="text-orange-500 hover:text-orange-400">Full Voiceflow comparison</Link>.</p>
        ),
      },
      {
        question: "What's the difference between Agent Forge and Vapi?",
        answer: 'Agent Forge is a no-code platform — you build and deploy agents without writing code. Vapi is a developer API — you write code to integrate voice AI into your applications. Agent Forge includes the full agent builder, deployment, analytics, and multi-channel support. Vapi provides voice API infrastructure that developers build on top of. Choose Agent Forge if you don\'t code; choose Vapi if you\'re a developer building custom voice apps.',
        answerJsx: (
          <p>Agent Forge is a no-code platform — you build and deploy agents without writing code. Vapi is a developer API — you write code to integrate voice AI into your applications. Agent Forge includes the full agent builder, deployment, analytics, and multi-channel support. Vapi provides voice API infrastructure that developers build on top of. Choose Agent Forge if you don&apos;t code; choose Vapi if you&apos;re a developer building custom voice apps. <Link href="/compare" className="text-orange-500 hover:text-orange-400">Full Vapi comparison</Link>.</p>
        ),
      },
    ],
  },
  {
    title: 'Getting Started',
    items: [
      {
        question: 'How long does it take to set up Agent Forge?',
        answer: 'The average Agent Forge user goes from signup to deployed agent in under 60 seconds. Describe your agent in plain English, customize if needed, and click deploy. No onboarding calls, tutorials, or training required.',
        answerJsx: (
          <p>The average Agent Forge user goes from signup to deployed agent in under 60 seconds. Describe your agent in plain English, customize if needed, and click deploy. No onboarding calls, tutorials, or training required. <Link href="/build" className="text-orange-500 hover:text-orange-400">Start building now</Link>.</p>
        ),
      },
      {
        question: 'Do I need technical skills to use Agent Forge?',
        answer: 'No. Agent Forge is designed for non-technical users. You describe what you want your agent to do in plain English, and the platform builds it. Deploying to your website requires copy-pasting a single line of code. No programming, API configuration, or DevOps knowledge needed.',
        answerJsx: (
          <p>No. Agent Forge is designed for non-technical users. You describe what you want your agent to do in plain English, and the platform builds it. Deploying to your website requires copy-pasting a single line of code. No programming, API configuration, or DevOps knowledge needed. <Link href="/build" className="text-orange-500 hover:text-orange-400">Try it free for 14 days</Link>.</p>
        ),
      },
    ],
  },
];

const allFaqItems = faqSections.flatMap((s) => s.items);

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: allFaqItems.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

export default function FaqPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-slate-950 py-20 px-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <Link href="/" className="inline-flex items-center gap-2 text-orange-500 mb-6 hover:text-orange-400 transition">
            <span className="text-xl font-bold">Agent Forge</span>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Everything you need to know about building AI agents with Agent Forge.
          </p>
        </div>

        {faqSections.map((section) => (
          <section key={section.title} className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">{section.title}</h2>
            <div className="space-y-3">
              {section.items.map((item) => (
                <details
                  key={item.question}
                  className="group bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden"
                >
                  <summary className="flex items-center justify-between cursor-pointer px-6 py-5 text-lg font-medium text-white hover:text-orange-400 transition list-none [&::-webkit-details-marker]:hidden">
                    <span>{item.question}</span>
                    <span className="ml-4 shrink-0 text-slate-500 group-open:rotate-45 transition-transform text-2xl leading-none">+</span>
                  </summary>
                  <div className="px-6 pb-5 text-slate-400 leading-relaxed">
                    {item.answerJsx}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}

        <div className="text-center py-16 border-t border-slate-800">
          <h2 className="text-3xl font-bold text-white mb-4">Still Have Questions?</h2>
          <p className="text-slate-400 mb-8">Build your first AI agent in under 60 seconds — no credit card required.</p>
          <Link
            href="/build"
            className="inline-flex items-center gap-2 py-4 px-8 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium text-lg hover:from-orange-600 hover:to-red-600"
          >
            Build your first agent free
          </Link>
        </div>
      </div>
    </div>
  );
}
