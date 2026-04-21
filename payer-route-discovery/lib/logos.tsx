// Payer logo components - use exact images from /public/logos

export function PayerLogo({ payerKey, size = 'md' }: { payerKey: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizeMap = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10',  // header: fills the square container edge-to-edge
  }

  const logoMap: Record<string, string> = {
    aetna: '/logos/aetna.png',
    blue_cross_blue_shield: '/logos/bcbs.png',
    cigna: '/logos/cigna.png',
    humana: '/logos/humana.png',
    unitedhealthcare: '/logos/uhc.png',
  }

  const logoPath = logoMap[payerKey]

  // xl = square header avatar (no circular clip; outer container handles rounding)
  // sm/md/lg = circular sidebar pill
  const isSquare = size === 'xl'

  if (!logoPath) {
    return (
      <div className={`${sizeMap[size]} ${isSquare ? '' : 'rounded-full'} overflow-hidden bg-gray-200 flex items-center justify-center`}>
        <span className="text-[10px] font-bold text-gray-600">{payerKey.slice(0, 2).toUpperCase()}</span>
      </div>
    )
  }

  return (
    <div className={`${sizeMap[size]} ${isSquare ? '' : 'rounded-full'} overflow-hidden bg-white flex items-center justify-center flex-shrink-0`}>
      <img
        src={logoPath}
        alt={payerKey}
        className="w-full h-full object-contain"
        loading="lazy"
      />
    </div>
  )
}

// Get payer brand color
export function getPayerColor(payerKey: string): string {
  switch (payerKey) {
    case 'aetna':
      return '#EE3124'
    case 'blue_cross_blue_shield':
      return '#0066CC'
    case 'cigna':
      return '#003087'
    case 'humana':
      return '#00A651'
    case 'unitedhealthcare':
      return '#FF6B35'
    default:
      return '#9CA3AF'
  }
}
