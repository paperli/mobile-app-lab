import { useEffect, useState } from 'react';
import Fuse from 'fuse.js';
import { useSpeechRecognition } from './useSpeechRecognition';
import { PLACEHOLDER_GAMES } from '@mobile-app-lab/shared';

interface VoiceCommand {
  command: string;
  gameId: string | null;
  gameTitle: string | null;
  confidence: number; // 0-1 range
}

interface UseVoiceCommandOptions {
  enabled?: boolean;
  onCommand?: (command: VoiceCommand) => void;
}

export function useVoiceCommand(options: UseVoiceCommandOptions = {}) {
  const { enabled = false, onCommand } = options;

  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);

  // Initialize Fuse.js for fuzzy matching game titles
  const fuse = new Fuse(PLACEHOLDER_GAMES, {
    keys: ['title'],
    threshold: 0.4, // 0 = exact match, 1 = match anything
    includeScore: true,
    minMatchCharLength: 3,
  });

  // Speech recognition hook
  const { transcript, interimTranscript, isListening, error, isSupported } = useSpeechRecognition({
    enabled,
    continuous: true,
    language: 'en-US',
  });

  // Process transcript when it changes
  useEffect(() => {
    if (!transcript || transcript.length === 0) return;

    console.log('[VoiceCommand] Processing transcript:', transcript);

    // Search for game name in transcript
    const results = fuse.search(transcript);

    if (results.length > 0) {
      const bestMatch = results[0];
      const game = bestMatch.item;
      const confidence = 1 - (bestMatch.score || 0); // Convert Fuse score to confidence

      console.log('[VoiceCommand] Match found:', {
        game: game.title,
        confidence: confidence.toFixed(2),
        transcript,
      });

      // Only accept matches with confidence > 0.5
      if (confidence > 0.5) {
        const command: VoiceCommand = {
          command: transcript,
          gameId: game.id,
          gameTitle: game.title,
          confidence,
        };

        setLastCommand(command);

        // Trigger callback
        if (onCommand) {
          onCommand(command);
        }
      } else {
        console.log('[VoiceCommand] Match confidence too low:', confidence.toFixed(2));
      }
    } else {
      console.log('[VoiceCommand] No match found for:', transcript);
    }
  }, [transcript, onCommand]);

  return {
    lastCommand,
    isListening,
    error,
    transcript,
    interimTranscript,
    isSupported,
  };
}
