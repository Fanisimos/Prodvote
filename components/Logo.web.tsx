interface LogoProps {
  size?: number;
  glow?: boolean;
}

export function LogoIcon({ size = 48, glow = false }: LogoProps) {
  return (
    <img
      src={require('../assets/app-icon-Prodvote.png')}
      alt="Prodvote"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.2,
        filter: glow ? `drop-shadow(0 0 ${size * 0.4}px rgba(124, 92, 252, 0.45))` : undefined,
      }}
    />
  );
}
