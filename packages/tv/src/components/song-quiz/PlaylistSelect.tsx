import type { NavigationDirection } from '@mobile-app-lab/shared';
import { PlaylistItem } from './PlaylistItem';
import { PlaylistFocusFrame } from './PlaylistFocusFrame';

// Placeholder data until real assets are provided
const FEATURED_PLAYLISTS = [
  { id: 'f1', title: 'Top Hits 2024', description: 'The biggest songs of the year', image: '/games/song-quiz/featured-0.png' },
  { id: 'f2', title: 'Classic Rock', description: 'Timeless rock anthems', image: '/games/song-quiz/featured-1.png' },
  { id: 'f3', title: 'K-Pop Essentials', description: 'The best of Korean pop', image: '/games/song-quiz/featured-2.png' },
];

const RECENT_PLAYLISTS = [
  { id: 'r1', title: 'Pop Mix', image: '/games/song-quiz/recent-0.png' },
  { id: 'r2', title: '90s Throwback', image: '/games/song-quiz/recent-1.png' },
  { id: 'r3', title: 'Chill Vibes', image: '/games/song-quiz/recent-2.png' },
  { id: 'r4', title: 'Workout Beats', image: '/games/song-quiz/recent-3.png' },
  { id: 'r5', title: 'Jazz Lounge', image: '/games/song-quiz/recent-4.png' },
];

interface PlaylistSelectProps {
  focusRow: number;
  focusCol: number;
  bounceDirection: NavigationDirection | null;
  isPressing: boolean;
}

export function PlaylistSelect({ focusRow, focusCol, bounceDirection, isPressing }: PlaylistSelectProps) {
  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(/games/song-quiz/playlist-bg.jpg)',
          backgroundColor: '#1a1a2e',
        }}
      />

      {/* Featured Row */}
      <div
        className="absolute"
        style={{
          left: `${(90 / 1920) * 100}vw`,
          top: `${(234 / 1080) * 100}vh`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            marginBottom: '16px',
            fontSize: '32px',
            color: 'rgba(255, 255, 255, 0.75)',
          }}
        >
          Featured
        </div>
        <div className="flex" style={{ gap: `${(64 / 1920) * 100}vw` }}>
          {FEATURED_PLAYLISTS.map((playlist) => (
            <PlaylistItem
              key={playlist.id}
              imageUrl={playlist.image}
              title={playlist.title}
              description={playlist.description}
              imageWidth={532}
              imageHeight={237}
            />
          ))}
        </div>
      </div>

      {/* Recently Played Row */}
      <div
        className="absolute"
        style={{
          left: `${(90 / 1920) * 100}vw`,
          top: `${(678 / 1080) * 100}vh`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            marginBottom: '16px',
            fontSize: '32px',
            color: 'rgba(255, 255, 255, 0.75)',
          }}
        >
          Recently Played
        </div>
        <div className="flex" style={{ gap: `${(64 / 1920) * 100}vw` }}>
          {RECENT_PLAYLISTS.map((playlist) => (
            <PlaylistItem
              key={playlist.id}
              imageUrl={playlist.image}
              title={playlist.title}
              imageWidth={234}
              imageHeight={234}
            />
          ))}
        </div>
      </div>

      {/* Focus Frame */}
      <PlaylistFocusFrame
        focusRow={focusRow}
        focusCol={focusCol}
        bounceDirection={bounceDirection}
        isPressing={isPressing}
      />
    </div>
  );
}

export { FEATURED_PLAYLISTS, RECENT_PLAYLISTS };
