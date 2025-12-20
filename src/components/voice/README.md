# VoiceAgentBuilder Component

A beautiful, animated multi-step wizard for creating voice AI agents with Framer Motion animations.

## Features

- **5-Step Wizard**: Type selection, voice config, behavior customization, phone number, review & deploy
- **20 Agent Types**: Organized into 5 categories (Customer Service, Sales, Healthcare, Financial, Hospitality)
- **Voice Selection**: 6 voice options with gender and tone indicators
- **Language Support**: 10 languages including English, Spanish, French, German, Japanese, Chinese
- **LLM Providers**: OpenAI GPT-4, GPT-3.5, Google Gemini Pro, Gemini Flash
- **Capabilities**: Voicemail detection, call transfer, recording, transcription, sentiment analysis
- **Phone Options**: Provision new number or use existing
- **Smooth Animations**: Framer Motion transitions matching AgentForgeDashboard style

## Usage

```jsx
import React, { useState } from 'react';
import VoiceAgentBuilder from './components/voice/VoiceAgentBuilder';

function MyComponent() {
  const [showBuilder, setShowBuilder] = useState(false);

  const handleAgentCreated = (formData) => {
    console.log('New voice agent configuration:', formData);
    // Handle agent deployment
  };

  return (
    <div>
      <button onClick={() => setShowBuilder(true)}>
        Create Voice Agent
      </button>

      <VoiceAgentBuilder
        isOpen={showBuilder}
        onClose={() => setShowBuilder(false)}
        onComplete={handleAgentCreated}
      />
    </div>
  );
}
```

## Integration with AgentForgeDashboard

Add to your dashboard's "Create Agent" flow:

```jsx
// In AgentForgeDashboard.jsx
import VoiceAgentBuilder from './components/voice/VoiceAgentBuilder';

// Add state
const [showVoiceBuilder, setShowVoiceBuilder] = useState(false);

// Add button
<motion.button
  onClick={() => setShowVoiceBuilder(true)}
  className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl"
>
  <Phone className="w-4 h-4" />
  Create Voice Agent
</motion.button>

// Add component
<VoiceAgentBuilder
  isOpen={showVoiceBuilder}
  onClose={() => setShowVoiceBuilder(false)}
  onComplete={(data) => {
    console.log('Voice agent created:', data);
    setShowVoiceBuilder(false);
  }}
/>
```

## Form Data Structure

The `onComplete` callback receives this data structure:

```javascript
{
  agentType: 'support',              // Selected agent type ID
  voice: 'alloy',                    // Selected voice ID
  language: 'en-US',                 // Language code
  speechSpeed: 1.0,                  // Speed multiplier (0.5-2.0)
  llmProvider: 'openai-gpt4',        // LLM provider ID
  greeting: 'Hello! How can I...',   // Greeting message
  systemPrompt: 'You are a...',      // System prompt
  maxCallDuration: 10,               // Minutes
  capabilities: {
    voicemail: true,
    transfer: true,
    recording: true,
    transcription: true,
    sentiment: false
  },
  phoneOption: 'new',                // 'new' or 'existing'
  areaCode: '415',                   // If phoneOption is 'new'
  existingNumber: '+1...'            // If phoneOption is 'existing'
}
```

## Agent Type Categories

### Customer Service (4 types)
- Customer Support
- IT Helpdesk
- Returns & Refunds
- Customer Onboarding

### Sales (4 types)
- Lead Qualification
- Appointment Setter
- Outbound Sales
- Upsell Assistant

### Healthcare (4 types)
- Medical Scheduler
- Appointment Reminders
- Patient Intake
- Prescription Refills

### Financial (4 types)
- Billing Support
- Collections
- Fraud Detection
- Financial Advisor

### Hospitality (4 types)
- Reservations
- Virtual Concierge
- Room Service
- Travel Booking

## Voice Options

1. **Alloy** - Neutral, Professional
2. **Echo** - Male, Friendly
3. **Fable** - British Male, Sophisticated
4. **Onyx** - Male, Deep & Authoritative
5. **Nova** - Female, Warm & Energetic
6. **Shimmer** - Female, Soft & Caring

## LLM Providers

1. **OpenAI GPT-4** - Fast, Excellent quality
2. **OpenAI GPT-3.5** - Very Fast, Good quality
3. **Google Gemini Pro** - Fast, Excellent quality
4. **Google Gemini Flash** - Ultra Fast, Good quality

## Styling

The component uses Tailwind CSS classes matching the AgentForgeDashboard theme:
- Dark mode (slate-900/950 backgrounds)
- Orange/red gradient accents
- Glass-morphism effects
- Smooth hover transitions

## Dependencies

- React 18+
- Framer Motion 11+
- Lucide React (for icons)
- Tailwind CSS 3+
