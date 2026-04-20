interface PlaylistItemProps {
  imageUrl: string;
  title: string;
  description?: string;
  imageWidth: number;  // px at 1920 reference
  imageHeight: number; // px at 1080 reference
}

export function PlaylistItem({ imageUrl, title, description, imageWidth, imageHeight }: PlaylistItemProps) {
  const widthVw = (imageWidth / 1920) * 100;
  const heightVh = (imageHeight / 1080) * 100;

  return (
    <div style={{ width: `${widthVw}vw` }}>
      <img
        src={imageUrl}
        alt={title}
        style={{
          width: `${widthVw}vw`,
          height: `${heightVh}vh`,
          borderRadius: '12px',
          objectFit: 'cover',
        }}
        draggable={false}
      />
      <div
        style={{
          fontSize: '24px',
          color: '#ffffff',
          marginTop: '8px',
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: '24px',
            color: 'rgba(255, 255, 255, 0.75)',
            marginTop: '4px',
          }}
        >
          {description}
        </div>
      )}
    </div>
  );
}
