export function IconSystem({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g filter="url(#sys_f)">
        <g clipPath="url(#sys_c)">
          <path d="M4 32C4 16.536 16.536 4 32 4C47.464 4 60 16.536 60 32C60 47.464 47.464 60 32 60C16.536 60 4 47.464 4 32Z" fill="#FFDA0A"/>
          <path d="M4 32C4 16.536 16.536 4 32 4C47.464 4 60 16.536 60 32C60 47.464 47.464 60 32 60C16.536 60 4 47.464 4 32Z" fill="url(#sys_g1)" style={{mixBlendMode:'multiply'}}/>
          <path d="M43.0592 15.8226C43.2598 15.0047 44.0706 14.5078 44.8703 14.7129C45.67 14.9181 46.1554 15.7477 45.9548 16.5656C45.3166 19.1681 43.8578 25.6993 42.1391 31.5175C41.1178 34.9744 40.1269 39.1284 37.8002 41.9779C37.2921 42.6001 36.4277 43.4203 35.2438 43.3439C34.2561 43.28 33.5723 42.6879 33.1556 42.0375C31.9397 40.1397 32.0702 37.411 31.9815 35.254C31.9192 33.7423 32.0518 30.7485 31.5989 30.6945C31.1461 30.6405 29.8944 35.3244 29.1593 37.637C28.48 39.7742 27.7197 42.032 26.8365 43.6887C25.959 45.3346 24.4611 47.1386 22.4033 46.5543C20.3983 45.9847 19.7353 43.6791 19.4934 41.8121C19.2279 39.7632 19.3185 37.1862 19.5772 34.5935C20.0956 29.3998 21.3349 23.7258 22.1704 21.1953C22.4342 20.3964 23.2811 19.9673 24.0622 20.2371L24.1342 20.2641C24.8687 20.561 25.2544 21.3984 24.999 22.1724C23.6827 26.2522 22.9728 30.6409 22.5474 34.9036C22.4756 35.6231 21.6354 43.4262 23.1812 43.6001C24.4745 43.7456 26.0858 37.4295 26.32 36.6928C26.9873 34.5934 27.6631 32.3167 28.3497 30.6141C28.9476 29.1316 29.9208 26.9492 31.798 27.0154C33.5671 27.1122 34.3096 28.8651 34.5889 30.4058C34.8373 31.7768 34.8992 33.5391 34.9645 35.1258C35.0302 36.7222 34.9473 39.9838 35.5015 40.0286C36.0558 40.0735 38.3375 33.8276 39.2809 30.6339C40.9722 24.9087 42.3984 18.5173 43.0592 15.8226Z" fill="#0A0322"/>
          <ellipse cx="32.0002" cy="16.6667" rx="44.6667" ry="20.6667" fill="url(#sys_g2)" style={{mixBlendMode:'screen'}}/>
        </g>
        <path d="M32 5C46.9117 5 59 17.0883 59 32C59 46.9117 46.9117 59 32 59C17.0883 59 5 46.9117 5 32C5 17.0883 17.0883 5 32 5Z" stroke="#9F9F9F" style={{mixBlendMode:'screen'}} strokeWidth="2"/>
      </g>
      <defs>
        <filter id="sys_f" x="0" y="0" width="64" height="64" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset/>
          <feGaussianBlur stdDeviation="2"/>
          <feComposite in2="hardAlpha" operator="out"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0"/>
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/>
        </filter>
        <linearGradient id="sys_g1" x1="32" y1="4" x2="32" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="white"/>
          <stop offset="0.525276" stopColor="white"/>
          <stop offset="1" stopColor="#E0E0E0"/>
        </linearGradient>
        <linearGradient id="sys_g2" x1="32.0002" y1="-0.820513" x2="32.0002" y2="37.3333" gradientUnits="userSpaceOnUse">
          <stop stopColor="#252525"/>
          <stop offset="1" stopColor="#5C5C5C"/>
        </linearGradient>
        <clipPath id="sys_c">
          <path d="M4 32C4 16.536 16.536 4 32 4C47.464 4 60 16.536 60 32C60 47.464 47.464 60 32 60C16.536 60 4 47.464 4 32Z" fill="white"/>
        </clipPath>
      </defs>
    </svg>
  );
}
