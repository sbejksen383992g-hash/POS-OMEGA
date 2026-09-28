export const NexusNative = {
  async startListening() {
    throw new Error("Native voice is only available in Android APK.");
  },

  async stopListening() {
    return;
  },

  async speak(text) {
    if ("speechSynthesis" in window) {
      speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    }
  },
};

export default NexusNative;