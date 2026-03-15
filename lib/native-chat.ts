import { registerPlugin } from '@capacitor/core';
import { isIOS } from './platform';

interface NativeChatPlugin {
  openChat(options: { agentName: string; agentId: string }): Promise<{ opened: boolean }>;
  getConversationHistory(options: { agentId: string }): Promise<{ messages: Array<{ id: string; role: string; content: string; timestamp: string }> }>;
  saveMessage(options: { agentId: string; role: string; content: string }): Promise<{ saved: boolean }>;
}

interface SiriShortcutsPlugin {
  donate(options: { activityType: string; title: string; agentName: string }): Promise<{ donated: boolean }>;
}

const NativeChat = registerPlugin<NativeChatPlugin>('NativeChat');
const SiriShortcuts = registerPlugin<SiriShortcutsPlugin>('SiriShortcuts');

export const openNativeChat = async (agentName: string, agentId: string): Promise<void> => {
  if (!isIOS()) return;
  try {
    await NativeChat.openChat({ agentName, agentId });
    await SiriShortcuts.donate({
      activityType: `com.agentforge.app.chat.${agentId}`,
      title: `Chat with ${agentName}`,
      agentName,
    });
  } catch (error) {
    console.error('Native chat error:', error);
  }
};

export const getNativeHistory = async (agentId: string) => {
  if (!isIOS()) return [];
  try {
    const result = await NativeChat.getConversationHistory({ agentId });
    return result.messages;
  } catch {
    return [];
  }
};

export const saveNativeMessage = async (agentId: string, role: string, content: string): Promise<boolean> => {
  if (!isIOS()) return false;
  try {
    const result = await NativeChat.saveMessage({ agentId, role, content });
    return result.saved;
  } catch {
    return false;
  }
};
