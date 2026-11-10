/* Renders one of the inline SVG illustrations from src/lib/art.ts */
export default function Art({
  svg,
  className = '',
  label,
}: {
  svg: string;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
