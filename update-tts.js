const fs = require('fs');

const path = 'app/build/voice/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Find and replace the playVoicePreview function
const oldFuncRegex = /const playVoicePreview = \(\) => \{[\s\S]*?window\.speechSynthesis\.speak\(utterance\);\s*\};/;

const newFunc = `const playVoicePreview = async () => {
    if (isPlayingVoice) return;
    setIsPlayingVoice(true);

    try {
      // Use OpenAI TTS API for human-like voice quality
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: voiceSettings.greetingMessage,
          voice: selectedVoice.id,
          speed: voiceSpeed,
        }),
      });

      if (!response.ok) {
        throw new Error('TTS API failed');
      }

      // Play the high-quality audio
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setIsPlayingVoice(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsPlayingVoice(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      setIsPlayingVoice(false);
    }
  };`;

if (oldFuncRegex.test(content)) {
  content = content.replace(oldFuncRegex, newFunc);
  fs.writeFileSync(path, content);
  console.log('✅ Updated playVoicePreview to use OpenAI TTS');
} else {
  console.log('⚠️ Function not found - checking if already updated...');
  if (content.includes("fetch('/api/tts'")) {
    console.log('✅ Already using OpenAI TTS');
  } else {
    console.log('❌ Could not find function to update');
  }
}
