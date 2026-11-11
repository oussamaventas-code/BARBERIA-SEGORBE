import { useState } from 'react'

/**
 * Imagen con carga diferida y fallback elegante (degradado obsidiana)
 * por si la URL externa no responde. Nunca muestra un placeholder genérico.
 */
export default function Img({ src, alt, className = '', imgClassName = '', priority = false, ...rest }) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  return (
    <div className={`relative overflow-hidden bg-[radial-gradient(120%_80%_at_30%_20%,#33333F_0%,#16161D_55%,#0D0D12_100%)] ${className}`}>
      {!failed && src && (
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
          {...rest}
        />
      )}
    </div>
  )
}
